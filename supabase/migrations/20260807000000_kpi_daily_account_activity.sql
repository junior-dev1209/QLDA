-- Track one activity record per account and Vietnam calendar day. This keeps
-- the daily monitoring count correct when a browser restores an existing session.
create table if not exists public.kpi_account_daily_activity (
  account_id text not null,
  activity_date date not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (account_id, activity_date)
);

create index if not exists kpi_account_daily_activity_date_idx
  on public.kpi_account_daily_activity (activity_date desc, account_id);

alter table public.kpi_account_daily_activity enable row level security;

revoke all on table public.kpi_account_daily_activity from anon, authenticated;

create or replace function public.kpi_record_account_daily_activity(
  p_account_id text,
  p_activity_date date,
  p_seen_at timestamptz
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.kpi_account_daily_activity (account_id, activity_date, first_seen_at, last_seen_at)
  values (p_account_id, p_activity_date, p_seen_at, p_seen_at)
  on conflict (account_id, activity_date) do update
    set last_seen_at = excluded.last_seen_at
    where kpi_account_daily_activity.last_seen_at < excluded.last_seen_at - interval '15 minutes';
$$;

revoke all on function public.kpi_record_account_daily_activity(text, date, timestamptz) from public;
revoke all on function public.kpi_record_account_daily_activity(text, date, timestamptz) from anon, authenticated;
grant execute on function public.kpi_record_account_daily_activity(text, date, timestamptz) to service_role;

-- Keep raw credential-entry counts, but use daily activity for unique accounts
-- that actually used a valid session on a Vietnam calendar day.
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
  with login_activity as (
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
      to_char(event.logged_in_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')
  ),
  daily_activity as (
    select
      activity.account_id,
      to_char(activity.activity_date, 'YYYY-MM') as period,
      bool_or(activity.activity_date >= (day_start_at at time zone 'Asia/Ho_Chi_Minh')::date) as active_today,
      bool_or(activity.activity_date >= (week_start_at at time zone 'Asia/Ho_Chi_Minh')::date) as active_week,
      bool_or(activity.activity_date >= (month_start_at at time zone 'Asia/Ho_Chi_Minh')::date) as active_month,
      max(activity.last_seen_at) as last_seen_at
    from public.kpi_account_daily_activity as activity
    where activity.activity_date >= (history_start_at at time zone 'Asia/Ho_Chi_Minh')::date
    group by
      activity.account_id,
      to_char(activity.activity_date, 'YYYY-MM')
  )
  select
    coalesce(login.account_id, activity.account_id) as account_id,
    coalesce(login.period, activity.period) as period,
    coalesce(login.login_count, 0)::bigint as login_count,
    coalesce(login.active_today, false) or coalesce(activity.active_today, false) as active_today,
    coalesce(login.active_week, false) or coalesce(activity.active_week, false) as active_week,
    coalesce(login.active_month, false) or coalesce(activity.active_month, false) as active_month,
    case
      when login.last_login_at is null then activity.last_seen_at
      when activity.last_seen_at is null then login.last_login_at
      else greatest(login.last_login_at, activity.last_seen_at)
    end as last_login_at
  from login_activity as login
  full outer join daily_activity as activity
    on activity.account_id = login.account_id
   and activity.period = login.period;
$$;

revoke all on function public.kpi_login_activity_summary(timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.kpi_login_activity_summary(timestamptz, timestamptz, timestamptz, timestamptz) from anon, authenticated;
grant execute on function public.kpi_login_activity_summary(timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
