-- ─────────────────────────────────────────────────────────────────────────────
-- NailTime · Esquema de producción (Supabase)
--
-- Cómo aplicarlo:
--   1. Crea un proyecto en https://supabase.com
--   2. Abre "SQL Editor" y pega/ejecuta TODO este archivo.
--   3. Copia la URL del proyecto y la publishable key en `.env`:
--        EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
--   4. En Authentication → URL Configuration:
--        · Site URL: la URL pública de tu web (o http://localhost:8081 en desarrollo)
--        · Redirect URLs: agrega `<tu-url>/**`, `http://localhost:8081/**` y `nailtime://**`
--   5. En Authentication → Providers → Email, deja activa la confirmación de correo.
--      Para producción configura tu propio SMTP (Authentication → SMTP).
--   6. Reinicia Metro con `npx expo start -c`.
--
-- Modelo: UN solo estudio por despliegue. La primera cuenta que confirma su
-- correo queda como manicurista (dueña) y configura el negocio. Todas las
-- demás cuentas son clientas.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- `btree_gist` vive en el esquema `extensions`; el search_path permite usar sus
-- clases de operadores en la restricción de exclusión de las citas.
set search_path = public, extensions;

-- ── Tipos ────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('manicurista', 'clienta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum ('pendiente', 'confirmada', 'completada', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.modality as enum ('local', 'domicilio');
exception when duplicate_object then null; end $$;

-- ── Utilidades ───────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Perfiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'clienta',
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un solo estudio: como máximo una cuenta manicurista.
create unique index if not exists profiles_single_owner
  on public.profiles ((role))
  where role = 'manicurista';

alter table public.profiles enable row level security;

-- Dueña del estudio = única cuenta con rol manicurista. Se define después de
-- `profiles` porque PostgreSQL valida el cuerpo de las funciones SQL al
-- crearlas (a diferencia de PL/pgSQL).
create or replace function public.is_owner()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manicurista'
  );
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- La dueña se asigna cuando la cuenta queda confirmada, no al registrarse:
-- así un correo mal escrito no puede ocupar el rol del estudio para siempre.
create or replace function public.promote_first_owner(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if p_user is null then
    return;
  end if;

  -- Serializa confirmaciones simultáneas sin bloques anidados.
  perform pg_advisory_xact_lock(7319465);

  if exists (select 1 from public.profiles where role = 'manicurista') then
    return;
  end if;

  update public.profiles
     set role = 'manicurista', updated_at = now()
   where id = p_user and role = 'clienta';

  if found then
    select full_name into v_name from public.profiles where id = p_user;
    update public.business
       set owner_id = p_user, owner_name = coalesce(v_name, '')
     where id = 1;
  end if;
end $$;

-- Perfil automático al registrarse. Todas las cuentas nuevas empiezan como
-- clientas; la primera confirmada se convierte en la dueña del estudio.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'clienta'), '@', 1)
  );
  v_phone := coalesce(new.raw_user_meta_data ->> 'phone', '');

  insert into public.profiles (id, role, full_name, phone)
  values (new.id, 'clienta', v_name, v_phone)
  on conflict (id) do nothing;

  -- Si la confirmación por correo está desactivada, la cuenta ya nace activa.
  if new.email_confirmed_at is not null then
    perform public.promote_first_owner(new.id);
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Con confirmación por correo, Supabase actualiza `email_confirmed_at` cuando
-- la persona hace clic en el enlace. Ese momento es el que asigna a la dueña.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform public.promote_first_owner(new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- ── Negocio (fila única) ─────────────────────────────────────────────────────
create table if not exists public.business (
  id integer primary key default 1 check (id = 1),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null default '',
  owner_name text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  city text not null default '',
  latitude double precision not null default 4.6687,
  longitude double precision not null default -74.053,
  bio text not null default '',
  home_service boolean not null default false,
  home_service_fee integer not null default 0 check (home_service_fee >= 0),
  slot_step integer not null default 30 check (slot_step between 5 and 120),
  timezone text not null default 'America/Bogota',
  has_break boolean not null default true,
  break_start time not null default '13:00',
  break_end time not null default '14:00',
  configured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_break_range check (break_end > break_start)
);

insert into public.business (id) values (1) on conflict (id) do nothing;

-- La base de datos corre en UTC, pero las citas usan la hora local del estudio.
create or replace function public.studio_timezone()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (select timezone from public.business where id = 1),
    'America/Bogota'
  );
