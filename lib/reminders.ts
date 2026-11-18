import AsyncStorage from '@react-native-async-storage/async-storage';
import { isUpcoming } from './format';
import { cancelReminders, scheduleReminders } from './notifications';
import { Appointment } from './types';

const KEY = 'nailtime-reminders-v1';

interface ReminderEntry {
  ids: string[];
  date: string;
  time: string;
}

type ReminderMap = Record<string, ReminderEntry>;

async function readMap(): Promise<ReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ReminderMap) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: ReminderMap) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

/** Cancela y vuelve a programar los recordatorios locales de una cita. */
export async function setReminders(
  appointmentId: string,
  info: { serviceName: string; date: string; time: string; place: string }
) {
  const map = await readMap();
  if (map[appointmentId]) {
    await cancelReminders(map[appointmentId].ids);
    delete map[appointmentId];
  }
  const ids = await scheduleReminders(info);
  if (ids.length) map[appointmentId] = { ids, date: info.date, time: info.time };
  await writeMap(map);
}

export async function clearReminders(appointmentId: string) {
  const map = await readMap();
  const entry = map[appointmentId];
  if (!entry) return;
  await cancelReminders(entry.ids);
  delete map[appointmentId];
  await writeMap(map);
}

/**
 * Alinea los recordatorios del dispositivo con las citas reales: programa los
 * que faltan (o cambiaron de horario) y elimina los de citas canceladas o
 * pasadas.
 */
export async function syncReminders(appointments: Appointment[], place: (appointment: Appointment) => string) {
  const map = await readMap();
  const active = new Set<string>();

  for (const a of appointments) {
    if (!isUpcoming(a)) continue;
    active.add(a.id);
    const entry = map[a.id];
    if (entry && entry.date === a.date && entry.time === a.time && entry.ids.length) continue;
    if (entry) await cancelReminders(entry.ids);
    const ids = await scheduleReminders({ serviceName: a.serviceName, date: a.date, time: a.time, place: place(a) });
    if (ids.length) map[a.id] = { ids, date: a.date, time: a.time };
    else delete map[a.id];
  }

  for (const id of Object.keys(map)) {
    if (active.has(id)) continue;
    await cancelReminders(map[id].ids);
    delete map[id];
  }

  await writeMap(map);
}
