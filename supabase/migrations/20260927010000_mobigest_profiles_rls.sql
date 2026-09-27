-- MobiGest — perfis, municípios e RLS
-- Fase 4: autorização por perfil + âmbito territorial.
-- Esta migration não cria municípios nem utilizadores reais.

create schema if not exists private;

-- =========================================================
-- 1. Helpers de autorização
-- =========================================================

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$$;

create or replace function private.current_municipality_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.municipality_id
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$$;

create or replace function private.current_post_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.administrative_post_id
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_role()) = 'super_admin', false);
$$;

create or replace function private.same_municipality(target_municipality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_super_admin())
    or (
      target_municipality_id is not null
      and target_municipality_id = (select private.current_municipality_id())
    );
$$;

create or replace function private.same_post_or_municipality(
  target_municipality_id uuid,
  target_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_super_admin())
    or (
      target_municipality_id = (select private.current_municipality_id())
      and (
        (select private.current_post_id()) is null
        or target_post_id is null
        or target_post_id = (select private.current_post_id())
      )
    );
$$;

create or replace function private.authorize(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_super_admin())
    or exists (
      select 1
      from public.profiles p
      join public.role_permissions rp
        on rp.role = p.role
      join public.permissions pe
        on pe.id = rp.permission_id
      where p.id = (select auth.uid())
        and p.status = 'activo'
        and rp.allowed = true
        and pe.code = permission_code
    );
$$;

create or replace function private.can_manage_profile(target_municipality_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_super_admin())
    or (
      (select private.current_role()) = 'admin_municipal'
      and target_municipality_id = (select private.current_municipality_id())
      and target_role <> 'super_admin'
    );
$$;

create or replace function private.owner_in_scope(owner_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.owners o
    where o.id = owner_uuid
      and (select private.same_municipality(o.municipality_id))
  );
$$;

create or replace function private.vehicle_in_scope(vehicle_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vehicles v
    where v.id = vehicle_uuid
      and (select private.same_municipality(v.municipality_id))
  );
$$;

create or replace function private.registration_in_scope(registration_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.registrations r
    where r.id = registration_uuid
      and (select private.same_municipality(r.municipality_id))
  );
$$;

create or replace function private.fiscalization_in_scope(fiscalization_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.fiscalizations f
    where f.id = fiscalization_uuid
      and (select private.same_municipality(f.municipality_id))
  );
$$;

