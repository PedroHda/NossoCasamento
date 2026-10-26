import {
  newId,
  nowIso,
  planSchema,
  date,
  type Plan,
  type Expense,
  type Settings,
  type Installment,
  type Collection,
  type RecordItem,
} from "./schema.ts";

export const cents = (value: number) => Math.round(value * 100);
export const sumMoney = (values: number[]) =>
  values.reduce((sum, value) => sum + cents(value), 0) / 100;
export const paidAmount = (expense: Expense) =>
  sumMoney(expense.payments.map((payment) => payment.amount));
export const remainingAmount = (expense: Expense) =>
  (cents(expense.amount) - cents(paidAmount(expense))) / 100;
export const installmentPaid = (expense: Expense, installmentId: string) =>
  sumMoney(
    expense.payments
      .filter((payment) => payment.installmentId === installmentId)
      .map((payment) => payment.amount),
  );
export const installmentRemaining = (
  expense: Expense,
  installment: Installment,
) =>
  (cents(installment.amount) -
    cents(installmentPaid(expense, installment.id))) /
  100;
export const expenseStatus = (expense: Expense) =>
  remainingAmount(expense) === 0
    ? "Pago"
    : paidAmount(expense) > 0
      ? "Parcial"
      : "Pendente";
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const shortMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const formatDate = (value: string, full = false) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: full ? "2-digit" : "short",
        ...(full ? { year: "numeric" as const } : {}),
      })
        .format(new Date(`${value}T12:00:00-03:00`))
        .replace(".", "")
    : "Sem data";
export const weddingInstant = (settings: Settings) =>
  new Date(
    `${settings.weddingDate}T${settings.weddingTime}:00-03:00`,
  ).getTime();
export function countdown(settings: Settings, now = Date.now()) {
  const seconds = Math.floor(
    Math.max(0, weddingInstant(settings) - now) / 1000,
  );
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    arrived: now >= weddingInstant(settings),
  };
}
export function totals(plan: Plan) {
  const contracted = sumMoney(plan.expenses.map((item) => item.amount));
  const estimated = sumMoney(plan.expenses.map((item) => item.estimatedAmount));
  const paid = sumMoney(plan.expenses.map(paidAmount));
  const count = (status?: string) =>
    plan.guests
      .filter((guest) => !status || guest.status === status)
      .reduce(
        (sum, guest) =>
          sum +
          1 +
          (status === "Confirmado"
            ? (guest.confirmedCompanions ?? guest.companions)
            : guest.companions),
        0,
      );
  const completed = plan.tasks.filter((task) => task.done).length;
  return {
    contracted,
    estimated,
    paid,
    remaining: (cents(contracted) - cents(paid)) / 100,
    available: (cents(plan.settings.budget) - cents(contracted)) / 100,
    invited: count(),
    confirmed: count("Confirmado"),
    pending: count("Pendente"),
    declined: count("Não vai"),
    completed,
    progress: plan.tasks.length
      ? Math.round((completed / plan.tasks.length) * 100)
      : 0,
    budgetPercent: plan.settings.budget
      ? Math.round((contracted / plan.settings.budget) * 100)
      : contracted
        ? 100
        : 0,
  };
}

export function updateRecord(
  plan: Plan,
  collection: Collection,
  record: RecordItem,
  expectedUpdatedAt?: string,
): Plan {
  const next = structuredClone(plan);
  const list = next[collection] as RecordItem[];
  const index = list.findIndex((item) => item.id === record.id);
  if (
    index >= 0 &&
    expectedUpdatedAt &&
    list[index].updatedAt !== expectedUpdatedAt
  )
    throw new Error(
      "Este registro mudou em outra aba. Feche e reabra a edição antes de salvar.",
    );
  if (index < 0 && expectedUpdatedAt)
    throw new Error(
      "Este registro foi removido em outra aba. Reabra a lista antes de salvar.",
    );
  const updated = { ...record, updatedAt: nowIso() };
  if (index >= 0) list[index] = updated;
  else list.push(updated);
  return planSchema.parse(next);
}

export function generateInstallments(
  expense: Expense,
  count: number,
  firstDate: string,
): Installment[] {
  date.parse(firstDate);
  if (!Number.isInteger(count) || count < 1 || count > 36)
    throw new Error("Escolha de 1 a 36 parcelas.");
  if (expense.payments.some((payment) => payment.installmentId))
    throw new Error(
      "Já existem pagamentos vinculados. Remova esses pagamentos antes de refazer as parcelas.",
    );
  const outstanding = cents(remainingAmount(expense));
  if (outstanding <= 0 || outstanding < count)
    throw new Error("O saldo não é suficiente para esse parcelamento.");
  const [year, month, day] = firstDate.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const target = new Date(Date.UTC(year, month - 1 + index, 1));
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const dueDate = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
    return {
      id: newId(),
      name: `Parcela ${index + 1}/${count}`,
      amount:
        (Math.floor(outstanding / count) +
          (index < outstanding % count ? 1 : 0)) /
        100,
      dueDate,
    };
  });
}

