-- PASO 3/4 · Citas y portafolio
-- Pega este bloque completo en el SQL Editor y pulsa Run.
-- Ejecuta los pasos en orden. Reescribir un paso ya aplicado es seguro.

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
