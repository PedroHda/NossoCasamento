import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/model.js";
import { createPlan, migrateV1, parsePlan } from "../src/domain/migration.ts";
import {
  planSchema,
  attachmentSchema,
  settingsSchema,
  newId,
  nowIso,
} from "../src/domain/schema.ts";
import {
  totals,
  countdown,
  generateInstallments,
  paidAmount,
  remainingAmount,
  budgetTimeline,
  moveToTrash,
  restoreFromTrash,
  emptyTrash,
  updateRecord,
  reminderItems,
} from "../src/domain/planning.ts";
import {
  LocalPlanningRepository,
  STORAGE_KEY,
  LEGACY_KEY,
} from "../src/data/local-repository.ts";
import { RevisionConflictError } from "../src/data/contracts.ts";
import {
  invitationFor,
  encodeCode,
  parseInvitation,
  parseResponse,
  applyResponse,
} from "../src/services/invitations.ts";
import { csvCell, createCsv, createCalendar } from "../src/services/exports.ts";
import { notificationSchedule } from "../src/services/reminders.ts";

class MemoryStorage {
  values = new Map();
  get length() {
    return this.values.size;
  }
  key(index) {
    return [...this.values.keys()][index] || null;
  }
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}
const payment = (amount, installmentId = null) => ({
  id: newId(),
  amount,
  date: "2027-01-10",
  note: "",
  installmentId,
  receiptId: null,
});

test("migração v1 preserva convidados, saldos, IDs e data sem inventar histórico", () => {
  const old = initialState();
  const migrated = migrateV1(old);
  assert.equal(migrated.version, 2);
  assert.equal(totals(migrated).paid, 14900);
  assert.equal(totals(migrated).contracted, 36750);
  assert.equal(totals(migrated).confirmed, 10);
  assert.equal(migrated.guests[0].id, old.guests[0].id);
  assert.equal(migrated.expenses[0].payments[0].date, "");
  assert.match(migrated.expenses[0].payments[0].note, /importado/);
  assert.equal(migrated.settings.weddingDate, "2027-07-24");
  assert.equal(migrated.settings.weddingTime, "00:00");
  assert.equal(old.version, 1);
});

test("contagem usa a data e o horário editáveis no fuso de Brasília", () => {
  const plan = createPlan(true);
  const settings = settingsSchema.parse({
    ...plan.settings,
    weddingDate: "2028-02-29",
    weddingTime: "16:30",
  });
  assert.deepEqual(countdown(settings, Date.parse("2028-02-29T19:29:59Z")), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 1,
    arrived: false,
  });
  assert.equal(
    countdown(settings, Date.parse("2028-02-29T19:30:00Z")).arrived,
    true,
  );
  assert.throws(() =>
    settingsSchema.parse({ ...settings, weddingDate: "2027-02-29" }),
  );
});

test("parcelas distribuem todos os centavos e respeitam o fim dos meses", () => {
  const plan = createPlan();
  const expense = { ...plan.expenses[0], amount: 100, payments: [] };
  const installments = generateInstallments(expense, 3, "2027-01-31");
  assert.deepEqual(
    installments.map((item) => item.amount),
    [33.34, 33.33, 33.33],
  );
  assert.deepEqual(
    installments.map((item) => item.dueDate),
    ["2027-01-31", "2027-02-28", "2027-03-31"],
  );
  assert.throws(() => generateInstallments(expense, 3, "2027-02-30"));
  assert.throws(() => generateInstallments(expense, 0, "2027-01-01"));
});

test("geração de parcelas usa apenas o saldo que falta pagar", () => {
  const expense = createPlan().expenses[0];
  const installments = generateInstallments(expense, 3, "2027-01-01");
  assert.equal(
    installments.reduce((sum, item) => sum + item.amount, 0),
    6000,
  );
  const linked = {
    ...expense,
    installments,
    payments: [...expense.payments, payment(100, installments[0].id)],
  };
  assert.throws(
    () => generateInstallments(linked, 2, "2027-02-01"),
    /vinculados/,
  );
});

test("pagamentos não podem ultrapassar a despesa, a parcela ou referenciar parcela inexistente", () => {
  const plan = createPlan();
  const expense = plan.expenses[0];
  expense.installments = generateInstallments(expense, 2, "2027-01-01");
  expense.payments.push(payment(3001, expense.installments[0].id));
  assert.throws(() => planSchema.parse(plan), /ultrapassa/);
  expense.payments.pop();
  expense.payments.push(payment(1, "inexistente"));
  assert.throws(() => planSchema.parse(plan), /não encontrada/);
  expense.payments.pop();
  expense.payments.push(payment(6001));
  assert.throws(() => planSchema.parse(plan), /ultrapassar/);
});