export function moveToTrash(
  plan: Plan,
  collection: Collection,
  id: string,
): Plan {
  const next = structuredClone(plan);
  const list = next[collection] as RecordItem[];
  const item = list.find((item) => item.id === id);
  if (!item) throw new Error("O registro não está mais nesta lista.");
  list.splice(list.indexOf(item), 1);
  next.trash.push({
    id: newId(),
    collection,
    record: item,
    deletedAt: nowIso(),
  } as Plan["trash"][number]);
  return planSchema.parse(next);
}
export function restoreFromTrash(plan: Plan, trashId: string): Plan {
  const next = structuredClone(plan);
  const entry = next.trash.find((item) => item.id === trashId);
  if (!entry) throw new Error("Registro não encontrado na lixeira.");
  (next[entry.collection] as RecordItem[]).push(entry.record);
  next.trash = next.trash.filter((item) => item.id !== trashId);
  return planSchema.parse(next);
}
export function emptyTrash(plan: Plan): Plan {
  const next = structuredClone(plan);
  const removedVendors = new Set(
    next.trash
      .filter((item) => item.collection === "vendors")
      .map((item) => item.record.id),
  );
  next.expenses.forEach((expense) => {
    if (expense.vendorId && removedVendors.has(expense.vendorId))
      expense.vendorId = null;
  });
  next.trash = [];
  return planSchema.parse(next);
}
export function vendorName(plan: Plan, id: string | null) {
  return (
    plan.vendors.find((item) => item.id === id)?.name ||
    plan.trash.find(
      (item) => item.collection === "vendors" && item.record.id === id,
    )?.record.name ||
    ""
  );
}

export interface ReminderItem {
  id: string;
  name: string;
  kind: "Tarefa" | "Pagamento" | "Cronograma";
  date: string;
  time: string;
  amount?: number;
}
export function reminderItems(plan: Plan): ReminderItem[] {
  const tasks: ReminderItem[] = plan.tasks
    .filter((item) => !item.done && item.dueDate)
    .map((item) => ({
      id: item.id,
      name: item.name,
      kind: "Tarefa",
      date: item.dueDate,
      time: "09:00",
    }));
  const payments: ReminderItem[] = plan.expenses.flatMap((expense) => {
    const installments = expense.installments
      .filter((item) => installmentRemaining(expense, item) > 0)
      .map((item) => ({
        id: item.id,
        name: `${expense.name} · ${item.name}`,
        kind: "Pagamento" as const,
        date: item.dueDate,
        time: "09:00",
        amount: installmentRemaining(expense, item),
      }));
    const unallocated =
      (cents(remainingAmount(expense)) -
        installments.reduce((sum, item) => sum + cents(item.amount), 0)) /
      100;
    return [
      ...installments,
      ...(unallocated > 0 && expense.dueDate
        ? [
            {
              id: expense.id,
              name: expense.name,
              kind: "Pagamento" as const,
              date: expense.dueDate,
              time: "09:00",
              amount: unallocated,
            },
          ]
        : []),
    ];
  });
  return [
    ...tasks,
    ...payments,
    ...plan.timeline.map((item) => ({
      id: item.id,
      name: item.name,
      kind: "Cronograma" as const,
      date: item.date,
      time: item.time,
    })),
  ].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function budgetTimeline(plan: Plan) {
  const events: { date: string; amount: number; paid: boolean }[] = [];
  for (const expense of plan.expenses) {
    for (const payment of expense.payments)
      events.push({
        date: payment.date || today(),
        amount: payment.amount,
        paid: true,
      });
    let scheduled = 0;
    for (const installment of expense.installments) {
      const remaining = installmentRemaining(expense, installment);
      scheduled += cents(remaining);
      events.push({
        date: installment.dueDate,
        amount: remaining,
        paid: false,
      });
    }
    const remainder = (cents(remainingAmount(expense)) - scheduled) / 100;
    if (remainder > 0)
      events.push({
        date: expense.dueDate || plan.settings.weddingDate,
        amount: remainder,
        paid: false,
      });
  }
  const dates = [
    today(),
    plan.settings.weddingDate,
    ...events.map((item) => item.date),
  ].sort();
  const [startYear, startMonth] = dates[0].split("-").map(Number);
  const [endYear, endMonth] = dates.at(-1)!.split("-").map(Number);
  const start = startYear * 12 + startMonth - 1;
  const end = endYear * 12 + endMonth - 1;
  const length = Math.min(12, Math.max(2, end - start + 1));
  return Array.from({ length }, (_, i) => {
    const month =
      start === end
        ? start + i
        : Math.round(start + ((end - start) * i) / (length - 1));
    const prefix = `${Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}`;
    const included = events.filter((item) => item.date.slice(0, 7) <= prefix);
    return {
      month: prefix,
      label: new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      })
        .format(new Date(`${prefix}-01T12:00:00Z`))
        .replace(".", ""),
      planned: sumMoney(included.map((item) => item.amount)),
      paid: sumMoney(
        included.filter((item) => item.paid).map((item) => item.amount),
      ),
    };
  });
}
