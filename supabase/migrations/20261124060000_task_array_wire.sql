-- Lossless transport adapter. All writes still use the original delta writer.
begin;
create or replace function public.kpi_task_metadata_wire_context(
  p_task_id text,p_after_revision bigint default null,p_source_mode text default null,
  p_directory_epoch bigint default null,p_metadata_epoch bigint default null
) returns table(revision bigint,updated_at timestamptz,source_mode text,state jsonb,
  directory_epoch bigint,directory_complete boolean,directory jsonb,changed_tasks jsonb,checkpoint_version integer,
  metadata_epoch bigint,metadata_complete boolean,array_base_hashes jsonb)
language plpgsql stable security definer set search_path='' as $$
declare base record; hashes jsonb:='{}'; key text;
begin
  select * into base from public.kpi_task_metadata_context(p_task_id,p_after_revision,p_source_mode,p_directory_epoch,p_metadata_epoch);
  foreach key in array array['notifications','activityLog'] loop
    if jsonb_typeof(base.state->key)='array' then
      hashes:=jsonb_set(hashes,array[key],to_jsonb(encode(sha256(convert_to((base.state->key)::text,'UTF8')),'hex')),true);
    end if;
  end loop;
  return query select base.revision,base.updated_at,base.source_mode,base.state,base.directory_epoch,base.directory_complete,
    base.directory,base.changed_tasks,base.checkpoint_version,base.metadata_epoch,base.metadata_complete,hashes;
