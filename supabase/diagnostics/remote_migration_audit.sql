-- MobiGest — auditoria segura do estado remoto das migrations
-- Objectivo:
--   1) comparar o ledger do Supabase com objectos realmente instalados;
--   2) detectar migrations aplicadas manualmente sem entrada no ledger;
--   3) impedir reexecução cega de migrations já materializadas.
--
-- Este script NÃO altera tabelas, dados, políticas ou funções da aplicação.
-- Apenas cria uma tabela TEMPORÁRIA na sessão actual para compor o relatório.

drop table if exists pg_temp.mobigest_migration_audit;

create temporary table mobigest_migration_audit (
  version text primary key,
  migration_file text not null,
  ledger_applied boolean,
  probe_present boolean not null default false,
  evidence text not null default ''
) on commit drop;

create or replace function pg_temp.exists_function(
  p_schema text,
  p_name text
)
returns boolean
language sql
stable
as $
  select exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = p_schema
      and p.proname = p_name
  );
$;

insert into mobigest_migration_audit (version, migration_file) values
('20260927000000','20260927000000_mobigest_initial_schema.sql'),
('20260927010000','20260927010000_mobigest_profiles_rls.sql'),
('20261004070000','20261004070000_drivers_fines.sql'),
('20261004090000','20261004090000_identity_security_hardening.sql'),
('20261004100000','20261004100000_super_admin_municipality_ops.sql'),
('20261004110000','20261004110000_super_admin_municipal_access.sql'),
('20261004120000','20261004120000_territory_ops.sql'),
('20261004130000','20261004130000_owner_ops.sql'),
('20261004140000','20261004140000_vehicle_registration_ops.sql'),
('20261004150000','20261004150000_document_storage.sql'),
('20261004160000','20261004160000_driver_ops.sql'),
('20261004170000','20261004170000_public_lookups.sql'),
('20261004180000','20261004180000_enforcement_fines.sql'),
('20261004190000','20261004190000_finance_ops.sql'),
('20261004200000','20261004200000_audit_access.sql'),
('20261004210000','20261004210000_license_ops.sql'),
('20261004211000','20261004211000_license_module_enforcement.sql'),
('20261004212000','20261004212000_license_module_enforcement_fix.sql'),
('20261004213000','20261004213000_global_reports.sql'),
('20261004214000','20261004214000_platform_health.sql'),
('20261004215000','20261004215000_municipal_reports.sql'),
('20261004216000','20261004216000_numbering_status.sql'),
('20261004217000','20261004217000_document_requirement_ops.sql');

-- Ledger: funciona mesmo se supabase_migrations.schema_migrations não existir.
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute $sql$
      update pg_temp.mobigest_migration_audit a
      set ledger_applied = exists (
        select 1
        from supabase_migrations.schema_migrations sm
        where sm.version::text = a.version
      )
    $sql$;
  else
    update pg_temp.mobigest_migration_audit
    set ledger_applied = null;
  end if;
end
$$;

-- 1. Schema inicial.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regclass('public.municipalities') is not null
    and to_regclass('public.profiles') is not null
    and to_regclass('public.vehicles') is not null
    and to_regclass('public.registrations') is not null
    and to_regclass('public.audit_logs') is not null
    and to_regclass('public.municipal_access_sessions') is not null,
  evidence = 'core tables: municipalities/profiles/vehicles/registrations/audit_logs/municipal_access_sessions'
where version = '20260927000000';

-- 2. RLS e autorização base.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regprocedure('private.authorize(text)') is not null
    and to_regprocedure('private.current_role()') is not null
    and coalesce((
      select c.relrowsecurity
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'profiles'
    ), false)
    and coalesce((
      select c.relrowsecurity
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'vehicles'
    ), false),
  evidence = 'private.authorize/current_role + RLS profiles/vehicles'
where version = '20260927010000';

