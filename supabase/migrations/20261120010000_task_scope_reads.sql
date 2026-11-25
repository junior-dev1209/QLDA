-- Necessary-candidate reduction only. Edge remains the permission authority.
begin;
do $$ begin
  if to_regprocedure('public.kpi_task_filtered_query_context(text,text,text,boolean,boolean)') is null then
    raise exception 'Install filtered task reads before scope reads.';
  end if;
end $$;

create or replace function public.kpi_task_participant_tuple(p_task jsonb)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('ownerId',p_task->'ownerId','collaboratorIds',p_task->'collaboratorIds','collaboratorId',p_task->'collaboratorId');
$$;
revoke all on function public.kpi_task_participant_tuple(jsonb) from public,anon,authenticated,service_role;
create index if not exists tasks_participant_tuple_gin_idx on public.tasks
  using gin (public.kpi_task_participant_tuple(data) jsonb_path_ops);

create or replace function public.kpi_task_scope_context(
  p_actor_id text,p_period text default null,p_from text default null,p_to text default null,
  p_search boolean default false,p_facets boolean default false
) returns table(revision bigint,updated_at timestamptz,source_mode text,context jsonb,
  participant_index jsonb,task_index jsonb,facet_index jsonb)
language plpgsql stable security definer set search_path='' as $$
declare base record; legacy record; actor jsonb; participants jsonb; facets jsonb := '[]'::jsonb;
begin
  select * into base from public.kpi_task_query_context('',false);
  if not found then raise exception 'Missing task context.' using errcode='KPT01'; end if;
  select a into actor from jsonb_array_elements(base.context->'accounts') a where a->>'id'=p_actor_id;
  -- Only a performance hint: returning all candidates NEVER grants access.
  -- If this hint misses a broad actor, Edge can explicitly request unfiltered candidates.
  if actor->>'role' in ('admin','director') or actor->'accessGrants'->'viewSystemContent'='true'::jsonb then
    select * into legacy from public.kpi_task_filtered_query_context(p_period,p_from,p_to,p_search,p_facets);
    return query select legacy.revision,legacy.updated_at,legacy.source_mode,legacy.context,
      '[]'::jsonb,legacy.task_index,legacy.facet_index;
    return;
  end if;
  if p_facets then
    select coalesce(jsonb_agg(x.item),'[]'::jsonb) into facets from (
      select distinct public.kpi_task_participant_tuple(t.data)||jsonb_build_object(
        'projectId',t.data->'projectId','projectName',t.data->'projectName','kind',t.data->'kind','taskKind',t.data->'taskKind',
        'assignedById',t.data->'assignedById','assignedAt',t.data->'assignedAt','responseStatus',t.data->'responseStatus','responseAt',t.data->'responseAt') item
      from public.tasks t
    ) x;
    -- Derive participant tuples from the already thin facets, not another Task scan.
    select coalesce(jsonb_agg(x.item),'[]'::jsonb) into participants from (
      select distinct public.kpi_task_participant_tuple(f) item from jsonb_array_elements(facets) f
    ) x;
  else
    select coalesce(jsonb_agg(x.item),'[]'::jsonb) into participants from (
      select distinct public.kpi_task_participant_tuple(t.data) item from public.tasks t
    ) x;
  end if;
  return query select base.revision,base.updated_at,base.source_mode,base.context,participants,null::jsonb,facets;
end $$;
revoke all on function public.kpi_task_scope_context(text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.kpi_task_scope_context(text,text,text,text,boolean,boolean) to service_role;

create or replace function public.kpi_task_scoped_candidates(
  p_revision bigint,p_participants jsonb,p_period text default null,p_from text default null,
  p_to text default null,p_search boolean default false
) returns table(revision bigint,task_index jsonb)
language plpgsql stable security definer set search_path='' as $$
declare base record; candidates jsonb; statement text; scopes jsonb[];
begin
  if (p_period is not null and p_period !~ '^\d{4}-(0[1-9]|1[0-2])$')
    or (p_from is not null and p_from !~ '^\d{4}-\d{2}-\d{2}$')
    or (p_to is not null and p_to !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid task filter.' using errcode='22023'; end if;
  if p_participants is not null then
    if jsonb_typeof(p_participants)<>'array' then raise exception 'Invalid participant tuples.' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(p_participants) x where jsonb_typeof(x)<>'object') then
      raise exception 'Invalid participant tuple.' using errcode='22023'; end if;
    select coalesce(array_agg(x),'{}'::jsonb[]) into scopes from jsonb_array_elements(p_participants) x;
  end if;
  select * into base from public.kpi_task_query_context('',false);
  if not found then raise exception 'Missing task context.' using errcode='KPT01'; end if;
  if base.revision<>p_revision then return; end if;
  statement := 'select coalesce(jsonb_agg(public.kpi_task_query_item(t.data,$1) order by t.position_index,t.id),''[]''::jsonb) from public.tasks t where true';
  if p_period is not null then statement:=statement||' and (left(t.due_on,7) collate "C")=$2'; end if;
  if p_from is not null then statement:=statement||' and (t.due_on collate "C") >= $3'; end if;
  if p_to is not null then statement:=statement||' and (t.due_on collate "C") <= $4'; end if;
  if p_participants is not null then statement:=statement||' and public.kpi_task_participant_tuple(t.data) @> any($5)'; end if;
  execute statement into candidates using p_search,p_period,p_from,p_to,scopes;
  return query select base.revision,candidates;
end $$;
revoke all on function public.kpi_task_scoped_candidates(bigint,jsonb,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.kpi_task_scoped_candidates(bigint,jsonb,text,text,text,boolean) to service_role;

create or replace function public.kpi_task_poll_context()
returns table(revision bigint,updated_at timestamptz,source_mode text,context jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id
    where s.id='primary' and m.schema_version=2 and m.shared_revision=s.revision) then
    raise exception 'Task read storage is not synchronized.' using errcode='KPT01'; end if;
  return query select s.revision,s.updated_at,m.source_mode,jsonb_build_object('accounts',s.state->'accounts')
    from public.kpi_shared_state s join public.kpi_task_storage_state m on m.id=s.id where s.id='primary';
end $$;
revoke all on function public.kpi_task_poll_context() from public,anon,authenticated;
grant execute on function public.kpi_task_poll_context() to service_role;
commit;
