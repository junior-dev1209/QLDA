-- Additive read protocol for the existing delta writer. No data/source changes.
begin;
do $$ begin
  if to_regprocedure('public.kpi_commit_task_delta_command(bigint,bigint,text,text,text,text,text,text,jsonb,jsonb,text[],text[])') is null
    or to_regprocedure('public.kpi_task_page_records(text[],bigint)') is null then
    raise exception 'Install task page reads and delta commands before write context.';
  end if;
end $$;
create or replace function public.kpi_task_write_context(p_task_id text)
returns table(revision bigint,updated_at timestamptz,state jsonb,source_mode text,task_versions jsonb,full_task_ids jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
    where s.id='primary' and m.schema_version=2 and m.shared_revision=s.revision) then
    raise exception 'Task write storage is not synchronized.' using errcode='KPT01';
  end if;
  return query select s.revision,s.updated_at,jsonb_set(s.state-'tasks','{tasks}',
    coalesce((select jsonb_agg(case when t.id=p_task_id then t.data else t.data-array['progressReports','attachments'] end
      order by t.position_index,t.id) from public.tasks t),'[]'::jsonb),true),m.source_mode,
    coalesce((select jsonb_object_agg(t.id,t.row_version) from public.tasks t),'{}'::jsonb),
    coalesce((select jsonb_agg(t.id) from public.tasks t where t.id=p_task_id),'[]'::jsonb)
  from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
end $$;
revoke all on function public.kpi_task_write_context(text) from public,anon,authenticated;
grant execute on function public.kpi_task_write_context(text) to service_role;
commit;
