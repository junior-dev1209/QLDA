-- Restore the normal account/password sign-in flow. These database objects
-- belonged only to the removed automatic login lockout mechanism.
drop function if exists public.kpi_login_retry_after(text);
drop function if exists public.kpi_record_failed_login(text, integer, integer, integer);
drop function if exists public.kpi_clear_failed_login(text);
drop table if exists public.kpi_login_rate_limits;
