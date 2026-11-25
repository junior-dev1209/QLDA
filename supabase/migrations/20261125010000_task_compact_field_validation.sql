-- Validate compact evidence without building a second, expanded descriptor tree.
-- The canonical expanded-byte limit and every original write guard remain unchanged.
begin;
create or replace function public.kpi_commit_independent_task_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[],
  p_dependency_contract text,p_dependency_state jsonb,p_read_task_versions jsonb,p_source_mode text,
  p_generation_reads jsonb,p_activities jsonb,p_task_field_reads jsonb,p_notifications jsonb
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean,rebased boolean)
language plpgsql security definer set search_path='' as $$
declare dictionary jsonb; restored jsonb; restore_bytes bigint; compact_fields boolean:=false; proof_bytes bigint; lock_deadline timestamptz := clock_timestamp()+interval '750 milliseconds'; s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; committed record;
  ignored text[] := array['bulletins','archiveRecords','publicInvestmentProjects','publicInvestmentAppraisals',
    'evaluations','departmentEvaluations','supportRequests'];
  candidate jsonb; ids text[]; generation_reads jsonb; audit jsonb; entry jsonb; target jsonb; key text;
  feed jsonb; events jsonb; acknowledgements jsonb; compact boolean;
begin
  if p_dependency_contract='task-record-appends-v3' then
    dictionary:=p_task_field_reads;
    if jsonb_typeof(dictionary) is distinct from 'object'
      or jsonb_typeof(dictionary->'templates') is distinct from 'array'
      or jsonb_typeof(dictionary->'rows') is distinct from 'array'
      or jsonb_typeof(p_read_task_versions) is distinct from 'object'
      or jsonb_typeof(p_read_task_versions->'overrides') is distinct from 'object'
      or jsonb_typeof(p_read_task_versions->'default') is distinct from 'number'
      or octet_length(dictionary::text)>4000000 or octet_length(p_read_task_versions::text)>4000000
      or (select count(*) from jsonb_object_keys(dictionary))<>2
      or (select count(*) from jsonb_object_keys(p_read_task_versions))<>2
      or p_task_order is null or cardinality(p_task_order)<1 or array_lower(p_task_order,1)<>1
      or jsonb_array_length(dictionary->'rows')<>cardinality(p_task_order)
      or jsonb_array_length(dictionary->'templates')>cardinality(p_task_order)
      or (p_read_task_versions->>'default') !~ '^[1-9][0-9]*$'
      or (p_read_task_versions->>'default')::numeric>9007199254740991 then
      raise exception 'Invalid Task dictionary envelope.' using errcode='22023'; end if;
    if exists(select 1 from unnest(p_task_order) x where x is null or btrim(x)='')
      or exists(select 1 from unnest(p_task_order) x group by x having count(*)>1)
      or (select count(*) from unnest(p_task_order) x where x=p_task_id)<>1
      or exists(select 1 from jsonb_array_elements(dictionary->'templates') t
        where jsonb_typeof(t) is distinct from 'object' or jsonb_typeof(t->'fields') is distinct from 'object'
          or jsonb_typeof(t->'identity') is distinct from 'boolean' or (select count(*) from jsonb_object_keys(t))<>2
          or (t->'identity'='true'::jsonb and (t->'fields') ? 'id'))
      or exists(select 1 from jsonb_array_elements(dictionary->'rows') r
        where jsonb_typeof(r) is distinct from 'number' or r::text !~ '^(-1|0|[1-9][0-9]*)$' or length(r::text)>10)
      or exists(select 1 from jsonb_each(p_read_task_versions->'overrides') v where not(v.key=any(p_task_order))
        or jsonb_typeof(v.value) is distinct from 'number' or v.value::text !~ '^[1-9][0-9]*$'
        or v.value::numeric>9007199254740991) then
      raise exception 'Invalid Task dictionary entries.' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(dictionary->'rows') with ordinality r(value,n)
      where (case when p_task_order[r.n::int]=p_task_id then r.value::text<>'-1'
        else r.value::text::bigint<0 or r.value::text::bigint>=jsonb_array_length(dictionary->'templates') end)) then
      raise exception 'Invalid Task dictionary indexes.' using errcode='22023'; end if;
    -- Bound expansion before aggregating. This is the exact JSONB text size,
    -- including escaped/multibyte IDs, empty objects and identity substitution.
    with templates as materialized (
      select n-1 as i,value->'fields' as fields,value->'identity'='true'::jsonb as identity,
        octet_length((value->'fields')::text) as bytes,
        case when value->'fields'='{}'::jsonb then 0 else 2 end as separator
      from jsonb_array_elements(dictionary->'templates') with ordinality t(value,n)
    ), rows as materialized (
      select value::text::bigint as i,octet_length(to_jsonb(p_task_order[n::int])::text) as key_bytes
      from jsonb_array_elements(dictionary->'rows') with ordinality r(value,n) where value::text<>'-1'
    ) select coalesce(sum(r.key_bytes+t.bytes+4+case when t.identity then 14+r.key_bytes+t.separator else 0 end),2)
      into restore_bytes from rows r join templates t on t.i=r.i;
    if restore_bytes>4000000 then raise exception 'Expanded Task dictionary exceeds its evidence limit.' using errcode='22023'; end if;
    with templates as materialized (
      select n-1 as i,value->'fields' as fields,value->'identity'='true'::jsonb as identity
      from jsonb_array_elements(dictionary->'templates') with ordinality t(value,n)
    ), rows as materialized (
      select value::text::bigint as i,p_task_order[n::int] as id
      from jsonb_array_elements(dictionary->'rows') with ordinality r(value,n) where value::text<>'-1'
    ) select coalesce(jsonb_object_agg(r.id,case when t.identity then jsonb_set(t.fields,'{id}',jsonb_build_array(true,r.id),true) else t.fields end),'{}'::jsonb)
      into restored from rows r join templates t on t.i=r.i;
    if octet_length(restored::text)<>restore_bytes then raise exception 'Task dictionary size check failed.' using errcode='22023'; end if;
    p_task_field_reads:=restored;
    select jsonb_object_agg(id,coalesce((p_read_task_versions->'overrides')->id,p_read_task_versions->'default'))
      into p_read_task_versions from unnest(p_task_order) id;
    p_dependency_contract:='task-record-appends-v2';
  end if;
  compact := p_dependency_contract in ('task-record-appends-v1','task-record-appends-v2');
  compact_fields:=p_dependency_contract='task-record-appends-v2';
  if compact_fields then
    if jsonb_typeof(p_task_field_reads) is distinct from 'object'
      or octet_length(p_task_field_reads::text)>4000000 then
      raise exception 'Invalid compact Task evidence.' using errcode='22023'; end if;
    if exists(select 1 from jsonb_each(p_task_field_reads) p
      where jsonb_typeof(p.value) is distinct from 'object'
        or exists(select 1 from jsonb_each(case when jsonb_typeof(p.value)='object' then p.value else '{}'::jsonb end) f
          where case when jsonb_typeof(f.value)='array' then
            not ((jsonb_array_length(f.value)=1 and f.value->0='false'::jsonb)
              or (jsonb_array_length(f.value)=2 and f.value->0='true'::jsonb))
            else true end)) then
      raise exception 'Invalid compact Task evidence.' using errcode='22023'; end if;
    -- JSONB text object separators and descriptor sizes, without allocating
    -- the complete expanded proof. Keep the former 4 MB envelope boundary.
    select coalesce(sum(octet_length(to_jsonb(p.key)::text)+4+f.bytes),2)
      into proof_bytes from jsonb_each(p_task_field_reads) p
      cross join lateral (
        select coalesce(sum(octet_length(to_jsonb(e.key)::text)+4+
          case when e.value->0='true'::jsonb then 28+octet_length((e.value->1)::text) else 18 end),2) as bytes
        from jsonb_each(p.value) e
      ) f;
  end if;
  -- Keep short contention inside one RPC; a longer wait remains unexecuted.
  loop
    select * into s from public.kpi_shared_state where id='primary' for update skip locked;
    exit when found;
    if clock_timestamp()>=lock_deadline then
      raise exception 'Task command store is busy.' using errcode='KPB01';
    end if;
    perform pg_sleep(0.025);
  end loop;
  if (p_dependency_contract is null or p_dependency_contract not in ('task-record-reads-v1','task-record-appends-v1','task-record-appends-v2')) or p_command_name is distinct from 'update-progress'
    or jsonb_typeof(p_dependency_state) is distinct from 'object' or jsonb_typeof(p_read_task_versions) is distinct from 'object'
    or jsonb_typeof(p_task_field_reads) is distinct from 'object' or jsonb_typeof(p_notifications) is distinct from 'array'
    or jsonb_typeof(p_generation_reads) is distinct from 'array' or jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_array_length(p_activities)<>1 or p_source_mode is null or p_source_mode not in ('snapshot','record-primary')
    or jsonb_typeof(p_task_upserts) is distinct from 'array' or jsonb_array_length(p_task_upserts)<>1
    or p_task_upserts->0->>'id' is distinct from p_task_id or p_task_deletes is null or cardinality(p_task_deletes)<>0
    or p_dependency_state ?| (ignored||array['tasks','activityLog','notifications'])
    or octet_length(jsonb_build_array(p_dependency_state,p_read_task_versions,p_task_field_reads,p_notifications,p_generation_reads,p_activities)::text)
      +(case when compact_fields then proof_bytes-octet_length(p_task_field_reads::text) else 0 end)>4000000 then
    raise exception 'Invalid independent task envelope.' using errcode='22023'; end if;
  entry := p_activities->0;
  if entry->>'action' is distinct from 'Dong bo' or entry->>'targetType' is distinct from 'sync'
    or entry->>'targetId' is distinct from 'shared-state' or entry->>'createdById' is distinct from p_actor_id
    or coalesce(entry->>'id','') !~ '^server-sync-[0-9a-f-]{36}$'
    or jsonb_typeof(p_next_state->'activityLog') is distinct from 'array' or p_next_state->'activityLog'->-1 is distinct from entry then
    raise exception 'Invalid independent task audit append.' using errcode='22023'; end if;
  s.state := s.state-'tasks';
  -- Authentication, command fingerprint, receipt replay and target version stay in the original writer.
  if not compact or exists(select 1 from public.kpi_task_command_receipts where actor_id=p_actor_id and command_id=p_command_id) then
  select * into committed from public.kpi_commit_task_delta_command(p_expected_revision,p_expected_task_version,p_task_id,
    p_actor_id,p_session_hash,p_command_id,p_command_name,p_request_hash,p_next_state,p_task_upserts,p_task_deletes,p_task_order);
  if found then
    return query select committed.next_revision,committed.next_updated_at,committed.task_version,committed.replayed,false;
    return;
  end if;
  end if;
  if s.revision is null or s.revision<p_expected_revision or (not compact and s.revision=p_expected_revision) then return; end if;
  if compact and (p_source_mode is distinct from 'record-primary'
    or p_next_state->'notifications' is distinct from p_notifications
    or p_next_state->'activityLog' is distinct from (select coalesce(jsonb_agg(a.value order by a.n),'[]'::jsonb)
      from jsonb_array_elements(p_generation_reads||p_activities) with ordinality a(value,n)
      where a.n>jsonb_array_length(p_generation_reads)+jsonb_array_length(p_activities)-5000)) then
    raise exception 'Invalid append-only task context.' using errcode='22023';
  end if;
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
      where case when compact_fields then
        (t.data ? f.key) is distinct from (f.value->>0)::boolean
        or ((f.value->>0)::boolean and t.data->f.key is distinct from f.value->1)
      else jsonb_typeof(f.value) is distinct from 'object'
        or jsonb_typeof(f.value->'present') is distinct from 'boolean'
        or (t.data ? f.key) is distinct from (f.value->>'present')::boolean
        or ((f.value->>'present')::boolean and (not(f.value ? 'value') or t.data->f.key is distinct from f.value->'value')) end)
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
  return query select c.next_revision,c.next_updated_at,c.task_version,c.replayed,(s.revision<>p_expected_revision)
    from public.kpi_commit_task_delta_command(s.revision,p_expected_task_version,p_task_id,p_actor_id,p_session_hash,
      p_command_id,p_command_name,p_request_hash,candidate,p_task_upserts,p_task_deletes,p_task_order) c;
exception when undefined_function then
  raise exception 'Independent task commit requires its original writer.' using errcode='KPT01';
end $$;
commit;
