-- Server-owned notification projection.  The Edge Function remains the only
-- writer; direct client access is disabled through RLS and revoked grants.
create table if not exists public.notifications (
  id text primary key,
  version bigint not null default 1,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_updated_at_idx on public.notifications (updated_at desc);
create index if not exists notifications_recipient_idx on public.notifications ((data->>'recipientAccountId'));

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;

-- Bring an existing protected snapshot forward without treating an empty or
-- older snapshot as an error.  The next authorised Edge Function command
-- maintains this table incrementally.
with source as (
  select revision, updated_at, state
  from public.kpi_shared_state
  where id = 'primary'
)
insert into public.notifications (id, version, data, created_at, updated_at)
select item.value->>'id', source.revision, item.value, source.updated_at, source.updated_at
from source
cross join lateral jsonb_array_elements(coalesce(source.state->'notifications', '[]'::jsonb)) as item(value)
where coalesce(item.value->>'id', '') <> ''
on conflict (id) do update
set version = excluded.version, data = excluded.data, updated_at = excluded.updated_at;
