create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  institution text not null check (char_length(trim(institution)) between 2 and 180),
  role_title text check (role_title is null or char_length(trim(role_title)) <= 120),
  phone text not null check (char_length(trim(phone)) between 7 and 30),
  email text check (email is null or char_length(trim(email)) <= 180),
  subject text not null check (char_length(trim(subject)) between 2 and 120),
  message text not null check (char_length(trim(message)) between 10 and 4000),
  source text not null default 'public_website',
  email_delivery_status text not null default 'pending_configuration'
    check (email_delivery_status in ('pending_configuration','sent','failed','not_requested')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select, insert, update on public.contact_messages to service_role;

comment on table public.contact_messages is
  'Pedidos enviados pelo formulário público do MobiGest. Escrita apenas via Edge Function.';
