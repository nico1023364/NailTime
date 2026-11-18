import { Appointment, Schedule } from './types';
import { toDateTime, toMin, toTime, todayStr } from './format';

export interface Slot {
  time: string;
  available: boolean;
}

export function isDayOpen(date: string, schedule: Schedule) {
  if (schedule.blockedDates.includes(date)) return false;
  return schedule.days[toDateTime(date).getDay()]?.active ?? false;
}

export function getSlots(date: string, duration: number, schedule: Schedule, appointments: Appointment[], excludeId?: string): Slot[] {
  if (!isDayOpen(date, schedule)) return [];
  const day = schedule.days[toDateTime(date).getDay()];
  const start = toMin(day.start);
  const end = toMin(day.end);
  const busy = appointments
    .filter(a => a.date === date && a.status !== 'cancelada' && a.id !== excludeId)
    .map((a): [number, number] => [toMin(a.time), toMin(a.time) + a.duration]);
  if (schedule.hasBreak) busy.push([toMin(schedule.breakStart), toMin(schedule.breakEnd)]);
  const now = new Date();
  const nowMin = date === todayStr() ? now.getHours() * 60 + now.getMinutes() : -1;
  const slots: Slot[] = [];
  for (let s = start; s + duration <= end; s += schedule.step) {
    const e = s + duration;
    const taken = busy.some(([bs, be]) => s < be && e > bs);
    slots.push({ time: toTime(s), available: !taken && s > nowMin });
  }
  return slots;
}
