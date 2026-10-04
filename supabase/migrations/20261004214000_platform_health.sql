-- MobiGest — diagnóstico técnico seguro para o Super Administrador

create or replace function public.super_admin_platform_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_required_tables text[] := array[
    'municipalities',
    'administrative_posts',
    'localities',
    'profiles',
    'owners',
    'vehicles',
    'registrations',
    'documents',
    'fiscalizations',
    'drivers',
    'fine_types',
    'fines',
    'fee_configs',
    'charges',
    'payments',
    'notifications',
    'audit_logs',
    'license_plans',
    'licenses',
    'municipal_access_sessions'
  ];
  v_required_table_count integer;
  v_rls_count integer;
  v_policy_count integer;
  v_storage_bucket boolean;
  v_finance_ops boolean;
  v_license_ops boolean;
  v_enforcement_ops boolean;
  v_document_ops boolean;
  v_audit_ops boolean;
begin
  if not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode consultar a saúde da plataforma';
  end if;

  select count(*)
    into v_required_table_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any(v_required_tables);

  select count(*)
    into v_rls_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any(v_required_tables)
    and c.relrowsecurity;

  select count(*)
    into v_policy_count
  from pg_catalog.pg_policies p
  where p.schemaname in ('public','storage');

  select exists (
    select 1
    from storage.buckets b
    where b.id = 'mobigest-documents'
      and b.public = false
  )
  into v_storage_bucket;

  select
    exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'register_charge_payment'
    )
    and exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'refund_charge'
    )
  into v_finance_ops;

  select
    exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'super_admin_create_license'
    )
    and exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private'
        and p.proname = 'license_allows_permission'
    )
  into v_license_ops;

  select
    exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'create_driver'
    )
    and exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'issue_fine'
    )
  into v_enforcement_ops;

  select
    v_storage_bucket
    and exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'create_document_metadata'
    )
    and exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'validate_document'
    )
  into v_document_ops;

  select
    exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'list_global_audit_logs'
    )
    and exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'list_municipal_audit_logs'
    )
  into v_audit_ops;

  return jsonb_build_object(
    'checked_at', now(),
    'database', jsonb_build_object(
      'required_tables', cardinality(v_required_tables),
      'present_tables', v_required_table_count,
      'ok', v_required_table_count = cardinality(v_required_tables)
    ),
    'rls', jsonb_build_object(
      'required_tables', cardinality(v_required_tables),
      'enabled_tables', v_rls_count,
      'policy_count', v_policy_count,
      'ok', v_rls_count = cardinality(v_required_tables)
    ),
    'storage', jsonb_build_object(
      'bucket', 'mobigest-documents',
      'private_bucket_exists', v_storage_bucket,
      'ok', v_storage_bucket
    ),
    'features', jsonb_build_object(
      'finance', v_finance_ops,
      'licenses', v_license_ops,
      'drivers_and_fines', v_enforcement_ops,
      'documents', v_document_ops,
      'audit', v_audit_ops
    )
  );
end;
$$;

revoke all on function public.super_admin_platform_health() from public;
grant execute on function public.super_admin_platform_health() to authenticated;
