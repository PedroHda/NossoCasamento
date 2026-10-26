import { LocalNotifications } from "@capacitor/local-notifications";
import type { Plan } from "../domain/schema.ts";
import { reminderItems } from "../domain/planning.ts";
import { isNative } from "./files.ts";

export function notificationSchedule(plan: Plan, now = Date.now()) {
  const used = new Set<number>();
  return reminderItems(plan)
    .map((item) => {
      const at = new Date(
        new Date(`${item.date}T${item.time}:00-03:00`).getTime() -
          plan.settings.reminderDays * 86400000,
      );
      let id =
        (Array.from(item.id).reduce(
          (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
          17,
        ) %
          2000000000) +
        1;
      while (used.has(id)) id = (id % 2000000000) + 1;
      used.add(id);
      return {
        id,
        title:
          item.kind === "Pagamento"
            ? "Um pagamento do nosso casamento"
            : "Um próximo passo do nosso sim",
        body: item.name,
        schedule: { at },
        extra: { recordId: item.id },
      };
    })
    .filter((item) => item.schedule.at.getTime() > now)
    .sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime())
    .slice(0, 50);
}
export async function enableReminders() {
  if (!isNative())
    throw new Error(
      "No navegador, acompanhe os lembretes no painel ou exporte a agenda. Os avisos do aparelho estão disponíveis no APK.",
    );
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw new Error(
      "As notificações não foram autorizadas. Você pode ativá-las nas configurações do Android.",
    );
}
let scheduling: Promise<unknown> = Promise.resolve();
export function scheduleReminders(plan: Plan): Promise<number> {
  const next = scheduling
    .catch(() => undefined)
    .then(() => applyReminders(plan));
  scheduling = next;
  return next;
}
async function applyReminders(plan: Plan) {
  if (!isNative()) return 0;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length)
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((item) => ({ id: item.id })),
    });
  if (!plan.settings.remindersEnabled) return 0;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted")
    throw new Error(
      "O Android não autorizou os lembretes. Confira as permissões do aplicativo.",
    );
  const notifications = notificationSchedule(plan);
  if (notifications.length)
    await LocalNotifications.schedule({ notifications });
  return notifications.length;
}