-- 3. Taxistas/condutores e multas — estrutura.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regclass('public.drivers') is not null
    and to_regclass('public.driver_vehicles') is not null
    and to_regclass('public.fine_types') is not null
    and to_regclass('public.fines') is not null
    and to_regclass('public.driver_numbering_counters') is not null
    and to_regclass('public.fine_numbering_counters') is not null,
  evidence = 'drivers/driver_vehicles/fine_types/fines + counters'
where version = '20261004070000';

-- 4. Hardening de identidade.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regprocedure('private.protect_profile_security_fields()') is not null
    and exists (
      select 1
      from pg_catalog.pg_trigger
      where tgname = 'profiles_protect_security_fields'
        and not tgisinternal
    )
    and exists (
      select 1
      from pg_catalog.pg_trigger
      where tgname = 'drivers_validate_territory'
        and not tgisinternal
    ),
  evidence = 'protect_profile_security_fields + profile/driver hardening triggers'
where version = '20261004090000';

-- 5. Operações globais de municípios.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','super_admin_create_municipality')
    and exists_function('public','super_admin_update_municipality')
    and exists_function('public','super_admin_set_municipality_status'),
  evidence = 'Super Admin municipality RPCs'
where version = '20261004100000';

-- 6. Sessão controlada de assistência municipal.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','super_admin_start_municipal_access')
    and exists_function('public','super_admin_current_municipal_access')
    and exists_function('public','super_admin_end_municipal_access')
    and exists_function('private','current_super_admin_access_municipality'),
  evidence = 'Super Admin municipal access RPCs'
where version = '20261004110000';

-- 7. Estrutura territorial.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','create_administrative_post')
    and exists_function('public','update_administrative_post')
    and exists_function('public','create_locality')
    and exists_function('public','update_locality'),
  evidence = 'administrative post/locality CRUD RPCs'
where version = '20261004120000';

-- 8. Proprietários.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','create_owner')
    and exists_function('public','update_owner')
    and exists (
      select 1
      from pg_catalog.pg_trigger
      where tgname = 'owners_validate_territory'
        and not tgisinternal
    ),
  evidence = 'owner CRUD + territory trigger'
where version = '20261004130000';

-- 9. Veículos e registos.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regclass('public.registration_numbering_counters') is not null
    and exists_function('public','create_vehicle_registration')
    and exists_function('public','decide_registration')
    and exists_function('public','request_vehicle_transfer'),
  evidence = 'vehicle registration/decision/transfer RPCs + registration counter'
where version = '20261004140000';

-- 10. Documentos e Storage.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','create_document_metadata')
    and exists_function('public','validate_document')
    and exists (
      select 1
      from storage.buckets
      where id = 'mobigest-documents'
        and public = false
    ),
  evidence = 'document RPCs + private mobigest-documents bucket'
where version = '20261004150000';

-- 11. Operações de condutores.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regclass('public.driver_reference_counters') is not null
    and exists_function('public','create_driver')
    and exists_function('public','update_driver')
    and exists_function('public','set_driver_status'),
  evidence = 'driver CRUD/status RPCs + reference counters'
where version = '20261004160000';

-- 12. Consultas públicas.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','lookup_public_vehicle')
    and exists_function('public','lookup_public_driver'),
  evidence = 'public vehicle/driver lookup RPCs'
where version = '20261004170000';

-- 13. Fiscalização e multas transaccionais.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','create_fiscalization')
    and exists_function('public','add_fiscalization_evidence')
    and exists_function('public','create_fine_type')
    and exists_function('public','issue_fine')
    and exists_function('public','set_fine_case_status'),
  evidence = 'fiscalization/evidence/fine type/issue fine/status RPCs'
where version = '20261004180000';

-- 14. Financeiro transaccional.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regclass('public.finance_numbering_counters') is not null
    and to_regclass('public.payment_refunds') is not null
    and exists_function('public','create_fee_config')
    and exists_function('public','create_charge')
    and exists_function('public','register_charge_payment')
    and exists_function('public','refund_charge'),
  evidence = 'finance counters/refunds + fee/charge/payment/refund RPCs'
where version = '20261004190000';

