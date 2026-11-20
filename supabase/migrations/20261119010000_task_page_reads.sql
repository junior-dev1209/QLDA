-- Read-only protocol. Does not switch sources, rewrite records or change writer ACLs.
begin;
do $$ begin
  if not exists (select 1 from public.kpi_task_storage_state where id='primary' and schema_version=2) then
    raise exception 'Install the record-primary protocol before task page reads.';
  end if;
end $$;

create or replace function public.kpi_task_query_context(p_task_id text default null, p_search boolean default false)
returns table(revision bigint, updated_at timestamptz, source_mode text, context jsonb, task_index jsonb, task jsonb, task_version bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
    where s.id='primary' and m.schema_version=2 and m.shared_revision=s.revision) then
    raise exception 'Task read storage is not synchronized.' using errcode='KPT01';
  end if;
  return query select s.revision,s.updated_at,m.source_mode,
    jsonb_build_object('accounts',s.state->'accounts','people',s.state->'people',
      'departments',s.state->'departments','roles',s.state->'roles',
      'moduleSettings',s.state->'moduleSettings','projectCatalog',s.state->'projectCatalog'),
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
    case when p_task_id is not null then (select t.row_version from public.tasks t where t.id=p_task_id) else null end
  from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
end $$;
revoke all on function public.kpi_task_query_context(text,boolean) from public,anon,authenticated;
grant execute on function public.kpi_task_query_context(text,boolean) to service_role;

create or replace function public.kpi_task_page_records(p_ids text[], p_revision bigint)
returns table(revision bigint, tasks jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_ids is null or cardinality(p_ids)>200 then raise exception 'Invalid task page size.' using errcode='22023'; end if;
  return query select s.revision,coalesce((select jsonb_agg(t.data order by ids.ordinality)
    from unnest(p_ids) with ordinality ids(id,ordinality) join public.tasks t on t.id=ids.id),'[]'::jsonb)
  from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
  where s.id='primary' and s.revision=p_revision and m.schema_version=2 and m.shared_revision=s.revision;
end $$;
revoke all on function public.kpi_task_page_records(text[],bigint) from public,anon,authenticated;
grant execute on function public.kpi_task_page_records(text[],bigint) to service_role;
commit;
