-- Same snapshot authority and transaction. Materialize IDs once, and rebuild
-- history only for changed tasks instead of expanding all histories per row.
begin;
create or replace function public.kpi_write_task_records(p_tasks jsonb, p_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare changed_ids text[]; changed_tasks jsonb;
begin
  if jsonb_typeof(p_tasks) is distinct from 'array'
    or exists(select 1 from jsonb_array_elements(p_tasks) t where jsonb_typeof(t) <> 'object' or coalesce(btrim(t->>'id'),'') = '')
    or exists(select 1 from jsonb_array_elements(p_tasks) t group by t->>'id' having count(*) > 1)
    or exists(select 1 from public.kpi_task_report_records(p_tasks) r group by r.id having count(*) > 1) then
    raise exception 'Invalid or duplicate task/history ids; no data changed.' using errcode = '22023';
  end if;
  perform set_config('kpi.task_mirror_write', 'on', true);
  with written as (
    insert into public.tasks(id, version, data, row_version, position_index, updated_at)
    select t.value->>'id', greatest(1,p_revision), t.value, 1, t.ordinality, clock_timestamp()
      from jsonb_array_elements(p_tasks) with ordinality t(value,ordinality)
      left join public.tasks previous on previous.id=t.value->>'id'
      where previous.id is null or previous.data is distinct from t.value or previous.position_index<>t.ordinality
    on conflict(id) do update set data=excluded.data, version=excluded.version,
      row_version=public.tasks.row_version + case when public.tasks.data is distinct from excluded.data then 1 else 0 end,
      position_index=excluded.position_index,
      updated_at=case when public.tasks.data is distinct from excluded.data then excluded.updated_at else public.tasks.updated_at end
    where public.tasks.data is distinct from excluded.data or public.tasks.position_index <> excluded.position_index
    returning id,data
  ) select coalesce(array_agg(id),'{}'::text[]),coalesce(jsonb_agg(data),'[]'::jsonb)
    into changed_ids,changed_tasks from written;

  delete from public.task_progress_reports where task_id=any(changed_ids);
  with source_ids as materialized (select t->>'id' as id from jsonb_array_elements(p_tasks) t)
    delete from public.task_progress_reports r where not exists(select 1 from source_ids s where s.id=r.task_id);
  insert into public.task_progress_reports(id,task_id,version,data,updated_at)
    select r.id,r.task_id,greatest(1,p_revision),r.data,clock_timestamp()
    from public.kpi_task_report_records(changed_tasks) r;
  with source_ids as materialized (select t->>'id' as id from jsonb_array_elements(p_tasks) t)
    delete from public.tasks t where not exists(select 1 from source_ids s where s.id=t.id);
  perform set_config('kpi.task_mirror_write', '', true);
end $$;
revoke all on function public.kpi_write_task_records(jsonb,bigint) from public,anon,authenticated,service_role;
commit;