-- 15. Auditoria municipal e global.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','list_municipal_audit_logs')
    and exists_function('public','list_global_audit_logs'),
  evidence = 'municipal/global audit RPCs'
where version = '20261004200000';

-- 16. Licenciamento.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regclass('public.license_numbering_counters') is not null
    and exists_function('public','super_admin_create_license')
    and exists_function('public','super_admin_set_license_status')
    and exists_function('public','super_admin_renew_license')
    and exists_function('private','municipality_has_active_license')
    and exists (
      select 1 from pg_catalog.pg_trigger
      where tgname = 'profiles_license_limit_guard' and not tgisinternal
    )
    and exists (
      select 1 from pg_catalog.pg_trigger
      where tgname = 'vehicles_license_limit_guard' and not tgisinternal
    ),
  evidence = 'license RPCs/counter/enforcement triggers'
where version = '20261004210000';

-- 17. Enforcement de módulos da licença.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('private','permission_module')
    and to_regprocedure('private.license_allows_permission(uuid,text)') is not null,
  evidence = 'permission_module + license_allows_permission'
where version = '20261004211000';

-- 18. Fix estrito: a função final NÃO deve conceder acesso por "core".
update pg_temp.mobigest_migration_audit
set
  probe_present =
    to_regprocedure('private.license_allows_permission(uuid,text)') is not null
    and position(
      'p.modules ? ''core'''
      in pg_get_functiondef(
        to_regprocedure('private.license_allows_permission(uuid,text)')
      )
    ) = 0,
  evidence = 'license_allows_permission final definition has no generic core bypass'
where version = '20261004212000';

-- 19. Relatório global.
update pg_temp.mobigest_migration_audit
set
  probe_present = exists_function('public','super_admin_global_report'),
  evidence = 'super_admin_global_report RPC'
where version = '20261004213000';

-- 20. Saúde da plataforma.
update pg_temp.mobigest_migration_audit
set
  probe_present = exists_function('public','super_admin_platform_health'),
  evidence = 'super_admin_platform_health RPC'
where version = '20261004214000';

-- 21. Relatório municipal.
update pg_temp.mobigest_migration_audit
set
  probe_present = exists_function('public','municipal_operational_report'),
  evidence = 'municipal_operational_report RPC'
where version = '20261004215000';

-- 22. Estado da numeração.
update pg_temp.mobigest_migration_audit
set
  probe_present = exists_function('public','current_mobigest_numbering_status'),
  evidence = 'current_mobigest_numbering_status RPC'
where version = '20261004216000';

-- 23. Requisitos documentais auditados.
update pg_temp.mobigest_migration_audit
set
  probe_present =
    exists_function('public','create_document_requirement')
    and exists_function('public','update_document_requirement'),
  evidence = 'document requirement create/update RPCs'
where version = '20261004217000';

select
  version,
  migration_file,
  case
    when ledger_applied is true then 'RECORDED'
    when ledger_applied is false then 'NOT_RECORDED'
    else 'NO_LEDGER'
  end as ledger_status,
  case
    when probe_present then 'PRESENT'
    else 'MISSING_OR_PARTIAL'
  end as object_status,
  case
    when ledger_applied is true and probe_present then 'OK'
    when ledger_applied is true and not probe_present then 'DRIFT_INVESTIGATE'
    when coalesce(ledger_applied, false) is false and probe_present
      then 'PRESENTE_SEM_HISTORICO'
    else 'APLICAR'
  end as recommended_action,
  evidence
from pg_temp.mobigest_migration_audit
order by version;

-- Resumo para decisão rápida.
select
  case
    when ledger_applied is true and probe_present then 'OK'
    when ledger_applied is true and not probe_present then 'DRIFT_INVESTIGATE'
    when coalesce(ledger_applied, false) is false and probe_present
      then 'PRESENTE_SEM_HISTORICO'
    else 'APLICAR'
  end as recommended_action,
  count(*) as total
from pg_temp.mobigest_migration_audit
group by 1
order by 1;
