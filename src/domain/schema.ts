import { z } from "zod";

export const CATEGORIES = [
  "Espaço e buffet",
  "Decoração",
  "Foto e vídeo",
  "Música",
  "Trajes e beleza",
  "Papelaria",
  "Outros",
] as const;
export const GUEST_GROUPS = [
  "Família",
  "Amigos",
  "Trabalho",
  "Outros",
] as const;
export const GUEST_STATUSES = ["Confirmado", "Pendente", "Não vai"] as const;
export const VENDOR_STATUSES = [
  "Em pesquisa",
  "Em negociação",
  "Contratado",
] as const;
export const MAX_ATTACHMENT_BYTES = 500 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 1500 * 1024;
export const identifier = z.string().min(1).max(100);
const text = (max = 160) =>
  z.string().trim().min(1, "Informe um nome.").max(max);
const optionalText = (max: number) => z.string().trim().max(max);
export const currency = z
  .number()
  .finite()
  .min(0, "O valor deve ser positivo.")
  .max(1e9)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001,
    "Use no máximo duas casas decimais.",
  );
export const date = z.string().refine((value) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}, "Informe uma data válida.");
const optionalDate = z.union([z.literal(""), date]);
export const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.");
const timestamp = z.string().datetime();
const base = { id: identifier, name: text(), updatedAt: timestamp };
export const attachmentSchema = z
  .object({
    id: identifier,
    name: text(160),
    mime: z.enum(["application/pdf", "image/png", "image/jpeg"]),
    size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
    data: z.string().min(4).max(700000),
  })
  .superRefine((file, ctx) => {
    try {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) throw new Error();
      const bytes = atob(file.data);
      const valid =
        file.mime === "application/pdf"
          ? bytes.startsWith("%PDF-")
          : file.mime === "image/png"
            ? bytes.startsWith("\x89PNG\r\n\x1a\n")
            : bytes.startsWith("\xff\xd8\xff");
      if (!valid || bytes.length !== file.size) throw new Error();
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "O arquivo não corresponde ao formato informado.",
      });
    }
  });
export const paymentSchema = z.object({
  id: identifier,
  amount: currency.refine(
    (value) => value > 0,
    "Informe um pagamento maior que zero.",
  ),
  date: optionalDate,
  note: optionalText(300),
  installmentId: identifier.nullable(),
  receiptId: identifier.nullable(),
});
export const installmentSchema = z.object({
  id: identifier,
  name: text(),
  amount: currency.refine((value) => value > 0),
  dueDate: date,
});
export const expenseSchema = z
  .object({
    ...base,
    category: z.enum(CATEGORIES),
    amount: currency,
    estimatedAmount: currency,
    dueDate: optionalDate,
    vendorId: identifier.nullable(),
    notes: optionalText(1000),
    payments: z.array(paymentSchema).max(500),
    installments: z.array(installmentSchema).max(120),
    attachments: z.array(attachmentSchema).max(10),
  })
  .superRefine((expense, ctx) => {
    const total = Math.round(expense.amount * 100);
    const paid = expense.payments.reduce(
      (sum, payment) => sum + Math.round(payment.amount * 100),
      0,
    );
    if (paid > total)
      ctx.addIssue({
        code: "custom",
        message: "O valor pago não pode ultrapassar o total da despesa.",
      });
    const ids = new Set(expense.installments.map((item) => item.id));
    const receipts = new Set(expense.attachments.map((item) => item.id));
    for (const payment of expense.payments) {
      if (payment.installmentId && !ids.has(payment.installmentId))
        ctx.addIssue({
          code: "custom",
          message: "Parcela do pagamento não encontrada.",
        });
      if (payment.receiptId && !receipts.has(payment.receiptId))
        ctx.addIssue({
          code: "custom",
          message: "Comprovante do pagamento não encontrado.",
        });
    }
    for (const installment of expense.installments) {
      const allocated = expense.payments
        .filter((payment) => payment.installmentId === installment.id)
        .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
      if (allocated > Math.round(installment.amount * 100))
        ctx.addIssue({
          code: "custom",
          message: `O pagamento ultrapassa o valor de ${installment.name}.`,
        });
    }
    const unallocatedPaid = expense.payments
      .filter((payment) => !payment.installmentId)
      .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
    if (
      expense.installments.reduce(
        (sum, item) => sum + Math.round(item.amount * 100),
        0,
      ) +
        unallocatedPaid >
      total
    )
      ctx.addIssue({
        code: "custom",
        message:
          "As parcelas e os pagamentos avulsos ultrapassam a despesa. Vincule o pagamento a uma parcela ou ajuste o parcelamento.",
      });
  });
export const guestSchema = z
  .object({
    ...base,
    group: z.enum(GUEST_GROUPS),
    status: z.enum(GUEST_STATUSES),
    companions: z.number().int().min(0).max(20),
    phone: optionalText(80),
    dietary: optionalText(300),
    notes: optionalText(1000),
    inviteToken: identifier,
    lastResponseAt: z.union([z.literal(""), timestamp]),
    confirmedCompanions: z
      .number()
      .int()
      .min(0)
      .max(20)
      .nullable()
      .default(null),
  })
  .refine(
    (guest) =>
      guest.confirmedCompanions === null ||
      guest.confirmedCompanions <= guest.companions,
    "Os acompanhantes confirmados ultrapassam o limite do convite.",
  );
