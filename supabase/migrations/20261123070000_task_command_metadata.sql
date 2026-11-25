-- A stored generated projection, never a second write authority. All existing
-- Task data, history, versions, permissions and protocol guards remain unchanged.
begin;
alter table public.tasks add column if not exists command_metadata jsonb
  generated always as (data-array['progressReports','attachments']) stored;
commit;
-- Same dependency/authentication/receipt contract; avoid repeated detoasting.
-- Proofs stay bounded and are still verified field-for-field under the lock.
begin;
create or replace function public.kpi_commit_independent_task_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[],
  p_dependency_contract text,p_dependency_state jsonb,p_read_task_versions jsonb,p_source_mode text,
  p_generation_reads jsonb,p_activities jsonb,p_task_field_reads jsonb,p_notifications jsonb
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean,rebased boolean)
language plpgsql security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; committed record;
  ignored text[] := array['bulletins','archiveRecords','publicInvestmentProjects','publicInvestmentAppraisals',
    'evaluations','departmentEvaluations','supportRequests'];
  candidate jsonb; ids text[]; generation_reads jsonb; audit jsonb; entry jsonb; target jsonb; key text;
  feed jsonb; events jsonb; acknowledgements jsonb;
begin
  if p_dependency_contract is distinct from 'task-record-reads-v1' or p_command_name is distinct from 'update-progress'
    or jsonb_typeof(p_dependency_state) is distinct from 'object' or jsonb_typeof(p_read_task_versions) is distinct from 'object'
    or jsonb_typeof(p_task_field_reads) is distinct from 'object' or jsonb_typeof(p_notifications) is distinct from 'array'
    or jsonb_typeof(p_generation_reads) is distinct from 'array' or jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_array_length(p_activities)<>1 or p_source_mode is null or p_source_mode not in ('snapshot','record-primary')
    or jsonb_typeof(p_task_upserts) is distinct from 'array' or jsonb_array_length(p_task_upserts)<>1
    or p_task_upserts->0->>'id' is distinct from p_task_id or p_task_deletes is null or cardinality(p_task_deletes)<>0
    or p_dependency_state ?| (ignored||array['tasks','activityLog','notifications'])
    or octet_length(jsonb_build_array(p_dependency_state,p_read_task_versions,p_task_field_reads,p_notifications,p_generation_reads,p_activities)::text)>4000000 then
    raise exception 'Invalid independent task envelope.' using errcode='22023'; end if;
  entry := p_activities->0;
  if entry->>'action' is distinct from 'Dong bo' or entry->>'targetType' is distinct from 'sync'
    or entry->>'targetId' is distinct from 'shared-state' or entry->>'createdById' is distinct from p_actor_id
    or coalesce(entry->>'id','') !~ '^server-sync-[0-9a-f-]{36}$'
    or jsonb_typeof(p_next_state->'activityLog') is distinct from 'array' or p_next_state->'activityLog'->-1 is distinct from entry then
    raise exception 'Invalid independent task audit append.' using errcode='22023'; end if;
  select * into s from public.kpi_shared_state where id='primary' for update;
  s.state := s.state-'tasks';
  -- Authentication, command fingerprint, receipt replay and target version stay in the original writer.
  select * into committed from public.kpi_commit_task_delta_command(p_expected_revision,p_expected_task_version,p_task_id,
    p_actor_id,p_session_hash,p_command_id,p_command_name,p_request_hash,p_next_state,p_task_upserts,p_task_deletes,p_task_order);
  if found then
    return query select committed.next_revision,committed.next_updated_at,committed.task_version,committed.replayed,false;
    return;
  end if;
  if s.revision is null or s.revision<=p_expected_revision then return; end if;
  select * into m from public.kpi_task_storage_state where id='primary';
  if m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision then
    raise exception 'Task record dependency storage is not synchronized.' using errcode='KPT01'; end if;
  if m.source_mode is distinct from p_source_mode then return; end if;
  if exists(select 1 from unnest(ignored) k where jsonb_typeof(s.state->k) is distinct from 'array') then return; end if;
  if (s.state-array['tasks','activityLog','notifications']-ignored) is distinct from p_dependency_state then return; end if;
  select coalesce(array_agg(t.id order by t.position_index,t.id),'{}'::text[]) into ids from public.tasks t;
  if ids is distinct from p_task_order or p_task_order is null or not(p_task_id=any(ids))
    or (select array_agg(k order by k) from jsonb_object_keys(p_read_task_versions) k)
      is distinct from (select array_agg(id order by id) from unnest(ids) id)
    or (select count(*) from jsonb_object_keys(p_task_field_reads))<>cardinality(ids)-1 then return; end if;
  select t.data into target from public.tasks t where t.id=p_task_id and t.row_version=p_expected_task_version;
  if not found or target->>'kind' is distinct from 'regular' or coalesce(nullif(target->>'recurrence',''),target->>'periodicity','') not in ('','none')
    or exists(select 1 from unnest(array['gpmbWorkflowId','gpmbStepId','recurrenceSourceId','recurrenceSeriesId',
      'recurrenceStoppedAt','recurrenceStopDate','sourceCalendarEventId']) k where coalesce(target->>k,'')<>'')
    or (target ? 'dependencyIds' and target->'dependencyIds' is distinct from '[]'::jsonb) then return; end if;
  -- Same membership/order prevents phantom dependencies. Missing and JSON null are different reads.
  -- Expand the incoming proof once too: RPC arguments can be TOASTed, so a
  -- lookup against the entire proof per Task repeatedly decompresses megabytes.
  if exists(with proofs as materialized (
    select p.key as id,p.value as fields from jsonb_each(p_task_field_reads) p
  ), actual as materialized (
    select t.id,p.fields,(select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
      from jsonb_each(case when p.fields ?| array['progressReports','attachments'] then t.data else t.command_metadata end) e where p.fields ? e.key) as data
    from public.tasks t left join proofs p on p.id=t.id where t.id<>p_task_id
  ) select 1 from actual t where
    jsonb_typeof(t.fields) is distinct from 'object' or not(t.fields ? 'dependencyIds')
    or (t.data ? 'dependencyIds' and (jsonb_typeof(t.data->'dependencyIds') is distinct from 'array'
      or (t.data->'dependencyIds') ? p_task_id))
    or exists(select 1 from jsonb_each(case when jsonb_typeof(t.fields)='object' then t.fields else '{}'::jsonb end) f
      where jsonb_typeof(f.value) is distinct from 'object'
        or jsonb_typeof(f.value->'present') is distinct from 'boolean'
        or (t.data ? f.key) is distinct from (f.value->>'present')::boolean
        or ((f.value->>'present')::boolean and (not(f.value ? 'value') or t.data->f.key is distinct from f.value->'value')))
  ) then return; end if;
  audit := s.state->'activityLog';
  if jsonb_typeof(audit) is distinct from 'array' or exists(select 1 from jsonb_array_elements(audit) a
    where jsonb_typeof(a)<>'object' or jsonb_typeof(a->'id') is distinct from 'string' or coalesce(a->>'id','')='')
    or exists(select 1 from jsonb_array_elements(audit) a group by a->>'id' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(audit) a where a->>'id'=entry->>'id') then return; end if;
  select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb) into generation_reads
    from jsonb_array_elements(audit) with ordinality a(value,n) where a.value->>'action'='Tự tạo định kỳ';
  if generation_reads is distinct from p_generation_reads then return; end if;
  feed := s.state->'notifications';
  if jsonb_typeof(feed) is distinct from 'array' or exists(select 1 from jsonb_array_elements(feed||p_notifications) n
    where jsonb_typeof(n)<>'object' or jsonb_typeof(n->'id') is distinct from 'string' or coalesce(n->>'id','')=''
      or coalesce(n->>'notificationType','') not in ('event','acknowledgement'))
    or exists(select 1 from jsonb_array_elements(feed||p_notifications) n group by n->>'id' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_notifications) n where n->>'notificationType' is distinct from 'event'
      or n->>'targetType' is distinct from 'task' or n->>'targetId' is distinct from p_task_id
      or not exists(select 1 from jsonb_array_elements(s.state->'accounts') a where a->>'id'=n->>'recipientAccountId')) then return; end if;
  candidate := p_next_state;
  foreach key in array ignored loop
    candidate := candidate-key;
    if s.state ? key then candidate := jsonb_set(candidate,array[key],s.state->key,true); end if;
  end loop;
  select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb) into audit
    from jsonb_array_elements(audit||p_activities) with ordinality a(value,n)
    where a.n>jsonb_array_length(audit)+1-5000;
  candidate := jsonb_set(candidate,'{activityLog}',audit,true);
  if jsonb_array_length(p_notifications)>0 then
    select coalesce(jsonb_agg(n.value order by n.i),'[]'::jsonb) into acknowledgements
      from jsonb_array_elements(feed) with ordinality n(value,i) where n.value->>'notificationType'='acknowledgement';
    select coalesce(jsonb_agg(n.value order by n.i),'[]'::jsonb) into events
      from jsonb_array_elements(feed) with ordinality n(value,i) where n.value->>'notificationType'='event';
    events := events||p_notifications;
    select coalesce(jsonb_agg(n.value order by n.i),'[]'::jsonb) into events
      from jsonb_array_elements(events) with ordinality n(value,i) where n.i>jsonb_array_length(events)-3000;
    feed := acknowledgements||events;
  end if;
  candidate := jsonb_set(candidate,'{notifications}',feed,true);
  return query select c.next_revision,c.next_updated_at,c.task_version,c.replayed,true
    from public.kpi_commit_task_delta_command(s.revision,p_expected_task_version,p_task_id,p_actor_id,p_session_hash,
      p_command_id,p_command_name,p_request_hash,candidate,p_task_upserts,p_task_deletes,p_task_order) c;
