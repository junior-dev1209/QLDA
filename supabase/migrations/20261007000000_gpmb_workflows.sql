-- Server-controlled GPMB workflows. The JSON snapshot remains compatible
-- during migration, while the Edge Function mirrors each authorised workflow
-- command here for independent querying and recovery.

create table if not exists public.gpmb_workflows (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gpmb_workflows_updated_at_idx
  on public.gpmb_workflows (updated_at desc);

alter table public.gpmb_workflows enable row level security;
revoke all on table public.gpmb_workflows from anon, authenticated;

-- Backfill every workflow already present in the protected shared snapshot.
with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.gpmb_workflows (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'gpmbWorkflows', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version, data = excluded.data, updated_at = excluded.updated_at;
