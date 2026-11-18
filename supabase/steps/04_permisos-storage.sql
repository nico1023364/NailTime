-- PASO 4/4 · Permisos, RLS, Storage y Realtime
-- Pega este bloque completo en el SQL Editor y pulsa Run.
-- Ejecuta los pasos en orden. Reescribir un paso ya aplicado es seguro.

-- ── Permisos ─────────────────────────────────────────────────────────────────
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- La dueña solo puede editar su nombre y celular; nunca su rol.
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

revoke all on public.business, public.services, public.business_hours,
  public.blocked_dates, public.portfolio_items from anon, authenticated;
grant select on public.business, public.services, public.business_hours,
  public.blocked_dates, public.portfolio_items to anon, authenticated;
grant insert, update, delete on public.business, public.services,
  public.business_hours, public.blocked_dates, public.portfolio_items
  to authenticated;

revoke all on public.appointments from anon, authenticated;
grant select, insert, update, delete on public.appointments to authenticated;

-- ── Políticas RLS ────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_owner());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists business_select on public.business;
create policy business_select on public.business
  for select to anon, authenticated
  using (true);

drop policy if exists business_write on public.business;
create policy business_write on public.business
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists business_hours_select on public.business_hours;
create policy business_hours_select on public.business_hours
  for select to anon, authenticated
  using (true);

drop policy if exists business_hours_write on public.business_hours;
create policy business_hours_write on public.business_hours
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to anon, authenticated
  using (active or public.is_owner());

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists blocked_dates_select on public.blocked_dates;
create policy blocked_dates_select on public.blocked_dates
  for select to anon, authenticated
  using (true);

drop policy if exists blocked_dates_write on public.blocked_dates;
create policy blocked_dates_write on public.blocked_dates
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists portfolio_select on public.portfolio_items;
create policy portfolio_select on public.portfolio_items
  for select to anon, authenticated
  using (true);

drop policy if exists portfolio_write on public.portfolio_items;
create policy portfolio_write on public.portfolio_items
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner());

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (public.is_owner() or client_id = auth.uid());

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
  for update to authenticated
  using (client_id = auth.uid() or public.is_owner())
  with check (client_id = auth.uid() or public.is_owner());

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
  for delete to authenticated
  using (public.is_owner());

-- ── Storage ──────────────────────────────────────────────────────────────────
-- `portfolio`: fotos públicas del portafolio y de servicios.
-- `references`: fotos privadas que las clientas envían al reservar.
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'references',
  'references',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio public read" on storage.objects;
create policy "portfolio public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'portfolio');

drop policy if exists "portfolio owner insert" on storage.objects;
create policy "portfolio owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio' and public.is_owner());

drop policy if exists "portfolio owner update" on storage.objects;
create policy "portfolio owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio' and public.is_owner())
  with check (bucket_id = 'portfolio' and public.is_owner());

drop policy if exists "portfolio owner delete" on storage.objects;
create policy "portfolio owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and public.is_owner());

drop policy if exists "references upload own" on storage.objects;
create policy "references upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "references read own or owner" on storage.objects;
create policy "references read own or owner" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'references'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_owner()
    )
  );

drop policy if exists "references delete own or owner" on storage.objects;
create policy "references delete own or owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'references'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_owner()
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'appointments', 'services', 'business', 'business_hours',
    'blocked_dates', 'portfolio_items', 'profiles'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Limpieza de la versión demo ──────────────────────────────────────────────
drop table if exists public.nailtime_state cascade;

-- ── Promover / cambiar de dueña (ejecutar a mano si hace falta) ──────────────
-- Si la persona dueña se registró después de otra cuenta, ejecuta:
--   update public.profiles set role = 'clienta' where role = 'manicurista';
--   update public.profiles set role = 'manicurista'
--     where id = (select id from auth.users where email = 'duena@correo.com');
--   update public.business set owner_id = (
--     select id from auth.users where email = 'duena@correo.com'
--   ) where id = 1;
--
-- Nunca cambies roles desde la app: solo se permite por SQL.

-- ── Cuentas creadas antes de esta migración (opcional) ───────────────────────
-- El trigger solo crea perfiles para usuarios nuevos. Si tu proyecto ya tenía
-- cuentas en Authentication, descomenta este bloque y ejecútalo una vez: la
-- cuenta más antigua queda como dueña y las demás como clientas.
--
-- insert into public.profiles (id, role, full_name, phone)
-- select
--   u.id,
--   case when row_number() over (order by u.created_at) = 1
--        then 'manicurista'::public.user_role
--        else 'clienta'::public.user_role end,
--   coalesce(
--     nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
--     split_part(coalesce(u.email, 'clienta'), '@', 1)
--   ),
--   coalesce(u.raw_user_meta_data ->> 'phone', '')
-- from auth.users u
-- where not exists (select 1 from public.profiles p where p.id = u.id)
-- order by u.created_at;
--
-- update public.business
--   set owner_id = (select id from public.profiles where role = 'manicurista' limit 1)
--   where id = 1;

notify pgrst, 'reload schema';
