-- Read the non-Task envelope once before accessing its fields. Repeated field
-- extraction from the large toasted snapshot decompresses the entire document.
begin;
create or replace function public.kpi_task_query_context(p_task_id text default null, p_search boolean default false)
returns table(revision bigint, updated_at timestamptz, source_mode text, context jsonb, task_index jsonb, task jsonb, task_version bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_revision bigint; v_updated_at timestamptz; v_mode text; v_context jsonb;
begin
  select s.revision,s.updated_at,m.source_mode,s.state-'tasks'
    into v_revision,v_updated_at,v_mode,v_context
    from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
    where s.id='primary' and m.schema_version=2 and m.shared_revision=s.revision;
  if not found then
    raise exception 'Task read storage is not synchronized.' using errcode='KPT01';
  end if;
  return query select v_revision,v_updated_at,v_mode,
    jsonb_build_object('accounts',v_context->'accounts','people',v_context->'people',
      'departments',v_context->'departments','roles',v_context->'roles',
      'moduleSettings',v_context->'moduleSettings','projectCatalog',v_context->'projectCatalog'),
    case when p_task_id is null then (select coalesce(jsonb_agg(
      (t.data - array['progressReports','attachments','customFields','note','blockerNote','deadlineExtensionReason'])
      || case when p_search then jsonb_build_object('note',t.data->'note',
        'queryReports',coalesce((select string_agg(coalesce(r.value->>'note',''),' ' order by r.ordinality)
          from jsonb_array_elements(case when jsonb_typeof(t.data->'progressReports')='array'
            then t.data->'progressReports' else '[]'::jsonb end) with ordinality r(value,ordinality)),''),
        'queryFiles',coalesce((select string_agg(coalesce(f.value->>'name',''),' ' order by f.ordinality)
          from jsonb_array_elements(case when jsonb_typeof(t.data->'attachments')='array'
            then t.data->'attachments' else '[]'::jsonb end) with ordinality f(value,ordinality)),''))
      else '{}'::jsonb end order by t.position_index,t.id),'[]'::jsonb) from public.tasks t)
    else null end,
    case when p_task_id is not null then (select t.data from public.tasks t where t.id=p_task_id) else null end,
    case when p_task_id is not null then (select t.row_version from public.tasks t where t.id=p_task_id) else null end;
end $$;
revoke all on function public.kpi_task_query_context(text,boolean) from public,anon,authenticated;
grant execute on function public.kpi_task_query_context(text,boolean) to service_role;

-- Preserve the exact health contract, but share one canonical export across
-- history comparison, snapshot comparison and checksum calculation.
create or replace function public.kpi_task_storage_health()
returns jsonb language sql stable security definer set search_path = '' as $$
  with exported as materialized (select public.kpi_task_record_export() as tasks),
  source as (select s.*,m.source_mode,m.shared_revision from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary'),
  expected_reports as(select r.* from exported e cross join lateral public.kpi_task_report_records(e.tasks) r),
  report_diff as(select 1 from expected_reports e full join public.task_progress_reports r on e.id=r.id
    where e.data is distinct from r.data or e.task_id is distinct from r.task_id),
  task_diff as(select 1 from public.tasks t where t.id is distinct from t.data->>'id' or t.row_version<1 or t.position_index<1
    or exists(select 1 from public.tasks x where x.position_index=t.position_index and x.id<>t.id)),
  checks as(select *,
    case when source_mode='snapshot' then state->'tasks' is not distinct from (select tasks from exported)
      else not(state ? 'tasks') end as source_valid from source)
  select jsonb_build_object('schemaVersion',2,'sourceMode',source_mode,'revision',revision,'storedRevision',shared_revision,
    'taskCount',(select count(*) from public.tasks),'reportCount',(select count(*) from public.task_progress_reports),
    'taskMismatches',(select count(*) from task_diff)+case when source_valid then 0 else 1 end,
    'reportMismatches',(select count(*) from report_diff),
    'taskChecksum',encode(sha256(convert_to((select tasks from exported)::text,'UTF8')),'hex'),
    'synchronized',source_valid and revision=shared_revision and not exists(select 1 from task_diff) and not exists(select 1 from report_diff))
  from checks;
$$;
revoke all on function public.kpi_task_storage_health() from public,anon,authenticated;
grant execute on function public.kpi_task_storage_health() to service_role;
commit;
