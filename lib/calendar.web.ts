export type CalendarResult = 'ok' | 'denied' | 'unavailable';

export type CalendarEventInput = {
  title: string;
  start: Date;
  minutes: number;
  location?: string;
  notes?: string;
};

export const calendarAvailable = false;

export async function addToCalendar(_event: CalendarEventInput): Promise<CalendarResult> {
  return 'unavailable';
}