create or replace function private.charge_in_scope(charge_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.charges c
    where c.id = charge_uuid
      and (select private.same_municipality(c.municipality_id))
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;

revoke all on function private.current_role() from public;
revoke all on function private.current_municipality_id() from public;
revoke all on function private.current_post_id() from public;
revoke all on function private.is_super_admin() from public;
revoke all on function private.same_municipality(uuid) from public;
revoke all on function private.same_post_or_municipality(uuid, uuid) from public;
revoke all on function private.authorize(text) from public;
revoke all on function private.can_manage_profile(uuid, text) from public;
revoke all on function private.owner_in_scope(uuid) from public;
revoke all on function private.vehicle_in_scope(uuid) from public;
revoke all on function private.registration_in_scope(uuid) from public;
revoke all on function private.fiscalization_in_scope(uuid) from public;
revoke all on function private.charge_in_scope(uuid) from public;

grant execute on function private.current_role() to authenticated;
grant execute on function private.current_municipality_id() to authenticated;
grant execute on function private.current_post_id() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.same_municipality(uuid) to authenticated;
grant execute on function private.same_post_or_municipality(uuid, uuid) to authenticated;
grant execute on function private.authorize(text) to authenticated;
grant execute on function private.can_manage_profile(uuid, text) to authenticated;
grant execute on function private.owner_in_scope(uuid) to authenticated;
grant execute on function private.vehicle_in_scope(uuid) to authenticated;
grant execute on function private.registration_in_scope(uuid) to authenticated;
grant execute on function private.fiscalization_in_scope(uuid) to authenticated;
grant execute on function private.charge_in_scope(uuid) to authenticated;

-- =========================================================
-- 2. Permissões funcionais
-- =========================================================

insert into public.permissions (code, module, action, description)
values
  ('dashboard.view', 'dashboard', 'consultar', 'Consultar dashboard'),
  ('vehicles.view', 'vehicles', 'consultar', 'Consultar veículos'),
  ('vehicles.create', 'vehicles', 'criar', 'Criar veículos'),
  ('vehicles.update', 'vehicles', 'editar', 'Editar veículos'),
  ('vehicles.status', 'vehicles', 'alterar_estado', 'Alterar estado de veículos'),
  ('owners.view', 'owners', 'consultar', 'Consultar proprietários'),
  ('owners.create', 'owners', 'criar', 'Criar proprietários'),
  ('owners.update', 'owners', 'editar', 'Editar proprietários'),
  ('registrations.view', 'registrations', 'consultar', 'Consultar registos'),
  ('registrations.create', 'registrations', 'criar', 'Criar registos'),
  ('registrations.update', 'registrations', 'editar', 'Editar registos'),
  ('registrations.validate', 'registrations', 'validar', 'Validar registos'),
  ('documents.view', 'documents', 'consultar', 'Consultar documentos'),
  ('documents.create', 'documents', 'criar', 'Adicionar documentos'),
  ('documents.update', 'documents', 'editar', 'Editar documentos'),
  ('documents.validate', 'documents', 'validar', 'Validar documentos'),
  ('ownership.transfer', 'ownership', 'transferir', 'Transferir propriedade'),
  ('fiscalization.view', 'fiscalization', 'consultar', 'Consultar fiscalização'),
  ('fiscalization.create', 'fiscalization', 'criar', 'Registar fiscalização'),
  ('finance.view', 'finance', 'consultar', 'Consultar informação financeira'),
  ('finance.manage', 'finance', 'gerir', 'Gerir taxas, cobranças e pagamentos'),
  ('reports.view', 'reports', 'consultar', 'Consultar relatórios'),
  ('users.view', 'users', 'consultar', 'Consultar utilizadores'),
  ('users.manage', 'users', 'gerir', 'Gerir utilizadores'),
  ('municipalities.view', 'municipalities', 'consultar', 'Consultar municípios'),
  ('municipalities.manage', 'municipalities', 'gerir', 'Gerir municípios'),
  ('audit.view', 'audit', 'consultar', 'Consultar auditoria'),
  ('settings.view', 'settings', 'consultar', 'Consultar definições'),
  ('settings.manage', 'settings', 'gerir', 'Gerir definições')
on conflict (code) do update set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Super Admin recebe todas as permissões.
insert into public.role_permissions (role, permission_id, allowed)
select 'super_admin', p.id, true
from public.permissions p
on conflict (role, permission_id) do update set allowed = excluded.allowed;

-- Administrador Municipal.
insert into public.role_permissions (role, permission_id, allowed)
select 'admin_municipal', p.id, true
from public.permissions p
where p.code in (
  'dashboard.view','vehicles.view','vehicles.create','vehicles.update','vehicles.status',
  'owners.view','owners.create','owners.update',
  'registrations.view','registrations.create','registrations.update','registrations.validate',
  'documents.view','documents.create','documents.update','documents.validate',
  'ownership.transfer','fiscalization.view','fiscalization.create',
  'finance.view','finance.manage','reports.view','users.view','users.manage',
  'settings.view','settings.manage'
)
on conflict (role, permission_id) do update set allowed = excluded.allowed;

-- Técnico.
insert into public.role_permissions (role, permission_id, allowed)
select 'tecnico', p.id, true
from public.permissions p
where p.code in (
  'dashboard.view','vehicles.view','vehicles.create','vehicles.update',
  'owners.view','owners.create','owners.update',
  'registrations.view','registrations.create','registrations.update','registrations.validate',
  'documents.view','documents.create','documents.update','documents.validate',
  'ownership.transfer','reports.view'
)
on conflict (role, permission_id) do update set allowed = excluded.allowed;

-- Fiscal.
insert into public.role_permissions (role, permission_id, allowed)
select 'fiscal', p.id, true
from public.permissions p
where p.code in (
  'dashboard.view','vehicles.view','owners.view','registrations.view',
  'documents.view','fiscalization.view','fiscalization.create','reports.view'
)
on conflict (role, permission_id) do update set allowed = excluded.allowed;

-- Financeiro.
insert into public.role_permissions (role, permission_id, allowed)
select 'financeiro', p.id, true
from public.permissions p
where p.code in (
  'dashboard.view','vehicles.view','owners.view','registrations.view',
  'documents.view','finance.view','finance.manage','reports.view'
)
on conflict (role, permission_id) do update set allowed = excluded.allowed;

-- =========================================================
-- 3. Grants — API só para authenticated, excepto consulta pública
-- =========================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'municipalities','administrative_posts','localities','profiles',
    'permissions','role_permissions','license_plans','licenses','owners',
    'owner_contacts','vehicles','registrations','registration_decisions',
    'documents','document_requirements','vehicle_status_history',
    'ownership_history','numbering_counters','fiscalizations',
    'fiscalization_evidence','fee_configs','charges','payments',
    'notifications','audit_logs','municipal_access_sessions'
  ]
  loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;
