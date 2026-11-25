-- Same guarded read projection in both synchronized storage modes.
-- No write authority, data, session, permission or eligibility-rule change.
begin;
create or replace function public.kpi_task_cold_context(p_task_id text)
returns table(revision bigint,updated_at timestamptz,source_mode text,state jsonb,
  task_versions jsonb,full_task_ids jsonb,cold_fields jsonb,cold_version integer,eligible boolean)
language plpgsql stable security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; target jsonb;
  bodies jsonb; versions jsonb; valid_ids boolean;
  fields text[] := array['id','kind','taskKind','assignedById','assignedAt','responseStatus','responseAt',
    'ownerId','collaboratorId','collaboratorIds','gpmbWorkflowId','gpmbStepId','projectId','projectName','category',
    'recurrence','periodicity','recurrenceSourceId','recurrenceSeriesId','recurrenceStoppedAt','recurrenceStopDate',
    'status','completionReviewStatus','dependencyIds'];
begin
  if coalesce(p_task_id,'')='' then raise exception 'Invalid cold Task target.' using errcode='22023'; end if;
  select * into s from public.kpi_shared_state where id='primary';
  select * into m from public.kpi_task_storage_state where id='primary';
  if s.revision is null or m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision
    or m.source_mode not in ('snapshot','record-primary') then
    raise exception 'Task cold storage is not synchronized.' using errcode='KPT01'; end if;
  select data into target from public.tasks where id=p_task_id;
  if target is null or target->>'kind' is distinct from 'regular'
    or coalesce(nullif(target->>'recurrence',''),target->>'periodicity','') not in ('','none')
    or exists(select 1 from unnest(array['gpmbWorkflowId','gpmbStepId','recurrenceSourceId','recurrenceSeriesId',
      'recurrenceStoppedAt','recurrenceStopDate','sourceCalendarEventId']) k where coalesce(target->>k,'')<>'') then
    return query select s.revision,s.updated_at,m.source_mode,null::jsonb,null::jsonb,null::jsonb,to_jsonb(fields),1,false;
    return;
  end if;
  select coalesce(jsonb_agg(case when t.id=p_task_id then t.data else (
      select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) from jsonb_each(t.data) e where e.key=any(fields)
    ) end order by t.position_index,t.id),'[]'::jsonb),
    coalesce(jsonb_object_agg(t.id,t.row_version),'{}'::jsonb),
    coalesce(bool_and(jsonb_typeof(t.data->'id')='string' and t.data->>'id'=t.id),false)
  into bodies,versions,valid_ids from public.tasks t;
  if not valid_ids then
    return query select s.revision,s.updated_at,m.source_mode,null::jsonb,null::jsonb,null::jsonb,to_jsonb(fields),1,false;
    return;
  end if;
  return query select s.revision,s.updated_at,m.source_mode,jsonb_set(s.state-'tasks','{tasks}',bodies,true),
    versions,jsonb_build_array(p_task_id),to_jsonb(fields),1,true;
end $$;
revoke all on function public.kpi_task_cold_context(text) from public,anon,authenticated;
grant execute on function public.kpi_task_cold_context(text) to service_role;
commit;

