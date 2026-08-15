-- Persist login throttling so the limit remains effective across concurrent
-- Edge Function instances. The attempt key is SHA-256 hashed by the Function.
create table if not exists public.kpi_login_rate_limits (
  attempt_key text primary key,
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

create index if not exists kpi_login_rate_limits_cleanup_idx
  on public.kpi_login_rate_limits (last_attempt_at asc);

alter table public.kpi_login_rate_limits enable row level security;
revoke all on table public.kpi_login_rate_limits from anon, authenticated;

create or replace function public.kpi_login_retry_after(p_attempt_key text)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    greatest(0, ceil(extract(epoch from (blocked_until - now())))::integer),
    0
  )
  from public.kpi_login_rate_limits
  where attempt_key = p_attempt_key;
$$;

create or replace function public.kpi_record_failed_login(
  p_attempt_key text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_block_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.kpi_login_rate_limits%rowtype;
  current_time timestamptz := now();
  next_count integer;
  next_window_start timestamptz;
  next_blocked_until timestamptz;
begin
  if p_attempt_key is null or length(p_attempt_key) < 32 then
    return 0;
  end if;

  insert into public.kpi_login_rate_limits (attempt_key, failed_count, window_started_at, last_attempt_at)
  values (p_attempt_key, 0, current_time, current_time)
  on conflict (attempt_key) do nothing;

  select * into current_row
  from public.kpi_login_rate_limits
  where attempt_key = p_attempt_key
  for update;

  if not found then
    return 0;
  end if;

  if current_row.blocked_until is not null and current_row.blocked_until > current_time then
    update public.kpi_login_rate_limits
    set last_attempt_at = current_time
    where attempt_key = p_attempt_key;
    return greatest(1, ceil(extract(epoch from (current_row.blocked_until - current_time)))::integer);
  end if;

  if current_row.window_started_at < current_time - make_interval(secs => greatest(1, p_window_seconds)) then
    next_count := 1;
    next_window_start := current_time;
  else
    next_count := current_row.failed_count + 1;
    next_window_start := current_row.window_started_at;
  end if;

  next_blocked_until := case
    when next_count >= greatest(1, p_max_attempts)
      then current_time + make_interval(secs => greatest(1, p_block_seconds))
    else null
  end;

  update public.kpi_login_rate_limits
  set failed_count = next_count,
      window_started_at = next_window_start,
      blocked_until = next_blocked_until,
      last_attempt_at = current_time
  where attempt_key = p_attempt_key;

  return coalesce(greatest(0, ceil(extract(epoch from (next_blocked_until - current_time)))::integer), 0);
end;
$$;

create or replace function public.kpi_clear_failed_login(p_attempt_key text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.kpi_login_rate_limits where attempt_key = p_attempt_key;
$$;

revoke all on function public.kpi_login_retry_after(text) from public, anon, authenticated;
revoke all on function public.kpi_record_failed_login(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.kpi_clear_failed_login(text) from public, anon, authenticated;
grant execute on function public.kpi_login_retry_after(text) to service_role;
grant execute on function public.kpi_record_failed_login(text, integer, integer, integer) to service_role;
grant execute on function public.kpi_clear_failed_login(text) to service_role;