end $$;

-- =========================================================
-- 4. Integridade territorial
-- =========================================================

create or replace function private.validate_territory_consistency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_municipality uuid;
  locality_municipality uuid;
  locality_post uuid;
begin
  if new.administrative_post_id is not null then
    select ap.municipality_id
      into post_municipality
    from public.administrative_posts ap
    where ap.id = new.administrative_post_id;

    if post_municipality is null or post_municipality <> new.municipality_id then
      raise exception 'Posto administrativo não pertence ao município indicado';
    end if;
  end if;

  if new.locality_id is not null then
    select l.municipality_id, l.administrative_post_id
      into locality_municipality, locality_post
    from public.localities l
    where l.id = new.locality_id;

    if locality_municipality is null or locality_municipality <> new.municipality_id then
      raise exception 'Localidade não pertence ao município indicado';
    end if;

    if new.administrative_post_id is not null
       and locality_post <> new.administrative_post_id then
      raise exception 'Localidade não pertence ao posto administrativo indicado';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_validate_territory on public.profiles;
create trigger profiles_validate_territory
before insert or update on public.profiles
for each row execute function private.validate_territory_consistency();

drop trigger if exists vehicles_validate_territory on public.vehicles;
create trigger vehicles_validate_territory
before insert or update on public.vehicles
for each row execute function private.validate_territory_consistency();

drop trigger if exists fiscalizations_validate_territory on public.fiscalizations;
create trigger fiscalizations_validate_territory
before insert or update on public.fiscalizations
for each row execute function private.validate_territory_consistency();

create or replace function private.validate_locality_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_municipality uuid;
begin
  select ap.municipality_id
    into post_municipality
  from public.administrative_posts ap
  where ap.id = new.administrative_post_id;

  if post_municipality is null or post_municipality <> new.municipality_id then
    raise exception 'Posto administrativo e localidade devem pertencer ao mesmo município';
  end if;

  return new;
end;
$$;

drop trigger if exists localities_validate_parent on public.localities;
create trigger localities_validate_parent
before insert or update on public.localities
for each row execute function private.validate_locality_parent();

-- =========================================================
-- 5. RLS — municípios e estrutura territorial
-- =========================================================

create policy "municipalities_select_scoped"
on public.municipalities for select to authenticated
using ((select private.is_super_admin()) or id = (select private.current_municipality_id()));

create policy "municipalities_insert_super_admin"
on public.municipalities for insert to authenticated
with check ((select private.is_super_admin()) and (select private.authorize('municipalities.manage')));

create policy "municipalities_update_super_admin"
on public.municipalities for update to authenticated
using ((select private.is_super_admin()) and (select private.authorize('municipalities.manage')))
with check ((select private.is_super_admin()) and (select private.authorize('municipalities.manage')));

create policy "municipalities_delete_super_admin"
on public.municipalities for delete to authenticated
using ((select private.is_super_admin()) and (select private.authorize('municipalities.manage')));

create policy "posts_select_scoped"
on public.administrative_posts for select to authenticated
using ((select private.same_municipality(municipality_id)));

create policy "posts_insert_scoped"
on public.administrative_posts for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

create policy "posts_update_scoped"
on public.administrative_posts for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

create policy "posts_delete_scoped"
on public.administrative_posts for delete to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

create policy "localities_select_scoped"
on public.localities for select to authenticated
using ((select private.same_municipality(municipality_id)));

create policy "localities_insert_scoped"
on public.localities for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

create policy "localities_update_scoped"
on public.localities for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

