-- Phase 1: the snapshot remains the only writer. Task records and their
-- histories are maintained in its transaction, never by a second API write.
begin;

lock table public.kpi_shared_state in share row exclusive mode;

create table if not exists public.kpi_task_migration_backups (
  entity text not null,
  record_id text not null,
  checksum text not null,
  row_data jsonb not null,
  captured_at timestamptz not null default now(),
  primary key (entity, record_id, checksum)
);
create table if not exists public.kpi_task_storage_state (
  id text primary key check (id = 'primary'),
  schema_version integer not null default 1 check (schema_version = 1),
  source_mode text not null default 'snapshot' check (source_mode = 'snapshot'),
  shared_revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.kpi_task_migration_backups enable row level security;
alter table public.kpi_task_storage_state enable row level security;
revoke all on public.kpi_task_migration_backups, public.kpi_task_storage_state from public, anon, authenticated;
grant all on public.kpi_task_migration_backups, public.kpi_task_storage_state to service_role;

-- Preserve all pre-migration data, including stale/orphan projection rows.
insert into public.kpi_task_migration_backups(entity, record_id, checksum, row_data)
select 'snapshot-tasks', id, md5(coalesce(state->'tasks', '[]'::jsonb)::text), coalesce(state->'tasks', '[]'::jsonb)
from public.kpi_shared_state on conflict do nothing;
insert into public.kpi_task_migration_backups(entity, record_id, checksum, row_data)
select 'tasks', t.id, md5(to_jsonb(t)::text), to_jsonb(t) from public.tasks t on conflict do nothing;
insert into public.kpi_task_migration_backups(entity, record_id, checksum, row_data)
select 'task_progress_reports', r.id, md5(to_jsonb(r)::text), to_jsonb(r)
from public.task_progress_reports r on conflict do nothing;

alter table public.tasks add column if not exists row_version bigint not null default 1;
alter table public.tasks add column if not exists owner_id text generated always as (data->>'ownerId') stored;
alter table public.tasks add column if not exists project_id text generated always as (data->>'projectId') stored;
alter table public.tasks add column if not exists task_status text generated always as (data->>'status') stored;
alter table public.tasks add column if not exists due_on text generated always as (data->>'due') stored;
create index if not exists tasks_owner_status_due_idx on public.tasks(owner_id, task_status, due_on, id);
create index if not exists tasks_project_id_idx on public.tasks(project_id, id);

create or replace function public.kpi_task_report_records(p_tasks jsonb)
returns table(id text, task_id text, data jsonb)
language sql immutable set search_path = '' as $$
  select coalesce(nullif(btrim(r.value->>'id'), ''), (t.value->>'id') || ':report:' || r.ordinality::text),
    t.value->>'id', r.value
  from jsonb_array_elements(p_tasks) t(value)
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(t.value->'progressReports') = 'array' then t.value->'progressReports' else '[]'::jsonb end
  ) with ordinality r(value, ordinality)
  where jsonb_typeof(r.value) = 'object';
$$;
revoke all on function public.kpi_task_report_records(jsonb) from public, anon, authenticated;
grant execute on function public.kpi_task_report_records(jsonb) to service_role;

create or replace function public.kpi_mirror_task_records(p_state jsonb, p_revision bigint, p_rebuild boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  source_tasks jsonb := coalesce(p_state->'tasks', '[]'::jsonb);
  changed_ids text[];
  old_context text := current_setting('kpi.task_mirror_write', true);
begin
  if jsonb_typeof(source_tasks) <> 'array' then
    raise exception 'Task storage: tasks must be an array.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(source_tasks) t
      where jsonb_typeof(t) <> 'object' or coalesce(btrim(t->>'id'), '') = '')
    or exists (select 1 from jsonb_array_elements(source_tasks) t group by t->>'id' having count(*) > 1) then
    raise exception 'Task storage: invalid or duplicate task id; no data was changed.' using errcode = '22023';
  end if;
  if exists (select 1 from public.kpi_task_report_records(source_tasks) r group by r.id having count(*) > 1) then
    raise exception 'Task storage: duplicate history id; no data was changed.' using errcode = '22023';
  end if;
  perform set_config('kpi.task_mirror_write', 'on', true);

  with updated as (
    insert into public.tasks(id, version, data, row_version, updated_at)
    select t->>'id', greatest(1, p_revision), t, 1, now() from jsonb_array_elements(source_tasks) t
    on conflict (id) do update set data = excluded.data, version = excluded.version,
      row_version = public.tasks.row_version + 1, updated_at = excluded.updated_at
    where public.tasks.data is distinct from excluded.data
    returning id
  ) select coalesce(array_agg(id), '{}'::text[]) into changed_ids from updated;

  if p_rebuild then
    select coalesce(array_agg(t->>'id'), '{}'::text[]) into changed_ids from jsonb_array_elements(source_tasks) t;
  end if;
  delete from public.task_progress_reports r where r.task_id = any(changed_ids)
    or not exists (select 1 from jsonb_array_elements(source_tasks) t where t->>'id' = r.task_id);
  insert into public.task_progress_reports(id, task_id, version, data, updated_at)
  select r.id, r.task_id, greatest(1, p_revision), r.data, now()
  from public.kpi_task_report_records(source_tasks) r where r.task_id = any(changed_ids);
  delete from public.tasks stored
  where not exists (select 1 from jsonb_array_elements(source_tasks) t where t->>'id' = stored.id);

  insert into public.kpi_task_storage_state(id, shared_revision, updated_at)
  values ('primary', p_revision, now()) on conflict (id) do update
    set shared_revision = excluded.shared_revision, updated_at = excluded.updated_at;
  perform set_config('kpi.task_mirror_write', coalesce(old_context, ''), true);
