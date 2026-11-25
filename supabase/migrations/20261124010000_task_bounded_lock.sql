-- Bounded short-lock admission, not another writer or an extended SQL timeout.
-- Existing session, role, dependency, version, receipt and history guards are unchanged.
begin;
create or replace function public.kpi_commit_task_delta_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[]
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean)
language plpgsql security definer set search_path='' as $$
declare lock_deadline timestamptz := clock_timestamp()+interval '750 milliseconds'; s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype;
  r public.kpi_task_command_receipts%rowtype; version bigint; candidate jsonb; next_tasks jsonb;
  changed_ids text[]; moved_ids text[]; creating boolean;
begin
  -- task-point-write-protocol:1
  creating := p_expected_task_version=0 and p_command_name='save-task';
  if p_expected_revision is null or p_expected_revision<=0 or p_expected_task_version is null or (p_expected_task_version<=0 and not creating)
    or coalesce(length(p_command_id),0) not between 1 and 160 or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid task command envelope.' using errcode='22023';
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
  perform 1 from public.kpi_sync_sessions where token_hash=p_session_hash and account_id=p_actor_id
    and expires_at>clock_timestamp() for share;
  if not found or not exists(select 1 from jsonb_array_elements(s.state->'accounts') a
    where a->>'id'=p_actor_id and coalesce(a->'disabled','false'::jsonb) in ('false','null','0','""')) then
    raise exception 'Authentication required.' using errcode='KPA01';
  end if;
  select * into r from public.kpi_task_command_receipts where actor_id=p_actor_id and command_id=p_command_id;
  if found then
    if r.task_id<>p_task_id or r.command_name<>p_command_name or r.request_hash<>p_request_hash then
      raise exception 'Command id was already used for a different request.' using errcode='KPC01';
    end if;
    return query select s.revision,s.updated_at,r.task_version,true; return;
  end if;
  if s.revision<>p_expected_revision then return; end if;
  select * into m from public.kpi_task_storage_state where id='primary';
  if m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision
    or m.source_mode not in ('snapshot','record-primary') then
    raise exception 'Task write storage is not synchronized.' using errcode='KPT01';
  end if;
  select t.row_version into version from public.tasks t where t.id=p_task_id;
  if creating then
    if found then return; end if;
  elsif not found or version<>p_expected_task_version then return; end if;
  if jsonb_typeof(p_next_state) is distinct from 'object' or p_next_state ? 'tasks'
    or jsonb_typeof(p_task_upserts) is distinct from 'array' or p_task_deletes is null or p_task_order is null then
    raise exception 'Invalid task delta structure.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(s.state-'tasks') k(key) where not(p_next_state ? k.key)) then
    raise exception 'Complete shared context is required.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_task_upserts) x where jsonb_typeof(x)<>'object' or coalesce(btrim(x->>'id'),'')='')
    or exists(select 1 from jsonb_array_elements(p_task_upserts) x group by x->>'id' having count(*)>1)
    or exists(select 1 from unnest(p_task_order) id where id is null or btrim(id)='')
    or exists(select 1 from unnest(p_task_order) id group by id having count(*)>1)
    or exists(select 1 from unnest(p_task_deletes) id where id is null or btrim(id)='')
    or exists(select 1 from unnest(p_task_deletes) id group by id having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_task_upserts) x where x->>'id'=any(p_task_deletes))
    or exists(select 1 from unnest(p_task_deletes) d(id) where not exists(select 1 from public.tasks t where t.id=d.id))
    or exists(select 1 from public.kpi_task_report_records(p_task_upserts) x group by x.id having count(*)>1) then
    raise exception 'Invalid or duplicate task delta ids.' using errcode='22023';
  end if;
  -- Verify the complete ID set without exporting unchanged task bodies/history.
  if exists(with expected as (
      select t.id from public.tasks t where not(t.id=any(p_task_deletes))
      union select x->>'id' from jsonb_array_elements(p_task_upserts) x
    ) select 1 from expected e full join unnest(p_task_order) o(id) on e.id=o.id where e.id is null or o.id is null) then
    raise exception 'Task delta order is incomplete.' using errcode='22023';
  end if;
  select x into candidate from jsonb_array_elements(p_task_upserts) x where x->>'id'=p_task_id;
  if candidate is null or (not creating and not exists(select 1 from jsonb_array_elements(
    case when jsonb_typeof(candidate->'progressReports')='array' then candidate->'progressReports' else '[]'::jsonb end
  ) x where x->>'id'=p_command_id)) then
    raise exception 'Task command has no audit report.' using errcode='22023';
  end if;

  perform set_config('kpi.task_mirror_write','on',true);
    delete from public.task_progress_reports where task_id=any(p_task_deletes);
    delete from public.tasks where id=any(p_task_deletes);
    with written as (
      insert into public.tasks(id,version,data,row_version,position_index,updated_at)
      select x->>'id',s.revision+1,x,1,o.position,clock_timestamp()
      from jsonb_array_elements(p_task_upserts) x join unnest(p_task_order) with ordinality o(id,position) on o.id=x->>'id'
      on conflict(id) do update set data=excluded.data,version=excluded.version,
        row_version=public.tasks.row_version+case when public.tasks.data is distinct from excluded.data then 1 else 0 end,
        position_index=excluded.position_index,
        updated_at=case when public.tasks.data is distinct from excluded.data then excluded.updated_at else public.tasks.updated_at end
      where public.tasks.data is distinct from excluded.data or public.tasks.position_index<>excluded.position_index
      returning id
    ) select coalesce(array_agg(id),'{}'::text[]) into changed_ids from written;
    with moved as (
      update public.tasks t set position_index=o.position,version=s.revision+1
      from unnest(p_task_order) with ordinality o(id,position) where t.id=o.id and t.position_index<>o.position returning t.id
    ) select coalesce(array_agg(id),'{}'::text[]) into moved_ids from moved;
    changed_ids:=changed_ids||moved_ids;
    delete from public.task_progress_reports where task_id=any(changed_ids);
    insert into public.task_progress_reports(id,task_id,version,data,updated_at)
      select x.id,x.task_id,s.revision+1,x.data,clock_timestamp()
      from public.kpi_task_report_records((select coalesce(jsonb_agg(t.data),'[]'::jsonb) from public.tasks t where t.id=any(changed_ids))) x;
    perform set_config('kpi.task_mirror_write','',true);
  if m.source_mode='snapshot' then
    -- Keep the complete snapshot authority; the already validated delta above
    -- updates its mirror in this same transaction, without a second full rewrite.
    select coalesce(jsonb_agg(coalesce(x.value,t.data) order by o.position),'[]'::jsonb) into next_tasks
      from unnest(p_task_order) with ordinality o(id,position)
      left join public.tasks t on t.id=o.id
      left join jsonb_array_elements(p_task_upserts) x(value) on x.value->>'id'=o.id;
  end if;
  perform set_config('kpi.snapshot_delta_write','on',true);
  perform set_config('kpi.record_state_commit','on',true);
  update public.kpi_shared_state set state=case when m.source_mode='record-primary' then p_next_state
      else jsonb_set(p_next_state,'{tasks}',next_tasks,true) end,
    revision=s.revision+1,updated_at=clock_timestamp() where id='primary' returning * into s;
  perform set_config('kpi.record_state_commit','',true);
  perform set_config('kpi.snapshot_delta_write','',true);
  select t.row_version into version from public.tasks t where t.id=p_task_id;
  if version is null or (creating and version<>1) or (not creating and version<=p_expected_task_version) then
    raise exception 'Task command did not change its record.' using errcode='22023';
  end if;
  insert into public.kpi_task_command_receipts(actor_id,command_id,task_id,command_name,request_hash,committed_revision,task_version)
    values(p_actor_id,p_command_id,p_task_id,p_command_name,p_request_hash,s.revision,version);
  return query select s.revision,s.updated_at,version,false;
