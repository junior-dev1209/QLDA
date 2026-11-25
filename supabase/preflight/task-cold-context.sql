-- Read-only: no source activation, business writes or backfill.
do $$ declare signature text := 'public.kpi_task_cold_context(text)';
begin
  if to_regprocedure(signature) is null then raise exception 'Missing Task cold context RPC.'; end if;
  if has_function_privilege('anon',signature,'execute') or has_function_privilege('authenticated',signature,'execute')
    or not has_function_privilege('service_role',signature,'execute') then raise exception 'Incorrect cold context grants.'; end if;
  if not exists(select 1 from public.kpi_task_storage_state m join public.kpi_shared_state s using(id)
    where m.id='primary' and m.schema_version=2 and m.shared_revision=s.revision and m.source_mode in ('snapshot','record-primary')) then
    raise exception 'Task cold storage is not synchronized.'; end if;
end $$;
