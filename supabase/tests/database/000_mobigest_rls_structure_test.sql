-- Estrutura mínima dos testes da Fase 4.
-- Executar com: supabase test db
-- Os testes de comportamento com utilizadores reais serão ampliados
-- quando o projecto Supabase estiver ligado ao ambiente de desenvolvimento.

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles deve ter RLS activo'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.municipalities'::regclass),
  'municipalities deve ter RLS activo'
);

select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles') > 0,
  'profiles deve possuir políticas RLS'
);

select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'municipalities') > 0,
  'municipalities deve possuir políticas RLS'
);

select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'vehicles') > 0,
  'vehicles deve possuir políticas RLS'
);

select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'owners') > 0,
  'owners deve possuir políticas RLS'
);

select ok(
  (select count(*) from public.permissions where code = 'vehicles.view') = 1,
  'permissão vehicles.view deve existir'
);

select ok(
  (select count(*) from public.permissions where code = 'users.manage') = 1,
  'permissão users.manage deve existir'
);

select * from finish();

rollback;