test("histórico financeiro soma centavos e o gráfico inclui vencimentos após o casamento", () => {
  const plan = createPlan();
  plan.expenses = [plan.expenses[0]];
  plan.expenses[0] = {
    ...plan.expenses[0],
    amount: 0.3,
    estimatedAmount: 0.3,
    dueDate: "2028-12-31",
    payments: [payment(0.1)],
    installments: [],
  };
  assert.equal(paidAmount(plan.expenses[0]), 0.1);
  assert.equal(remainingAmount(plan.expenses[0]), 0.2);
  const timeline = budgetTimeline(plan);
  assert.equal(timeline.at(-1).month, "2028-12");
  assert.equal(timeline.at(-1).planned, 0.3);
  assert.equal(timeline.at(-1).paid, 0.1);
});

test("gráfico não duplica pagamentos vinculados a parcelas", () => {
  const plan = createPlan();
  const expense = plan.expenses[0];
  plan.expenses = [expense];
  expense.installments = generateInstallments(expense, 2, "2027-02-01");
  expense.payments.push(payment(1000, expense.installments[0].id));
  assert.equal(budgetTimeline(plan).at(-1).planned, expense.amount);
  assert.equal(budgetTimeline(plan).at(-1).paid, 7000);
});

test("lixeira permite restaurar despesas inteiras e mantém vínculos com fornecedor arquivado", () => {
  const plan = createPlan();
  const vendorId = plan.expenses[0].vendorId;
  const archived = moveToTrash(plan, "vendors", vendorId);
  assert.equal(archived.expenses[0].vendorId, vendorId);
  const restored = restoreFromTrash(archived, archived.trash[0].id);
  assert.ok(restored.vendors.some((item) => item.id === vendorId));
  const cleared = emptyTrash(archived);
  assert.equal(cleared.expenses[0].vendorId, null);
  assert.equal(cleared.trash.length, 0);
  const expenseRemoved = moveToTrash(plan, "expenses", plan.expenses[0].id);
  const expenseRestored = restoreFromTrash(
    expenseRemoved,
    expenseRemoved.trash[0].id,
  );
  assert.deepEqual(
    expenseRestored.expenses.at(-1).payments,
    plan.expenses[0].payments,
  );
});

test("edição recusa versão antiga de um registro alterado em outra aba", () => {
  const plan = createPlan();
  const item = plan.tasks[0];
  assert.throws(
    () =>
      updateRecord(
        plan,
        "tasks",
        { ...item, name: "Outro nome" },
        "2000-01-01T00:00:00.000Z",
      ),
    /outra aba/,
  );
  const changed = updateRecord(
    plan,
    "tasks",
    { ...item, name: "Nome atualizado" },
    item.updatedAt,
  );
  assert.equal(changed.tasks[0].name, "Nome atualizado");
  assert.equal(plan.tasks[0].name, item.name);
});

test("repositório migra uma vez e mantém a chave v1 intacta", async () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify(initialState());
  storage.setItem(LEGACY_KEY, raw);
  const repository = new LocalPlanningRepository(storage);
  const first = await repository.load();
  const second = await repository.load();
  assert.equal(first.id, second.id);
  assert.equal(first.revision, 1);
  assert.equal(storage.getItem(LEGACY_KEY), raw);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 2);
});

test("revisão impede uma aba desatualizada de sobrescrever outra", async () => {
  const storage = new MemoryStorage();
  const repository = new LocalPlanningRepository(storage);
  const first = await repository.save(createPlan(), 0);
  const second = await repository.save(
    { ...first, settings: { ...first.settings, couple: "Nós dois" } },
    first.revision,
  );
  await assert.rejects(
    repository.save(
      { ...first, settings: { ...first.settings, couple: "Versão antiga" } },
      first.revision,
    ),
    RevisionConflictError,
  );
  assert.equal(
    (await repository.load()).settings.couple,
    second.settings.couple,
  );
});

test("armazenamento corrompido não é substituído silenciosamente", async () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "{quebrado");
  const repository = new LocalPlanningRepository(storage);
  await assert.rejects(repository.load());
  await assert.rejects(repository.save(createPlan(), 0));
  assert.equal(storage.getItem(STORAGE_KEY), "{quebrado");
  assert.equal(await repository.rawBackup(), "{quebrado");
});

test("falha de cota mantém a versão previamente salva", async () => {
  const storage = new MemoryStorage();
  const repository = new LocalPlanningRepository(storage);
  const first = await repository.save(createPlan(), 0);
  const original = storage.getItem(STORAGE_KEY);
  storage.setItem = () => {
    throw new DOMException("Full", "QuotaExceededError");
  };
  await assert.rejects(
    repository.save({ ...first, demo: false }, first.revision),
  );
  assert.equal(storage.getItem(STORAGE_KEY), original);
});

test("comprovantes validam assinatura do arquivo, tamanho e referências", () => {
  const data = btoa("%PDF-1.7\n");
  const attachment = attachmentSchema.parse({
    id: newId(),
    name: "recibo.pdf",
    mime: "application/pdf",
    size: 9,
    data,
  });
  const plan = createPlan();
  plan.expenses[0].attachments.push(attachment);
  plan.expenses[0].payments[0].receiptId = attachment.id;
  assert.equal(planSchema.parse(plan).expenses[0].attachments.length, 1);
  assert.throws(() =>
    attachmentSchema.parse({ ...attachment, data: btoa("<script>") }),
  );
  assert.throws(() => attachmentSchema.parse({ ...attachment, size: 10 }));
  plan.expenses[0].attachments = [];
  assert.throws(() => planSchema.parse(plan), /Comprovante/);
});