end $$;
create or replace function public.kpi_commit_independent_task_command(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[],
  p_dependency_contract text,p_dependency_state jsonb,p_read_task_versions jsonb,p_source_mode text,
  p_generation_reads jsonb,p_activities jsonb,p_task_field_reads jsonb,p_notifications jsonb
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean,rebased boolean)
language plpgsql security definer set search_path='' as $$
declare lock_deadline timestamptz := clock_timestamp()+interval '750 milliseconds'; s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; committed record;
  ignored text[] := array['bulletins','archiveRecords','publicInvestmentProjects','publicInvestmentAppraisals',
    'evaluations','departmentEvaluations','supportRequests'];
  candidate jsonb; ids text[]; generation_reads jsonb; audit jsonb; entry jsonb; target jsonb; key text;
  feed jsonb; events jsonb; acknowledgements jsonb; compact boolean;
begin
  compact := p_dependency_contract='task-record-appends-v1';
  -- Keep short contention inside one RPC; a longer wait remains unexecuted.
  loop
    select * into s from public.kpi_shared_state where id='primary' for update skip locked;
    exit when found;
    if clock_timestamp()>=lock_deadline then
      raise exception 'Task command store is busy.' using errcode='KPB01';
    end if;
    perform pg_sleep(0.025);
  end loop;
  if (p_dependency_contract is null or p_dependency_contract not in ('task-record-reads-v1','task-record-appends-v1')) or p_command_name is distinct from 'update-progress'
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
  return query select c.next_revision,c.next_updated_at,c.task_version,c.replayed,(s.revision<>p_expected_revision)
    from public.kpi_commit_task_delta_command(s.revision,p_expected_task_version,p_task_id,p_actor_id,p_session_hash,
      p_command_id,p_command_name,p_request_hash,candidate,p_task_upserts,p_task_deletes,p_task_order) c;
exception when undefined_function then
  raise exception 'Independent task commit requires its original writer.' using errcode='KPT01';
end $$;
commit;
