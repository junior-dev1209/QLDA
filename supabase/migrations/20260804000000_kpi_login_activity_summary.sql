-- Aggregate login activity inside Postgres so the monitoring screen never has to
-- load and scan every raw login event in the Edge Function.
create or replace function public.kpi_login_activity_summary(
  history_start_at timestamptz,
  day_start_at timestamptz,
  week_start_at timestamptz,
  month_start_at timestamptz
)
returns table (
  account_id text,
  period text,
  login_count bigint,
  active_today boolean,
  active_week boolean,
  active_month boolean,
  last_login_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    event.account_id,
    to_char(event.logged_in_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM') as period,
    count(*)::bigint as login_count,
    bool_or(event.logged_in_at >= day_start_at) as active_today,
    bool_or(event.logged_in_at >= week_start_at) as active_week,
    bool_or(event.logged_in_at >= month_start_at) as active_month,
    max(event.logged_in_at) as last_login_at
  from public.kpi_account_login_events as event
  where event.logged_in_at >= history_start_at
  group by
    event.account_id,
    to_char(event.logged_in_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM');
$$;

revoke all on function public.kpi_login_activity_summary(timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.kpi_login_activity_summary(timestamptz, timestamptz, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.kpi_login_activity_summary(timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
