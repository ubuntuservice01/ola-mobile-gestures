-- MobiGest — activação segura de contas por código de uso único
-- Substitui a dependência de convites por email para utilizadores municipais.

create table if not exists public.user_activation_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id) on delete cascade,
  municipality_id uuid
    references public.municipalities(id) on delete cascade,
  email_normalized text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  attempt_count integer not null default 0
    check (attempt_count between 0 and 5),
  last_attempt_at timestamptz,
  locked_at timestamptz,
  claimed_at timestamptz,
  claim_token uuid,
  claim_expires_at timestamptz,
  created_by uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_activation_one_open_per_user_idx
on public.user_activation_codes(user_id)
where used_at is null and revoked_at is null;

create index if not exists user_activation_email_open_idx
on public.user_activation_codes(email_normalized, created_at desc)
where used_at is null and revoked_at is null;

create unique index if not exists user_activation_claim_token_idx
on public.user_activation_codes(claim_token)
where claim_token is not null;

alter table public.user_activation_codes
enable row level security;

revoke all
on public.user_activation_codes
from public, anon, authenticated;

grant select, insert, update, delete
on public.user_activation_codes
to service_role;

create or replace function public.issue_user_activation_code(
  p_user_id uuid,
  p_email text,
  p_municipality_id uuid,
  p_created_by uuid,
  p_code text,
  p_ttl_hours integer default 24
)
returns table (
  activation_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_code text := upper(trim(p_code));
  v_id uuid;
  v_expires_at timestamptz;
begin
  if p_user_id is null
     or v_email = ''
     or p_created_by is null then
    raise exception 'Dados de activação incompletos';
  end if;

  if p_ttl_hours < 1 or p_ttl_hours > 72 then
    raise exception 'Validade do código inválida';
  end if;

  if v_code !~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' then
    raise exception 'Formato do código de activação inválido';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) = v_email
  ) then
    raise exception 'Conta Auth não encontrada para activação';
  end if;

  update public.user_activation_codes
  set
    revoked_at = now(),
    claim_token = null,
    claimed_at = null,
    claim_expires_at = null
  where user_id = p_user_id
    and used_at is null
    and revoked_at is null;

  v_expires_at := now() + make_interval(hours => p_ttl_hours);

  insert into public.user_activation_codes (
    user_id,
    municipality_id,
    email_normalized,
    code_hash,
    expires_at,
    created_by
  )
  values (
    p_user_id,
    p_municipality_id,
    v_email,
    extensions.crypt(
      v_code,
      extensions.gen_salt('bf', 10)
    ),
    v_expires_at,
    p_created_by
  )
  returning id
  into v_id;

  return query
  select v_id, v_expires_at;
end;
$$;

create or replace function public.claim_user_activation_code(
  p_email text,
  p_code text
)
returns table (
  status text,
  activation_id uuid,
  user_id uuid,
  claim_token uuid,
  claim_expires_at timestamptz,
  attempts_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_code text := upper(trim(p_code));
  v_row public.user_activation_codes%rowtype;
  v_claim uuid;
  v_claim_expires timestamptz;
  v_attempts integer;
begin
  select *
  into v_row
  from public.user_activation_codes uac
  where uac.email_normalized = v_email
    and uac.used_at is null
    and uac.revoked_at is null
  order by uac.created_at desc
  limit 1
  for update;

  if v_row.id is null then
    return query
    select
      'invalid'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::timestamptz,
      0;
    return;
  end if;

  if v_row.expires_at <= now() then
    update public.user_activation_codes
    set revoked_at = now()
    where id = v_row.id;

    return query
    select
      'expired'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::timestamptz,
      0;
    return;
  end if;

  if v_row.attempt_count >= 5 or v_row.locked_at is not null then
    return query
    select
      'locked'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::timestamptz,
      0;
    return;
  end if;

  if v_row.claim_token is not null
     and v_row.claim_expires_at is not null
     and v_row.claim_expires_at > now() then
    return query
    select
      'busy'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      v_row.claim_expires_at,
      greatest(0, 5 - v_row.attempt_count);
    return;
  end if;

  if extensions.crypt(v_code, v_row.code_hash) <> v_row.code_hash then
    v_attempts := least(5, v_row.attempt_count + 1);

    update public.user_activation_codes
    set
      attempt_count = v_attempts,
      last_attempt_at = now(),
      locked_at = case
        when v_attempts >= 5 then now()
        else locked_at
      end,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null
    where id = v_row.id;

    return query
    select
      case
        when v_attempts >= 5 then 'locked'
        else 'invalid'
      end::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::timestamptz,
      greatest(0, 5 - v_attempts);
    return;
  end if;

  v_claim := gen_random_uuid();
  v_claim_expires := now() + interval '10 minutes';

  update public.user_activation_codes
  set
    claim_token = v_claim,
    claimed_at = now(),
    claim_expires_at = v_claim_expires,
    last_attempt_at = now()
  where id = v_row.id;

  return query
  select
    'valid'::text,
    v_row.id,
    v_row.user_id,
    v_claim,
    v_claim_expires,
    greatest(0, 5 - v_row.attempt_count);
end;
$$;

create or replace function public.finalize_user_activation(
  p_activation_id uuid,
  p_claim_token uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.user_activation_codes%rowtype;
begin
  select *
  into v_row
  from public.user_activation_codes
  where id = p_activation_id
  for update;

  if v_row.id is null
     or v_row.used_at is not null
     or v_row.revoked_at is not null
     or v_row.expires_at <= now()
     or v_row.claim_token is distinct from p_claim_token
     or v_row.claim_expires_at is null
     or v_row.claim_expires_at <= now() then
    raise exception 'Sessão de activação inválida ou expirada';
  end if;

  update public.user_activation_codes
  set
    used_at = now(),
    claim_token = null,
    claimed_at = null,
    claim_expires_at = null
  where id = v_row.id;

  return v_row.user_id;
end;
$$;

create or replace function public.release_user_activation_claim(
  p_activation_id uuid,
  p_claim_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_activation_codes
  set
    claim_token = null,
    claimed_at = null,
    claim_expires_at = null
  where id = p_activation_id
    and claim_token = p_claim_token
    and used_at is null
    and revoked_at is null;
end;
$$;

revoke all
on function public.issue_user_activation_code(uuid,text,uuid,uuid,text,integer)
from public, anon, authenticated;

revoke all
on function public.claim_user_activation_code(text,text)
from public, anon, authenticated;

revoke all
on function public.finalize_user_activation(uuid,uuid)
from public, anon, authenticated;

revoke all
on function public.release_user_activation_claim(uuid,uuid)
from public, anon, authenticated;

grant execute
on function public.issue_user_activation_code(uuid,text,uuid,uuid,text,integer)
to service_role;

grant execute
on function public.claim_user_activation_code(text,text)
to service_role;

grant execute
on function public.finalize_user_activation(uuid,uuid)
to service_role;

grant execute
on function public.release_user_activation_claim(uuid,uuid)
to service_role;
