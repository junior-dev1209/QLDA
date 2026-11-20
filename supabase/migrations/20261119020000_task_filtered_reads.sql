-- Additive read optimization only: no business data rewrite or source-mode change.
begin;
do $$ begin
  if to_regprocedure('public.kpi_task_query_context(text,boolean)') is null then
    raise exception 'Install task page reads before filtered task reads.';
  end if;
end $$;

create index if not exists tasks_query_period_position_idx
  on public.tasks ((left(due_on,7) collate "C"),position_index,id);
create index if not exists tasks_query_due_position_idx
  on public.tasks ((due_on collate "C"),position_index,id);

create or replace function public.kpi_task_query_item(p_task jsonb,p_search boolean)
returns jsonb language sql immutable set search_path = '' as $$
  select (p_task - array['progressReports','attachments','customFields','note','blockerNote','deadlineExtensionReason'])
    || case when p_search then jsonb_build_object('note',p_task->'note',
      'queryReports',coalesce((select string_agg(coalesce(r.value->>'note',''),' ' order by r.ordinality)
        from jsonb_array_elements(case when jsonb_typeof(p_task->'progressReports')='array'
          then p_task->'progressReports' else '[]'::jsonb end) with ordinality r(value,ordinality)),''),
      'queryFiles',coalesce((select string_agg(coalesce(f.value->>'name',''),' ' order by f.ordinality)
        from jsonb_array_elements(case when jsonb_typeof(p_task->'attachments')='array'
          then p_task->'attachments' else '[]'::jsonb end) with ordinality f(value,ordinality)),''))
    else '{}'::jsonb end;
$$;
revoke all on function public.kpi_task_query_item(jsonb,boolean) from public,anon,authenticated,service_role;

create or replace function public.kpi_task_filtered_query_context(
  p_period text default null,p_from text default null,p_to text default null,
  p_search boolean default false,p_facets boolean default false
)
returns table(revision bigint,updated_at timestamptz,source_mode text,context jsonb,task_index jsonb,facet_index jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare base record; candidates jsonb; facets jsonb := '[]'::jsonb; statement text;
begin
  if (p_period is not null and p_period !~ '^\d{4}-(0[1-9]|1[0-2])$')
    or (p_from is not null and p_from !~ '^\d{4}-\d{2}-\d{2}$')
    or (p_to is not null and p_to !~ '^\d{4}-\d{2}-\d{2}$') then
    raise exception 'Invalid task filter.' using errcode='22023';
  end if;
  -- The empty ID obtains only the existing MVCC context/storage guard, not a task index.
  select * into base from public.kpi_task_query_context('',false);
  if not found then raise exception 'Missing task context.' using errcode='KPT01'; end if;
  -- Only fixed fragments are composed. Bound values keep sparse-period/range plans indexable.
  statement := 'select coalesce(jsonb_agg(public.kpi_task_query_item(t.data,$1) order by t.position_index,t.id),''[]''::jsonb) from public.tasks t where true';
  if p_period is not null then statement := statement || ' and (left(t.due_on,7) collate "C")=$2'; end if;
  if p_from is not null then statement := statement || ' and (t.due_on collate "C") >= $3'; end if;
  if p_to is not null then statement := statement || ' and (t.due_on collate "C") <= $4'; end if;
  execute statement into candidates using p_search,p_period,p_from,p_to;
  if p_facets then
    -- Filter choices span all authorized periods. Coalesce repeated participant/project tuples,
    -- not task IDs; the Edge applies its original ACL to these thin tuples before exposing choices.
    select coalesce(jsonb_agg(f.item),'[]'::jsonb) into facets from (
      select distinct jsonb_build_object('ownerId',t.data->'ownerId','collaboratorIds',t.data->'collaboratorIds',
        'collaboratorId',t.data->'collaboratorId','projectId',t.data->'projectId','projectName',t.data->'projectName',
        'kind',t.data->'kind','taskKind',t.data->'taskKind','assignedById',t.data->'assignedById',
        'assignedAt',t.data->'assignedAt','responseStatus',t.data->'responseStatus','responseAt',t.data->'responseAt') item
      from public.tasks t
    ) f;
  end if;
  return query select base.revision,base.updated_at,base.source_mode,base.context,candidates,facets;
end $$;
revoke all on function public.kpi_task_filtered_query_context(text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.kpi_task_filtered_query_context(text,text,text,boolean,boolean) to service_role;
commit;
