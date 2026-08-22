-- Count all accounts that actually use the system during a Vietnam calendar day.
-- Credential sign-ins retain every event; a restored valid session with no new
-- password entry contributes one visit for that account/day.
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
  with login_visits as (
    select
      event.account_id,
      (event.logged_in_at at time zone 'Asia/Ho_Chi_Minh')::date as visit_date,
      count(*)::bigint as visit_count
    from public.kpi_account_login_events as event
    where event.logged_in_at >= history_start_at
    group by
      event.account_id,
      (event.logged_in_at at time zone 'Asia/Ho_Chi_Minh')::date
  ),
  session_activity as (
    select
      activity.account_id,
      activity.activity_date as visit_date
    from public.kpi_account_daily_activity as activity
    where activity.activity_date >= (history_start_at at time zone 'Asia/Ho_Chi_Minh')::date
  )
  select
    coalesce(login.account_id, activity.account_id) as account_id,
    coalesce(login.visit_date, activity.visit_date) as visit_date,
    (
      coalesce(login.visit_count, 0)
      + case when login.account_id is null and activity.account_id is not null then 1 else 0 end
    )::bigint as visit_count
  from login_visits as login
  full outer join session_activity as activity
    on activity.account_id = login.account_id
   and activity.visit_date = login.visit_date;
$$;

revoke all on function public.kpi_login_daily_visit_summary(timestamptz) from public;
revoke all on function public.kpi_login_daily_visit_summary(timestamptz) from anon, authenticated;
grant execute on function public.kpi_login_daily_visit_summary(timestamptz) to service_role;
