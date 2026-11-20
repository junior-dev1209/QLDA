-- Central operator, after the additive migration. Read-only; no source switch or repair.
begin read only;
do $$ begin
  if to_regprocedure('public.kpi_task_filtered_query_context(text,text,text,boolean,boolean)') is null
    or to_regclass('public.tasks_query_period_position_idx') is null
    or to_regclass('public.tasks_query_due_position_idx') is null then
    raise exception 'Filtered task read functions/indexes are missing.';
  end if;
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean,false) then
    raise exception 'Task/history storage must be synchronized before filtered reads are promoted.';
  end if;
  if exists(select 1 from pg_index i where i.indexrelid in (
    'public.tasks_query_period_position_idx'::regclass,'public.tasks_query_due_position_idx'::regclass)
    and (not i.indisvalid or not i.indisready)) then
    raise exception 'Filtered task read indexes must be valid and ready.';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='kpi_task_filtered_query_context'
    and (not p.prosecdef or p.provolatile<>'s' or has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('authenticated',p.oid,'execute') or not has_function_privilege('service_role',p.oid,'execute'))) then
    raise exception 'Unexpected filtered task read privileges.';
  end if;
end $$;
select s.revision,m.shared_revision,m.source_mode,m.schema_version
from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
commit;
