-- Central operator only. Read-only; does not activate the source or repair data.
begin transaction read only;
select public.kpi_task_storage_health() as health_and_switch_preconditions;
select schema_version,source_mode,shared_revision from public.kpi_task_storage_state where id='primary';
select count(*) as tasks,coalesce(sum(jsonb_array_length(
  case when jsonb_typeof(data->'progressReports')='array' then data->'progressReports' else '[]'::jsonb end)),0) as embedded_report_count
from public.tasks;
select count(*) as indexed_reports from public.task_progress_reports;
select has_function_privilege('service_role','public.kpi_set_task_source_mode(text,bigint,text,jsonb)','execute') as edge_can_switch,
  has_table_privilege('service_role','public.kpi_task_storage_state','update') as edge_can_change_mode_directly,
  has_table_privilege('service_role','public.kpi_task_source_switches','select') as edge_can_read_private_backups,
  has_function_privilege('anon','public.kpi_read_task_state()','execute') as anonymous_can_read,
  has_function_privilege('authenticated','public.kpi_read_task_record(text)','execute') as browser_can_read;
select count(*) as retained_switch_records,max(switched_at) as latest_switch from public.kpi_task_source_switches;
rollback;