create policy "localities_delete_scoped"
on public.localities for delete to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

-- =========================================================
-- 6. Perfis e permissões
-- =========================================================

create policy "profiles_select_self_or_manager"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_super_admin())
  or (
    (select private.current_role()) = 'admin_municipal'
    and municipality_id = (select private.current_municipality_id())
  )
);

create policy "profiles_insert_manager"
on public.profiles for insert to authenticated
with check (
  (select private.can_manage_profile(municipality_id, role))
  and (select private.authorize('users.manage'))
);

create policy "profiles_update_manager"
on public.profiles for update to authenticated
using (
  (select private.is_super_admin())
  or (
    (select private.current_role()) = 'admin_municipal'
    and municipality_id = (select private.current_municipality_id())
    and role <> 'super_admin'
    and (select private.authorize('users.manage'))
  )
  or id = (select auth.uid())
)
with check (
  (select private.is_super_admin())
  or (
    (select private.current_role()) = 'admin_municipal'
    and municipality_id = (select private.current_municipality_id())
    and role <> 'super_admin'
    and (select private.authorize('users.manage'))
  )
  or (
    id = (select auth.uid())
    and role = (select private.current_role())
    and municipality_id = (select private.current_municipality_id())
  )
);

create policy "profiles_delete_manager"
on public.profiles for delete to authenticated
using (
  (select private.is_super_admin())
  or (
    (select private.current_role()) = 'admin_municipal'
    and municipality_id = (select private.current_municipality_id())
    and role <> 'super_admin'
    and (select private.authorize('users.manage'))
  )
);

create policy "permissions_read_authenticated"
on public.permissions for select to authenticated
using (true);

create policy "permissions_manage_super_admin"
on public.permissions for all to authenticated
using ((select private.is_super_admin()) and (select private.authorize('settings.manage')))
with check ((select private.is_super_admin()) and (select private.authorize('settings.manage')));

create policy "role_permissions_read_authenticated"
on public.role_permissions for select to authenticated
using (true);

create policy "role_permissions_manage_super_admin"
on public.role_permissions for all to authenticated
using ((select private.is_super_admin()) and (select private.authorize('settings.manage')))
with check ((select private.is_super_admin()) and (select private.authorize('settings.manage')));

-- =========================================================
-- 7. Proprietários
-- =========================================================

create policy "owners_select_scoped"
on public.owners for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('owners.view'))
);

create policy "owners_insert_scoped"
on public.owners for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('owners.create'))
);

create policy "owners_update_scoped"
on public.owners for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('owners.update'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('owners.update'))
);

create policy "owners_delete_admin"
on public.owners for delete to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.current_role()) = 'admin_municipal'
  and (select private.authorize('owners.update'))
);

create policy "owner_contacts_select_scoped"
on public.owner_contacts for select to authenticated
using (
  (select private.owner_in_scope(owner_id))
  and (select private.authorize('owners.view'))
);

create policy "owner_contacts_insert_scoped"
on public.owner_contacts for insert to authenticated
with check (
  (select private.owner_in_scope(owner_id))
  and (select private.authorize('owners.create'))
);

create policy "owner_contacts_update_scoped"
on public.owner_contacts for update to authenticated
using (
  (select private.owner_in_scope(owner_id))
  and (select private.authorize('owners.update'))
)
with check (
  (select private.owner_in_scope(owner_id))
  and (select private.authorize('owners.update'))
);

create policy "owner_contacts_delete_scoped"
on public.owner_contacts for delete to authenticated
using (
  (select private.owner_in_scope(owner_id))
  and (select private.authorize('owners.update'))
);

-- =========================================================
-- 8. Veículos
-- =========================================================

create policy "vehicles_select_scoped"
on public.vehicles for select to authenticated
using (
  (select private.same_post_or_municipality(municipality_id, administrative_post_id))
  and (select private.authorize('vehicles.view'))
);

create policy "vehicles_insert_scoped"
on public.vehicles for insert to authenticated
with check (
  (select private.same_post_or_municipality(municipality_id, administrative_post_id))
  and (select private.authorize('vehicles.create'))
);

