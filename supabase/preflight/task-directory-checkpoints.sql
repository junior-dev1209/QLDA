-- Read-only; never enables a source mode or rewrites Task data.
do $$ declare signature text := 'public.kpi_task_checkpoint_context(text,bigint,text,bigint)';
begin
  if to_regprocedure(signature) is null then raise exception 'Missing directory checkpoint RPC.'; end if;
  if has_function_privilege('anon',signature,'execute') or has_function_privilege('authenticated',signature,'execute')
    or not has_function_privilege('service_role',signature,'execute') then raise exception 'Incorrect directory checkpoint grants.'; end if;
  if not public.kpi_task_directory_ready() then
    raise exception 'Directory validation triggers are incomplete.'; end if;
  if not exists(select 1 from public.kpi_task_storage_state m join public.kpi_shared_state s using(id)
    where m.id='primary' and m.schema_version=2 and m.shared_revision=s.revision and m.directory_epoch>=0) then
    raise exception 'Task directory storage is not synchronized.'; end if;
end $$;
