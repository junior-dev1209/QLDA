-- Read-only preflight. Run centrally on a restored staging dataset first.
-- Every result set below must be empty before applying the task migration.
select id, jsonb_typeof(state->'tasks') as task_type
from public.kpi_shared_state
where state ? 'tasks' and jsonb_typeof(state->'tasks') <> 'array';

with source as (
  select jsonb_array_elements(case when jsonb_typeof(state->'tasks') = 'array' then state->'tasks' else '[]'::jsonb end) value
  from public.kpi_shared_state where id = 'primary'
)
select value from source where jsonb_typeof(value) <> 'object' or coalesce(btrim(value->>'id'), '') = '';

with source as (
  select jsonb_array_elements(case when jsonb_typeof(state->'tasks') = 'array' then state->'tasks' else '[]'::jsonb end) value
  from public.kpi_shared_state where id = 'primary'
)
select value->>'id' task_id, count(*) copies from source group by value->>'id' having count(*) > 1;

with tasks as (
  select jsonb_array_elements(case when jsonb_typeof(state->'tasks') = 'array' then state->'tasks' else '[]'::jsonb end) value
  from public.kpi_shared_state where id = 'primary'
), reports as (
  select t.value->>'id' task_id,
    coalesce(nullif(btrim(r.value->>'id'), ''), (t.value->>'id') || ':report:' || r.ordinality::text) report_id
  from tasks t cross join lateral jsonb_array_elements(
    case when jsonb_typeof(t.value->'progressReports') = 'array' then t.value->'progressReports' else '[]'::jsonb end
  ) with ordinality r(value, ordinality) where jsonb_typeof(r.value) = 'object'
)
select report_id, array_agg(task_id) task_ids from reports group by report_id having count(*) > 1;