create policy "vehicles_update_scoped"
on public.vehicles for update to authenticated
using (
  (select private.same_post_or_municipality(municipality_id, administrative_post_id))
  and (select private.authorize('vehicles.update'))
)
with check (
  (select private.same_post_or_municipality(municipality_id, administrative_post_id))
  and (select private.authorize('vehicles.update'))
);

create policy "vehicles_status_update_scoped"
on public.vehicles for update to authenticated
using (
  (select private.same_post_or_municipality(municipality_id, administrative_post_id))
  and (select private.authorize('vehicles.status'))
)
with check (
  (select private.same_post_or_municipality(municipality_id, administrative_post_id))
  and (select private.authorize('vehicles.status'))
);

create policy "vehicles_delete_admin"
on public.vehicles for delete to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.current_role()) = 'admin_municipal'
);

-- =========================================================
-- 9. Registos e decisões
-- =========================================================

create policy "registrations_select_scoped"
on public.registrations for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('registrations.view'))
);

create policy "registrations_insert_scoped"
on public.registrations for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('registrations.create'))
);

create policy "registrations_update_scoped"
on public.registrations for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('registrations.update'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('registrations.update'))
);

create policy "registrations_delete_admin"
on public.registrations for delete to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.current_role()) = 'admin_municipal'
);

create policy "registration_decisions_select_scoped"
on public.registration_decisions for select to authenticated
using (
  (select private.registration_in_scope(registration_id))
  and (select private.authorize('registrations.view'))
);

create policy "registration_decisions_insert_scoped"
on public.registration_decisions for insert to authenticated
with check (
  (select private.registration_in_scope(registration_id))
  and (select private.authorize('registrations.validate'))
);

-- Decisions are historical and should not be edited/deleted by clients.
-- Future server-side validation RPCs will write them atomically.

-- =========================================================
-- 10. Documentos
-- =========================================================

create policy "documents_select_scoped"
on public.documents for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('documents.view'))
);

create policy "documents_insert_scoped"
on public.documents for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('documents.create'))
);

create policy "documents_update_scoped"
on public.documents for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('documents.update'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('documents.update'))
);

create policy "documents_delete_admin"
on public.documents for delete to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.current_role()) = 'admin_municipal'
);

create policy "document_requirements_select_scoped"
on public.document_requirements for select to authenticated
using ((select private.same_municipality(municipality_id)));

create policy "document_requirements_manage_admin"
on public.document_requirements for all to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('settings.manage'))
);

-- =========================================================
-- 11. Históricos
-- =========================================================

create policy "vehicle_status_history_select_scoped"
on public.vehicle_status_history for select to authenticated
using (
  (select private.vehicle_in_scope(vehicle_id))
  and (select private.authorize('vehicles.view'))
);

create policy "ownership_history_select_scoped"
on public.ownership_history for select to authenticated
using (
  (select private.vehicle_in_scope(vehicle_id))
  and (select private.authorize('vehicles.view'))
);

-- Histórico não recebe INSERT/UPDATE/DELETE directo.
-- Futuras funções transaccionais criarão estes eventos.

-- =========================================================
-- 12. Numeração
-- =========================================================

create policy "numbering_counters_select_admin"
on public.numbering_counters for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (
    (select private.current_role()) in ('super_admin','admin_municipal')
  )
);

create policy "numbering_counters_manage_super_admin"
on public.numbering_counters for all to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

-- O incremento atómico será feito por função PostgreSQL na Fase 7.

-- =========================================================
-- 13. Fiscalização
-- =========================================================

create policy "fiscalizations_select_scoped"
on public.fiscalizations for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('fiscalization.view'))
);

create policy "fiscalizations_insert_scoped"
on public.fiscalizations for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('fiscalization.create'))
);

create policy "fiscalization_evidence_select_scoped"
on public.fiscalization_evidence for select to authenticated
using (
  (select private.fiscalization_in_scope(fiscalization_id))
  and (select private.authorize('fiscalization.view'))
);

create policy "fiscalization_evidence_insert_scoped"
on public.fiscalization_evidence for insert to authenticated
with check (
  (select private.fiscalization_in_scope(fiscalization_id))
  and (select private.authorize('fiscalization.create'))
);

-- =========================================================
-- 14. Financeiro
-- =========================================================

create policy "license_plans_select_authenticated"
on public.license_plans for select to authenticated
using (true);

