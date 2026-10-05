-- MobiGest — endurecimento de execução de RPCs SECURITY DEFINER.
-- Mantém anónimas apenas as duas consultas públicas de verificação por QR/código.

do $$
declare
  r record;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and p.proname not in ('lookup_public_vehicle', 'lookup_public_driver')
  loop
    execute format(
      'revoke execute on function %s from public, anon',
      r.oid::regprocedure
    );
    execute format(
      'grant execute on function %s to authenticated',
      r.oid::regprocedure
    );
  end loop;
end;
$$;

alter function public.set_updated_at()
  set search_path = public, pg_temp;
