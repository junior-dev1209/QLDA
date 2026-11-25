-- Metadata only: existing rows, versions and logical JSON are not rewritten.
-- New values use PostgreSQL's faster built-in TOAST compression when available.
begin;
set local lock_timeout='3s';
do $$ begin
  alter table public.kpi_shared_state alter column state set compression lz4;
  alter table public.tasks alter column data set compression lz4;
exception when feature_not_supported then
  raise notice 'LZ4 is unavailable; existing compression remains unchanged.';
end $$;
commit;
