-- Same snapshot authority and atomic delta transaction in both modes.
-- Legacy/general snapshot writes still use the complete validating mirror.
begin;
create or replace function public.kpi_sync_task_records_on_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.kpi_task_storage_state where id='primary' and source_mode='record-primary')
    and not coalesce(current_setting('kpi.snapshot_delta_write',true)='on'
      and current_setting('kpi.record_state_commit',true)='on',false) then
    if tg_op='INSERT' or old.state->'tasks' is distinct from new.state->'tasks' then
      perform public.kpi_write_task_records(coalesce(new.state->'tasks','[]'::jsonb),new.revision);
    end if;
  end if;
  update public.kpi_task_storage_state set shared_revision=new.revision,updated_at=clock_timestamp() where id='primary';
  return new;
end $$;
revoke all on function public.kpi_sync_task_records_on_snapshot() from public,anon,authenticated,service_role;
create or replace function public.kpi_commit_task_delta_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[]
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean)
language plpgsql security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype;
  r public.kpi_task_command_receipts%rowtype; version bigint; candidate jsonb; next_tasks jsonb;
  changed_ids text[]; moved_ids text[];
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
  select * into m from public.kpi_task_storage_state where id='primary';
  if m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision
    or m.source_mode not in ('snapshot','record-primary') then
    raise exception 'Task write storage is not synchronized.' using errcode='KPT01';
  end if;
  select t.row_version into version from public.tasks t where t.id=p_task_id;
  if not found or version<>p_expected_task_version then return; end if;
  if jsonb_typeof(p_next_state) is distinct from 'object' or p_next_state ? 'tasks'
    or jsonb_typeof(p_task_upserts) is distinct from 'array' or p_task_deletes is null or p_task_order is null then
    raise exception 'Invalid task delta structure.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(s.state-'tasks') k(key) where not(p_next_state ? k.key)) then
    raise exception 'Complete shared context is required.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_task_upserts) x where jsonb_typeof(x)<>'object' or coalesce(btrim(x->>'id'),'')='')
    or exists(select 1 from jsonb_array_elements(p_task_upserts) x group by x->>'id' having count(*)>1)
    or exists(select 1 from unnest(p_task_order) id where id is null or btrim(id)='')
    or exists(select 1 from unnest(p_task_order) id group by id having count(*)>1)
    or exists(select 1 from unnest(p_task_deletes) id where id is null or btrim(id)='')
    or exists(select 1 from unnest(p_task_deletes) id group by id having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_task_upserts) x where x->>'id'=any(p_task_deletes))
    or exists(select 1 from unnest(p_task_deletes) d(id) where not exists(select 1 from public.tasks t where t.id=d.id))
    or exists(select 1 from public.kpi_task_report_records(p_task_upserts) x group by x.id having count(*)>1) then
    raise exception 'Invalid or duplicate task delta ids.' using errcode='22023';
  end if;
  -- Verify the complete ID set without exporting unchanged task bodies/history.
  if exists(with expected as (
      select t.id from public.tasks t where not(t.id=any(p_task_deletes))
      union select x->>'id' from jsonb_array_elements(p_task_upserts) x
    ) select 1 from expected e full join unnest(p_task_order) o(id) on e.id=o.id where e.id is null or o.id is null) then
    raise exception 'Task delta order is incomplete.' using errcode='22023';
  end if;
  select x into candidate from jsonb_array_elements(p_task_upserts) x where x->>'id'=p_task_id;
  if candidate is null or not exists(select 1 from jsonb_array_elements(
    case when jsonb_typeof(candidate->'progressReports')='array' then candidate->'progressReports' else '[]'::jsonb end
  ) x where x->>'id'=p_command_id) then
    raise exception 'Task command has no audit report.' using errcode='22023';
  end if;

  perform set_config('kpi.task_mirror_write','on',true);
    delete from public.task_progress_reports where task_id=any(p_task_deletes);
    delete from public.tasks where id=any(p_task_deletes);
    with written as (
      insert into public.tasks(id,version,data,row_version,position_index,updated_at)
      select x->>'id',s.revision+1,x,1,o.position,clock_timestamp()
      from jsonb_array_elements(p_task_upserts) x join unnest(p_task_order) with ordinality o(id,position) on o.id=x->>'id'
      on conflict(id) do update set data=excluded.data,version=excluded.version,
        row_version=public.tasks.row_version+case when public.tasks.data is distinct from excluded.data then 1 else 0 end,
        position_index=excluded.position_index,
        updated_at=case when public.tasks.data is distinct from excluded.data then excluded.updated_at else public.tasks.updated_at end
      where public.tasks.data is distinct from excluded.data or public.tasks.position_index<>excluded.position_index
      returning id
    ) select coalesce(array_agg(id),'{}'::text[]) into changed_ids from written;
    with moved as (
      update public.tasks t set position_index=o.position,version=s.revision+1
      from unnest(p_task_order) with ordinality o(id,position) where t.id=o.id and t.position_index<>o.position returning t.id
    ) select coalesce(array_agg(id),'{}'::text[]) into moved_ids from moved;
    changed_ids:=changed_ids||moved_ids;
    delete from public.task_progress_reports where task_id=any(changed_ids);
    insert into public.task_progress_reports(id,task_id,version,data,updated_at)
      select x.id,x.task_id,s.revision+1,x.data,clock_timestamp()
      from public.kpi_task_report_records((select coalesce(jsonb_agg(t.data),'[]'::jsonb) from public.tasks t where t.id=any(changed_ids))) x;
    perform set_config('kpi.task_mirror_write','',true);
  if m.source_mode='snapshot' then
    -- Keep the complete snapshot authority; the already validated delta above
    -- updates its mirror in this same transaction, without a second full rewrite.
    select coalesce(jsonb_agg(coalesce(x.value,t.data) order by o.position),'[]'::jsonb) into next_tasks
      from unnest(p_task_order) with ordinality o(id,position)
      left join public.tasks t on t.id=o.id
      left join jsonb_array_elements(p_task_upserts) x(value) on x.value->>'id'=o.id;
  end if;
  perform set_config('kpi.snapshot_delta_write','on',true);
  perform set_config('kpi.record_state_commit','on',true);
  update public.kpi_shared_state set state=case when m.source_mode='record-primary' then p_next_state
      else jsonb_set(p_next_state,'{tasks}',next_tasks,true) end,
    revision=s.revision+1,updated_at=clock_timestamp() where id='primary' returning * into s;
  perform set_config('kpi.record_state_commit','',true);
  perform set_config('kpi.snapshot_delta_write','',true);
  select t.row_version into version from public.tasks t where t.id=p_task_id;
  if version is null or version<=p_expected_task_version then
    raise exception 'Task command did not change its record.' using errcode='22023';
  end if;
  insert into public.kpi_task_command_receipts(actor_id,command_id,task_id,command_name,request_hash,committed_revision,task_version)
    values(p_actor_id,p_command_id,p_task_id,p_command_name,p_request_hash,s.revision,version);
  return query select s.revision,s.updated_at,version,false;
end $$;
revoke all on function public.kpi_commit_task_delta_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.kpi_commit_task_delta_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[]) to service_role;
commit;

