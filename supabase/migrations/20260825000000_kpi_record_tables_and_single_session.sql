-- QTNS v3.0.57 SAFE - replay-safe record projection migration
-- Version: 2026.08.25.3
--
-- IMPORTANT:
-- This migration intentionally DOES NOT reuse public.people/public.tasks/
-- public.activity_log/... because older production databases may already have
-- tables with those names and a different schema.
--
-- The protected JSON snapshot in public.kpi_shared_state remains the source of
-- truth during this staged migration. Dedicated kpi_record_* tables are mirrors.

-- ---------------------------------------------------------------------------
-- 1. Single-device application session
-- ---------------------------------------------------------------------------

delete from public.kpi_sync_sessions as older
using public.kpi_sync_sessions as newer
where older.account_id = newer.account_id
  and (
    older.last_seen_at,
    older.created_at,
    older.token_hash
  ) < (
    newer.last_seen_at,
    newer.created_at,
    newer.token_hash
  );

create unique index if not exists kpi_sync_sessions_one_active_account_idx
  on public.kpi_sync_sessions (account_id);

create or replace function public.kpi_replace_sync_session(
  p_account_id text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_seen_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(trim(p_account_id), '') = '' or coalesce(trim(p_token_hash), '') = '' then
    raise exception 'A valid account and session token are required.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_account_id)::bigint);

  delete from public.kpi_sync_sessions
  where account_id = p_account_id
     or expires_at <= now();

  insert into public.kpi_sync_sessions (
    token_hash,
    account_id,
    expires_at,
    created_at,
    last_seen_at
  ) values (
    p_token_hash,
    p_account_id,
    p_expires_at,
    now(),
    coalesce(p_seen_at, now())
  );
end;
$$;

revoke all on function public.kpi_replace_sync_session(text, text, timestamptz, timestamptz)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Dedicated record-projection tables
-- ---------------------------------------------------------------------------

create table if not exists public.kpi_record_people (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_record_tasks (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_record_task_progress_reports (
  id text primary key,
  task_id text not null,
  version bigint not null default 1,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_record_evaluations (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_record_catalog (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_record_activity_log (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_record_projection_state (
  id text primary key default 'primary' check (id = 'primary'),
  shared_revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Replay-safe repair in case a previous partial run created projection_state
-- with an older schema.
alter table public.kpi_record_projection_state
  add column if not exists shared_revision bigint not null default 0;
alter table public.kpi_record_projection_state
  add column if not exists updated_at timestamptz not null default now();

create index if not exists kpi_record_task_progress_reports_task_id_idx
  on public.kpi_record_task_progress_reports (task_id);
create index if not exists kpi_record_tasks_updated_at_idx
  on public.kpi_record_tasks (updated_at desc);
create index if not exists kpi_record_evaluations_updated_at_idx
  on public.kpi_record_evaluations (updated_at desc);
create index if not exists kpi_record_activity_log_updated_at_idx
  on public.kpi_record_activity_log (updated_at desc);

alter table public.kpi_record_people enable row level security;
alter table public.kpi_record_tasks enable row level security;
alter table public.kpi_record_task_progress_reports enable row level security;
alter table public.kpi_record_evaluations enable row level security;
alter table public.kpi_record_catalog enable row level security;
alter table public.kpi_record_activity_log enable row level security;
alter table public.kpi_record_projection_state enable row level security;

revoke all on table
  public.kpi_record_people,
  public.kpi_record_tasks,
  public.kpi_record_task_progress_reports,
  public.kpi_record_evaluations,
  public.kpi_record_catalog,
  public.kpi_record_activity_log,
  public.kpi_record_projection_state
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Backfill from kpi_shared_state.
-- Safe to replay: every INSERT uses ON CONFLICT.
-- ---------------------------------------------------------------------------

with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.kpi_record_people (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'people', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version,
    data = excluded.data,
    updated_at = excluded.updated_at;

with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.kpi_record_tasks (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'tasks', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version,
    data = excluded.data,
    updated_at = excluded.updated_at;

with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
), reports as (
  select
    task.value->>'id' as task_id,
    report,
    source.revision,
    source.updated_at,
    report_index
  from source
  cross join lateral jsonb_array_elements(coalesce(source.state->'tasks', '[]'::jsonb)) as task(value)
  cross join lateral jsonb_array_elements(coalesce(task.value->'progressReports', '[]'::jsonb))
    with ordinality as progress(report, report_index)
  where coalesce(task.value->>'id', '') <> ''
)
insert into public.kpi_record_task_progress_reports
  (id, task_id, version, data, created_at, updated_at)
select
  coalesce(nullif(report->>'id', ''), task_id || ':report:' || report_index::text),
  task_id,
  revision,
  report,
  updated_at,
  updated_at
from reports
on conflict (id) do update
set task_id = excluded.task_id,
    version = excluded.version,
    data = excluded.data,
    updated_at = excluded.updated_at;

with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
), all_evaluations as (
  select 'personal:' || (item.value->>'id') as id,
         item.value as item,
         source.revision,
         source.updated_at
  from source
  cross join lateral jsonb_array_elements(coalesce(source.state->'evaluations', '[]'::jsonb)) as item(value)
  where coalesce(item.value->>'id', '') <> ''

  union all

  select 'department:' || (item.value->>'id') as id,
         item.value as item,
         source.revision,
         source.updated_at
  from source
  cross join lateral jsonb_array_elements(coalesce(source.state->'departmentEvaluations', '[]'::jsonb)) as item(value)
  where coalesce(item.value->>'id', '') <> ''
)
insert into public.kpi_record_evaluations (id, version, data, created_at, updated_at)
select id, revision, item, updated_at, updated_at
from all_evaluations
on conflict (id) do update
set version = excluded.version,
    data = excluded.data,
    updated_at = excluded.updated_at;

with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
), catalog as (
  select 'catalog:departments'::text as id,
         source.state->'departments' as data,
         source.revision,
         source.updated_at
  from source

  union all
  select 'catalog:roles',
         source.state->'roles',
         source.revision,
         source.updated_at
  from source

  union all
  select 'catalog:behavior-rules',
         source.state->'behaviorRules',
         source.revision,
         source.updated_at
  from source

  union all
  select 'catalog:module-settings',
         source.state->'moduleSettings',
         source.revision,
         source.updated_at
  from source

  union all
  select 'catalog:system-customization',
         source.state->'systemCustomization',
         source.revision,
         source.updated_at
  from source

  union all
  select 'project:' || (item.value->>'id'),
         item.value,
         source.revision,
         source.updated_at
  from source
  cross join lateral jsonb_array_elements(coalesce(source.state->'projectCatalog', '[]'::jsonb)) as item(value)
  where coalesce(item.value->>'id', '') <> ''
)
insert into public.kpi_record_catalog (id, version, data, created_at, updated_at)
select id, revision, coalesce(data, 'null'::jsonb), updated_at, updated_at
from catalog
on conflict (id) do update
set version = excluded.version,
    data = excluded.data,
    updated_at = excluded.updated_at;

with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.kpi_record_activity_log (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'activityLog', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version,
    data = excluded.data,
    updated_at = excluded.updated_at;

insert into public.kpi_record_projection_state (id, shared_revision, updated_at)
select id, revision, updated_at
from public.kpi_shared_state
where id = 'primary'
on conflict (id) do update
set shared_revision = excluded.shared_revision,
    updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------------
-- 4. Optional sanity output (visible in SQL Editor)
-- ---------------------------------------------------------------------------

select
  (select count(*) from public.kpi_record_people) as projected_people,
  (select count(*) from public.kpi_record_tasks) as projected_tasks,
  (select count(*) from public.kpi_record_task_progress_reports) as projected_progress_reports,
  (select count(*) from public.kpi_record_evaluations) as projected_evaluations,
  (select count(*) from public.kpi_record_catalog) as projected_catalog_rows,
  (select count(*) from public.kpi_record_activity_log) as projected_activity_rows;
