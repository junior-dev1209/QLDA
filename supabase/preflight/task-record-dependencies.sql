-- Read-only deployment check. This never switches the task source mode.
do $$ declare signature text := 'public.kpi_commit_independent_task_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],text,jsonb,jsonb,text,jsonb,jsonb,jsonb,jsonb)';
begin
  if to_regprocedure(signature) is null then raise exception 'Missing independent task command RPC.'; end if;
  if has_function_privilege('anon',signature,'execute') or has_function_privilege('authenticated',signature,'execute')
    or not has_function_privilege('service_role',signature,'execute') then raise exception 'Incorrect independent task RPC grants.'; end if;
  if not exists(select 1 from public.kpi_task_storage_state m join public.kpi_shared_state s using(id)
    where m.id='primary' and m.schema_version=2 and m.shared_revision=s.revision and m.source_mode in ('snapshot','record-primary')) then
    raise exception 'Task storage marker is not synchronized.'; end if;
end $$;
