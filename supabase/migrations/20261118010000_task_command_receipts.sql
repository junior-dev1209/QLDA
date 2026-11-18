-- Phase 2a preparation only: the snapshot is still the sole writer.
begin;
lock table public.kpi_shared_state in share row exclusive mode;
do $$ begin
  if not coalesce((public.kpi_task_storage_health()->>'synchronized')::boolean, false) then
    raise exception 'Task storage must be synchronized before enabling command receipts.';
  end if;
end $$;

create table if not exists public.kpi_task_command_receipts (
  actor_id text not null,
  command_id text not null check (length(command_id) between 1 and 160),
  task_id text not null,
  command_name text not null check (command_name in ('save-task', 'update-progress', 'submit-completion',
    'review-completion', 'request-extension', 'review-extension')),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  committed_revision bigint not null,
  task_version bigint not null,
  committed_at timestamptz not null default now(),
  primary key(actor_id, command_id)
);
create index if not exists kpi_task_command_receipts_task_idx
  on public.kpi_task_command_receipts(task_id, committed_at);
alter table public.kpi_task_command_receipts enable row level security;
revoke all on public.kpi_task_command_receipts from public, anon, authenticated, service_role;
grant select on public.kpi_task_command_receipts to service_role;

create or replace function public.kpi_commit_task_command(
  p_expected_revision bigint, p_expected_task_version bigint, p_task_id text,
  p_actor_id text, p_session_hash text, p_command_id text, p_command_name text,
  p_request_hash text, p_next_state jsonb
)
returns table(next_revision bigint, next_updated_at timestamptz, task_version bigint, replayed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  current_snapshot public.kpi_shared_state%rowtype;
  receipt public.kpi_task_command_receipts%rowtype;
  current_task_version bigint;
  candidate jsonb;
begin
  if p_expected_revision is null or p_expected_revision <= 0
    or p_expected_task_version is null or p_expected_task_version <= 0
    or coalesce(length(p_command_id), 0) not between 1 and 160
    or p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_next_state) is distinct from 'object' then
    raise exception 'Invalid task command envelope.' using errcode = '22023';
  end if;
  select * into current_snapshot from public.kpi_shared_state where id = 'primary' for update;
  if not found then raise exception 'Central data is not initialized.' using errcode = 'KPC01'; end if;

  -- Holding the session row also prevents logout/revocation from racing commit.
  perform 1 from public.kpi_sync_sessions where token_hash = p_session_hash
    and account_id = p_actor_id and expires_at > clock_timestamp() for share;
  if not found then raise exception 'Authentication required.' using errcode = 'KPA01'; end if;
  if not exists (select 1 from jsonb_array_elements(current_snapshot.state->'accounts') a
      where a->>'id' = p_actor_id and coalesce(a->'disabled', 'false'::jsonb) in ('false'::jsonb, 'null'::jsonb, '0'::jsonb, '""'::jsonb)) then
    raise exception 'Authentication required.' using errcode = 'KPA01';
  end if;

  select * into receipt from public.kpi_task_command_receipts
    where actor_id = p_actor_id and command_id = p_command_id;
  if found then
    if receipt.task_id <> p_task_id or receipt.command_name <> p_command_name or receipt.request_hash <> p_request_hash then
      raise exception 'Command id was already used for a different request.' using errcode = 'KPC01';
    end if;
    return query select current_snapshot.revision, current_snapshot.updated_at, receipt.task_version, true;
    return;
  end if;
  -- A changed global revision forces the Edge to reload/re-authorize/rebase.
  if current_snapshot.revision <> p_expected_revision then return; end if;
  select t.row_version into current_task_version from public.tasks t where t.id = p_task_id;
  if not found or current_task_version <> p_expected_task_version then return; end if;
  select t into candidate from jsonb_array_elements(p_next_state->'tasks') t where t->>'id' = p_task_id;
  if candidate is null or not exists (
    select 1 from jsonb_array_elements(candidate->'progressReports') r where r->>'id' = p_command_id
  ) then raise exception 'Task command has no committed audit report.' using errcode = '22023'; end if;

  update public.kpi_shared_state set state = p_next_state, revision = revision + 1, updated_at = clock_timestamp()
    where id = 'primary' returning * into current_snapshot;
  -- The phase 1 trigger commits task/report/side-effect snapshot changes atomically.
  select t.row_version into current_task_version from public.tasks t where t.id = p_task_id;
  if current_task_version <= p_expected_task_version then
    raise exception 'Task command did not change its record.' using errcode = '22023';
  end if;
  insert into public.kpi_task_command_receipts(actor_id, command_id, task_id, command_name, request_hash,
    committed_revision, task_version)
  values(p_actor_id, p_command_id, p_task_id, p_command_name, p_request_hash, current_snapshot.revision, current_task_version);
  return query select current_snapshot.revision, current_snapshot.updated_at, current_task_version, false;
end;
$$;
revoke all on function public.kpi_commit_task_command(bigint,bigint,text,text,text,text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.kpi_commit_task_command(bigint,bigint,text,text,text,text,text,text,jsonb) to service_role;
commit;