export const taskSchema = z.object({
  ...base,
  category: z.enum(CATEGORIES),
  dueDate: optionalDate,
  done: z.boolean(),
  owner: optionalText(80),
  priority: z.enum(["Normal", "Alta"]),
});
export const vendorSchema = z.object({
  ...base,
  category: z.enum(CATEGORIES),
  contact: optionalText(200),
  status: z.enum(VENDOR_STATUSES),
  notes: optionalText(1000),
  quoteAmount: currency.nullable(),
});
export const eventSchema = z.object({
  ...base,
  date,
  time,
  location: optionalText(200),
  notes: optionalText(1000),
});
export const trashSchema = z.discriminatedUnion("collection", [
  z.object({
    id: identifier,
    deletedAt: timestamp,
    collection: z.literal("expenses"),
    record: expenseSchema,
  }),
  z.object({
    id: identifier,
    deletedAt: timestamp,
    collection: z.literal("guests"),
    record: guestSchema,
  }),
  z.object({
    id: identifier,
    deletedAt: timestamp,
    collection: z.literal("tasks"),
    record: taskSchema,
  }),
  z.object({
    id: identifier,
    deletedAt: timestamp,
    collection: z.literal("vendors"),
    record: vendorSchema,
  }),
  z.object({
    id: identifier,
    deletedAt: timestamp,
    collection: z.literal("timeline"),
    record: eventSchema,
  }),
]);
export const settingsSchema = z.object({
  couple: optionalText(80),
  budget: currency,
  guestTarget: z.number().int().min(0).max(100000),
  location: optionalText(200),
  weddingDate: date,
  weddingTime: time,
  timeZone: z.literal("America/Sao_Paulo"),
  remindersEnabled: z.boolean(),
  reminderDays: z.number().int().min(0).max(30),
  publicUrl: z
    .string()
    .max(500)
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return (
          !url.username &&
          !url.password &&
          (url.protocol === "https:" ||
            (url.protocol === "http:" &&
              ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
        );
      } catch {
        return false;
      }
    }, "Use um endereço HTTPS válido para os convites."),
});
export const planSchema = z
  .object({
    version: z.literal(2),
    id: identifier,
    revision: z.number().int().min(0),
    updatedAt: timestamp,
    demo: z.boolean(),
    settings: settingsSchema,
    expenses: z.array(expenseSchema).max(10000),
    guests: z.array(guestSchema).max(10000),
    tasks: z.array(taskSchema).max(10000),
    vendors: z.array(vendorSchema).max(10000),
    timeline: z.array(eventSchema).max(10000),
    trash: z.array(trashSchema).max(100),
  })
  .superRefine((plan, ctx) => {
    const ids = new Set<string>();
    const checkId = (id: string) => {
      if (ids.has(id))
        ctx.addIssue({
          code: "custom",
          message: "Existem identificadores repetidos no planejamento.",
        });
      ids.add(id);
    };
    const allExpenses = [
      ...plan.expenses,
      ...plan.trash.flatMap((item) =>
        item.collection === "expenses" ? [item.record] : [],
      ),
    ];
    for (const collection of [
      "expenses",
      "guests",
      "tasks",
      "vendors",
      "timeline",
    ] as const)
      for (const record of plan[collection]) checkId(record.id);
    for (const item of plan.trash) {
      checkId(item.id);
      checkId(item.record.id);
    }
    const tokens = new Set<string>();
    for (const guest of [
      ...plan.guests,
      ...plan.trash.flatMap((item) =>
        item.collection === "guests" ? [item.record] : [],
      ),
    ]) {
      if (tokens.has(guest.inviteToken))
        ctx.addIssue({
          code: "custom",
          message: "Existem códigos de convite repetidos no planejamento.",
        });
      tokens.add(guest.inviteToken);
    }
    let bytes = 0;
    for (const expense of allExpenses) {
      for (const payment of expense.payments) checkId(payment.id);
      for (const installment of expense.installments) checkId(installment.id);
      for (const attachment of expense.attachments) {
        checkId(attachment.id);
        bytes += attachment.size;
      }
    }
    if (bytes > MAX_TOTAL_ATTACHMENT_BYTES)
      ctx.addIssue({
        code: "custom",
        message:
          "Os comprovantes ultrapassam o limite local de 1,5 MB. Inclua também os arquivos da lixeira nessa conta.",
      });
    const vendors = new Set([
      ...plan.vendors.map((item) => item.id),
      ...plan.trash.flatMap((item) =>
        item.collection === "vendors" ? [item.record.id] : [],
      ),
    ]);
    for (const expense of allExpenses)
      if (expense.vendorId && !vendors.has(expense.vendorId))
        ctx.addIssue({
          code: "custom",
          message: "Fornecedor vinculado não encontrado.",
        });
  });

export type Plan = z.infer<typeof planSchema>;
export type Settings = Plan["settings"];
export type Expense = z.infer<typeof expenseSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Installment = z.infer<typeof installmentSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type TimelineEvent = z.infer<typeof eventSchema>;
export type TrashItem = z.infer<typeof trashSchema>;
export type Collection =
  | "expenses"
  | "guests"
  | "tasks"
  | "vendors"
  | "timeline";
export type RecordItem = Expense | Guest | Task | Vendor | TimelineEvent;
export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message || "Confira os dados informados.";
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
}