end $$;

create or replace function public.studio_now()
returns timestamp
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return now() at time zone public.studio_timezone();
end $$;

create or replace function public.studio_today()
returns date
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.studio_now()::date;
end $$;

alter table public.business enable row level security;

drop trigger if exists business_touch on public.business;
create trigger business_touch before update on public.business
  for each row execute function public.touch_updated_at();

-- ── Servicios ────────────────────────────────────────────────────────────────
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration integer not null check (duration between 15 and 480),
  price integer not null check (price >= 0),
  category text not null default 'Manos',
  icon text not null default 'sparkles-outline',
  photo_path text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();

-- ── Horario semanal ──────────────────────────────────────────────────────────
create table if not exists public.business_hours (
  day smallint primary key check (day between 0 and 6),
  active boolean not null default false,
  start_time time not null default '09:00',
  end_time time not null default '19:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_valid_range check (end_time > start_time)
);

insert into public.business_hours (day, active, start_time, end_time) values
  (0, false, '09:00', '19:00'),
  (1, true,  '09:00', '19:00'),
  (2, true,  '09:00', '19:00'),
  (3, true,  '09:00', '19:00'),
  (4, true,  '09:00', '19:00'),
  (5, true,  '09:00', '19:00'),
  (6, true,  '09:00', '19:00')
on conflict (day) do nothing;

alter table public.business_hours enable row level security;

drop trigger if exists business_hours_touch on public.business_hours;
create trigger business_hours_touch before update on public.business_hours
  for each row execute function public.touch_updated_at();

-- ── Fechas bloqueadas ────────────────────────────────────────────────────────
create table if not exists public.blocked_dates (
  date date primary key,
  created_at timestamptz not null default now()
);

alter table public.blocked_dates enable row level security;

-- Valida que una cita caiga en un día/horario de atención y no en una fecha
-- bloqueada. Se usa tanto al crear como al reprogramar.
create or replace function public.validate_appointment_slot(p_date date, p_start integer, p_duration integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.business_hours;
  b public.business;
  s integer;
  e integer;
begin
  if exists (select 1 from public.blocked_dates where date = p_date) then
    raise exception 'Ese día no está disponible' using errcode = '22023';
  end if;

  select * into h from public.business_hours where day = extract(dow from p_date)::smallint;
  if h.day is null or not h.active then
    raise exception 'Ese día no hay atención en el estudio' using errcode = '22023';
  end if;

  s := extract(epoch from h.start_time)::integer / 60;
  e := extract(epoch from h.end_time)::integer / 60;
  if p_start < s or p_start + p_duration > e then
    raise exception 'El horario está fuera de la atención del estudio' using errcode = '22023';
  end if;

  select * into b from public.business where id = 1;
  if b.has_break
     and p_start < (extract(epoch from b.break_end)::integer / 60)
     and p_start + p_duration > (extract(epoch from b.break_start)::integer / 60) then
    raise exception 'Ese horario está dentro del descanso del estudio' using errcode = '22023';
  end if;
end $$;

-- ── Citas ────────────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  client_name text not null default '',
  client_phone text not null default '',
  service_id uuid references public.services (id) on delete set null,
  service_name text not null,
  date date not null,
  time time not null,
  start_min integer not null check (start_min between 0 and 1439),
  duration integer not null check (duration between 15 and 480),
  price integer not null check (price >= 0),
  modality public.modality not null default 'local',
  address text,
  latitude double precision,
  longitude double precision,
  reference_path text,
  notes text,
  status public.appointment_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_start_matches check (start_min = (extract(epoch from time)::integer / 60)),
  constraint appointments_fits_day check (start_min + duration <= 1440),
  constraint appointments_home_address check (
    modality = 'local' or (address is not null and length(btrim(address)) >= 5)
  ),
  constraint appointments_no_overlap exclude using gist (
    date with =,
    int4range(start_min, start_min + duration) with &&
  ) where (status <> 'cancelada')
);

create index if not exists appointments_client_idx on public.appointments (client_id, date desc);
create index if not exists appointments_date_idx on public.appointments (date);