end;
$$;
revoke all on function public.kpi_mirror_task_records(jsonb, bigint, boolean) from public, anon, authenticated;
-- Not an API: only the trigger/migration owner may execute the mirror.
revoke all on function public.kpi_mirror_task_records(jsonb, bigint, boolean) from service_role;

create or replace function public.kpi_sync_task_records_on_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or old.state->'tasks' is distinct from new.state->'tasks' then
    perform public.kpi_mirror_task_records(new.state, new.revision);
  else
    update public.kpi_task_storage_state set shared_revision = new.revision, updated_at = now() where id = 'primary';
  end if;
  return new;
end;
$$;
revoke all on function public.kpi_sync_task_records_on_snapshot() from public, anon, authenticated, service_role;
drop trigger if exists kpi_sync_task_records on public.kpi_shared_state;
create trigger kpi_sync_task_records after insert or update on public.kpi_shared_state
for each row execute function public.kpi_sync_task_records_on_snapshot();

-- A delayed projection request from an older Edge must not overwrite a newer
-- committed row or delete its history. Ignoring that legacy mirror is safe:
-- its originating snapshot transaction has already performed the real write.
create or replace function public.kpi_guard_task_projection_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('kpi.task_mirror_write', true) is distinct from 'on' then return null; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.kpi_guard_task_projection_write() from public, anon, authenticated, service_role;
drop trigger if exists kpi_guard_task_projection on public.tasks;
create trigger kpi_guard_task_projection before insert or update or delete on public.tasks
for each row execute function public.kpi_guard_task_projection_write();
drop trigger if exists kpi_guard_task_report_projection on public.task_progress_reports;
create trigger kpi_guard_task_report_projection before insert or update or delete on public.task_progress_reports
for each row execute function public.kpi_guard_task_projection_write();

do $$
declare current_snapshot record;
begin
  select state, revision into current_snapshot from public.kpi_shared_state where id = 'primary';
  if found then perform public.kpi_mirror_task_records(current_snapshot.state, current_snapshot.revision, true); end if;
end;
$$;

create or replace function public.kpi_task_storage_health()
returns jsonb language sql stable security definer set search_path = '' as $$
  with source as (select revision, coalesce(state->'tasks', '[]'::jsonb) tasks from public.kpi_shared_state where id = 'primary'),
  expected_tasks as (select t->>'id' id, t data from source, jsonb_array_elements(source.tasks) t),
  expected_reports as (select r.* from source, lateral public.kpi_task_report_records(source.tasks) r),
  task_diff as (
    select 1 from expected_tasks e full join public.tasks t on t.id = e.id where e.data is distinct from t.data
  ), report_diff as (
    select 1 from expected_reports e full join public.task_progress_reports r on r.id = e.id
    where e.data is distinct from r.data or e.task_id is distinct from r.task_id
  ) select jsonb_build_object(
    'schemaVersion', 1, 'sourceMode', 'snapshot', 'revision', (select revision from source),
    'storedRevision', (select shared_revision from public.kpi_task_storage_state where id = 'primary'),
    'taskCount', (select count(*) from public.tasks), 'reportCount', (select count(*) from public.task_progress_reports),
    'taskMismatches', (select count(*) from task_diff), 'reportMismatches', (select count(*) from report_diff),
    'synchronized', coalesce((select revision from source) = (select shared_revision from public.kpi_task_storage_state where id = 'primary')
      and not exists(select 1 from task_diff) and not exists(select 1 from report_diff), false)
  );
$$;
revoke all on function public.kpi_task_storage_health() from public, anon, authenticated;
grant execute on function public.kpi_task_storage_health() to service_role;
commit;
