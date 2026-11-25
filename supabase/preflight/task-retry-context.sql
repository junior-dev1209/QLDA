-- Read-only gate; does not activate a source mode or change business rows.
begin read only;
do $$ begin
  if to_regprocedure('public.kpi_task_retry_context(text,bigint,text)') is null
    or to_regclass('public.tasks_changed_revision_idx') is null then raise exception 'Task retry protocol is missing.'; end if;
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean,false) then
    raise exception 'Task/history storage must be synchronized.'; end if;
  if exists(select 1 from pg_index i where i.indexrelid='public.tasks_changed_revision_idx'::regclass and (not i.indisvalid or not i.indisready)) then
    raise exception 'Changed-revision index must be valid and ready.'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    and p.proname in ('kpi_task_retry_context','kpi_task_write_context')
    and (not p.prosecdef or p.provolatile<>'s' or has_function_privilege('anon',p.oid,'execute')
      or has_function_privilege('authenticated',p.oid,'execute') or not has_function_privilege('service_role',p.oid,'execute'))) then
    raise exception 'Unexpected task retry read privileges.'; end if;
end $$;
select s.revision,m.shared_revision,m.source_mode,m.schema_version
from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
commit;
