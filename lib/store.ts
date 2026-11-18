import { format } from 'date-fns';
import { create } from 'zustand';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { confirmRedirect, recoveryRedirect } from './authLinks';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from './supabase';
import { publicImageUrl, removeImages, signedImageUrls, uploadImage } from './storage';
import { clearReminders, setReminders, syncReminders } from './reminders';
import { toMin } from './format';
import type {
  Appointment,
  AppointmentPatch,
  AppointmentStatus,
  Business,
  BusinessInput,
  DaySchedule,
  NewAppointment,
  PortfolioItem,
  Profile,
  Role,
  Schedule,
  Service,
  ServiceInput,
} from './types';

// ── Filas de la base de datos ────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  role: Role;
  full_name: string;
  phone: string;
}

interface BusinessRow {
  id: number;
  owner_id: string | null;
  name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  bio: string;
  home_service: boolean;
  home_service_fee: number;
  slot_step: number;
  has_break: boolean;
  break_start: string;
  break_end: string;
  configured: boolean;
}

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  icon: string;
  photo_path: string | null;
  active: boolean;
  sort_order: number;
}

interface HourRow {
  day: number;
  active: boolean;
  start_time: string;
  end_time: string;
}

interface AppointmentRow {
  id: string;
  service_id: string | null;
  service_name: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  modality: 'local' | 'domicilio';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  reference_path: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
}

interface PortfolioRow {
  id: string;
  storage_path: string;
  created_at: string;
}

// ── Valores iniciales ────────────────────────────────────────────────────────

export const emptyBusiness: Business = {
  name: '',
  owner: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  latitude: 4.6687,
  longitude: -74.053,
  bio: '',
  homeService: false,
  homeServiceFee: 0,
  configured: false,
};

export const emptySchedule = (): Schedule => ({
  days: Array.from({ length: 7 }, (_, i) => ({ active: i !== 0, start: '09:00', end: '19:00' })),
  hasBreak: true,
  breakStart: '13:00',
  breakEnd: '14:00',
  step: 30,
  blockedDates: [],
});

export interface Data {
  /** La sesión inicial ya se consultó (para ocultar el splash). */
  ready: boolean;
  session: Profile | null;
  business: Business;
  services: Service[];
  schedule: Schedule;
  appointments: Appointment[];
  portfolio: PortfolioItem[];
  loading: boolean;
}

