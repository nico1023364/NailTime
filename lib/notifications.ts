import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { time12, toDateTime } from './format';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

function load(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  const expoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (expoGoAndroid) {
    cached = null;
    return cached;
  }
  try {
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export const notificationsAvailable = () => load() !== null;

export function configureNotifications() {
  const N = load();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }) as import('expo-notifications').NotificationBehavior,
    });
  } catch {}
}

export async function ensureNotificationPermission() {
  const N = load();
  if (!N) return false;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('citas', {
        name: 'Citas',
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E05A8A',
      });
    }
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await N.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function scheduleReminders(info: { serviceName: string; date: string; time: string; place: string }) {
  const ids: string[] = [];
  const N = load();
  if (!N) return ids;
  const ok = await ensureNotificationPermission();
  if (!ok) return ids;
  const start = toDateTime(info.date, info.time).getTime();
  const reminders = [
    { minutes: 24 * 60, title: 'Tu cita es mañana', body: `${info.serviceName} a las ${time12(info.time)} en ${info.place}.` },
    { minutes: 120, title: 'Tu cita es en 2 horas', body: `${info.serviceName} a las ${time12(info.time)}. ¡Te esperamos!` },
  ];
  for (const r of reminders) {
    const when = new Date(start - r.minutes * 60000);
    if (when.getTime() <= Date.now()) continue;
    try {
      const id = await N.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, sound: true },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: when, channelId: 'citas' },
      });
      ids.push(id);
    } catch {}
  }
  return ids;
}

export async function cancelReminders(ids: string[] = []) {
  const N = load();
  if (!N) return;
  for (const id of ids) {
    try {
      await N.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}

export async function notifyNow(title: string, body: string) {
  const N = load();
  if (!N) return false;
  const ok = await ensureNotificationPermission();
  if (!ok) return false;
  try {
    await N.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: null });
    return true;
  } catch {
    return false;
  }
}