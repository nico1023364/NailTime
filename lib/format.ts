import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment } from './types';

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const money = (v: number) => '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatDuration = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};

export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export const longDate = (d: string) => capitalize(format(parseISO(d), "EEEE d 'de' MMMM", { locale: es }));

export const shortDate = (d: string) => format(parseISO(d), "d 'de' MMM", { locale: es }).replace('.', '');

export const friendlyDate = (d: string) => {
  const date = parseISO(d);
  if (isToday(date)) return 'Hoy';
  if (isTomorrow(date)) return 'Mañana';
  return longDate(d);
};

export const monthShort = (d: string) => format(parseISO(d), 'MMM', { locale: es }).replace('.', '').toUpperCase();

export const dayNumber = (d: string) => format(parseISO(d), 'd');

export const time12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const toDateTime = (date: string, time = '00:00') => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
};

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const compareAppointments = (a: Appointment, b: Appointment) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

export const isUpcoming = (a: Appointment) =>
  (a.status === 'pendiente' || a.status === 'confirmada') && toDateTime(a.date, a.time).getTime() >= Date.now();

export const firstName = (n: string) => n.trim().split(' ')[0] ?? '';

export const initials = (n: string) =>
  n.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
