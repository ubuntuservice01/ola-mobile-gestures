-- MobiGest — operações financeiras institucionais, referências, pagamentos e reembolsos

alter table public.charges
  add column if not exists reference text,
  add column if not exists vehicle_id uuid
    references public.vehicles(id) on delete set null,
  add column if not exists note text,
  add column if not exists updated_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists exemption_approved_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists exemption_approved_at timestamptz;

alter table public.payments
  add column if not exists note text;

alter table public.charges
  drop constraint if exists charges_status_check;

alter table public.charges
  add constraint charges_status_check
  check (
    status in (
      'pendente',
      'em_confirmacao',
      'pago',
      'cancelado',
      'reembolsado',
      'isento'
    )
  );

create unique index if not exists charges_reference_unique_idx
  on public.charges(reference)
  where reference is not null;

create unique index if not exists payments_receipt_unique_idx
  on public.payments(receipt_number)
  where receipt_number is not null;

create unique index if not exists payments_one_confirmed_per_charge_idx
  on public.payments(charge_id)
  where paid_at is not null;

create table if not exists public.finance_numbering_counters (
  municipality_id uuid not null
    references public.municipalities(id) on delete cascade,
  series text not null
    check (series in ('COB','REC','RMB')),
  year integer not null
    check (year between 2000 and 2100),
  current_value bigint not null default 0
    check (current_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (municipality_id, series, year)
);

revoke all on public.finance_numbering_counters from anon, authenticated;
grant select, insert, update, delete on public.finance_numbering_counters to service_role;
alter table public.finance_numbering_counters enable row level security;

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null
    references public.municipalities(id) on delete restrict,
  charge_id uuid not null
    references public.charges(id) on delete restrict,
  payment_id uuid not null
    references public.payments(id) on delete restrict,
  reference text not null unique,
  amount numeric(14,2) not null check (amount >= 0),
  reason text not null,
  refunded_at timestamptz not null default now(),
  refunded_by uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (charge_id)
);

create index if not exists payment_refunds_municipality_idx
  on public.payment_refunds(municipality_id, refunded_at desc);

revoke all on public.payment_refunds from anon;
grant select on public.payment_refunds to authenticated;
grant select, insert, update, delete on public.payment_refunds to service_role;
alter table public.payment_refunds enable row level security;

drop policy if exists payment_refunds_select_scoped on public.payment_refunds;
create policy payment_refunds_select_scoped
on public.payment_refunds
for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('finance.view'))
);

