-- Aggregate valid sign-ins by Vietnam calendar day. The monitoring screen uses
-- this summary for visit counts without downloading raw login events.
create or replace function public.kpi_login_daily_visit_summary(
  history_start_at timestamptz
)
returns table (
  account_id text,
  visit_date date,
  visit_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    event.account_id,
    (event.logged_in_at at time zone 'Asia/Ho_Chi_Minh')::date as visit_date,
    count(*)::bigint as visit_count
  from public.kpi_account_login_events as event
  where event.logged_in_at >= history_start_at
  group by
    event.account_id,
    (event.logged_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

revoke all on function public.kpi_login_daily_visit_summary(timestamptz) from public;
revoke all on function public.kpi_login_daily_visit_summary(timestamptz) from anon, authenticated;
grant execute on function public.kpi_login_daily_visit_summary(timestamptz) to service_role;