interface Actions {
  init: () => () => void;
  retry: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (data: { name: string; phone: string; email: string; password: string }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  refresh: () => Promise<void>;
  saveBusiness: (data: BusinessInput) => Promise<void>;
  updateBusiness: (data: Partial<BusinessInput>) => Promise<void>;
  updateSchedule: (data: Partial<Pick<Schedule, 'hasBreak' | 'breakStart' | 'breakEnd' | 'step'>>) => Promise<void>;
  updateDay: (index: number, data: Partial<DaySchedule>) => Promise<void>;
  toggleBlockedDate: (date: string) => Promise<void>;
  saveService: (data: ServiceInput) => Promise<Service>;
  deleteService: (id: string) => Promise<void>;
  toggleService: (id: string) => Promise<void>;
  addAppointment: (data: NewAppointment) => Promise<Appointment>;
  updateAppointment: (id: string, data: AppointmentPatch) => Promise<Appointment>;
  addPortfolio: (uri: string) => Promise<void>;
  removePortfolio: (id: string) => Promise<void>;
}

// ── Mapeos ───────────────────────────────────────────────────────────────────

const hms = (value: string | null | undefined, fallback: string) => (value ? value.slice(0, 5) : fallback);

const mapBusiness = (row: BusinessRow): Business => ({
  name: row.name,
  owner: row.owner_name,
  phone: row.phone,
  whatsapp: row.whatsapp,
  address: row.address,
  city: row.city,
  latitude: row.latitude,
  longitude: row.longitude,
  bio: row.bio,
  homeService: row.home_service,
  homeServiceFee: row.home_service_fee,
  configured: row.configured,
});

const mapService = (row: ServiceRow): Service => ({
  id: row.id,
  name: row.name,
  description: row.description,
  duration: row.duration,
  price: row.price,
  category: row.category,
  icon: row.icon,
  photoPath: row.photo_path ?? undefined,
  photo: publicImageUrl(row.photo_path),
  active: row.active,
  sortOrder: row.sort_order,
});

const mapSchedule = (business: BusinessRow | null, hours: HourRow[], blocked: string[]): Schedule => {
  const byDay = new Map(hours.map(h => [h.day, h]));
  return {
    days: Array.from({ length: 7 }, (_, i) => {
      const h = byDay.get(i);
      return {
        active: h ? h.active : i !== 0,
        start: hms(h?.start_time, '09:00'),
        end: hms(h?.end_time, '19:00'),
      };
    }),
    hasBreak: business?.has_break ?? true,
    breakStart: hms(business?.break_start, '13:00'),
    breakEnd: hms(business?.break_end, '14:00'),
    step: business?.slot_step ?? 30,
    blockedDates: blocked,
  };
};

const mapAppointment = (row: AppointmentRow, signed: Record<string, string>): Appointment => ({
  id: row.id,
  serviceId: row.service_id,
  serviceName: row.service_name,
  clientId: row.client_id,
  clientName: row.client_name,
  clientPhone: row.client_phone,
  date: row.date,
  time: hms(row.time, '00:00'),
  duration: row.duration,
  price: row.price,
  modality: row.modality,
  address: row.address ?? undefined,
  latitude: row.latitude ?? undefined,
  longitude: row.longitude ?? undefined,
  referencePath: row.reference_path ?? undefined,
  referencePhoto: row.reference_path ? signed[row.reference_path] : undefined,
  notes: row.notes ?? undefined,
  status: row.status,
  createdAt: row.created_at,
});

const mapPortfolio = (row: PortfolioRow): PortfolioItem => ({
  id: row.id,
  storagePath: row.storage_path,
  uri: publicImageUrl(row.storage_path) ?? '',
  date: format(new Date(row.created_at), 'yyyy-MM-dd'),
});

// ── Carga de datos ───────────────────────────────────────────────────────────

async function fetchProfile(session: Session): Promise<Profile> {
  const user = session.user;
  const email = user.email ?? '';
  const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string };

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    if (data) {
      return {
        id: data.id,
        role: data.role,
        name: data.full_name || meta.full_name || email.split('@')[0],
        email,
        phone: data.phone || meta.phone || '',
      };
    }
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  // El trigger de registro debería haber creado el perfil. Este respaldo
  // permite entrar en modo clienta si hubo una demora puntual.
  return { id: user.id, role: 'clienta', name: meta.full_name || email.split('@')[0], email, phone: meta.phone ?? '' };
}

async function fetchStudio(profile: Profile) {
  const [businessRes, servicesRes, hoursRes, blockedRes, appointmentsRes, portfolioRes] = await Promise.all([
    supabase.from('business').select('*').eq('id', 1).maybeSingle<BusinessRow>(),
    supabase.from('services').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('business_hours').select('*').order('day', { ascending: true }),
    supabase.from('blocked_dates').select('date').order('date', { ascending: true }),
    supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true }),
    supabase.from('portfolio_items').select('*').order('created_at', { ascending: false }),
  ]);

  const error =
    businessRes.error ||
    servicesRes.error ||
    hoursRes.error ||
    blockedRes.error ||
    appointmentsRes.error ||
    portfolioRes.error;
  if (error) throw error;

  const businessRow = (businessRes.data as BusinessRow | null) ?? null;
  const business = businessRow
    ? { ...mapBusiness(businessRow), owner: businessRow.owner_name || profile.name }
    : { ...emptyBusiness, owner: profile.name };

  const hours = (hoursRes.data ?? []) as HourRow[];
  const blocked = ((blockedRes.data ?? []) as { date: string }[]).map(r => r.date);
  const appointmentRows = (appointmentsRes.data ?? []) as AppointmentRow[];
  const paths = appointmentRows.map(r => r.reference_path).filter((p): p is string => Boolean(p));
  const signed = await signedImageUrls(paths);

  return {
    business,
    services: ((servicesRes.data ?? []) as ServiceRow[]).map(mapService),
    schedule: mapSchedule(businessRow, hours, blocked),
    appointments: appointmentRows.map(row => mapAppointment(row, signed)),
    portfolio: ((portfolioRes.data ?? []) as PortfolioRow[]).map(mapPortfolio),
  };
}

const placeFor = (appointment: Appointment, business: Business) =>
  appointment.modality === 'domicilio' ? 'tu domicilio' : business.name;

// ── Store ────────────────────────────────────────────────────────────────────

