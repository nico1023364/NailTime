import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Calendar from 'expo-calendar';

export type CalendarResult = 'ok' | 'denied' | 'unavailable';

export type CalendarEventInput = {
  title: string;
  start: Date;
  minutes: number;
  location?: string;
  notes?: string;
};

/**
 * `expo-calendar` is not bundled in Expo Go for SDK 58, so guard against it
 * instead of letting the native call fail at runtime.
 */
export const calendarAvailable = !isRunningInExpoGo();

async function writableCalendar() {
  if (Platform.OS === 'ios') {
    return Calendar.getDefaultCalendarSync();
  }
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter(calendar => calendar.allowsModifications);
  return writable.find(calendar => calendar.isPrimary) ?? writable[0];
}

export async function addToCalendar(event: CalendarEventInput): Promise<CalendarResult> {
  if (!calendarAvailable) return 'unavailable';
  try {
    const permission = await Calendar.requestCalendarPermissions();
    if (!permission.granted) return 'denied';

    const calendar = await writableCalendar();
    if (!calendar) return 'unavailable';

    await calendar.createEvent({
      title: event.title,
      startDate: event.start,
      endDate: new Date(event.start.getTime() + event.minutes * 60000),
      location: event.location,
      notes: event.notes,
      alarms: [{ relativeOffset: -60 }],
    });
    return 'ok';
  } catch {
    return 'unavailable';
  }
}