exception when undefined_function then
  raise exception 'Independent task commit requires its original writer.' using errcode='KPT01';
end $$;
revoke all on function public.kpi_commit_independent_task_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],text,jsonb,jsonb,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.kpi_commit_independent_task_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],text,jsonb,jsonb,text,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;


do $upgrade$ begin
  if to_regprocedure('public.kpi_task_cold_context(text)') is not null then
    execute $definition$create or replace function public.kpi_task_cold_context(p_task_id text)
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
      select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) from jsonb_each(t.command_metadata) e where e.key=any(fields)
    ) end order by t.position_index,t.id),'[]'::jsonb),
    coalesce(jsonb_object_agg(t.id,t.row_version),'{}'::jsonb),
    coalesce(bool_and(jsonb_typeof(t.command_metadata->'id')='string' and t.command_metadata->>'id'=t.id),false)
  into bodies,versions,valid_ids from public.tasks t;
  if not valid_ids then
    return query select s.revision,s.updated_at,m.source_mode,null::jsonb,null::jsonb,null::jsonb,to_jsonb(fields),1,false;
    return;
  end if;
  return query select s.revision,s.updated_at,m.source_mode,jsonb_set(s.state-'tasks','{tasks}',bodies,true),
    versions,jsonb_build_array(p_task_id),to_jsonb(fields),1,true;
end $$;$definition$;
  end if;
end $upgrade$;
