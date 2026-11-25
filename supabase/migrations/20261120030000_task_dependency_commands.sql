-- Explicit independent roots; the original delta writer remains the only writer.
begin;
do $$ begin
  if to_regprocedure('public.kpi_commit_task_delta_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[])') is null then
    raise exception 'Install delta task commands before dependency commands.';
  end if;
end $$;
create or replace function public.kpi_commit_task_dependency_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[],
  p_dependency_contract text,p_dependency_state jsonb,p_read_task_versions jsonb,p_source_mode text,
  p_generation_reads jsonb,p_activities jsonb
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean,rebased boolean)
language plpgsql security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; committed record;
  ignored text[] := array['bulletins','archiveRecords','publicInvestmentProjects','publicInvestmentAppraisals',
    'evaluations','departmentEvaluations','supportRequests'];
  candidate jsonb; versions jsonb; ids text[]; generation_reads jsonb; audit jsonb; entry jsonb; target jsonb; key text;
begin
  if p_dependency_contract is distinct from 'task-roots-v1' or p_command_name is distinct from 'update-progress'
    or jsonb_typeof(p_dependency_state) is distinct from 'object' or jsonb_typeof(p_read_task_versions) is distinct from 'object'
    or jsonb_typeof(p_generation_reads) is distinct from 'array' or jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_array_length(p_activities)<>1 or p_source_mode is null or p_source_mode not in ('snapshot','record-primary')
    or jsonb_typeof(p_task_upserts) is distinct from 'array' or jsonb_array_length(p_task_upserts)<>1
    or p_task_upserts->0->>'id' is distinct from p_task_id or p_task_deletes is null or cardinality(p_task_deletes)<>0
    or p_dependency_state ?| (ignored||array['tasks','activityLog']) then
    raise exception 'Invalid task dependency envelope.' using errcode='22023'; end if;
  entry := p_activities->0;
  if entry->>'action' is distinct from 'Dong bo' or entry->>'targetType' is distinct from 'sync'
    or entry->>'targetId' is distinct from 'shared-state' or entry->>'createdById' is distinct from p_actor_id
    or coalesce(entry->>'id','') !~ '^server-sync-[0-9a-f-]{36}$'
    or jsonb_typeof(p_next_state->'activityLog') is distinct from 'array' or p_next_state->'activityLog'->-1 is distinct from entry then
    raise exception 'Invalid task audit append.' using errcode='22023'; end if;
  select * into s from public.kpi_shared_state where id='primary' for update;
  -- This performs the existing authentication/receipt checks even on a stale revision.
  select * into committed from public.kpi_commit_task_delta_command(p_expected_revision,p_expected_task_version,p_task_id,
    p_actor_id,p_session_hash,p_command_id,p_command_name,p_request_hash,p_next_state,p_task_upserts,p_task_deletes,p_task_order);
  if found then
    return query select committed.next_revision,committed.next_updated_at,committed.task_version,committed.replayed,false;
    return;
  end if;
  if s.revision is null or s.revision<=p_expected_revision then return; end if;
  select * into m from public.kpi_task_storage_state where id='primary';
  if m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision then
    raise exception 'Task dependency storage is not synchronized.' using errcode='KPT01'; end if;
  if m.source_mode is distinct from p_source_mode then return; end if;
  -- Schema validation/collection initialization also depends on root shape.
  if exists(select 1 from unnest(ignored) k where jsonb_typeof(s.state->k) is distinct from 'array') then return; end if;
  if (s.state-array['tasks','activityLog']-ignored) is distinct from p_dependency_state then return; end if;
  select coalesce(jsonb_object_agg(t.id,t.row_version),'{}'::jsonb),coalesce(array_agg(t.id order by t.position_index,t.id),'{}'::text[])
    into versions,ids from public.tasks t;
  if versions is distinct from p_read_task_versions or ids is distinct from p_task_order then return; end if;
  select t.data into target from public.tasks t where t.id=p_task_id;
  if target->>'kind' is distinct from 'regular' or coalesce(nullif(target->>'recurrence',''),target->>'periodicity','') not in ('','none')
    or exists(select 1 from unnest(array['gpmbWorkflowId','gpmbStepId','recurrenceSourceId','recurrenceSeriesId',
      'recurrenceStoppedAt','recurrenceStopDate','sourceCalendarEventId']) k where coalesce(target->>k,'')<>'') then return; end if;
  audit := s.state->'activityLog';
  if jsonb_typeof(audit) is distinct from 'array' or exists(select 1 from jsonb_array_elements(audit) a
    where jsonb_typeof(a)<>'object' or jsonb_typeof(a->'id') is distinct from 'string' or coalesce(a->>'id','')='')
    or exists(select 1 from jsonb_array_elements(audit) a group by a->>'id' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(audit) a where a->>'id'=entry->>'id') then return; end if;
  select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb) into generation_reads
    from jsonb_array_elements(audit) with ordinality a(value,n) where a.value->>'action'='Tự tạo định kỳ';
  if generation_reads is distinct from p_generation_reads then return; end if;
  candidate := p_next_state;
  foreach key in array ignored loop
    candidate := candidate-key;
    if s.state ? key then candidate := jsonb_set(candidate,array[key],s.state->key,true); end if;
  end loop;
  select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb) into audit
    from jsonb_array_elements(audit||p_activities) with ordinality a(value,n)
    where a.n>jsonb_array_length(audit)+1-5000;
  candidate := jsonb_set(candidate,'{activityLog}',audit,true);
  return query select c.next_revision,c.next_updated_at,c.task_version,c.replayed,true
    from public.kpi_commit_task_delta_command(s.revision,p_expected_task_version,p_task_id,p_actor_id,p_session_hash,
      p_command_id,p_command_name,p_request_hash,candidate,p_task_upserts,p_task_deletes,p_task_order) c;
exception when undefined_function then
  raise exception 'Task dependency commit requires its original writer.' using errcode='KPT01';
end $$;
revoke all on function public.kpi_commit_task_dependency_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],text,jsonb,jsonb,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.kpi_commit_task_dependency_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],text,jsonb,jsonb,text,jsonb,jsonb) to service_role;
commit;
