-- Hồ sơ GPMB theo hộ/thửa đất. Bản ghi chi tiết vẫn do Edge Function kiểm
-- soát để áp dụng cùng quyền điều hành quy trình GPMB và tránh truy cập trực
-- tiếp từ các tài khoản trình duyệt.

create table if not exists public.gpmb_cases (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gpmb_cases_updated_at_idx
  on public.gpmb_cases (updated_at desc);

create index if not exists gpmb_cases_workflow_id_idx
  on public.gpmb_cases ((data->>'workflowId'));

create index if not exists gpmb_cases_status_idx
  on public.gpmb_cases ((data->>'status'));

alter table public.gpmb_cases enable row level security;
revoke all on table public.gpmb_cases from anon, authenticated;

-- Backfill the cases if the central JSON snapshot already contains them.
with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.gpmb_cases (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'gpmbCases', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version, data = excluded.data, updated_at = excluded.updated_at;
