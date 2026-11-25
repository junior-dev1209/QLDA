begin read only;
do $$ declare f regprocedure := to_regprocedure('public.kpi_commit_task_dependency_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],text,jsonb,jsonb,text,jsonb,jsonb)');
begin
  if f is null then raise exception 'Task dependency protocol is missing.'; end if;
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean,false) then raise exception 'Task/history storage must be synchronized.'; end if;
  if has_function_privilege('anon',f,'execute') or has_function_privilege('authenticated',f,'execute')
    or not has_function_privilege('service_role',f,'execute') then raise exception 'Invalid task dependency privileges.'; end if;
  if not exists(select 1 from pg_proc p where p.oid=f and p.prosecdef and p.provolatile='v') then
    raise exception 'Task dependency transaction must remain a private volatile definer.'; end if;
end $$;
select s.revision,m.shared_revision,m.source_mode from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
commit;
