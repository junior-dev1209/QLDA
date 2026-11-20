-- Installs the record-primary protocol, but DOES NOT activate it.
begin;
lock table public.kpi_shared_state in share row exclusive mode;
do $$ begin
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean, false) then
    raise exception 'Task storage must be synchronized before installing phase 2b.';
  end if;
end $$;

alter table public.kpi_task_storage_state drop constraint if exists kpi_task_storage_state_schema_version_check;
alter table public.kpi_task_storage_state drop constraint if exists kpi_task_storage_state_source_mode_check;
alter table public.kpi_task_storage_state add constraint kpi_task_storage_state_schema_version_check check (schema_version in (1,2));
alter table public.kpi_task_storage_state add constraint kpi_task_storage_state_source_mode_check check (source_mode in ('snapshot','record-primary'));
update public.kpi_task_storage_state set schema_version = 2 where id = 'primary';
revoke all on public.kpi_task_storage_state from service_role;
grant select on public.kpi_task_storage_state to service_role;
alter table public.tasks add column if not exists position_index bigint not null default 0;
select set_config('kpi.task_mirror_write', 'on', true);
update public.tasks t set position_index = source.ordinality
from public.kpi_shared_state s, lateral jsonb_array_elements(s.state->'tasks') with ordinality source(value, ordinality)
where s.id = 'primary' and t.id = source.value->>'id';
select set_config('kpi.task_mirror_write', '', true);
create index if not exists tasks_position_idx on public.tasks(position_index,id);

create table if not exists public.kpi_task_source_switches (
  id bigint generated always as identity primary key,
  from_mode text not null, to_mode text not null, revision_before bigint not null,
  task_checksum text not null, before_state jsonb not null, evidence jsonb not null,
  operator_name text not null default session_user, switched_at timestamptz not null default clock_timestamp()
);
alter table public.kpi_task_source_switches enable row level security;
revoke all on public.kpi_task_source_switches from public, anon, authenticated, service_role;
revoke all on sequence public.kpi_task_source_switches_id_seq from public, anon, authenticated, service_role;

create or replace function public.kpi_task_record_export()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(t.data order by t.position_index, t.id), '[]'::jsonb) from public.tasks t;
$$;
revoke all on function public.kpi_task_record_export() from public, anon, authenticated, service_role;

create or replace function public.kpi_write_task_records(p_tasks jsonb, p_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare changed_ids text[];
begin
  if jsonb_typeof(p_tasks) is distinct from 'array'
    or exists(select 1 from jsonb_array_elements(p_tasks) t where jsonb_typeof(t) <> 'object' or coalesce(btrim(t->>'id'),'') = '')
    or exists(select 1 from jsonb_array_elements(p_tasks) t group by t->>'id' having count(*) > 1)
    or exists(select 1 from public.kpi_task_report_records(p_tasks) r group by r.id having count(*) > 1) then
    raise exception 'Invalid or duplicate task/history ids; no data changed.' using errcode = '22023';
  end if;
  perform set_config('kpi.task_mirror_write', 'on', true);
  with written as (
    insert into public.tasks(id, version, data, row_version, position_index, updated_at)
    select t.value->>'id', greatest(1,p_revision), t.value, 1, t.ordinality, clock_timestamp()
      from jsonb_array_elements(p_tasks) with ordinality t(value,ordinality)
    on conflict(id) do update set data=excluded.data, version=excluded.version,
      row_version=public.tasks.row_version + case when public.tasks.data is distinct from excluded.data then 1 else 0 end,
      position_index=excluded.position_index,
      updated_at=case when public.tasks.data is distinct from excluded.data then excluded.updated_at else public.tasks.updated_at end
    where public.tasks.data is distinct from excluded.data or public.tasks.position_index <> excluded.position_index
    returning id
  ) select coalesce(array_agg(id),'{}'::text[]) into changed_ids from written;
  delete from public.task_progress_reports r where r.task_id=any(changed_ids)
    or not exists(select 1 from jsonb_array_elements(p_tasks) t where t->>'id'=r.task_id);
  insert into public.task_progress_reports(id,task_id,version,data,updated_at)
    select r.id,r.task_id,greatest(1,p_revision),r.data,clock_timestamp()
    from public.kpi_task_report_records(p_tasks) r where r.task_id=any(changed_ids);
  delete from public.tasks t where not exists(select 1 from jsonb_array_elements(p_tasks) x where x->>'id'=t.id);
  perform set_config('kpi.task_mirror_write', '', true);
end $$;
revoke all on function public.kpi_write_task_records(jsonb,bigint) from public, anon, authenticated, service_role;

create or replace function public.kpi_guard_record_primary_state()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.kpi_task_storage_state where id='primary' and source_mode='record-primary') then
    if tg_op='DELETE' or current_setting('kpi.record_state_commit',true) is distinct from 'on' or new.state ? 'tasks' then
      raise exception 'Legacy snapshot writer is blocked in record-primary mode.' using errcode = 'KPT01';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.kpi_guard_record_primary_state() from public,anon,authenticated,service_role;
