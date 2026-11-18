-- PASO 2/4 · Negocio, servicios, horario y fechas bloqueadas
-- Pega este bloque completo en el SQL Editor y pulsa Run.
-- Ejecuta los pasos en orden. Reescribir un paso ya aplicado es seguro.

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
