-- Run AFTER both 20261118 migrations, as the central database operator.
-- This does not repair data, delete history or switch the task source.
begin transaction read only;
select public.kpi_task_storage_health() as task_storage;
select to_regprocedure('public.kpi_commit_task_command(bigint,bigint,text,text,text,text,text,text,jsonb)') as command_rpc,
  has_function_privilege('anon', 'public.kpi_commit_task_command(bigint,bigint,text,text,text,text,text,text,jsonb)', 'execute') as anon_can_execute,
  has_function_privilege('authenticated', 'public.kpi_commit_task_command(bigint,bigint,text,text,text,text,text,text,jsonb)', 'execute') as authenticated_can_execute,
  has_function_privilege('service_role', 'public.kpi_commit_task_command(bigint,bigint,text,text,text,text,text,text,jsonb)', 'execute') as edge_can_execute;
select count(*) as retained_receipts, min(committed_at) as oldest_receipt, max(committed_at) as latest_receipt
from public.kpi_task_command_receipts;
rollback;
