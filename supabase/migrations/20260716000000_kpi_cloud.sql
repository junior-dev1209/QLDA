create table if not exists public.kpi_shared_state (
  id text primary key default 'primary' check (id = 'primary'),
  revision bigint not null default 0,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_sync_sessions (
  token_hash text primary key,
  account_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists kpi_sync_sessions_expires_at_idx on public.kpi_sync_sessions (expires_at);
create index if not exists kpi_sync_sessions_account_id_idx on public.kpi_sync_sessions (account_id);

alter table public.kpi_shared_state enable row level security;
alter table public.kpi_sync_sessions enable row level security;

revoke all on table public.kpi_shared_state from anon, authenticated;
revoke all on table public.kpi_sync_sessions from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('kpi-files', 'kpi-files', false)
on conflict (id) do update set public = false;

create or replace function public.kpi_update_shared_state(expected_revision bigint, next_state jsonb)
returns table(next_revision bigint, next_updated_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.kpi_shared_state
  set state = next_state,
      revision = revision + 1,
      updated_at = now()
  where id = 'primary'
    and revision = expected_revision;

  if found then
    return query
    select revision, updated_at
    from public.kpi_shared_state
    where id = 'primary';
    return;
  end if;

  if expected_revision = 0 and not exists (select 1 from public.kpi_shared_state where id = 'primary') then
    insert into public.kpi_shared_state (id, revision, state, updated_at)
    values ('primary', 1, next_state, now());

    return query
    select revision, updated_at
    from public.kpi_shared_state
    where id = 'primary';
  end if;
end;
$$;

revoke all on function public.kpi_update_shared_state(bigint, jsonb) from public, anon, authenticated;