test("convites preservam acentos e não carregam o restante do planejamento", () => {
  const plan = createPlan();
  plan.settings.couple = "João & Ana";
  const invitation = invitationFor(plan, plan.guests[0]);
  const decoded = parseInvitation(encodeCode(invitation));
  assert.equal(decoded.couple, "João & Ana");
  assert.equal(decoded.guest, plan.guests[0].name);
  assert.equal(decoded.expenses, undefined);
  assert.throws(() => parseInvitation("x".repeat(6001)));
});

test("resposta manual respeita o convite e conta os acompanhantes efetivamente confirmados", () => {
  const plan = createPlan();
  const guest = plan.guests[0];
  const response = {
    version: 1,
    token: guest.inviteToken,
    status: "Confirmado",
    companions: 0,
    dietary: "Sem lactose",
    updatedAt: nowIso(),
  };
  const changed = applyResponse(plan, parseResponse(encodeCode(response)));
  assert.equal(changed.guests[0].dietary, "Sem lactose");
  assert.equal(changed.guests[0].companions, 1);
  assert.equal(changed.guests[0].confirmedCompanions, 0);
  assert.equal(totals(changed).confirmed, totals(plan).confirmed - 1);
  assert.throws(
    () => applyResponse(plan, { ...response, companions: 2 }),
    /mais acompanhantes/,
  );
  assert.throws(
    () => applyResponse(plan, { ...response, token: "outro" }),
    /não pertence/,
  );
});

test("CSV para Excel escapa fórmulas, aspas e mantém valores numéricos", () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("  +1"), '"\'  +1"');
  assert.equal(csvCell(-10.5), "-10,5");
  const plan = createPlan();
  plan.guests[0].name = "=FORMULA()";
  plan.guests[0].confirmedCompanions = 0;
  assert.ok(createCsv(plan, "guests").startsWith("\ufeff"));
  assert.match(createCsv(plan, "guests"), /'=FORMULA/);
  assert.match(createCsv(plan, "guests"), /"Família";1;0;"Confirmado"/);
});

test("agenda ICS usa UTC, escapa títulos e dobra linhas sem quebrar caracteres", () => {
  const plan = createPlan();
  plan.timeline[0].name = "Cerimônia, família; " + "á".repeat(100);
  const calendar = createCalendar(plan);
  assert.match(calendar, /BEGIN:VCALENDAR/);
  assert.match(calendar, /DTSTART:20270724T030000Z/);
  assert.match(calendar, /Cerimônia\\, família\\;/);
  for (const line of calendar.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
});

test("lembretes incluem parcelas pendentes sem duplicar o saldo e ignoram tarefas concluídas", () => {
  const plan = createPlan();
  const expense = plan.expenses[0];
  plan.expenses = [expense];
  expense.installments = generateInstallments(expense, 2, "2027-02-01");
  const items = reminderItems(plan);
  assert.equal(items.filter((item) => item.kind === "Pagamento").length, 2);
  assert.equal(
    items.some((item) => item.id === plan.tasks.find((item) => item.done).id),
    false,
  );
  assert.equal(
    items.some((item) => item.id === expense.id),
    false,
  );
});

test("notificações ficam no futuro, com IDs estáveis e limite de agendamento", () => {
  const plan = createPlan();
  const now = Date.parse("2026-01-01T00:00:00Z");
  const first = notificationSchedule(plan, now);
  const second = notificationSchedule(plan, now);
  assert.ok(first.length > 0 && first.length <= 50);
  assert.deepEqual(
    first.map((item) => item.id),
    second.map((item) => item.id),
  );
  assert.equal(new Set(first.map((item) => item.id)).size, first.length);
  assert.ok(
    first.every(
      (item) =>
        item.schedule.at.getTime() > now &&
        item.id > 0 &&
        Number.isInteger(item.id),
    ),
  );
  assert.equal(
    notificationSchedule(plan, Date.parse("2100-01-01T00:00:00Z")).length,
    0,
  );
});

test("backup v2 mantém arquivos e propostas e rejeita versões ou IDs inválidos", () => {
  const plan = createPlan();
  assert.deepEqual(parsePlan(JSON.parse(JSON.stringify(plan))), plan);
  assert.throws(() => parsePlan({ ...plan, version: 99 }));
  const duplicatedInvites = structuredClone(plan);
  duplicatedInvites.guests[1].inviteToken =
    duplicatedInvites.guests[0].inviteToken;
  assert.throws(() => planSchema.parse(duplicatedInvites), /convite repetidos/);
  plan.tasks[0].id = plan.expenses[0].id;
  assert.throws(() => planSchema.parse(plan), /identificadores repetidos/);
});
