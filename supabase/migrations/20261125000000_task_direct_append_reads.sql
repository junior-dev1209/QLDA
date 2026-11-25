-- Same read contract and fresh authority. Project before aggregation, rather
-- than materializing a complete metadata/root tuple only to discard most of it.
begin;
create or replace function public.kpi_task_append_metadata_context(
  p_task_id text,p_after_revision bigint default null,p_source_mode text default null,
  p_directory_epoch bigint default null,p_metadata_epoch bigint default null
) returns table(revision bigint,updated_at timestamptz,source_mode text,state jsonb,
  directory_epoch bigint,directory_complete boolean,directory jsonb,changed_tasks jsonb,checkpoint_version integer,
  metadata_epoch bigint,metadata_complete boolean,cold_fields jsonb,cold_version integer,eligible boolean,root_projection text)
language plpgsql stable security definer set search_path='' as $read$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype;
  target jsonb; bodies boolean; complete boolean; allowed boolean; projected jsonb;
  fields text[]:=array['id','kind','taskKind','assignedById','assignedAt','responseStatus','responseAt',
    'ownerId','collaboratorId','collaboratorIds','gpmbWorkflowId','gpmbStepId','projectId','projectName','category',
    'recurrence','periodicity','recurrenceSourceId','recurrenceSeriesId','recurrenceStoppedAt','recurrenceStopDate',
    'status','completionReviewStatus','dependencyIds'];
begin
  if coalesce(p_task_id,'')='' or (p_after_revision is not null and (p_after_revision<=0 or p_source_mode is null
    or p_source_mode not in ('snapshot','record-primary') or p_directory_epoch is null or p_directory_epoch<0
    or p_metadata_epoch is null or p_metadata_epoch<0)) then
    raise exception 'Invalid task metadata checkpoint.' using errcode='22023'; end if;
  select * into s from public.kpi_shared_state where id='primary';
  select * into m from public.kpi_task_storage_state where id='primary';
  if s.revision is null or m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision
    or m.source_mode not in ('snapshot','record-primary') or m.directory_epoch is null or m.directory_epoch<0
    or m.metadata_epoch is null or m.metadata_epoch<0
    or (p_after_revision is not null and s.revision<p_after_revision) or not public.kpi_task_metadata_ready() then
    raise exception 'Task metadata storage is not synchronized.' using errcode='KPT01'; end if;
  bodies:=p_after_revision is null or m.source_mode is distinct from p_source_mode or m.metadata_epoch is distinct from p_metadata_epoch;
  complete:=bodies or m.directory_epoch is distinct from p_directory_epoch;
  select t.data into target from public.tasks t where t.id=p_task_id;
  allowed:=m.source_mode='record-primary' and target is not null and target->>'kind'='regular'
    and coalesce(nullif(target->>'recurrence',''),target->>'periodicity','') in ('','none')
    and not exists(select 1 from unnest(array['gpmbWorkflowId','gpmbStepId','recurrenceSourceId','recurrenceSeriesId',
      'recurrenceStoppedAt','recurrenceStopDate','sourceCalendarEventId']) k where coalesce(target->>k,'')<>'');
  if not coalesce(allowed,false) then
    return query select s.revision,s.updated_at,m.source_mode,null::jsonb,m.directory_epoch,complete,
      null::jsonb,null::jsonb,2,m.metadata_epoch,bodies,to_jsonb(fields),1,false,'task-appends-v2'::text;
    return;
  end if;
  projected:=jsonb_set(jsonb_set((s.state-array['tasks','bulletins','archiveRecords','publicInvestmentProjects','publicInvestmentAppraisals',
    'evaluations','departmentEvaluations','supportRequests'])||jsonb_build_object(
      'bulletins','[]'::jsonb,'archiveRecords','[]'::jsonb,'publicInvestmentProjects','[]'::jsonb,
      'publicInvestmentAppraisals','[]'::jsonb,'evaluations','[]'::jsonb,'departmentEvaluations','[]'::jsonb,'supportRequests','[]'::jsonb),
    '{notifications}','[]'::jsonb,true),'{activityLog}',
    (select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb) from jsonb_array_elements(s.state->'activityLog') with ordinality a(value,n)
      where a.value->>'action'='Tự tạo định kỳ'),true);
  return query select s.revision,s.updated_at,m.source_mode,projected,m.directory_epoch,complete,
    coalesce((select jsonb_agg(jsonb_build_array(t.id,t.row_version) order by t.position_index,t.id) from public.tasks t
      where complete or t.version>p_after_revision or t.id=p_task_id),'[]'::jsonb),
    coalesce((select jsonb_agg(case when t.id=p_task_id then t.data else (
        select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) from jsonb_each(t.command_metadata) e where e.key=any(fields)
      ) end order by t.position_index,t.id) from public.tasks t
      where bodies or t.version>p_after_revision or t.id=p_task_id),'[]'::jsonb),
    2,m.metadata_epoch,bodies,to_jsonb(fields),1,true,'task-appends-v2'::text;
end;
$read$;
revoke all on function public.kpi_task_append_metadata_context(text,bigint,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.kpi_task_append_metadata_context(text,bigint,text,bigint,bigint) to service_role;
commit;
