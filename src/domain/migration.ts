import {
  initialState as legacyInitialState,
  validateState as validateLegacyState,
} from "../model.js";
import { planSchema, newId, nowIso, type Plan } from "./schema.ts";

export function migrateV1(value: unknown): Plan {
  const legacy = validateLegacyState(value) as unknown as {
    demo: boolean;
    settings: {
      couple: string;
      budget: number;
      guestTarget: number;
      location: string;
      weddingDate: string;
    };
    expenses: {
      id: string;
      name: string;
      category: string;
      amount: number;
      paid: number;
      dueDate: string;
    }[];
    guests: object[];
    tasks: object[];
    vendors: object[];
  };
  const stamp = nowIso();
  return planSchema.parse({
    version: 2,
    id: newId(),
    revision: 0,
    updatedAt: stamp,
    demo: legacy.demo,
    settings: {
      ...legacy.settings,
      weddingTime: "00:00",
      timeZone: "America/Sao_Paulo",
      remindersEnabled: false,
      reminderDays: 1,
      publicUrl: "",
    },
    expenses: legacy.expenses.map(
      (item: {
        id: string;
        name: string;
        category: string;
        amount: number;
        paid: number;
        dueDate: string;
      }) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        amount: item.amount,
        estimatedAmount: item.amount,
        dueDate: item.dueDate,
        vendorId: null,
        notes: "",
        updatedAt: stamp,
        payments: item.paid
          ? [
              {
                id: `legacy-payment-${item.id}`,
                amount: item.paid,
                date: "",
                note: "Saldo importado da versão 1; data original não informada.",
                installmentId: null,
                receiptId: null,
              },
            ]
          : [],
        installments: [],
        attachments: [],
      }),
    ),
    guests: legacy.guests.map((item: object) => ({
      ...item,
      phone: "",
      dietary: "",
      notes: "",
      inviteToken: newId(),
      lastResponseAt: "",
      updatedAt: stamp,
    })),
    tasks: legacy.tasks.map((item: object) => ({
      ...item,
      owner: "Nós",
      priority: "Normal",
      updatedAt: stamp,
    })),
    vendors: legacy.vendors.map((item: object) => ({
      ...item,
      quoteAmount: null,
      updatedAt: stamp,
    })),
    timeline: [],
    trash: [],
  });
}

export function parsePlan(value: unknown): Plan {
  return value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1
    ? migrateV1(value)
    : planSchema.parse(value);
}

export function createPlan(empty = false): Plan {
  const plan = migrateV1(legacyInitialState(empty));
  if (!empty) {
    const links: Record<string, string> = {
      e1: "v1",
      e2: "v4",
      e3: "v2",
      e4: "v3",
    };
    plan.expenses.forEach((item) => {
      item.vendorId = links[item.id] || null;
    });
    plan.vendors.forEach((item) => {
      item.quoteAmount =
        plan.expenses.find((expense) => expense.vendorId === item.id)?.amount ||
        null;
    });
    plan.timeline = [
      {
        id: newId(),
        name: "Cerimônia",
        date: plan.settings.weddingDate,
        time: "16:00",
        location: "",
        notes: "Horário de exemplo: ajuste para o seu grande dia.",
        updatedAt: plan.updatedAt,
      },
      {
        id: newId(),
        name: "Fotos com a família",
        date: plan.settings.weddingDate,
        time: "17:00",
        location: "",
        notes: "",
        updatedAt: plan.updatedAt,
      },
      {
        id: newId(),
        name: "Recepção e festa",
        date: plan.settings.weddingDate,
        time: "18:30",
        location: "",
        notes: "",
        updatedAt: plan.updatedAt,
      },
    ];
  }
  return planSchema.parse(plan);
}