end $$;
revoke all on function public.kpi_task_metadata_wire_context(text,bigint,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.kpi_task_metadata_wire_context(text,bigint,text,bigint,bigint) to service_role;

create or replace function public.kpi_expand_task_array_wire(p_base jsonb,p_parts jsonb)
returns jsonb language plpgsql immutable security definer set search_path='' as $$
declare part jsonb; count_rows bigint:=0; decoded_bytes bigint; result jsonb; start_index integer; run_length integer;
begin
  if jsonb_typeof(p_base) is distinct from 'array' or jsonb_typeof(p_parts) is distinct from 'array'
    or jsonb_array_length(p_base)>10000 or jsonb_array_length(p_parts)>10000 or octet_length(p_parts::text)>4000000 then
    raise exception 'Invalid Task array transport.' using errcode='22023'; end if;
  for part in select value from jsonb_array_elements(p_parts) loop
    if jsonb_typeof(part)='array' then
      if jsonb_array_length(part)<>2 or jsonb_typeof(part->0)<>'number' or jsonb_typeof(part->1)<>'number'
        or (part->>0)!~'^(0|[1-9][0-9]{0,4})$' or (part->>1)!~'^[1-9][0-9]{0,4}$' then
        raise exception 'Invalid Task array range.' using errcode='22023'; end if;
      start_index:=(part->>0)::integer; run_length:=(part->>1)::integer;
      if start_index+run_length>jsonb_array_length(p_base) then raise exception 'Task array range exceeds baseline.' using errcode='22023'; end if;
      count_rows:=count_rows+run_length;
    elsif jsonb_typeof(part)='object' and part ? 'value' and (select count(*) from jsonb_object_keys(part))=1 then
      count_rows:=count_rows+1;
    else raise exception 'Invalid Task array literal.' using errcode='22023'; end if;
    if count_rows>10000 then raise exception 'Task array expansion is too large.' using errcode='22023'; end if;
  end loop;
  -- Expand baseline TOAST once. Check the decoded byte budget before aggregation.
  with baseline as materialized (
    select n-1 as id,octet_length(value::text) as bytes from jsonb_array_elements(p_base) with ordinality x(value,n)
  ), expanded as (
    select p.value,i.n from jsonb_array_elements(p_parts) p(value)
      cross join lateral generate_series(0,case when jsonb_typeof(p.value)='array' then (p.value->>1)::integer-1 else 0 end) i(n)
  ) select coalesce(sum(case when jsonb_typeof(e.value)='array' then b.bytes else octet_length((e.value->'value')::text) end),0)
      +greatest(count_rows-1,0)*2+2 into decoded_bytes
    from expanded e left join baseline b on jsonb_typeof(e.value)='array' and b.id=(e.value->>0)::integer+e.n;
  if decoded_bytes>4000000 then raise exception 'Task array decoded bytes exceed limit.' using errcode='22023'; end if;
  with baseline as materialized (
    select n-1 as id,value from jsonb_array_elements(p_base) with ordinality x(value,n)
  ), expanded as (
    select p.value,p.n as part_number,i.n from jsonb_array_elements(p_parts) with ordinality p(value,n)
      cross join lateral generate_series(0,case when jsonb_typeof(p.value)='array' then (p.value->>1)::integer-1 else 0 end) i(n)
  ) select coalesce(jsonb_agg(case when jsonb_typeof(e.value)='array' then b.value else e.value->'value' end order by e.part_number,e.n),'[]')
    into result from expanded e left join baseline b on jsonb_typeof(e.value)='array' and b.id=(e.value->>0)::integer+e.n;
  return result;
end $$;
revoke all on function public.kpi_expand_task_array_wire(jsonb,jsonb) from public,anon,authenticated,service_role;

create or replace function public.kpi_commit_task_delta_wire(
  p_expected_revision bigint,p_expected_task_version bigint,p_task_id text,p_actor_id text,p_session_hash text,
  p_command_id text,p_command_name text,p_request_hash text,p_next_state jsonb,
  p_task_upserts jsonb,p_task_deletes text[],p_task_order text[],p_array_patches jsonb
) returns table(next_revision bigint,next_updated_at timestamptz,task_version bigint,replayed boolean)
language plpgsql security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; candidate jsonb; item record;
  lock_deadline timestamptz:=clock_timestamp()+interval '750 milliseconds';
begin
  loop
    select * into s from public.kpi_shared_state where id='primary' for update skip locked;
    exit when found;
    if clock_timestamp()>=lock_deadline then raise exception 'Task command store is busy.' using errcode='KPB01'; end if;
    perform pg_sleep(0.025);
  end loop;
  -- Preserve the original authentication/receipt/CAS ordering on replays or stale reads.
  if s.revision<>p_expected_revision or exists(select 1 from public.kpi_task_command_receipts
    where actor_id=p_actor_id and command_id=p_command_id) then
    return query select * from public.kpi_commit_task_delta_command(p_expected_revision,p_expected_task_version,p_task_id,p_actor_id,p_session_hash,
      p_command_id,p_command_name,p_request_hash,'{}',p_task_upserts,p_task_deletes,p_task_order); return;
  end if;
  if jsonb_typeof(p_next_state) is distinct from 'object' or jsonb_typeof(p_array_patches) is distinct from 'object'
    or (select count(*) from jsonb_object_keys(p_array_patches)) not between 1 and 2
    or octet_length(jsonb_build_array(p_next_state,p_array_patches)::text)>2000000 then
    raise exception 'Invalid Task root transport.' using errcode='22023'; end if;
  candidate:=p_next_state;
  for item in select key,value from jsonb_each(p_array_patches) loop
    if item.key not in ('notifications','activityLog') or candidate ? item.key or jsonb_typeof(item.value) is distinct from 'object'
      or (select count(*) from jsonb_object_keys(item.value))<>2 or not(item.value ?& array['base_hash','parts'])
      or jsonb_typeof(item.value->'base_hash') is distinct from 'string' or (item.value->>'base_hash')!~'^[a-f0-9]{64}$'
      or jsonb_typeof(s.state->item.key) is distinct from 'array' then
      raise exception 'Invalid Task array baseline proof.' using errcode='22023'; end if;
    if item.value->>'base_hash' is distinct from encode(sha256(convert_to((s.state->item.key)::text,'UTF8')),'hex') then return; end if;
    candidate:=jsonb_set(candidate,array[item.key],public.kpi_expand_task_array_wire(s.state->item.key,item.value->'parts'),true);
  end loop;
  return query select * from public.kpi_commit_task_delta_command(p_expected_revision,p_expected_task_version,p_task_id,p_actor_id,p_session_hash,
    p_command_id,p_command_name,p_request_hash,candidate,p_task_upserts,p_task_deletes,p_task_order);
end $$;
revoke all on function public.kpi_commit_task_delta_wire(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],jsonb) from public,anon,authenticated;
grant execute on function public.kpi_commit_task_delta_wire(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[],jsonb) to service_role;
commit;
