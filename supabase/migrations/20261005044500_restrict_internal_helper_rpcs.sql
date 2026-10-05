revoke all on function public.lookup_vehicle(text) from public, anon, authenticated;
revoke all on function public.next_driver_reference(uuid) from public, anon, authenticated;
revoke all on function public.next_fine_reference(uuid) from public, anon, authenticated;
revoke all on function public.validate_driver_vehicle_scope() from public, anon, authenticated;
revoke all on function public.validate_fine_scope() from public, anon, authenticated;
