-- Request-local retry reads only; the existing CAS writer is unchanged.
begin;
do $$ begin
  if to_regprocedure('public.kpi_task_write_context(text)') is null then
    raise exception 'Install task write context before retry reads.';
  end if;
end $$;

create index if not exists tasks_changed_revision_idx on public.tasks(version,id);

-- Aggregate bodies, versions and completeness in one Task scan, one MVCC view.
create or replace function public.kpi_task_write_context(p_task_id text)
returns table(revision bigint,updated_at timestamptz,state jsonb,source_mode text,task_versions jsonb,full_task_ids jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
    where s.id='primary' and m.schema_version=2 and m.shared_revision=s.revision) then
    raise exception 'Task write storage is not synchronized.' using errcode='KPT01'; end if;
  return query select s.revision,s.updated_at,jsonb_set(s.state-'tasks','{tasks}',body.items,true),
    m.source_mode,body.versions,body.full_ids
  from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
  cross join lateral (
    select coalesce(jsonb_agg(case when t.id=p_task_id then t.data else t.data-array['progressReports','attachments'] end
        order by t.position_index,t.id),'[]'::jsonb) items,
      coalesce(jsonb_object_agg(t.id,t.row_version),'{}'::jsonb) versions,
      coalesce(jsonb_agg(t.id) filter(where t.id=p_task_id),'[]'::jsonb) full_ids
    from public.tasks t
  ) body where s.id='primary';
end $$;
revoke all on function public.kpi_task_write_context(text) from public,anon,authenticated;
grant execute on function public.kpi_task_write_context(text) to service_role;

create or replace function public.kpi_task_retry_context(p_task_id text,p_after_revision bigint,p_source_mode text)
returns table(revision bigint,updated_at timestamptz,state jsonb,source_mode text,
  task_versions jsonb,task_order jsonb,changed_tasks jsonb,reset_required boolean)
language plpgsql stable security definer set search_path='' as $$
declare s public.kpi_shared_state%rowtype; m public.kpi_task_storage_state%rowtype;
begin
  if p_after_revision is null or p_after_revision<=0 or p_source_mode is null
    or p_source_mode not in ('snapshot','record-primary') or coalesce(p_task_id,'')='' then
    raise exception 'Invalid retry context envelope.' using errcode='22023'; end if;
  select * into s from public.kpi_shared_state where id='primary';
  select * into m from public.kpi_task_storage_state where id='primary';
  if s.revision is null or m.schema_version is distinct from 2 or m.shared_revision is distinct from s.revision
    or m.source_mode not in ('snapshot','record-primary') or s.revision<p_after_revision then
    raise exception 'Task retry storage is not synchronized.' using errcode='KPT01'; end if;
  if m.source_mode<>p_source_mode then
    return query select s.revision,s.updated_at,'{}'::jsonb,m.source_mode,
      '{}'::jsonb,'[]'::jsonb,'[]'::jsonb,true;
    return;
  end if;
  return query select s.revision,s.updated_at,s.state-'tasks',m.source_mode,
    headers.versions,headers.ids,
    coalesce((select jsonb_agg(case when t.id=p_task_id then t.data else t.data-array['progressReports','attachments'] end
      order by t.position_index,t.id) from public.tasks t where t.version>p_after_revision or t.id=p_task_id),'[]'::jsonb),false
  from (
    select coalesce(jsonb_object_agg(t.id,t.row_version),'{}'::jsonb) versions,
      coalesce(jsonb_agg(t.id order by t.position_index,t.id),'[]'::jsonb) ids from public.tasks t
  ) headers;
end $$;
revoke all on function public.kpi_task_retry_context(text,bigint,text) from public,anon,authenticated;
grant execute on function public.kpi_task_retry_context(text,bigint,text) to service_role;
commit;
