-- Metadata and aggregate counts only. Run with the CLI --read-only flag.
-- No personal rows, password values, tokens or application writes are returned.
select jsonb_build_object(
  'tables', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', c.relname, 'rls', c.relrowsecurity,
    'anon', jsonb_build_object('select', has_table_privilege('anon', c.oid, 'SELECT'),
      'insert', has_table_privilege('anon', c.oid, 'INSERT'),
      'update', has_table_privilege('anon', c.oid, 'UPDATE'),
      'delete', has_table_privilege('anon', c.oid, 'DELETE'),
      'columnSelect', has_any_column_privilege('anon', c.oid, 'SELECT')),
    'authenticated', jsonb_build_object('select', has_table_privilege('authenticated', c.oid, 'SELECT'),
      'insert', has_table_privilege('authenticated', c.oid, 'INSERT'),
      'update', has_table_privilege('authenticated', c.oid, 'UPDATE'),
      'delete', has_table_privilege('authenticated', c.oid, 'DELETE'),
      'columnSelect', has_any_column_privilege('authenticated', c.oid, 'SELECT')),
    'service', jsonb_build_object('select', has_table_privilege('service_role', c.oid, 'SELECT'),
      'insert', has_table_privilege('service_role', c.oid, 'INSERT'),
      'update', has_table_privilege('service_role', c.oid, 'UPDATE'),
      'delete', has_table_privilege('service_role', c.oid, 'DELETE'))
  ) order by c.relname), '[]'::jsonb)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname in
    ('access_logs','accounts','archive_records','bulletins','department_evaluations',
     'evaluations','people','project_catalog','system_configs','tasks','task_progress_reports','kpi_shared_state','kpi_sync_sessions')),
  'policies', (select coalesce(jsonb_agg(to_jsonb(p) order by tablename, policyname), '[]'::jsonb)
    from pg_policies p where schemaname = 'public' and tablename in
    ('access_logs','accounts','archive_records','bulletins','department_evaluations',
     'evaluations','people','project_catalog','system_configs','tasks','task_progress_reports')),
  'buckets', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id), '[]'::jsonb)
    from storage.buckets where id in ('backup_data', 'kpi-files')),
  'storagePolicies', (select coalesce(jsonb_agg(to_jsonb(p) order by policyname), '[]'::jsonb)
    from pg_policies p where schemaname = 'storage' and tablename = 'objects'),
  'publicDefinerFunctions', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid),
    'returnType', p.prorettype::regtype::text,
    'apiCallableType', p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype),
    'anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE')) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and
      (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  'passwordCounts', (select jsonb_build_object('accounts', count(*),
    'hashed', count(*) filter (where a->>'passwordAlgorithm' = 'pbkdf2-sha256-v1'
      and coalesce(a->>'passwordHash','') <> '' and coalesce(a->>'passwordSalt','') <> ''),
    'legacy', count(*) filter (where coalesce(a->>'password','') <> ''))
    from public.kpi_shared_state s cross join lateral jsonb_array_elements(s.state->'accounts') a
    where s.id = 'primary')
) as audit;
