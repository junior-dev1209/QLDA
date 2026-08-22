-- Clear temporary blocks recorded under the former strict five-attempt rule.
-- The Edge Function now applies a lighter server-side limit and lets a valid
-- password clear any previous failed-attempt record immediately.
update public.kpi_login_rate_limits
set failed_count = 0,
    window_started_at = now(),
    blocked_until = null,
    last_attempt_at = now()
where failed_count > 0
   or blocked_until is not null;
