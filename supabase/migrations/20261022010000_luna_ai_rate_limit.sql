create table if not exists public.kpi_luna_ai_request_limits (
  account_id text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.kpi_luna_ai_request_limits enable row level security;
revoke all on table public.kpi_luna_ai_request_limits from public, anon, authenticated;
grant all on table public.kpi_luna_ai_request_limits to service_role;

create or replace function public.kpi_luna_ai_allow_request(
  p_account_id text,
  p_max_requests integer default 12,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean;
  max_requests integer := greatest(1, least(coalesce(p_max_requests, 12), 100));
  window_seconds integer := greatest(1, least(coalesce(p_window_seconds, 60), 3600));
begin
  if p_account_id is null or length(trim(p_account_id)) = 0 or length(p_account_id) > 200 then
    return false;
  end if;

  insert into public.kpi_luna_ai_request_limits as existing_limit
    (account_id, window_started_at, request_count)
  values (p_account_id, now(), 1)
  on conflict (account_id) do update
    set window_started_at = case
          when existing_limit.window_started_at <= now() - make_interval(secs => window_seconds) then now()
          else existing_limit.window_started_at
        end,
        request_count = case
          when existing_limit.window_started_at <= now() - make_interval(secs => window_seconds) then 1
          else least(existing_limit.request_count + 1, max_requests + 1)
        end
  returning existing_limit.request_count <= max_requests into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.kpi_luna_ai_allow_request(text, integer, integer) from public, anon, authenticated;
grant execute on function public.kpi_luna_ai_allow_request(text, integer, integer) to service_role;
