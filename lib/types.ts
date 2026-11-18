export type Role = 'manicurista' | 'clienta';
export type AppointmentStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
export type Modality = 'local' | 'domicilio';

/** Cuenta autenticada en Supabase. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  icon: string;
  /** Ruta del archivo dentro del bucket `portfolio`. */
  photoPath?: string;
  /** URL pública resuelta para mostrar la foto. */
  photo?: string;
  active: boolean;
  sortOrder: number;
}

/** Datos que envía el formulario de servicio. */
export interface ServiceInput {
  id?: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  icon: string;
  active: boolean;
  /** Archivo local recién elegido (se sube al guardar). */
  photoUri?: string;
  /** Ruta ya guardada en Storage. */
  photoPath?: string | null;
}

export interface Appointment {
  id: string;
  serviceId: string | null;
  serviceName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  modality: Modality;
  address?: string;
  latitude?: number;
  longitude?: number;
  /** Ruta privada dentro del bucket `references`. */
  referencePath?: string;
  /** URL firmada resuelta para mostrar la referencia. */
  referencePhoto?: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

/** Datos mínimos para crear una cita; el servidor calcula precio, duración y estado. */
export interface NewAppointment {
  serviceId: string;
  date: string;
  time: string;
  modality: Modality;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  /** Foto local de referencia (se sube al crear). */
  referenceUri?: string;
}

/** Cambios permitidos sobre una cita existente. */
export interface AppointmentPatch {
  date?: string;
  time?: string;
  modality?: Modality;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  status?: AppointmentStatus;
  referenceUri?: string | null;
  referencePath?: string | null;
}

export interface DaySchedule {
  active: boolean;
  start: string;
  end: string;
}

export interface Schedule {
  days: DaySchedule[];
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
  step: number;
  blockedDates: string[];
}

export interface Business {
  name: string;
  owner: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  bio: string;
  homeService: boolean;
  homeServiceFee: number;
  /** `false` hasta que la dueña completa el onboarding. */
  configured: boolean;
}

export interface PortfolioItem {
  id: string;
  storagePath: string;
  /** URL pública resuelta. */
  uri: string;
  date: string;
}

export interface BusinessInput {
  name: string;
  owner: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  bio: string;
  homeService: boolean;
  homeServiceFee: number;
  latitude: number;
  longitude: number;
}
