-- Read validation only. Existing business writers and source mode are unchanged.
begin;
-- Match the canonical writer's lock order before changing the observer schema.
lock table public.kpi_shared_state in exclusive mode;
lock table public.tasks in share row exclusive mode;
do $$ begin
  if to_regprocedure('public.kpi_task_retry_context(text,bigint,text)') is null then
    raise exception 'Install task retry context before directory checkpoints.';
  end if;
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean,false) then
    raise exception 'Task storage must be synchronized before directory checkpoints.';
  end if;
end $$;
alter table public.kpi_task_storage_state add column if not exists directory_epoch bigint not null default 0;

create or replace function public.kpi_track_task_directory()
returns trigger language plpgsql security definer set search_path='' as $$
declare invalidate boolean := false; shared_revision bigint;
begin
  if tg_op='INSERT' then
    invalidate := exists(select 1 from new_task_rows);
  elsif tg_op='DELETE' then
    invalidate := exists(select 1 from old_task_rows);
  elsif tg_op='TRUNCATE' then
    invalidate := true;
  else
    select s.revision into shared_revision from public.kpi_shared_state s where s.id='primary';
    select exists(select 1 from old_task_rows o full join new_task_rows n on n.id=o.id
      where o.id is null or n.id is null or n.position_index is distinct from o.position_index
        or case when n.version<=o.version or n.version<shared_revision then
          n.data is distinct from o.data or n.row_version is distinct from o.row_version
        else false end) into invalidate;
  end if;
  if invalidate then
    update public.kpi_task_storage_state set directory_epoch=directory_epoch+1 where id='primary';
    if not found then raise exception 'Task directory marker is missing.' using errcode='KPT01'; end if;
  end if;
  return null;
end $$;
revoke all on function public.kpi_track_task_directory() from public,anon,authenticated,service_role;
create or replace trigger kpi_task_directory_insert after insert on public.tasks
  referencing new table as new_task_rows for each statement execute function public.kpi_track_task_directory();
create or replace trigger kpi_task_directory_delete after delete on public.tasks
  referencing old table as old_task_rows for each statement execute function public.kpi_track_task_directory();
create or replace trigger kpi_task_directory_update after update on public.tasks
  referencing old table as old_task_rows new table as new_task_rows for each statement execute function public.kpi_track_task_directory();
create or replace trigger kpi_task_directory_truncate after truncate on public.tasks
  for each statement execute function public.kpi_track_task_directory();

create or replace function public.kpi_task_directory_ready()
returns boolean language sql stable security definer set search_path='' as $$
  select count(*)=4 from pg_catalog.pg_trigger t join (values
    ('kpi_task_directory_insert',4,null::text,'new_task_rows'),
    ('kpi_task_directory_delete',8,'old_task_rows',null::text),
    ('kpi_task_directory_update',16,'old_task_rows','new_task_rows'),
    ('kpi_task_directory_truncate',32,null::text,null::text)
  ) e(name,event,old_rows,new_rows) on t.tgname=e.name
  where t.tgrelid='public.tasks'::regclass and not t.tgisinternal and t.tgenabled in ('O','A') and t.tgtype=e.event
    and t.tgfoid='public.kpi_track_task_directory()'::regprocedure
    and t.tgoldtable is not distinct from e.old_rows and t.tgnewtable is not distinct from e.new_rows;
$$;
revoke all on function public.kpi_task_directory_ready() from public,anon,authenticated,service_role;

create or replace function public.kpi_task_checkpoint_context(
  p_task_id text,p_after_revision bigint default null,p_source_mode text default null,p_directory_epoch bigint default null
) returns table(revision bigint,updated_at timestamptz,source_mode text,state jsonb,
  directory_epoch bigint,directory_complete boolean,directory jsonb,changed_tasks jsonb,checkpoint_version integer)
language plpgsql stable security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype; complete boolean;
begin
  if coalesce(p_task_id,'')='' or (p_after_revision is not null and (p_after_revision<=0 or p_source_mode is null
    or p_source_mode not in ('snapshot','record-primary') or p_directory_epoch is null or p_directory_epoch<0)) then
    raise exception 'Invalid task directory checkpoint.' using errcode='22023'; end if;
  select * into s from public.kpi_shared_state where id='primary';
  select * into m from public.kpi_task_storage_state where id='primary';
  if s.revision is null or m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision
    or m.source_mode not in ('snapshot','record-primary') or m.directory_epoch is null or m.directory_epoch<0
    or (p_after_revision is not null and s.revision<p_after_revision) or not public.kpi_task_directory_ready() then
    raise exception 'Task checkpoint storage is not synchronized.' using errcode='KPT01'; end if;
  complete := p_after_revision is null or m.source_mode is distinct from p_source_mode or m.directory_epoch is distinct from p_directory_epoch;
  if complete then
    return query select s.revision,s.updated_at,m.source_mode,s.state-'tasks',m.directory_epoch,true,
      coalesce(jsonb_agg(jsonb_build_array(t.id,t.row_version) order by t.position_index,t.id),'[]'::jsonb),
      coalesce(jsonb_agg(case when t.id=p_task_id then t.data else t.data-array['progressReports','attachments'] end
        order by t.position_index,t.id),'[]'::jsonb),1 from public.tasks t;
  else
    -- Fixed membership/order plus monotonic change stamps prove untouched headers.
    return query select s.revision,s.updated_at,m.source_mode,s.state-'tasks',m.directory_epoch,false,
      coalesce(jsonb_agg(jsonb_build_array(t.id,t.row_version) order by t.position_index,t.id),'[]'::jsonb),
      coalesce(jsonb_agg(case when t.id=p_task_id then t.data else t.data-array['progressReports','attachments'] end
        order by t.position_index,t.id),'[]'::jsonb),1 from public.tasks t where t.version>p_after_revision or t.id=p_task_id;
  end if;
end $$;
revoke all on function public.kpi_task_checkpoint_context(text,bigint,text,bigint) from public,anon,authenticated;
grant execute on function public.kpi_task_checkpoint_context(text,bigint,text,bigint) to service_role;
commit;