create policy "license_plans_manage_super_admin"
on public.license_plans for all to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "licenses_select_scoped"
on public.licenses for select to authenticated
using (
  (select private.is_super_admin())
  or (
    municipality_id = (select private.current_municipality_id())
    and (select private.authorize('settings.view'))
  )
);

create policy "licenses_manage_super_admin"
on public.licenses for all to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "fee_configs_select_scoped"
on public.fee_configs for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.view'))
);

create policy "fee_configs_manage_scoped"
on public.fee_configs for all to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.manage'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.manage'))
);

create policy "charges_select_scoped"
on public.charges for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.view'))
);

create policy "charges_insert_scoped"
on public.charges for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.manage'))
);

create policy "charges_update_scoped"
on public.charges for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.manage'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.manage'))
);

create policy "payments_select_scoped"
on public.payments for select to authenticated
using (
  (select private.charge_in_scope(charge_id))
  and (select private.authorize('finance.view'))
);

create policy "payments_insert_scoped"
on public.payments for insert to authenticated
with check (
  (select private.charge_in_scope(charge_id))
  and (select private.authorize('finance.manage'))
);

create policy "payments_update_scoped"
on public.payments for update to authenticated
using (
  (select private.charge_in_scope(charge_id))
  and (select private.authorize('finance.manage'))
)
with check (
  (select private.charge_in_scope(charge_id))
  and (select private.authorize('finance.manage'))
);

-- =========================================================
-- 15. Notificações
-- =========================================================

create policy "notifications_select_own"
on public.notifications for select to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (select private.is_super_admin())
);

create policy "notifications_update_own"
on public.notifications for update to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (select private.is_super_admin())
)
with check (
  recipient_user_id = (select auth.uid())
  or (select private.is_super_admin())
);

-- Criação de notificações fica reservada ao backend/serviços.

-- =========================================================
-- 16. Auditoria
-- =========================================================

create policy "audit_logs_select_scoped"
on public.audit_logs for select to authenticated
using (
  (select private.is_super_admin())
  or (
    municipality_id = (select private.current_municipality_id())
    and (select private.authorize('audit.view'))
  )
);

-- Sem INSERT/UPDATE/DELETE para clientes.
-- A escrita será feita por funções/triggers controlados.

-- =========================================================
-- 17. Acesso temporário do Super Admin
-- =========================================================

create policy "municipal_access_sessions_super_admin"
on public.municipal_access_sessions for all to authenticated
using (
  (select private.is_super_admin())
  and super_admin_id = (select auth.uid())
)
with check (
  (select private.is_super_admin())
  and super_admin_id = (select auth.uid())
);

-- =========================================================
-- 18. Consulta pública segura por código MobiGest
-- =========================================================
-- Não concedemos SELECT público directo à tabela vehicles.
-- Em vez disso, disponibilizamos apenas os campos definidos para consulta pública.

create or replace function public.lookup_vehicle(p_mobigest_number text)
returns table (
  mobigest_number text,
  vehicle_type text,
  make text,
  model text,
  color text,
  manufacture_year integer,
  municipality_name text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.mobigest_number,
    v.vehicle_type,
    v.make,
    v.model,
    v.color,
    v.manufacture_year,
    m.name as municipality_name,
    v.status
  from public.vehicles v
  join public.municipalities m on m.id = v.municipality_id
  where upper(v.mobigest_number) = upper(trim(p_mobigest_number))
    and v.mobigest_number is not null
    and exists (
      select 1
      from public.registrations r
      where r.vehicle_id = v.id
        and r.status = 'aprovada'
    )
  limit 1;
$$;

revoke all on function public.lookup_vehicle(text) from public;
revoke all on function public.lookup_vehicle(text) from anon, authenticated;
grant execute on function public.lookup_vehicle(text) to anon, authenticated;

-- =========================================================
-- 19. Garantias finais
-- =========================================================

-- Mantém RLS activo nas tabelas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'municipalities','administrative_posts','localities','profiles',
    'permissions','role_permissions','license_plans','licenses','owners',
    'owner_contacts','vehicles','registrations','registration_decisions',
    'documents','document_requirements','vehicle_status_history',
    'ownership_history','numbering_counters','fiscalizations',
    'fiscalization_evidence','fee_configs','charges','payments',
    'notifications','audit_logs','municipal_access_sessions'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
