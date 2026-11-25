-- Custom application sessions are authorized by kpi-sync. Browser API roles
-- must not bypass that authorization through older public tables or backups.
begin;
set local lock_timeout = '5s';
do $lockdown$
declare
  t record;
  c record;
  p record;
  privilege_name text;
  service_privileges text[];
  remaining_roles text;
begin
  for t in
    select cls.oid, cls.relname from pg_class cls
    join pg_namespace ns on ns.oid = cls.relnamespace
    where ns.nspname = 'public' and cls.relkind in ('r','p') and cls.relname in
      ('access_logs','accounts','archive_records','bulletins','department_evaluations',
       'evaluations','people','project_catalog','system_configs','tasks','task_progress_reports',
       'kpi_shared_state','kpi_sync_sessions')
  loop
    select array_agg(v) into service_privileges
    from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) v
    where has_table_privilege('service_role', t.oid, v);
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', t.relname);
    foreach privilege_name in array coalesce(service_privileges, array[]::text[]) loop
      execute format('grant %s on table public.%I to service_role', privilege_name, t.relname);
    end loop;
    for c in select attname, attnum from pg_attribute
      where attrelid = t.oid and attnum > 0 and not attisdropped
    loop
      select array_agg(v) into service_privileges
      from unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) v
      where has_column_privilege('service_role', t.oid, c.attnum, v);
      execute format('revoke all privileges (%I) on table public.%I from public, anon, authenticated', c.attname, t.relname);
      foreach privilege_name in array coalesce(service_privileges, array[]::text[]) loop
        execute format('grant %s (%I) on table public.%I to service_role', privilege_name, c.attname, t.relname);
      end loop;
    end loop;
    -- Retire browser policy roles, preserving any unrelated explicit DB roles.
    for p in select * from pg_policy where polrelid = t.oid and
      (0::oid = any(polroles) or (select oid from pg_roles where rolname='anon') = any(polroles)
        or (select oid from pg_roles where rolname='authenticated') = any(polroles))
    loop
      select string_agg(quote_ident(r.rolname), ',') into remaining_roles
      from unnest(p.polroles) role_oid join pg_roles r on r.oid = role_oid
      where r.rolname not in ('anon','authenticated');
      execute format('alter policy %I on public.%I to %s', p.polname, t.relname, coalesce(remaining_roles, 'service_role'));
    end loop;
    if has_table_privilege('anon', t.oid, 'SELECT,INSERT,UPDATE,DELETE')
      or has_table_privilege('authenticated', t.oid, 'SELECT,INSERT,UPDATE,DELETE')
      or has_any_column_privilege('anon', t.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
      or has_any_column_privilege('authenticated', t.oid, 'SELECT,INSERT,UPDATE,REFERENCES') then
      raise exception 'Unexpected inherited browser privileges remain on public.%', t.relname;
    end if;
  end loop;
end
$lockdown$;

-- Keep every backup object. Private buckets alone do not prevent a permissive
-- storage.objects policy from listing or downloading private backups.
update storage.buckets set public = false where id = 'backup_data' and public;
do $backup$
begin
  if exists (select 1 from storage.buckets where id = 'backup_data') then
    if not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass
      and polname = 'kpi_private_backups_browser_deny') then
      create policy kpi_private_backups_browser_deny on storage.objects as restrictive
        for all to anon, authenticated
        using (bucket_id <> 'backup_data') with check (bucket_id <> 'backup_data');
    else
      alter policy kpi_private_backups_browser_deny on storage.objects to anon, authenticated
        using (bucket_id <> 'backup_data') with check (bucket_id <> 'backup_data');
    end if;
  end if;
end
$backup$;
commit;
