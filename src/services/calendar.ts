import { registerPlugin } from "@capacitor/core";
import type { Plan } from "../domain/schema.ts";
import { reminderItems, type ReminderItem } from "../domain/planning.ts";
import { isNative } from "./files.ts";
export interface DeviceCalendar {
  id: string;
  name: string;
  account: string;
}
export interface CalendarEntry {
  id: string;
  title: string;
  start: number;
  end: number;
  location: string;
  reminderMinutes: number;
  description: string;
}
interface CalendarPlugin {
  listCalendars(): Promise<{ calendars: DeviceCalendar[] }>;
  connect(options: { planId: string; calendarId: string }): Promise<void>;
  syncEvents(options: {
    planId: string;
    calendarId: string;
    events: CalendarEntry[];
  }): Promise<{ count: number }>;
  disconnect(options: { planId: string }): Promise<{ removed: number }>;
}
const NativeCalendar = registerPlugin<CalendarPlugin>("PlanningCalendar");
export function calendarEntries(plan: Plan, now = Date.now()): CalendarEntry[] {
  const source: ReminderItem[] = [
    {
      id: `wedding-${plan.id}`,
      name: plan.settings.couple
        ? `Casamento de ${plan.settings.couple}`
        : "Nosso casamento",
      kind: "Cronograma",
      date: plan.settings.weddingDate,
      time: plan.settings.weddingTime,
      location: plan.settings.location,
      durationMinutes: 240,
    },
    ...reminderItems(plan),
  ];
  return source
    .map((item) => {
      const start = new Date(`${item.date}T${item.time}:00-03:00`).getTime();
      return {
        id: item.id,
        title: item.name,
        start,
        end: start + (item.durationMinutes || 60) * 60000,
        location: item.location || "",
        reminderMinutes:
          item.reminderMinutes ?? plan.settings.reminderDays * 1440,
        description: `Nosso Casamento\n${item.kind}\n[${plan.id}:${item.id}]`,
      };
    })
    .filter((item) => item.end >= now - 86400000)
    .sort((a, b) => a.start - b.start)
    .slice(0, 250);
}
export async function listDeviceCalendars() {
  if (!isNative())
    throw new Error(
      "A conexão automática com o calendário está disponível no APK Android. No navegador, use Google Agenda ou exporte o arquivo .ics.",
    );
  return (await NativeCalendar.listCalendars()).calendars;
}
export async function connectDeviceCalendar(
  planId: string,
  calendarId: string,
) {
  await NativeCalendar.connect({ planId, calendarId });
  signature = "";
}
let pending: Promise<unknown> = Promise.resolve(),
  signature = "",
  desired = true;
export function syncCalendar(plan: Plan, force = false): Promise<number> {
  desired = plan.settings.calendarSyncEnabled;
  const entries = calendarEntries(plan);
  const key = JSON.stringify([plan.id, plan.settings.calendarId, entries]);
  const next = pending
    .catch(() => undefined)
    .then(async () => {
      if (!isNative() || !plan.settings.calendarSyncEnabled || !desired)
        return 0;
      if (signature === key && !force) return entries.length;
      const response = await NativeCalendar.syncEvents({
        planId: plan.id,
        calendarId: plan.settings.calendarId,
        events: entries,
      });
      signature = key;
      return response.count;
    });
  pending = next;
  return next;
}
export async function disconnectCalendar(planId: string) {
  desired = false;
  await pending.catch(() => undefined);
  const result = await NativeCalendar.disconnect({ planId });
  signature = "";
  return result.removed;
}
export function googleCalendarUrl(item: ReminderItem) {
  const start = new Date(`${item.date}T${item.time}:00-03:00`);
  const end = new Date(start.getTime() + (item.durationMinutes || 60) * 60000);
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.search = new URLSearchParams({
    action: "TEMPLATE",
    text: item.name,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `${item.kind} · Nosso Casamento`,
    location: item.location || "",
    ctz: "America/Sao_Paulo",
  }).toString();
  return url.toString();
}
