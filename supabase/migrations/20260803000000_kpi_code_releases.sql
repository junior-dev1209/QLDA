create table if not exists public.kpi_app_releases (
  id uuid primary key,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text not null,
  published_at timestamptz,
  published_by text
);

create index if not exists kpi_app_releases_created_at_idx
  on public.kpi_app_releases (created_at desc);

create unique index if not exists kpi_app_releases_single_active_idx
  on public.kpi_app_releases (status)
  where status = 'active';

alter table public.kpi_app_releases enable row level security;
revoke all on table public.kpi_app_releases from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('kpi-releases', 'kpi-releases', false)
on conflict (id) do update set public = false;

create or replace function public.kpi_activate_app_release(target_release uuid, actor_account_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.kpi_app_releases
    where id = target_release
      and status in ('draft', 'active', 'archived')
  ) then
    raise exception 'Release not found';
  end if;

  update public.kpi_app_releases
  set status = 'archived'
  where status = 'active'
    and id <> target_release;

  update public.kpi_app_releases
  set status = 'active',
      published_at = now(),
      published_by = actor_account_id
  where id = target_release;
end;
$$;

revoke all on function public.kpi_activate_app_release(uuid, text) from public, anon, authenticated;
