-- PASO 1/4 · Extensiones, tipos, perfiles y dueña
-- Pega este bloque completo en el SQL Editor y pulsa Run.
-- Ejecuta los pasos en orden. Reescribir un paso ya aplicado es seguro.

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
