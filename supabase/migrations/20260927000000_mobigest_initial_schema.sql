-- MobiGest — arquitectura inicial da base de dados
-- Fase 3: modelo relacional. RLS/politicas serão fechadas na Fase 4.
-- Não contém dados de municípios ou utilizadores de demonstração.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{2,10}$'),
  province text not null,
  area text,
  institutional_phone text,
  institutional_email text,
  address text,
  status text not null default 'configuracao'
    check (status in ('configuracao','activo','suspenso','inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.administrative_posts (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  name text not null,
  code text,
  status text not null default 'activo'
    check (status in ('activo','inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, name),
  unique (municipality_id, code)
);

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  administrative_post_id uuid not null references public.administrative_posts(id) on delete restrict,
  name text not null,
  code text,
  type text not null default 'localidade'
    check (type in ('localidade','bairro','povoacao','outro')),
  status text not null default 'activo'
    check (status in ('activo','inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (administrative_post_id, name),
  unique (administrative_post_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null
    check (role in ('super_admin','admin_municipal','tecnico','fiscal','financeiro')),
  municipality_id uuid references public.municipalities(id) on delete restrict,
  administrative_post_id uuid references public.administrative_posts(id) on delete restrict,
  status text not null default 'activo'
    check (status in ('activo','suspenso','inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_municipality_idx on public.profiles(municipality_id);
create index profiles_post_idx on public.profiles(administrative_post_id);
create index profiles_role_idx on public.profiles(role);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role text not null
    check (role in ('super_admin','admin_municipal','tecnico','fiscal','financeiro')),
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (role, permission_id)
);

create table public.license_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_users integer,
  max_vehicles integer,
  modules jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_users is null or max_users > 0),
  check (max_vehicles is null or max_vehicles > 0)
);

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  plan_id uuid not null references public.license_plans(id) on delete restrict,
  license_code text not null unique,
  starts_at date,
  ends_at date,
  status text not null default 'em_configuracao'
    check (status in ('em_configuracao','activa','suspensa','expirada','cancelada')),
  max_users integer,
  max_vehicles integer,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index licenses_municipality_idx on public.licenses(municipality_id);
create index licenses_status_idx on public.licenses(status);

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  full_name text not null,
  document_type text,
  document_number text,
  nuit text,
  phone text,
  alternate_phone text,
  email text,
  address text,
  notes text,
  status text not null default 'activo'
    check (status in ('activo','inactivo','bloqueado')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index owners_municipality_idx on public.owners(municipality_id);
create index owners_document_idx on public.owners(document_type, document_number);
create index owners_phone_idx on public.owners(phone);

create table public.owner_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  full_name text not null,
  relationship text,
  primary_phone text,
  alternate_phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index owner_contacts_owner_idx on public.owner_contacts(owner_id);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  administrative_post_id uuid references public.administrative_posts(id) on delete restrict,
  locality_id uuid references public.localities(id) on delete restrict,
  current_owner_id uuid references public.owners(id) on delete restrict,
  vehicle_type text not null
    check (vehicle_type in ('motorizada','carro','bicicleta')),
  mobigest_number text unique,
  qr_code text unique,
  plate_number text,
  chassis_number text,
  frame_number text,
  engine_number text,
  make text,
  model text,
  color text,
  manufacture_year integer check (manufacture_year is null or manufacture_year between 1900 and 2100),
  commercial_status text not null default 'normal'
    check (commercial_status in ('normal','a_venda')),
  status text not null default 'activa'
    check (status in ('activa','suspensa','roubada','apreendida','cancelada')),
  registration_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_municipality_idx on public.vehicles(municipality_id);
create index vehicles_owner_idx on public.vehicles(current_owner_id);
create index vehicles_type_idx on public.vehicles(vehicle_type);
create index vehicles_status_idx on public.vehicles(status);
create index vehicles_chassis_idx on public.vehicles(chassis_number);
create index vehicles_frame_idx on public.vehicles(frame_number);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  owner_id uuid not null references public.owners(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  status text not null default 'pendente'
    check (status in ('pendente','em_validacao','correccao','aprovada','rejeitada','cancelada')),
  submitted_at timestamptz,
  validated_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  correction_requested_at timestamptz,
  decision_observation text,
  created_by uuid references public.profiles(id) on delete set null,
  validated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index registrations_municipality_idx on public.registrations(municipality_id);
create index registrations_status_idx on public.registrations(status);
create index registrations_owner_idx on public.registrations(owner_id);
create index registrations_vehicle_idx on public.registrations(vehicle_id);

create table public.registration_decisions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  decision text not null
    check (decision in ('aprovada','correccao','rejeitada')),
  observation text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default now()
);

create index registration_decisions_registration_idx
  on public.registration_decisions(registration_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  owner_id uuid references public.owners(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  document_type text not null,
  file_path text,
  document_number text,
  issued_at date,
  expires_at date,
  status text not null default 'nao_apresentado'
    check (status in ('nao_apresentado','em_validacao','validado','rejeitado','expirado')),
  rejection_reason text,
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_one_subject check (
    num_nonnulls(owner_id, vehicle_id, registration_id) = 1
  ),
  check (expires_at is null or issued_at is null or expires_at >= issued_at)
);

create index documents_municipality_idx on public.documents(municipality_id);
create index documents_owner_idx on public.documents(owner_id);
create index documents_vehicle_idx on public.documents(vehicle_id);
create index documents_registration_idx on public.documents(registration_id);
create index documents_status_idx on public.documents(status);

create table public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  vehicle_type text
    check (vehicle_type is null or vehicle_type in ('motorizada','carro','bicicleta')),
  document_code text not null,
  label text not null,
  required boolean not null default true,
  expiry_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, vehicle_type, document_code)
);

create table public.vehicle_status_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  previous_status text,
  new_status text not null
    check (new_status in ('activa','suspensa','roubada','apreendida','cancelada')),
  reason text,
  occurrence_reference text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index vehicle_status_history_vehicle_idx
  on public.vehicle_status_history(vehicle_id, changed_at desc);

create table public.ownership_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  previous_owner_id uuid references public.owners(id) on delete restrict,
  new_owner_id uuid not null references public.owners(id) on delete restrict,
  registration_id uuid references public.registrations(id) on delete set null,
  operation text not null
    check (operation in ('registo_inicial','transferencia')),
  reason text,
  effective_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ownership_history_vehicle_idx
  on public.ownership_history(vehicle_id, effective_at desc);

create table public.numbering_counters (
  municipality_id uuid primary key references public.municipalities(id) on delete cascade,
  current_value bigint not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now()
);

create table public.fiscalizations (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  administrative_post_id uuid references public.administrative_posts(id) on delete restrict,
  locality_id uuid references public.localities(id) on delete restrict,
  result text not null
    check (result in ('regular','irregular','pendente','nao_localizado','outro')),
  occurrence text,
  observation text,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  fiscal_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index fiscalizations_municipality_idx on public.fiscalizations(municipality_id);
create index fiscalizations_vehicle_idx on public.fiscalizations(vehicle_id);
create index fiscalizations_occurred_idx on public.fiscalizations(occurred_at desc);

create table public.fiscalization_evidence (
  id uuid primary key default gen_random_uuid(),
  fiscalization_id uuid not null references public.fiscalizations(id) on delete cascade,
  file_path text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fee_configs (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  code text not null,
  name text not null,
  vehicle_type text
    check (vehicle_type is null or vehicle_type in ('motorizada','carro','bicicleta')),
  amount numeric(14,2) not null check (amount >= 0),
  valid_from date not null,
  valid_to date,
  active boolean not null default true,
  conditions text,
  exemption_allowed boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, code, valid_from),
  check (valid_to is null or valid_to >= valid_from)
);

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  fee_config_id uuid references public.fee_configs(id) on delete restrict,
  registration_id uuid references public.registrations(id) on delete set null,
  owner_id uuid references public.owners(id) on delete set null,
  service_type text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'MZN',
  status text not null default 'pendente'
    check (status in ('pendente','em_confirmacao','pago','cancelado','reembolsado')),
  exemption boolean not null default false,
  exemption_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index charges_municipality_idx on public.charges(municipality_id);
create index charges_status_idx on public.charges(status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges(id) on delete restrict,
  method text not null
    check (method in ('numerario','pos','transferencia','pagamento_movel','outro')),
  amount numeric(14,2) not null check (amount >= 0),
  reference text,
  receipt_number text,
  paid_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_charge_idx on public.payments(charge_id);
create index payments_paid_at_idx on public.payments(paid_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  municipality_id uuid references public.municipalities(id) on delete set null,
  category text not null,
  severity text not null default 'info'
    check (severity in ('info','success','warning','critical')),
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications(recipient_user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  municipality_id uuid references public.municipalities(id) on delete set null,
  module text not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  result text,
  reference text,
  old_values jsonb,
  new_values jsonb,
  observation text,
  origin text,
  created_at timestamptz not null default now()
);

create index audit_logs_municipality_idx on public.audit_logs(municipality_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs(action, created_at desc);

create table public.municipal_access_sessions (
  id uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null references public.profiles(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  mode text not null check (mode in ('consulta','assistencia')),
  reason text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  status text not null default 'activa'
    check (status in ('activa','terminada','expirada','cancelada')),
  audit_reference text,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create index municipal_access_sessions_super_admin_idx
  on public.municipal_access_sessions(super_admin_id, starts_at desc);
create index municipal_access_sessions_municipality_idx
  on public.municipal_access_sessions(municipality_id, starts_at desc);

create index localities_municipality_idx on public.localities(municipality_id);
create index localities_post_idx on public.localities(administrative_post_id);

create trigger municipalities_set_updated_at
before update on public.municipalities
for each row execute function public.set_updated_at();

create trigger administrative_posts_set_updated_at
before update on public.administrative_posts
for each row execute function public.set_updated_at();

create trigger localities_set_updated_at
before update on public.localities
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger license_plans_set_updated_at
before update on public.license_plans
for each row execute function public.set_updated_at();

create trigger licenses_set_updated_at
before update on public.licenses
for each row execute function public.set_updated_at();

create trigger owners_set_updated_at
before update on public.owners
for each row execute function public.set_updated_at();

create trigger owner_contacts_set_updated_at
before update on public.owner_contacts
for each row execute function public.set_updated_at();

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create trigger registrations_set_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger document_requirements_set_updated_at
before update on public.document_requirements
for each row execute function public.set_updated_at();

create trigger fee_configs_set_updated_at
before update on public.fee_configs
for each row execute function public.set_updated_at();

create trigger charges_set_updated_at
before update on public.charges
for each row execute function public.set_updated_at();

-- RLS fica ligado desde a criação. As políticas serão adicionadas na Fase 4.
-- Sem políticas, os dados ficam fechados até o desenho de autorização estar concluído.
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
