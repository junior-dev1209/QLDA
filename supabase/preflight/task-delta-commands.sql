-- Read-only central gate. Does not activate record-primary or repair data.
begin read only;
do $$ declare proc regprocedure := to_regprocedure('public.kpi_commit_task_delta_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[])');
begin
  if proc is null then raise exception 'Task delta command migration is missing.'; end if;
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean,false) then
    raise exception 'Task/history storage must be synchronized.';
  end if;
  if exists(select 1 from pg_proc p where p.oid=proc and (not p.prosecdef
    or has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute')
    or not has_function_privilege('service_role',p.oid,'execute'))) then
    raise exception 'Unexpected delta command privileges.';
  end if;
end $$;
select s.revision,m.shared_revision,m.source_mode,m.schema_version
from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
commit;
