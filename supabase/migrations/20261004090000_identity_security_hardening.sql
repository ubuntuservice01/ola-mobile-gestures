-- MobiGest — endurecimento de identidade, RLS e integridade territorial
-- Esta migration corrige o bootstrap inicial sem alterar migrations já aplicadas.

-- 1) Apenas perfis activos podem fornecer papel/território para autorização.
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
    and p.status = 'activo'
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
    and p.status = 'activo'
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
    and p.status = 'activo'
  limit 1;
$$;

-- 2) A validação territorial passa a ser segura para tabelas que não possuem locality_id,
--    como public.profiles, e continua válida para vehicles/fiscalizations/drivers.
create or replace function private.validate_territory_consistency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  target_municipality uuid;
  target_post uuid;
  target_locality uuid;
  post_municipality uuid;
  locality_municipality uuid;
  locality_post uuid;
begin
  row_data := to_jsonb(new);
  target_municipality := nullif(row_data ->> 'municipality_id', '')::uuid;
  target_post := nullif(row_data ->> 'administrative_post_id', '')::uuid;
  target_locality := nullif(row_data ->> 'locality_id', '')::uuid;

  if target_post is not null then
    if target_municipality is null then
      raise exception 'Município é obrigatório quando existe posto administrativo';
    end if;

    select ap.municipality_id
      into post_municipality
    from public.administrative_posts ap
    where ap.id = target_post;

    if post_municipality is null or post_municipality <> target_municipality then
      raise exception 'Posto administrativo não pertence ao município indicado';
    end if;
  end if;

  if target_locality is not null then
    if target_municipality is null then
      raise exception 'Município é obrigatório quando existe localidade';
    end if;

    select l.municipality_id, l.administrative_post_id
      into locality_municipality, locality_post
    from public.localities l
    where l.id = target_locality;

    if locality_municipality is null or locality_municipality <> target_municipality then
      raise exception 'Localidade não pertence ao município indicado';
    end if;

    if target_post is not null and locality_post <> target_post then
      raise exception 'Localidade não pertence ao posto administrativo indicado';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists drivers_validate_territory on public.drivers;
create trigger drivers_validate_territory
before insert or update on public.drivers
for each row execute function private.validate_territory_consistency();

-- 3) Auto-edição do perfil limita-se a dados pessoais não privilegiados.
create or replace function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (select auth.uid()) = old.id
     and (
       new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.municipality_id is distinct from old.municipality_id
       or new.administrative_post_id is distinct from old.administrative_post_id
       or new.status is distinct from old.status
       or new.created_at is distinct from old.created_at
     ) then
    raise exception 'O utilizador não pode alterar os próprios campos de segurança';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields
before update on public.profiles
for each row execute function private.protect_profile_security_fields();

-- Suspensos/inactivos podem consultar o próprio perfil para a aplicação mostrar
-- o estado da conta, mas não podem actualizá-lo.
drop policy if exists "profiles_update_manager" on public.profiles;
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
  or (
    id = (select auth.uid())
    and status = 'activo'
  )
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
    and status = 'activo'
    and role = (select private.current_role())
    and municipality_id is not distinct from (select private.current_municipality_id())
  )
);

-- Perfis institucionais são desactivados/suspensos, não apagados pela API.
drop policy if exists "profiles_delete_manager" on public.profiles;
revoke delete on public.profiles from authenticated;

-- 4) Relações de condutor e tipos de multa preservam histórico: sem hard-delete pela API.
drop policy if exists driver_vehicles_manage on public.driver_vehicles;
create policy driver_vehicles_insert
on public.driver_vehicles for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('drivers.update'))
);

create policy driver_vehicles_update
on public.driver_vehicles for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('drivers.update'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('drivers.update'))
);

revoke delete on public.driver_vehicles from authenticated;

drop policy if exists fine_types_manage on public.fine_types;
create policy fine_types_insert
on public.fine_types for insert to authenticated
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('fine_types.manage'))
);

create policy fine_types_update
on public.fine_types for update to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('fine_types.manage'))
)
with check (
  (select private.same_municipality(municipality_id))
  and (select private.authorize('fine_types.manage'))
);

revoke delete on public.fine_types from authenticated;

-- 5) As validações multi-município de relações críticas executam com privilégios
--    do dono da função, sem depender das permissões de leitura do operador.
create or replace function public.validate_driver_vehicle_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d_municipality uuid;
  v_municipality uuid;
begin
  select municipality_id into d_municipality
  from public.drivers
  where id = new.driver_id;

  select municipality_id into v_municipality
  from public.vehicles
  where id = new.vehicle_id;

  if d_municipality is null
     or v_municipality is null
     or new.municipality_id <> d_municipality
     or new.municipality_id <> v_municipality then
    raise exception 'Condutor e veículo devem pertencer ao mesmo município do vínculo';
  end if;

  return new;
end;
$$;

create or replace function public.validate_fine_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d_municipality uuid;
  v_municipality uuid;
  ft_municipality uuid;
  f_municipality uuid;
  c_municipality uuid;
begin
  select municipality_id into d_municipality
  from public.drivers
  where id = new.driver_id;

  select municipality_id into ft_municipality
  from public.fine_types
  where id = new.fine_type_id;

  if d_municipality is null
     or ft_municipality is null
     or new.municipality_id <> d_municipality
     or new.municipality_id <> ft_municipality then
    raise exception 'Condutor e tipo de multa devem pertencer ao mesmo município da multa';
  end if;

  if new.vehicle_id is not null then
    select municipality_id into v_municipality
    from public.vehicles
    where id = new.vehicle_id;

    if v_municipality is null or new.municipality_id <> v_municipality then
      raise exception 'Veículo deve pertencer ao mesmo município da multa';
    end if;
  end if;

  if new.fiscal_id is not null then
    select municipality_id into f_municipality
    from public.profiles
    where id = new.fiscal_id;

    if f_municipality is null or new.municipality_id <> f_municipality then
      raise exception 'Fiscal deve pertencer ao mesmo município da multa';
    end if;
  end if;

  if new.charge_id is not null then
    select municipality_id into c_municipality
    from public.charges
    where id = new.charge_id;

    if c_municipality is null or new.municipality_id <> c_municipality then
      raise exception 'Cobrança deve pertencer ao mesmo município da multa';
    end if;
  end if;

  return new;
end;
$$;