let authUnsubscribe: (() => void) | null = null;
let channel: RealtimeChannel | null = null;
let loadedId: string | null = null;
let loadPromise: Promise<void> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<Data & Actions>()((set, get) => {
  const reset = () =>
    set({
      session: null,
      business: emptyBusiness,
      services: [],
      schedule: emptySchedule(),
      appointments: [],
      portfolio: [],
      loading: false,
    });

  const stopRealtime = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  const refreshSoon = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void get()
        .refresh()
        .catch(() => {});
    }, 650);
  };

  const startRealtime = (profile: Profile) => {
    stopRealtime();
    channel = supabase
      .channel(`nailtime-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_hours' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_items' }, refreshSoon)
      .subscribe();
  };

  const handleSession = async (session: Session | null, force = false): Promise<void> => {
    if (!session?.user) {
      loadedId = null;
      loadPromise = null;
      stopRealtime();
      reset();
      return;
    }
    if (!force && loadedId === session.user.id && get().session) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      set({ loading: true });
      try {
        const profile = await fetchProfile(session);
        const studio = await fetchStudio(profile);
        set({ ...studio, session: profile, loading: false });
        loadedId = profile.id;
        startRealtime(profile);

        if (profile.role === 'clienta') {
          const { appointments, business } = get();
          void syncReminders(appointments, a => placeFor(a, business));
        }
      } finally {
        loadPromise = null;
        set({ loading: false });
      }
    })();

    return loadPromise;
  };

  const safeHandle = (session: Session | null) => {
    void handleSession(session).catch(() => {
      set({ loading: false });
    });
  };

  const updateLocalAppointment = (appointment: Appointment) =>
    set(s => {
      const exists = s.appointments.some(a => a.id === appointment.id);
      return {
        appointments: exists
          ? s.appointments.map(a => (a.id === appointment.id ? appointment : a))
          : [...s.appointments, appointment],
      };
    });

  return {
    ready: false,
    session: null,
    business: emptyBusiness,
    services: [],
    schedule: emptySchedule(),
    appointments: [],
    portfolio: [],
    loading: false,

    init: () => {
      if (authUnsubscribe) return authUnsubscribe;
      if (!isSupabaseConfigured) {
        set({ ready: true });
        return () => {};
      }

      supabase.auth
        .getSession()
        .then(({ data }) => handleSession(data.session))
        .catch(() => {})
        .finally(() => set({ ready: true }));

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') return;
        if (event === 'SIGNED_OUT') {
          loadedId = null;
          loadPromise = null;
          stopRealtime();
          reset();
          return;
        }
        safeHandle(session);
      });

      authUnsubscribe = () => {
        data.subscription.unsubscribe();
        authUnsubscribe = null;
        stopRealtime();
      };
      return authUnsubscribe;
    },

    retry: async () => {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await handleSession(data.session, true);
    },

    signIn: async (email, password) => {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error('No pudimos iniciar tu sesión. Inténtalo de nuevo.');
      loadedId = null;
      await handleSession(data.session, true);
      const profile = get().session;
      if (!profile) throw new Error('No encontramos tu perfil. Inténtalo de nuevo.');
      return profile;
    },

    signUp: async ({ name, phone, email, password }) => {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim(), phone: phone.trim() },
          emailRedirectTo: confirmRedirect(),
        },
      });
      if (error) throw error;
      if (data.session) {
        loadedId = null;
        await handleSession(data.session, true);
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },

    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        loadedId = null;
        loadPromise = null;
        stopRealtime();
        reset();
      }
    },

    resetPassword: async email => {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: recoveryRedirect(),
      });
      if (error) throw error;
    },

    updatePassword: async password => {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (data.user) {
        const { data: current } = await supabase.auth.getSession();
        if (current.session) {
          loadedId = null;
          await handleSession(current.session, true);
        }
      }
    },

    updateProfile: async data => {
      const current = get().session;
      if (!current) throw new Error('Inicia sesión para continuar.');
      const name = data.name?.trim() || current.name;
      const phone = data.phone?.trim() ?? current.phone;

      const { data: row, error } = await supabase
        .from('profiles')
        .update({ full_name: name, phone })
        .eq('id', current.id)
        .select('id, role, full_name, phone')
        .single<ProfileRow>();
      if (error) throw error;

      set({ session: { ...current, name: row.full_name, phone: row.phone } });

      if (current.role === 'manicurista') {
        try {
          await supabase.from('business').update({ owner_name: row.full_name }).eq('id', 1);
          set(s => ({ business: { ...s.business, owner: row.full_name } }));
        } catch {}
      }
    },

    refresh: async () => {
      const profile = get().session;
      if (!profile) return;
      const studio = await fetchStudio(profile);
      set({ ...studio });
      if (profile.role === 'clienta') {
        const { appointments, business } = get();
        void syncReminders(appointments, a => placeFor(a, business));
      }
    },

    saveBusiness: async data => {
      const { data: row, error } = await supabase
        .from('business')
        .update({
          name: data.name.trim(),
          owner_name: data.owner.trim(),
          phone: data.phone.trim(),
          whatsapp: data.whatsapp.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          latitude: data.latitude,
          longitude: data.longitude,
          bio: data.bio.trim(),
          home_service: data.homeService,
          home_service_fee: data.homeServiceFee,
          configured: true,
        })
        .eq('id', 1)
        .select('*')
        .single<BusinessRow>();
      if (error) throw error;
      set({ business: mapBusiness(row) });
    },

    updateBusiness: async data => {
      const current = get().business;
      const next: BusinessInput = {
        name: data.name ?? current.name,
        owner: data.owner ?? current.owner,
        phone: data.phone ?? current.phone,
        whatsapp: data.whatsapp ?? current.whatsapp,
        address: data.address ?? current.address,
        city: data.city ?? current.city,
        bio: data.bio ?? current.bio,
        homeService: data.homeService ?? current.homeService,
        homeServiceFee: data.homeServiceFee ?? current.homeServiceFee,
        latitude: data.latitude ?? current.latitude,
        longitude: data.longitude ?? current.longitude,
      };
      await get().saveBusiness(next);
    },

    updateSchedule: async data => {
      const body: Record<string, unknown> = {};
      if (data.hasBreak !== undefined) body.has_break = data.hasBreak;
      if (data.breakStart !== undefined) body.break_start = data.breakStart;
      if (data.breakEnd !== undefined) body.break_end = data.breakEnd;
      if (data.step !== undefined) body.slot_step = data.step;
      if (!Object.keys(body).length) return;

      const { error } = await supabase.from('business').update(body).eq('id', 1);
      if (error) throw error;
      set(s => ({ schedule: { ...s.schedule, ...data } }));
    },

    updateDay: async (index, data) => {
      const next = { ...get().schedule.days[index], ...data };
      const { error } = await supabase
        .from('business_hours')
        .upsert({ day: index, active: next.active, start_time: next.start, end_time: next.end }, { onConflict: 'day' });
      if (error) throw error;
      set(s => ({
        schedule: { ...s.schedule, days: s.schedule.days.map((d, i) => (i === index ? next : d)) },
      }));
    },

    toggleBlockedDate: async date => {
      const blocked = get().schedule.blockedDates.includes(date);
      const { error } = blocked
        ? await supabase.from('blocked_dates').delete().eq('date', date)
        : await supabase.from('blocked_dates').insert({ date });
      if (error) throw error;
      set(s => ({
        schedule: {
          ...s.schedule,
          blockedDates: blocked ? s.schedule.blockedDates.filter(d => d !== date) : [...s.schedule.blockedDates, date],
        },
      }));
    },

    saveService: async input => {
      const existing = input.id ? get().services.find(s => s.id === input.id) : undefined;
      const oldPath = existing?.photoPath ?? null;

      let photoPath: string | null = input.photoPath ?? existing?.photoPath ?? null;
      if (input.photoUri) photoPath = await uploadImage('portfolio', input.photoUri, 'services');
      else if (input.photoPath === null) photoPath = null;

      const body = {
        name: input.name.trim(),
        description: input.description.trim(),
        duration: input.duration,
        price: input.price,
        category: input.category,
        icon: input.icon,
        active: input.active,
        photo_path: photoPath,
        sort_order: existing?.sortOrder ?? get().services.length,
      };

      const query = input.id
        ? supabase.from('services').update(body).eq('id', input.id)
        : supabase.from('services').insert(body);
      const { data, error } = await query.select('*').single<ServiceRow>();
      if (error) {
        if (input.photoUri && photoPath) await removeImages('portfolio', [photoPath]);
        throw error;
      }

      if (oldPath && oldPath !== photoPath) await removeImages('portfolio', [oldPath]);

      const service = mapService(data);
      set(s => ({
        services: existing ? s.services.map(x => (x.id === service.id ? service : x)) : [...s.services, service],
      }));
      return service;
    },

    deleteService: async id => {
      const service = get().services.find(s => s.id === id);
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      if (service?.photoPath) await removeImages('portfolio', [service.photoPath]);
      set(s => ({ services: s.services.filter(x => x.id !== id) }));
    },

    toggleService: async id => {
      const service = get().services.find(s => s.id === id);
      if (!service) return;
      const { error } = await supabase.from('services').update({ active: !service.active }).eq('id', id);
      if (error) throw error;
      set(s => ({ services: s.services.map(x => (x.id === id ? { ...x, active: !x.active } : x)) }));
    },

    addAppointment: async input => {
      const profile = get().session;
      if (!profile) throw new Error('Inicia sesión para reservar.');
      const service = get().services.find(s => s.id === input.serviceId);
      if (!service) throw new Error('Ese servicio ya no está disponible.');

      let referencePath: string | null = null;
      if (input.referenceUri) referencePath = await uploadImage('references', input.referenceUri, profile.id);

      const fee = input.modality === 'domicilio' && get().business.homeService ? get().business.homeServiceFee : 0;

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: profile.id,
          client_name: profile.name,
          client_phone: profile.phone,
          service_id: service.id,
          service_name: service.name,
          date: input.date,
          time: input.time,
          start_min: toMin(input.time),
          duration: service.duration,
          price: service.price + fee,
          modality: input.modality,
          address: input.address ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          reference_path: referencePath,
          notes: input.notes ?? null,
        })
        .select('*')
        .single<AppointmentRow>();

      if (error) {
        if (referencePath) await removeImages('references', [referencePath]);
        throw error;
      }

      const signed = data.reference_path ? await signedImageUrls([data.reference_path]) : {};
      const appointment = mapAppointment(data, signed);
      updateLocalAppointment(appointment);

      if (profile.role === 'clienta') {
        void setReminders(appointment.id, {
          serviceName: appointment.serviceName,
          date: appointment.date,
          time: appointment.time,
          place: placeFor(appointment, get().business),
        });
      }
      return appointment;
    },

    updateAppointment: async (id, patch) => {
      const current = get().appointments.find(a => a.id === id);
      if (!current) throw new Error('No encontramos esa cita.');
      const profile = get().session;
      if (!profile) throw new Error('Inicia sesión para continuar.');

      let referencePath = current.referencePath ?? null;
      if (patch.referenceUri) referencePath = await uploadImage('references', patch.referenceUri, profile.id);
      else if (patch.referencePath === null) referencePath = null;

      const body: Record<string, unknown> = {};
      if (patch.date !== undefined) body.date = patch.date;
      if (patch.time !== undefined) {
        body.time = patch.time;
        body.start_min = toMin(patch.time);
      }
      if (patch.modality !== undefined) body.modality = patch.modality;
      if (patch.address !== undefined) body.address = patch.address;
      if (patch.latitude !== undefined) body.latitude = patch.latitude;
      if (patch.longitude !== undefined) body.longitude = patch.longitude;
      if (patch.notes !== undefined) body.notes = patch.notes;
      if (patch.status !== undefined) body.status = patch.status;
      if (patch.referenceUri !== undefined || patch.referencePath !== undefined) body.reference_path = referencePath;

      if (patch.date !== undefined || patch.time !== undefined) {
        body.status = profile.role === 'manicurista' ? 'confirmada' : 'pendiente';
      }

      const { data, error } = await supabase.from('appointments').update(body).eq('id', id).select('*').single<AppointmentRow>();

      if (error) {
        if (patch.referenceUri && referencePath) await removeImages('references', [referencePath]);
        throw error;
      }

      const signed = data.reference_path ? await signedImageUrls([data.reference_path]) : {};
      const appointment = mapAppointment(data, signed);
      updateLocalAppointment(appointment);

      if (current.referencePath && current.referencePath !== appointment.referencePath) {
        await removeImages('references', [current.referencePath]);
      }

      if (appointment.status === 'cancelada') {
        void clearReminders(appointment.id);
      } else if (profile.role === 'clienta' && appointment.clientId === profile.id) {
        void setReminders(appointment.id, {
          serviceName: appointment.serviceName,
          date: appointment.date,
          time: appointment.time,
          place: placeFor(appointment, get().business),
        });
      }

      return appointment;
    },

    addPortfolio: async uri => {
      const path = await uploadImage('portfolio', uri, 'portfolio');
      const { data, error } = await supabase
        .from('portfolio_items')
        .insert({ storage_path: path })
        .select('*')
        .single<PortfolioRow>();
      if (error) {
        await removeImages('portfolio', [path]);
        throw error;
      }
      set(s => ({ portfolio: [mapPortfolio(data), ...s.portfolio] }));
    },

    removePortfolio: async id => {
      const item = get().portfolio.find(p => p.id === id);
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
      if (error) throw error;
      if (item?.storagePath) await removeImages('portfolio', [item.storagePath]);
      set(s => ({ portfolio: s.portfolio.filter(p => p.id !== id) }));
    },
  };
});

/** @deprecated Solo para compatibilidad de imports antiguos. */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
