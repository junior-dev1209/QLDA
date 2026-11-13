-- Hồ sơ phân hệ Thẩm định dự án đầu tư công - Giai đoạn 1.
-- Edge Function là cổng duy nhất đọc/ghi để bảo đảm phân quyền theo phòng,
-- người được phân công và vai trò phê duyệt.

create table if not exists public.public_investment_appraisals (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_investment_appraisals_updated_at_idx
  on public.public_investment_appraisals (updated_at desc);

create unique index if not exists public_investment_appraisals_code_idx
  on public.public_investment_appraisals (lower(data->>'code'));

create index if not exists public_investment_appraisals_project_id_idx
  on public.public_investment_appraisals ((data->>'projectId'));

create index if not exists public_investment_appraisals_department_id_idx
  on public.public_investment_appraisals ((data->>'departmentId'));

create index if not exists public_investment_appraisals_status_idx
  on public.public_investment_appraisals ((data->>'status'));

alter table public.public_investment_appraisals enable row level security;
revoke all on table public.public_investment_appraisals from anon, authenticated;

-- Backfill khi trạng thái trung tâm đã có dữ liệu do chạy thử offline trước.
with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.public_investment_appraisals (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'publicInvestmentAppraisals', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version, data = excluded.data, updated_at = excluded.updated_at;
