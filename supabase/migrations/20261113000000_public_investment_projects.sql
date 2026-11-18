-- Hồ sơ số quản lý thực hiện dự án đầu tư công.
-- Mọi quyền đọc/ghi được kiểm tra tại Edge Function kpi-sync; ứng dụng khách
-- không được truy cập trực tiếp bảng projection này.

create table if not exists public.public_investment_projects (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_investment_projects_updated_at_idx
  on public.public_investment_projects (updated_at desc);

create unique index if not exists public_investment_projects_code_idx
  on public.public_investment_projects (lower(data->>'code'));

create unique index if not exists public_investment_projects_project_id_idx
  on public.public_investment_projects ((data->>'projectId'));

create index if not exists public_investment_projects_department_id_idx
  on public.public_investment_projects ((data->>'departmentId'));

create index if not exists public_investment_projects_status_idx
  on public.public_investment_projects ((data->>'status'));

create index if not exists public_investment_projects_phase_idx
  on public.public_investment_projects ((data->>'phase'));

alter table public.public_investment_projects enable row level security;
revoke all on table public.public_investment_projects from anon, authenticated;

-- Backfill an toàn khi hồ sơ đã được dùng thử offline trước lúc migration chạy.
with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.public_investment_projects (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'publicInvestmentProjects', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version, data = excluded.data, updated_at = excluded.updated_at;