drop trigger if exists kpi_guard_record_primary_state on public.kpi_shared_state;
create trigger kpi_guard_record_primary_state before insert or update or delete on public.kpi_shared_state
for each row execute function public.kpi_guard_record_primary_state();

create or replace function public.kpi_sync_task_records_on_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.kpi_task_storage_state where id='primary' and source_mode='record-primary') then
    if tg_op='INSERT' or old.state->'tasks' is distinct from new.state->'tasks' then
      perform public.kpi_write_task_records(coalesce(new.state->'tasks','[]'::jsonb),new.revision);
    end if;
  end if;
  update public.kpi_task_storage_state set shared_revision=new.revision,updated_at=clock_timestamp() where id='primary';
  return new;
end $$;

-- One MVCC snapshot reconstructs the old API shape without storing a second task authority.
create or replace function public.kpi_read_task_state()
returns table(revision bigint,updated_at timestamptz,state jsonb,source_mode text,task_versions jsonb)
language sql stable security definer set search_path = '' as $$
  select s.revision,s.updated_at,
    case when m.source_mode='record-primary' then jsonb_set(s.state,'{tasks}',public.kpi_task_record_export(),true) else s.state end,
    m.source_mode,coalesce((select jsonb_object_agg(t.id,t.row_version) from public.tasks t),'{}'::jsonb)
  from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
$$;
revoke all on function public.kpi_read_task_state() from public,anon,authenticated;
grant execute on function public.kpi_read_task_state() to service_role;

create or replace function public.kpi_read_task_record(p_task_id text)
returns table(data jsonb,row_version bigint,revision bigint)
language sql stable security definer set search_path = '' as $$
  select t.data,t.row_version,s.revision from public.tasks t cross join public.kpi_shared_state s
  where t.id=p_task_id and s.id='primary';
$$;
revoke all on function public.kpi_read_task_record(text) from public,anon,authenticated;
grant execute on function public.kpi_read_task_record(text) to service_role;