create or replace function private.next_finance_reference(
  p_municipality_id uuid,
  p_series text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_year integer := extract(year from now())::integer;
  v_value bigint;
begin
  if p_series not in ('COB','REC','RMB') then
    raise exception 'Série financeira inválida';
  end if;

  select code into v_code
  from public.municipalities
  where id = p_municipality_id;

  if v_code is null then
    raise exception 'Município não encontrado';
  end if;

  insert into public.finance_numbering_counters (
    municipality_id,
    series,
    year,
    current_value
  )
  values (
    p_municipality_id,
    p_series,
    v_year,
    1
  )
  on conflict (municipality_id, series, year)
  do update set
    current_value = public.finance_numbering_counters.current_value + 1,
    updated_at = now()
  returning current_value into v_value;

  return
    p_series || '-' ||
    upper(v_code) || '-' ||
    v_year::text || '-' ||
    lpad(v_value::text, 6, '0');
end;
$$;

revoke all on function private.next_finance_reference(uuid,text) from public;

create or replace function private.assign_charge_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference is null or trim(new.reference) = '' then
    new.reference :=
      private.next_finance_reference(new.municipality_id, 'COB');
  end if;

  return new;
end;
$$;

revoke all on function private.assign_charge_reference() from public;

drop trigger if exists charges_assign_reference on public.charges;
create trigger charges_assign_reference
before insert on public.charges
for each row execute function private.assign_charge_reference();

do $$
declare
  v_charge record;
begin
  for v_charge in
    select id, municipality_id
    from public.charges
    where reference is null
    order by created_at, id
  loop
    update public.charges
    set reference =
      private.next_finance_reference(v_charge.municipality_id, 'COB')
    where id = v_charge.id;
  end loop;
end $$;

alter table public.charges
  alter column reference set not null;

create or replace function public.create_fee_config(
  p_code text,
  p_name text,
  p_vehicle_type text,
  p_amount numeric,
  p_valid_from date,
  p_valid_to date default null,
  p_active boolean default true,
  p_conditions text default null,
  p_exemption_allowed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality uuid := (select private.current_operational_municipality_id());
  v_id uuid;
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_operate_in_municipality(
    v_municipality,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para gerir taxas';
  end if;

  if nullif(trim(p_code), '') is null
     or nullif(trim(p_name), '') is null
     or p_amount is null
     or p_amount < 0
     or p_valid_from is null then
    raise exception 'Dados da taxa inválidos';
  end if;

  if p_vehicle_type is not null
     and p_vehicle_type not in ('motorizada','carro','bicicleta') then
    raise exception 'Tipo de veículo inválido';
  end if;

  if p_valid_to is not null and p_valid_to < p_valid_from then
    raise exception 'Fim de validade anterior ao início';
  end if;

  insert into public.fee_configs (
    municipality_id,
    code,
    name,
    vehicle_type,
    amount,
    valid_from,
    valid_to,
    active,
    conditions,
    exemption_allowed,
    created_by,
    updated_by
  )
  values (
    v_municipality,
    upper(trim(p_code)),
    trim(p_name),
    p_vehicle_type,
    p_amount,
    p_valid_from,
    p_valid_to,
    p_active,
    nullif(trim(p_conditions), ''),
    p_exemption_allowed,
    v_actor,
    v_actor
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  select
    v_actor,
    (select private.current_role()),
    v_municipality,
    'finance',
    'create_fee',
    'fee_config',
    v_id,
    'success',
    code,
    jsonb_build_object(
      'name', name,
      'vehicle_type', vehicle_type,
      'amount', amount,
      'valid_from', valid_from,
      'valid_to', valid_to,
      'active', active,
      'exemption_allowed', exemption_allowed
    ),
    conditions,
    'web'
  from public.fee_configs
  where id = v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe uma taxa com este código e início de validade';
end;
$$;

create or replace function public.update_fee_config(
  p_id uuid,
  p_code text,
  p_name text,
  p_vehicle_type text,
  p_amount numeric,
  p_valid_from date,
  p_valid_to date default null,
  p_active boolean default true,
  p_conditions text default null,
  p_exemption_allowed boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.fee_configs%rowtype;
  v_new public.fee_configs%rowtype;
begin
  select * into v_old
  from public.fee_configs
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Taxa não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_old.municipality_id,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para alterar esta taxa';
  end if;

  if nullif(trim(p_code), '') is null
     or nullif(trim(p_name), '') is null
     or p_amount is null
     or p_amount < 0
     or p_valid_from is null then
    raise exception 'Dados da taxa inválidos';
  end if;

  if p_vehicle_type is not null
     and p_vehicle_type not in ('motorizada','carro','bicicleta') then
    raise exception 'Tipo de veículo inválido';
  end if;

  if p_valid_to is not null and p_valid_to < p_valid_from then
    raise exception 'Fim de validade anterior ao início';
  end if;

  update public.fee_configs
  set
    code = upper(trim(p_code)),
    name = trim(p_name),
    vehicle_type = p_vehicle_type,
    amount = p_amount,
    valid_from = p_valid_from,
    valid_to = p_valid_to,
    active = p_active,
    conditions = nullif(trim(p_conditions), ''),
    exemption_allowed = p_exemption_allowed,
    updated_by = v_actor
  where id = p_id
  returning * into v_new;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_old.municipality_id,
    'finance',
    'update_fee',
    'fee_config',
    p_id,
    'success',
    v_new.code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Taxa municipal actualizada',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe uma taxa com este código e início de validade';
end;
$$;

create or replace function public.create_charge(
  p_fee_config_id uuid,
  p_owner_id uuid,
  p_vehicle_id uuid default null,
  p_registration_id uuid default null,
  p_note text default null
)
returns table (
  charge_id uuid,
  charge_reference text,
  amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_fee public.fee_configs%rowtype;
  v_owner public.owners%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_registration public.registrations%rowtype;
  v_id uuid;
  v_reference text;
begin
  select * into v_fee
  from public.fee_configs
  where id = p_fee_config_id;

  if v_fee.id is null then
    raise exception 'Taxa não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_fee.municipality_id,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para criar cobranças';
  end if;

  if not v_fee.active
     or current_date < v_fee.valid_from
     or (v_fee.valid_to is not null and current_date > v_fee.valid_to) then
    raise exception 'A taxa seleccionada não está vigente';
  end if;

  select * into v_owner
  from public.owners
  where id = p_owner_id;

  if v_owner.id is null
     or v_owner.municipality_id <> v_fee.municipality_id then
    raise exception 'Proprietário inválido para este município';
  end if;

  if p_vehicle_id is not null then
    select * into v_vehicle
    from public.vehicles
    where id = p_vehicle_id;

    if v_vehicle.id is null
       or v_vehicle.municipality_id <> v_fee.municipality_id then
      raise exception 'Veículo inválido para este município';
    end if;

    if v_vehicle.current_owner_id is distinct from p_owner_id then
      raise exception 'O veículo não pertence ao proprietário seleccionado';
    end if;

    if v_fee.vehicle_type is not null
       and v_fee.vehicle_type <> v_vehicle.vehicle_type then
      raise exception 'Esta taxa não se aplica ao tipo de veículo seleccionado';
    end if;
  elsif v_fee.vehicle_type is not null then
    raise exception 'Esta taxa exige um veículo do tipo configurado';
  end if;

  if p_registration_id is not null then
    select * into v_registration
    from public.registrations
    where id = p_registration_id;

    if v_registration.id is null
       or v_registration.municipality_id <> v_fee.municipality_id then
      raise exception 'Processo de registo inválido';
    end if;
  end if;

  insert into public.charges (
    municipality_id,
    fee_config_id,
    registration_id,
    owner_id,
    vehicle_id,
    service_type,
    amount,
    currency,
    status,
    exemption,
    note,
    created_by,
    updated_by
  )
  values (
    v_fee.municipality_id,
    v_fee.id,
    p_registration_id,
    p_owner_id,
    p_vehicle_id,
    v_fee.code,
    v_fee.amount,
    'MZN',
    'pendente',
    false,
    nullif(trim(p_note), ''),
    v_actor,
    v_actor
  )
  returning id, reference
  into v_id, v_reference;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_fee.municipality_id,
    'finance',
    'create_charge',
    'charge',
    v_id,
    'success',
    v_reference,
    jsonb_build_object(
      'fee_config_id', v_fee.id,
      'owner_id', p_owner_id,
      'vehicle_id', p_vehicle_id,
      'registration_id', p_registration_id,
      'service_type', v_fee.code,
      'amount', v_fee.amount,
      'status', 'pendente'
    ),
    nullif(trim(p_note), ''),
    'web'
  );

  return query select v_id, v_reference, v_fee.amount;
end;
$$;

create or replace function public.set_charge_status(
  p_charge_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_charge public.charges%rowtype;
begin
  if p_status not in ('pendente','em_confirmacao','cancelado') then
    raise exception 'Estado de cobrança inválido para este fluxo';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteração é obrigatório';
  end if;

  select * into v_charge
  from public.charges
  where id = p_charge_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobrança não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_charge.municipality_id,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para alterar esta cobrança';
  end if;

  if v_charge.status in ('pago','isento','reembolsado') then
    raise exception 'Esta cobrança já possui estado financeiro final';
  end if;

  if v_charge.status = p_status then
    raise exception 'A cobrança já possui este estado';
  end if;

  if p_status = 'cancelado'
     and exists (
       select 1 from public.fines f
       where f.charge_id = v_charge.id
         and f.status <> 'anulada'
     ) then
    raise exception 'Multas devem ser anuladas no módulo de Multas';
  end if;

  update public.charges
  set
    status = p_status,
    updated_by = v_actor
  where id = p_charge_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_charge.municipality_id,
    'finance',
    'change_charge_status',
    'charge',
    v_charge.id,
    'success',
    v_charge.reference,
    jsonb_build_object('status', v_charge.status),
    jsonb_build_object('status', p_status),
    trim(p_reason),
    'web'
  );
end;
$$;

create or replace function public.register_charge_payment(
  p_charge_id uuid,
  p_method text,
  p_reference text default null,
  p_note text default null
)
returns table (
  payment_id uuid,
  receipt_number text,
  amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_charge public.charges%rowtype;
  v_payment_id uuid;
  v_receipt text;
begin
  if p_method not in (
    'numerario','pos','transferencia','pagamento_movel','outro'
  ) then
    raise exception 'Método de pagamento inválido';
  end if;

  select * into v_charge
  from public.charges
  where id = p_charge_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobrança não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_charge.municipality_id,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para registar pagamentos';
  end if;

  if v_charge.status not in ('pendente','em_confirmacao') then
    raise exception 'A cobrança não está disponível para pagamento';
  end if;

  if v_charge.exemption then
    raise exception 'Uma cobrança isenta não pode receber pagamento';
  end if;

  if exists (
    select 1 from public.payments p
    where p.charge_id = v_charge.id
      and p.paid_at is not null
  ) then
    raise exception 'Já existe um pagamento confirmado para esta cobrança';
  end if;

  v_receipt :=
    private.next_finance_reference(v_charge.municipality_id, 'REC');

  insert into public.payments (
    charge_id,
    method,
    amount,
    reference,
    receipt_number,
    paid_at,
    confirmed_by,
    note
  )
  values (
    v_charge.id,
    p_method,
    v_charge.amount,
    nullif(trim(p_reference), ''),
    v_receipt,
    now(),
    v_actor,
    nullif(trim(p_note), '')
  )
  returning id into v_payment_id;

  update public.charges
  set
    status = 'pago',
    updated_by = v_actor
  where id = v_charge.id;

  update public.fines
  set status = 'paga'
  where charge_id = v_charge.id
    and status in ('pendente','em_recurso');

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_charge.municipality_id,
    'finance',
    'register_payment',
    'payment',
    v_payment_id,
    'success',
    v_receipt,
    jsonb_build_object('charge_status', v_charge.status),
    jsonb_build_object(
      'charge_status', 'pago',
      'method', p_method,
      'amount', v_charge.amount,
      'receipt_number', v_receipt
    ),
    nullif(trim(p_note), ''),
    'web'
  );

  return query
  select v_payment_id, v_receipt, v_charge.amount;
end;
$$;

create or replace function public.apply_charge_exemption(
  p_charge_id uuid,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_charge public.charges%rowtype;
  v_fee public.fee_configs%rowtype;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da isenção é obrigatório';
  end if;

  select * into v_charge
  from public.charges
  where id = p_charge_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobrança não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_charge.municipality_id,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para aplicar isenção';
  end if;

  if v_charge.status not in ('pendente','em_confirmacao') then
    raise exception 'A cobrança não está disponível para isenção';
  end if;

  if exists (
    select 1 from public.fines f
    where f.charge_id = v_charge.id
  ) then
    raise exception 'Cobranças de multa não podem ser isentadas por este fluxo';
  end if;

  if v_charge.fee_config_id is null then
    raise exception 'A cobrança não possui uma taxa configurada';
  end if;

  select * into v_fee
  from public.fee_configs
  where id = v_charge.fee_config_id;

  if v_fee.id is null or not v_fee.exemption_allowed then
    raise exception 'Esta taxa não permite isenção';
  end if;

  update public.charges
  set
    exemption = true,
    exemption_reason = trim(p_reason),
    exemption_approved_by = v_actor,
    exemption_approved_at = now(),
    status = 'isento',
    note = coalesce(nullif(trim(p_note), ''), note),
    updated_by = v_actor
  where id = v_charge.id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_charge.municipality_id,
    'finance',
    'apply_exemption',
    'charge',
    v_charge.id,
    'success',
    v_charge.reference,
    jsonb_build_object(
      'status', v_charge.status,
      'exemption', v_charge.exemption
    ),
    jsonb_build_object(
      'status', 'isento',
      'exemption', true,
      'reason', trim(p_reason)
    ),
    nullif(trim(p_note), ''),
    'web'
  );
end;
$$;

create or replace function public.refund_charge(
  p_charge_id uuid,
  p_reason text
)
returns table (
  refund_id uuid,
  refund_reference text,
  amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_charge public.charges%rowtype;
  v_payment public.payments%rowtype;
  v_refund_id uuid;
  v_reference text;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo do reembolso é obrigatório';
  end if;

  select * into v_charge
  from public.charges
  where id = p_charge_id
  for update;

  if v_charge.id is null then
    raise exception 'Cobrança não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_charge.municipality_id,
    'finance.manage'
  )) then
    raise exception 'Sem permissão para reembolsar esta cobrança';
  end if;

  if v_charge.status <> 'pago' then
    raise exception 'Apenas cobranças pagas podem ser reembolsadas';
  end if;

  if exists (
    select 1 from public.payment_refunds r
    where r.charge_id = v_charge.id
  ) then
    raise exception 'Esta cobrança já foi reembolsada';
  end if;

  select * into v_payment
  from public.payments
  where charge_id = v_charge.id
    and paid_at is not null
  order by paid_at desc
  limit 1;

  if v_payment.id is null then
    raise exception 'Pagamento confirmado não encontrado';
  end if;

  v_reference :=
    private.next_finance_reference(v_charge.municipality_id, 'RMB');

  insert into public.payment_refunds (
    municipality_id,
    charge_id,
    payment_id,
    reference,
    amount,
    reason,
    refunded_at,
    refunded_by
  )
  values (
    v_charge.municipality_id,
    v_charge.id,
    v_payment.id,
    v_reference,
    v_payment.amount,
    trim(p_reason),
    now(),
    v_actor
  )
  returning id into v_refund_id;

  update public.charges
  set
    status = 'reembolsado',
    updated_by = v_actor
  where id = v_charge.id;

  update public.fines
  set status = 'pendente'
  where charge_id = v_charge.id
    and status = 'paga';

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_charge.municipality_id,
    'finance',
    'refund',
    'refund',
    v_refund_id,
    'success',
    v_reference,
    jsonb_build_object('charge_status', 'pago'),
    jsonb_build_object(
      'charge_status', 'reembolsado',
      'amount', v_payment.amount
    ),
    trim(p_reason),
    'web'
  );

  return query
  select v_refund_id, v_reference, v_payment.amount;
end;
$$;

revoke all on function public.create_fee_config(text,text,text,numeric,date,date,boolean,text,boolean) from public;
revoke all on function public.update_fee_config(uuid,text,text,text,numeric,date,date,boolean,text,boolean) from public;
revoke all on function public.create_charge(uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.set_charge_status(uuid,text,text) from public;
revoke all on function public.register_charge_payment(uuid,text,text,text) from public;
revoke all on function public.apply_charge_exemption(uuid,text,text) from public;
revoke all on function public.refund_charge(uuid,text) from public;

grant execute on function public.create_fee_config(text,text,text,numeric,date,date,boolean,text,boolean) to authenticated;
grant execute on function public.update_fee_config(uuid,text,text,text,numeric,date,date,boolean,text,boolean) to authenticated;
grant execute on function public.create_charge(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.set_charge_status(uuid,text,text) to authenticated;
grant execute on function public.register_charge_payment(uuid,text,text,text) to authenticated;
grant execute on function public.apply_charge_exemption(uuid,text,text) to authenticated;
grant execute on function public.refund_charge(uuid,text) to authenticated;

revoke insert, update, delete on public.fee_configs from authenticated;
revoke insert, update, delete on public.charges from authenticated;
revoke insert, update, delete on public.payments from authenticated;
revoke insert, update, delete on public.payment_refunds from authenticated;

grant select on public.fee_configs,
  public.charges,
  public.payments,
  public.payment_refunds
to authenticated;
