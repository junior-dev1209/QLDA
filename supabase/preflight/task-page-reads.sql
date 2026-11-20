-- Central operator only. Metadata/ACL readiness; never changes data or source mode.
begin read only;
do $$ begin
  if to_regprocedure('public.kpi_task_query_context(text,boolean)') is null
    or to_regprocedure('public.kpi_task_page_records(text[],bigint)') is null then
    raise exception 'Task page read migration is missing.';
  end if;
  if not exists(select 1 from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
    where s.id='primary' and m.schema_version=2 and m.shared_revision=s.revision) then
    raise exception 'Task storage marker is not synchronized.';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('kpi_task_query_context','kpi_task_page_records')
    and (not p.prosecdef or p.provolatile<>'s'
      or has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('authenticated',p.oid,'execute')
      or not has_function_privilege('service_role',p.oid,'execute'))) then
    raise exception 'Unexpected task read RPC privileges or volatility.';
  end if;
end $$;
select s.revision,m.shared_revision,m.source_mode,m.schema_version
from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
commit;
