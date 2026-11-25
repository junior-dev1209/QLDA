-- Batch only derived notification/audit projections after an authorized commit.
-- No Task/history/source/permission changes and no data rewrite on installation.
begin;
create or replace function public.kpi_project_task_side_effects(
  p_revision bigint,p_notifications jsonb,p_notification_deletes text[],
  p_activities jsonb,p_activity_deletes text[],p_server_activities jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare rows jsonb; activity_table text; item jsonb; seen timestamptz;
begin
  if p_revision is null or p_revision<1
    or p_revision>(select revision from public.kpi_shared_state where id='primary')
    or jsonb_typeof(p_notifications) is distinct from 'array'
    or jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_typeof(p_server_activities) is distinct from 'array'
    or p_notification_deletes is null or p_activity_deletes is null
    or jsonb_array_length(p_notifications)>200 or jsonb_array_length(p_activities)>200
    or jsonb_array_length(p_server_activities)>200
    or cardinality(p_notification_deletes)>200 or cardinality(p_activity_deletes)>200
    or octet_length(jsonb_build_array(p_notifications,p_activities,p_server_activities,p_notification_deletes,p_activity_deletes)::text)>2000000
    or exists(select 1 from unnest(p_notification_deletes||p_activity_deletes) id where id is null or btrim(id)='') then
    raise exception 'Invalid Task projection batch.' using errcode='22023';
  end if;
  foreach rows in array array[p_notifications,p_activities,p_server_activities] loop
    if exists(select 1 from jsonb_array_elements(rows) x group by x->>'id' having count(*)>1) then
      raise exception 'Duplicate Task projection ID.' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(rows) loop
      if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string'
        or coalesce(item->>'id','')='' or item->'version' is distinct from to_jsonb(p_revision)
        or jsonb_typeof(item->'data') is distinct from 'object' or item->'data'->>'id' is distinct from item->>'id'
        or jsonb_typeof(item->'updated_at') is distinct from 'string' then
        raise exception 'Invalid Task projection row.' using errcode='22023'; end if;
      seen:=(item->>'updated_at')::timestamptz;
      if not isfinite(seen) then raise exception 'Invalid Task projection time.' using errcode='22023'; end if;
    end loop;
  end loop;
  activity_table:=case when to_regclass('public.kpi_record_activity_log') is not null then 'kpi_record_activity_log' else 'activity_log' end;
  insert into public.notifications as stored(id,version,data,updated_at)
    select x.id,x.version,x.data,x.updated_at from jsonb_to_recordset(p_notifications) x(id text,version bigint,data jsonb,updated_at timestamptz)
    on conflict(id) do update set version=excluded.version,data=excluded.data,updated_at=excluded.updated_at
    where stored.version<=excluded.version;
  delete from public.notifications where id=any(p_notification_deletes) and version<=p_revision;
  execute format('insert into public.%I as stored(id,version,data,updated_at)
    select x.id,x.version,x.data,x.updated_at from jsonb_to_recordset($1) x(id text,version bigint,data jsonb,updated_at timestamptz)
    on conflict(id) do update set version=excluded.version,data=excluded.data,updated_at=excluded.updated_at
    where stored.version<=excluded.version',activity_table) using p_activities;
  execute format('delete from public.%I where id=any($1) and version<=$2',activity_table) using p_activity_deletes,p_revision;
  execute format('insert into public.%I as stored(id,version,data,updated_at)
    select x.id,x.version,x.data,x.updated_at from jsonb_to_recordset($1) x(id text,version bigint,data jsonb,updated_at timestamptz)
    on conflict(id) do update set version=excluded.version,data=excluded.data,updated_at=excluded.updated_at
    where stored.version<=excluded.version',activity_table) using p_server_activities;
  insert into public.kpi_record_projection_state as stored(id,shared_revision,updated_at)
    values('primary',p_revision,clock_timestamp()) on conflict(id) do update
    set shared_revision=greatest(stored.shared_revision,excluded.shared_revision),updated_at=excluded.updated_at;
  return true;
end $$;
revoke all on function public.kpi_project_task_side_effects(bigint,jsonb,text[],jsonb,text[],jsonb) from public,anon,authenticated;
grant execute on function public.kpi_project_task_side_effects(bigint,jsonb,text[],jsonb,text[],jsonb) to service_role;
commit;
