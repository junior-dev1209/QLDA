-- Read-only append checkpoints reuse the existing directory/metadata epochs.
-- The generated metadata is exactly data minus histories/files. No write authority changes.
begin;
do $prerequisite$ begin
  if to_regprocedure('public.kpi_task_metadata_context(text,bigint,text,bigint,bigint)') is null
    or not exists(select 1 from pg_attribute where attrelid='public.tasks'::regclass and attname='command_metadata' and attgenerated='s') then
    raise exception 'Install the existing metadata checkpoint and generated projection first'; end if;
end $prerequisite$;
create or replace function public.kpi_task_metadata_context(
  p_task_id text,p_after_revision bigint default null,p_source_mode text default null,
  p_directory_epoch bigint default null,p_metadata_epoch bigint default null
) returns table(revision bigint,updated_at timestamptz,source_mode text,state jsonb,
  directory_epoch bigint,directory_complete boolean,directory jsonb,changed_tasks jsonb,checkpoint_version integer,
  metadata_epoch bigint,metadata_complete boolean)
language plpgsql stable security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; complete boolean; bodies boolean;
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
  bodies := p_after_revision is null or m.source_mode is distinct from p_source_mode or m.metadata_epoch is distinct from p_metadata_epoch;
  complete := bodies or m.directory_epoch is distinct from p_directory_epoch;
  if bodies then
    return query select s.revision,s.updated_at,m.source_mode,s.state-'tasks',m.directory_epoch,true,
      coalesce(jsonb_agg(jsonb_build_array(t.id,t.row_version) order by t.position_index,t.id),'[]'::jsonb),
      coalesce(jsonb_agg(case when t.id=p_task_id then t.data else t.command_metadata end
        order by t.position_index,t.id),'[]'::jsonb),2,m.metadata_epoch,true from public.tasks t;
  elsif complete then
    -- Fresh membership/order, but unchanged row bodies still have a proven baseline.
    return query select s.revision,s.updated_at,m.source_mode,s.state-'tasks',m.directory_epoch,true,
      coalesce((select jsonb_agg(jsonb_build_array(t.id,t.row_version) order by t.position_index,t.id) from public.tasks t),'[]'::jsonb),
      coalesce((select jsonb_agg(case when t.id=p_task_id then t.data else t.command_metadata end
        order by t.position_index,t.id) from public.tasks t where t.version>p_after_revision or t.id=p_task_id),'[]'::jsonb),2,m.metadata_epoch,false;
  else
    return query select s.revision,s.updated_at,m.source_mode,s.state-'tasks',m.directory_epoch,false,
      coalesce(jsonb_agg(jsonb_build_array(t.id,t.row_version) order by t.position_index,t.id),'[]'::jsonb),
      coalesce(jsonb_agg(case when t.id=p_task_id then t.data else t.command_metadata end
        order by t.position_index,t.id),'[]'::jsonb),2,m.metadata_epoch,false
      from public.tasks t where t.version>p_after_revision or t.id=p_task_id;
  end if;
end $$;
create or replace function public.kpi_task_append_metadata_context(
  p_task_id text,p_after_revision bigint default null,p_source_mode text default null,
  p_directory_epoch bigint default null,p_metadata_epoch bigint default null
) returns table(revision bigint,updated_at timestamptz,source_mode text,state jsonb,
  directory_epoch bigint,directory_complete boolean,directory jsonb,changed_tasks jsonb,checkpoint_version integer,
  metadata_epoch bigint,metadata_complete boolean,cold_fields jsonb,cold_version integer,eligible boolean,root_projection text)
language plpgsql stable security definer set search_path='' as $read$
declare c record; target jsonb; bodies jsonb; allowed boolean;
  fields text[]:=array['id','kind','taskKind','assignedById','assignedAt','responseStatus','responseAt',
    'ownerId','collaboratorId','collaboratorIds','gpmbWorkflowId','gpmbStepId','projectId','projectName','category',
    'recurrence','periodicity','recurrenceSourceId','recurrenceSeriesId','recurrenceStoppedAt','recurrenceStopDate',
    'status','completionReviewStatus','dependencyIds'];
begin
  select * into c from public.kpi_task_metadata_context(p_task_id,p_after_revision,p_source_mode,p_directory_epoch,p_metadata_epoch);
  select value into target from jsonb_array_elements(c.changed_tasks) t where value->>'id'=p_task_id;
  allowed:=c.source_mode='record-primary' and target is not null and target->>'kind'='regular'
    and coalesce(nullif(target->>'recurrence',''),target->>'periodicity','') in ('','none')
    and not exists(select 1 from unnest(array['gpmbWorkflowId','gpmbStepId','recurrenceSourceId','recurrenceSeriesId',
      'recurrenceStoppedAt','recurrenceStopDate','sourceCalendarEventId']) k where coalesce(target->>k,'')<>'');
  if not coalesce(allowed,false) then
    return query select c.revision,c.updated_at,c.source_mode,null::jsonb,c.directory_epoch,c.directory_complete,
      null::jsonb,null::jsonb,c.checkpoint_version,c.metadata_epoch,c.metadata_complete,to_jsonb(fields),1,false,'task-appends-v2'::text;
    return;
  end if;
  select coalesce(jsonb_agg(case when t.value->>'id'=p_task_id then t.value else (
      select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) from jsonb_each(t.value) e where e.key=any(fields)
    ) end order by t.n),'[]'::jsonb) into bodies from jsonb_array_elements(c.changed_tasks) with ordinality t(value,n);
  return query select c.revision,c.updated_at,c.source_mode,
    jsonb_set(jsonb_set((c.state-array['bulletins','archiveRecords','publicInvestmentProjects','publicInvestmentAppraisals',
      'evaluations','departmentEvaluations','supportRequests'])||jsonb_build_object(
        'bulletins','[]'::jsonb,'archiveRecords','[]'::jsonb,'publicInvestmentProjects','[]'::jsonb,
        'publicInvestmentAppraisals','[]'::jsonb,'evaluations','[]'::jsonb,'departmentEvaluations','[]'::jsonb,'supportRequests','[]'::jsonb),
      '{notifications}','[]'::jsonb,true),'{activityLog}',
      (select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb) from jsonb_array_elements(c.state->'activityLog') with ordinality a(value,n)
        where a.value->>'action'='Tự tạo định kỳ'),true),
    c.directory_epoch,c.directory_complete,c.directory,bodies,c.checkpoint_version,c.metadata_epoch,c.metadata_complete,
    to_jsonb(fields),1,true,'task-appends-v2'::text;
end;
$read$;
revoke all on function public.kpi_task_append_metadata_context(text,bigint,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.kpi_task_append_metadata_context(text,bigint,text,bigint,bigint) to service_role;
commit;
