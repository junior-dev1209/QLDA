-- Central operator: read-only. No repair, activation or business data changes.
begin read only;
do $$ declare proc regprocedure := to_regprocedure('public.kpi_task_write_context(text)');
begin
  if proc is null or to_regprocedure('public.kpi_commit_task_delta_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[])') is null
    or to_regprocedure('public.kpi_task_page_records(text[],bigint)') is null then raise exception 'Write-context prerequisites are missing.'; end if;
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean,false) then raise exception 'Task/history storage must be synchronized.'; end if;
  if exists(select 1 from pg_proc p where p.oid=proc and (not p.prosecdef or p.provolatile<>'s'
    or has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute')
    or not has_function_privilege('service_role',p.oid,'execute'))) then raise exception 'Unexpected write-context privileges.'; end if;
end $$;
select s.revision,m.shared_revision,m.source_mode,m.schema_version
from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
commit;