alter table public.appointments enable row level security;

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- Precio, duración y nombre salen siempre del catálogo; la clienta no puede
-- alterarlos ni auto-confirmarse una cita.
create or replace function public.price_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  svc public.services;
  fee integer := 0;
  allow_home boolean := false;
  p public.profiles;
begin
  select * into svc from public.services where id = new.service_id;
  if svc.id is null then
    raise exception 'El servicio ya no está disponible' using errcode = '22023';
  end if;
  if not svc.active and not public.is_owner() then
    raise exception 'El servicio ya no está disponible' using errcode = '22023';
  end if;

  select home_service, home_service_fee into allow_home, fee
    from public.business where id = 1;

  if new.modality = 'domicilio' and not allow_home then
    raise exception 'El servicio a domicilio no está disponible' using errcode = '22023';
  end if;

  new.service_name := svc.name;
  new.duration := svc.duration;
  new.price := svc.price + case
    when new.modality = 'domicilio' and allow_home then greatest(fee, 0)
    else 0
  end;

  perform public.validate_appointment_slot(new.date, new.start_min, new.duration);

  if new.client_id = auth.uid() then
    select * into p from public.profiles where id = new.client_id;
    if p.id is not null then
      new.client_name := p.full_name;
      new.client_phone := p.phone;
    end if;
    new.status := 'pendiente';
    if new.date < public.studio_today() then
      raise exception 'No puedes reservar en una fecha pasada' using errcode = '22023';
    end if;
    if new.date = public.studio_today()
       and new.start_min < (extract(hour from public.studio_now()) * 60
                            + extract(minute from public.studio_now()))::integer then
      raise exception 'Ese horario ya pasó' using errcode = '22023';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists appointments_price on public.appointments;
create trigger appointments_price before insert on public.appointments
  for each row execute function public.price_appointment();

-- La clienta solo puede reprogramar, cancelar o editar datos de contacto de
-- su cita; el precio y el servicio quedan protegidos.
create or replace function public.guard_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allow_home boolean := false;
  fee integer := 0;
  svc_price integer;
begin
  if new.date <> old.date or new.time <> old.time or new.duration <> old.duration then
    perform public.validate_appointment_slot(new.date, new.start_min, new.duration);
  end if;

  if auth.uid() is null or public.is_owner() then
    return new;
  end if;

  -- La clienta puede cambiar la modalidad; el precio se recalcula desde el
  -- catálogo para que el recargo a domicilio siempre sea el correcto.
  if new.modality <> old.modality then
    select home_service, home_service_fee into allow_home, fee
      from public.business where id = 1;
    if new.modality = 'domicilio' and not allow_home then
      raise exception 'El servicio a domicilio no está disponible' using errcode = '22023';
    end if;

    select price into svc_price from public.services where id = old.service_id;
    if svc_price is not null then
      new.price := svc_price + case
        when new.modality = 'domicilio' and allow_home then greatest(fee, 0)
        else 0
      end;
    else
      new.price := old.price;
    end if;
  else
    new.price := old.price;
  end if;

  if new.client_id <> old.client_id
     or new.client_name <> old.client_name
     or new.client_phone <> old.client_phone
     or new.service_id is distinct from old.service_id
     or new.service_name <> old.service_name
     or new.duration <> old.duration
     or new.created_at <> old.created_at then
    raise exception 'No puedes modificar estos datos de la cita' using errcode = '42501';
  end if;

  if new.status <> old.status and new.status not in ('pendiente', 'cancelada') then
    raise exception 'Estado de cita no permitido' using errcode = '42501';
  end if;

  if (new.date, new.time) is distinct from (old.date, old.time) then
    if new.date < public.studio_today() then
      raise exception 'No puedes mover la cita a una fecha pasada' using errcode = '22023';
    end if;
    if new.date = public.studio_today()
       and new.start_min < (extract(hour from public.studio_now()) * 60
                            + extract(minute from public.studio_now()))::integer then
      raise exception 'Ese horario ya pasó' using errcode = '22023';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists appointments_guard on public.appointments;
create trigger appointments_guard before update on public.appointments
  for each row execute function public.guard_appointment_update();

-- ── Portafolio ───────────────────────────────────────────────────────────────
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.portfolio_items enable row level security;

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