-- Compatibility command adapter for ALL audited domain writers. A validated
-- candidate becomes changed task rows, not another persisted task snapshot.
create or replace function public.kpi_commit_record_state(
  expected_revision bigint,next_state jsonb,p_actor_id text default '',p_session_hash text default ''
) returns table(next_revision bigint,next_updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare current_state public.kpi_shared_state%rowtype; mode text; task_changed boolean;
begin
  select * into current_state from public.kpi_shared_state where id='primary' for update;
  if not found or current_state.revision<>expected_revision then return; end if;
  select source_mode into mode from public.kpi_task_storage_state where id='primary';
  if jsonb_typeof(next_state) is distinct from 'object' or jsonb_typeof(next_state->'tasks') is distinct from 'array' then
    raise exception 'Complete canonical task export is required.' using errcode='22023';
  end if;
  task_changed := (case when mode='record-primary' then public.kpi_task_record_export() else current_state.state->'tasks' end)
    is distinct from next_state->'tasks';
  if (task_changed and mode='record-primary') or p_actor_id<>'' then
    perform 1 from public.kpi_sync_sessions where token_hash=p_session_hash and account_id=p_actor_id
      and expires_at>clock_timestamp() for share;
    if not found or not exists(select 1 from jsonb_array_elements(current_state.state->'accounts') a
      where a->>'id'=p_actor_id and coalesce(a->'disabled','false'::jsonb) in ('false','null','0','""')) then
      raise exception 'Authentication required.' using errcode='KPA01';
    end if;
  end if;
  if mode='record-primary' and task_changed then
    perform public.kpi_write_task_records(next_state->'tasks',current_state.revision+1);
  end if;
  perform set_config('kpi.record_state_commit','on',true);
  update public.kpi_shared_state set state=case when mode='record-primary' then next_state-'tasks' else next_state end,
    revision=current_state.revision+1,updated_at=clock_timestamp() where id='primary'
    returning * into current_state;
  perform set_config('kpi.record_state_commit','',true);
  return query select current_state.revision,current_state.updated_at;
end $$;
revoke all on function public.kpi_commit_record_state(bigint,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.kpi_commit_record_state(bigint,jsonb,text,text) to service_role;

create or replace function public.kpi_commit_record_task_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean)
language plpgsql security definer set search_path = '' as $$
declare s public.kpi_shared_state%rowtype; r public.kpi_task_command_receipts%rowtype; version bigint; candidate jsonb; committed record;
begin
  if p_expected_revision is null or p_expected_revision<=0 or p_expected_task_version is null or p_expected_task_version<=0
    or coalesce(length(p_command_id),0) not between 1 and 160 or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid task command envelope.' using errcode='22023';
  end if;
  select * into s from public.kpi_shared_state where id='primary' for update;
  perform 1 from public.kpi_sync_sessions where token_hash=p_session_hash and account_id=p_actor_id
    and expires_at>clock_timestamp() for share;
  if not found or not exists(select 1 from jsonb_array_elements(s.state->'accounts') a
      where a->>'id'=p_actor_id and coalesce(a->'disabled','false'::jsonb) in ('false','null','0','""')) then
    raise exception 'Authentication required.' using errcode='KPA01';
  end if;
  select * into r from public.kpi_task_command_receipts where actor_id=p_actor_id and command_id=p_command_id;
  if found then
    if r.task_id<>p_task_id or r.command_name<>p_command_name or r.request_hash<>p_request_hash then
      raise exception 'Command id was already used for a different request.' using errcode='KPC01';
    end if;
    return query select s.revision,s.updated_at,r.task_version,true; return;
  end if;
  if s.revision<>p_expected_revision then return; end if;
  select t.row_version into version from public.tasks t where t.id=p_task_id;
  if not found or version<>p_expected_task_version then return; end if;
  select t into candidate from jsonb_array_elements(p_next_state->'tasks') t where t->>'id'=p_task_id;
  if candidate is null or not exists(select 1 from jsonb_array_elements(candidate->'progressReports') x where x->>'id'=p_command_id) then
    raise exception 'Task command has no audit report.' using errcode='22023';
  end if;
  select * into committed from public.kpi_commit_record_state(p_expected_revision,p_next_state,p_actor_id,p_session_hash);
  if not found then return; end if;
  select t.row_version into version from public.tasks t where t.id=p_task_id;
  if version<=p_expected_task_version then raise exception 'Task command did not change its record.' using errcode='22023'; end if;
  insert into public.kpi_task_command_receipts(actor_id,command_id,task_id,command_name,request_hash,committed_revision,task_version)
    values(p_actor_id,p_command_id,p_task_id,p_command_name,p_request_hash,committed.next_revision,version);
  return query select committed.next_revision,committed.next_updated_at,version,false;
end $$;
revoke all on function public.kpi_commit_record_task_command(bigint,bigint,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.kpi_commit_record_task_command(bigint,bigint,text,text,text,text,text,text,jsonb) to service_role;

create or replace function public.kpi_task_storage_health()
returns jsonb language sql stable security definer set search_path = '' as $$
  with source as (select s.*,m.source_mode,m.shared_revision from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary'),
  expected_reports as(select r.* from lateral public.kpi_task_report_records(public.kpi_task_record_export()) r),
  report_diff as(select 1 from expected_reports e full join public.task_progress_reports r on e.id=r.id
    where e.data is distinct from r.data or e.task_id is distinct from r.task_id),
  task_diff as(select 1 from public.tasks t where t.id is distinct from t.data->>'id' or t.row_version<1 or t.position_index<1
    or exists(select 1 from public.tasks x where x.position_index=t.position_index and x.id<>t.id)),
  checks as(select *,
    case when source_mode='snapshot' then state->'tasks' is not distinct from public.kpi_task_record_export()
      else not(state ? 'tasks') end as source_valid from source)
  select jsonb_build_object('schemaVersion',2,'sourceMode',source_mode,'revision',revision,'storedRevision',shared_revision,
    'taskCount',(select count(*) from public.tasks),'reportCount',(select count(*) from public.task_progress_reports),
    'taskMismatches',(select count(*) from task_diff)+case when source_valid then 0 else 1 end,
    'reportMismatches',(select count(*) from report_diff),
    'taskChecksum',encode(sha256(convert_to(public.kpi_task_record_export()::text,'UTF8')),'hex'),
    'synchronized',source_valid and revision=shared_revision and not exists(select 1 from task_diff) and not exists(select 1 from report_diff))
  from checks;
$$;

-- Database-owner operation only. Neither browser nor Edge can switch modes.
create or replace function public.kpi_set_task_source_mode(
  p_mode text,p_expected_revision bigint,p_expected_checksum text,p_evidence jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.kpi_shared_state%rowtype; old_mode text; health jsonb; exported jsonb;
begin
  if p_mode not in ('snapshot','record-primary') or p_mode is null then raise exception 'Invalid target mode.'; end if;
  select * into s from public.kpi_shared_state where id='primary' for update;
  lock table public.tasks,public.task_progress_reports in share row exclusive mode;
  select source_mode into old_mode from public.kpi_task_storage_state where id='primary';
  health := public.kpi_task_storage_health();
  if not coalesce((health->>'synchronized')::boolean,false) or s.revision is distinct from p_expected_revision
    or health->>'taskChecksum' is distinct from p_expected_checksum then
    raise exception 'Task source changed or is inconsistent; switch aborted.' using errcode='KPT01';
  end if;
  if old_mode=p_mode then return health; end if;
  if jsonb_typeof(p_evidence) is distinct from 'object' or coalesce(btrim(p_evidence->>'ticket'),'')=''
    or coalesce(btrim(p_evidence->>'release'),'')='' or not(p_evidence @> '{"backupVerified":true,"restoreVerified":true,"stagingVerified":true,"rolesVerified":true,"workflowsVerified":true,"sameArtifactVerified":true}'::jsonb) then
    raise exception 'Verified backup/restore, staging, permissions, workflows and same-artifact evidence required.' using errcode='KPT01';
  end if;
  exported := public.kpi_task_record_export();
  insert into public.kpi_task_source_switches(from_mode,to_mode,revision_before,task_checksum,before_state,evidence)
    values(old_mode,p_mode,s.revision,health->>'taskChecksum',jsonb_set(s.state,'{tasks}',exported,true),p_evidence);
  update public.kpi_task_storage_state set source_mode=p_mode where id='primary';
  perform set_config('kpi.record_state_commit','on',true);
  update public.kpi_shared_state set state=case when p_mode='record-primary' then state-'tasks' else jsonb_set(state,'{tasks}',exported,true) end,
    revision=revision+1,updated_at=clock_timestamp() where id='primary';
  perform set_config('kpi.record_state_commit','',true);
  return public.kpi_task_storage_health();
end $$;
revoke all on function public.kpi_set_task_source_mode(text,bigint,text,jsonb) from public,anon,authenticated,service_role;
commit;
