import test from "node:test";
import assert from "node:assert/strict";
import { createPlan, parsePlan } from "../src/domain/migration.ts";
import {
  familySchema,
  guestSchema,
  householdSchema,
  newId,
  nowIso,
  planSchema,
} from "../src/domain/schema.ts";
import {
  guestCounts,
  familyStatus,
  familyGroups,
  setFamilyAttendance,
} from "../src/domain/guests.ts";
import { householdTotals, householdStatus } from "../src/domain/household.ts";
import {
  updateRecord,
  moveToTrash,
  restoreFromTrash,
  emptyTrash,
  totals,
  reminderItems,
} from "../src/domain/planning.ts";
import {
  familyInvitationFor,
  parseFamilyInvitation,
  parseAnyResponse,
  applyFamilyResponse,
} from "../src/services/family-invitations.ts";
import { encodeCode } from "../src/services/invitations.ts";
import {
  calendarEntries,
  googleCalendarUrl,
} from "../src/services/calendar.ts";
import { createCalendar, createCsv } from "../src/services/exports.ts";
import { notificationSchedule } from "../src/services/reminders.ts";
const family = () =>
  familySchema.parse({
    id: newId(),
    name: "Família Oliveira",
    updatedAt: nowIso(),
    inviteToken: newId(),
  });
const guest = (overrides = {}) =>
  guestSchema.parse({
    id: newId(),
    name: "Ana Oliveira",
    updatedAt: nowIso(),
    group: "Família",
    status: "Pendente",
    companions: 0,
    phone: "",
    dietary: "",
    notes: "",
    inviteToken: newId(),
    lastResponseAt: "",
    ...overrides,
  });
const house = (overrides = {}) =>
  householdSchema.parse({
    id: newId(),
    name: "Cadeira",
    updatedAt: nowIso(),
    room: "Sala",
    category: "Móveis",
    quantity: 4,
    ownedQuantity: 1,
    estimatedUnitAmount: 99.99,
    status: "A comprar",
    priority: "Essencial",
    ...overrides,
  });
function fixture() {
  const plan = createPlan(true);
  const nucleus = family();
  plan.families.push(nucleus);
  plan.guests.push(
    guest({ familyId: nucleus.id }),
    guest({ familyId: nucleus.id, name: "Bruno Oliveira", child: true }),
  );
  return { plan, nucleus };
}
test("backup v2 anterior recebe famílias/casa e permissões desativadas sem perder IDs", () => {
  const original = createPlan();
  const raw = JSON.parse(JSON.stringify(original));
  delete raw.families;
  delete raw.household;
  delete raw.settings.calendarSyncEnabled;
  delete raw.settings.calendarId;
  for (const g of raw.guests) {
    delete g.familyId;
    delete g.child;
    delete g.table;
  }
  const migrated = parsePlan(raw);
  assert.deepEqual(migrated.families, []);
  assert.deepEqual(migrated.household, []);
  assert.equal(migrated.guests[0].id, original.guests[0].id);
  assert.equal(migrated.guests[0].familyId, null);
  assert.equal(migrated.settings.calendarSyncEnabled, false);
});
test("indicadores contam pessoas e acompanhantes uma vez e fecham o total", () => {
  const people = [
    guest({ companions: 2, status: "Confirmado", confirmedCompanions: 1 }),
    guest({ status: "Pendente", companions: 1 }),
    guest({ status: "Talvez" }),
    guest({ status: "Não vai", companions: 1 }),
  ];
  const c = guestCounts(people);
  assert.equal(c.invited, 8);
  assert.equal(c.confirmed, 2);
  assert.equal(c.pending, 2);
  assert.equal(c.declined, 3);
  assert.equal(c.maybe, 1);
  assert.equal(c.confirmed + c.pending + c.declined + c.maybe, c.invited);
});
test("famílias refletem pendência, confirmação parcial, recusa e talvez", () => {
  assert.equal(familyStatus([]), "Pendentes");
  assert.equal(familyStatus([guest()]), "Pendentes");
  assert.equal(
    familyStatus([guest({ status: "Confirmado" }), guest()]),
    "Parcial",
  );
  assert.equal(
    familyStatus([
      guest({ status: "Confirmado" }),
      guest({ status: "Não vai" }),
    ]),
    "Parcial",
  );
  assert.equal(familyStatus([guest({ status: "Confirmado" })]), "Confirmados");
  assert.equal(familyStatus([guest({ status: "Não vai" })]), "Recusaram");
  assert.equal(familyStatus([guest({ status: "Talvez" })]), "Talvez");
});
test("vínculo de família é validado e pessoas individuais não desaparecem", () => {
  const { plan } = fixture();
  plan.guests.push(guest());
  assert.equal(familyGroups(plan).length, 2);
  assert.throws(() =>
    planSchema.parse({ ...plan, guests: [guest({ familyId: "inexistente" })] }),
  );
});
test("confirmação em lote altera apenas a família selecionada", () => {
  const { plan, nucleus } = fixture();
  const other = guest();
  plan.guests.push(other);
  const updated = setFamilyAttendance(plan, nucleus.id, "Confirmado");
  assert.equal(
    updated.guests.filter((g) => g.status === "Confirmado").length,
    2,
  );
  assert.equal(
    updated.guests.find((g) => g.id === other.id).status,
    "Pendente",
  );
  assert.equal(plan.guests[0].status, "Pendente");
});
test("lixeira de família mantém vínculos para restauração e os libera ao esvaziar", () => {
  const { plan, nucleus } = fixture();
  const removed = moveToTrash(plan, "families", nucleus.id);
  assert.equal(removed.guests[0].familyId, nucleus.id);
  assert.equal(familyGroups(removed).length, 2);
  const restored = restoreFromTrash(removed, removed.trash[0].id);
  assert.equal(familyGroups(restored)[0].members.length, 2);
  const purged = emptyTrash(removed);
  assert.equal(purged.guests[0].familyId, null);
});
test("convite familiar preserva acentos e não expõe contatos nem outras famílias", () => {
  const { plan, nucleus } = fixture();
  nucleus.phone = "11999990000";
  plan.guests.push(guest({ name: "Outra pessoa", phone: "11555550000" }));
  const invitation = familyInvitationFor(plan, nucleus);
  const decoded = parseFamilyInvitation(encodeCode(invitation));
  assert.equal(decoded.family, "Família Oliveira");
  assert.equal(decoded.members.length, 2);
  assert.equal(JSON.stringify(decoded).includes("11999990000"), false);
  assert.equal(JSON.stringify(decoded).includes("Outra pessoa"), false);
});
test("resposta da família aplica escolhas individuais e rejeita pessoa de outro núcleo", () => {
  const { plan, nucleus } = fixture();
  const reply = {
    version: 2,
    kind: "family",
    token: nucleus.inviteToken,
    updatedAt: nowIso(),
    members: plan.guests.map((g, i) => ({
      token: g.inviteToken,
      status: i ? "Talvez" : "Confirmado",
      companions: 0,
      dietary: i ? "Alergia a leite" : "",
    })),
  };
  const response = parseAnyResponse(encodeCode(reply));
  const next = applyFamilyResponse(plan, response);
  assert.equal(next.guests[0].status, "Confirmado");
  assert.equal(next.guests[1].status, "Talvez");
  assert.equal(next.guests[1].dietary, "Alergia a leite");
  assert.throws(() =>
    applyFamilyResponse(plan, {
      ...reply,
      members: [{ ...reply.members[0], token: newId() }],
    }),
  );
  assert.equal(plan.guests[0].status, "Pendente");
});
test("respostas excedentes, duplicadas e antigas não sobrescrevem confirmações", () => {
  const { plan, nucleus } = fixture();
  const reply = {
    version: 2,
    kind: "family",
    token: nucleus.inviteToken,
    updatedAt: "2027-01-01T10:00:00.000Z",
    members: [
      {
        token: plan.guests[0].inviteToken,
        status: "Confirmado",
        companions: 0,
        dietary: "",
      },
    ],
  };
  assert.throws(() =>
    applyFamilyResponse(plan, {
      ...reply,
      members: [{ ...reply.members[0], companions: 1 }],
    }),
  );
  assert.throws(() =>
    parseAnyResponse(
      encodeCode({ ...reply, members: [reply.members[0], reply.members[0]] }),
    ),
  );
  const next = applyFamilyResponse(plan, reply);
  assert.throws(() =>
    applyFamilyResponse(next, {
      ...reply,
      updatedAt: "2026-12-31T10:00:00.000Z",
    }),
  );
  assert.equal(applyFamilyResponse(next, reply).guests[0].status, "Confirmado");
});
test("família mantém pendente um membro adicionado depois de gerar o convite", () => {
  const { plan, nucleus } = fixture();
  const invitation = familyInvitationFor(plan, nucleus);
  plan.guests.push(guest({ familyId: nucleus.id, name: "Nova pessoa" }));
  const reply = {
    version: 2,
    kind: "family",
    token: nucleus.inviteToken,
    updatedAt: nowIso(),
    members: invitation.members.map((m) => ({
      token: m.token,
      status: "Confirmado",
      companions: 0,
      dietary: "",
    })),
  };
  const next = applyFamilyResponse(plan, reply);
  assert.equal(familyStatus(next.guests), "Parcial");
  assert.equal(next.guests[2].status, "Pendente");
});
test("lista da casa distingue recebidos, faltantes e estimativa em centavos", () => {
  const items = [
    house(),
    house({
      name: "Panela",
      room: "Cozinha",
      quantity: 2,
      ownedQuantity: 2,
      estimatedUnitAmount: 50,
      status: "Em casa",
    }),
  ];
  const summary = householdTotals(items);
  assert.equal(summary.total, 6);
  assert.equal(summary.owned, 3);
  assert.equal(summary.missing, 3);
  assert.equal(summary.estimatedMissing, 299.97);
  assert.equal(summary.rooms.find((r) => r.room === "Sala").estimate, 299.97);
  assert.equal(householdStatus(items[1]), "Já temos");
  assert.equal(householdStatus(items[0]), "Parcial");
});
test("itens comprados aguardando entrega ainda não contam como recebidos", () => {
  const item = house({ status: "Aguardando entrega" });
  assert.equal(householdStatus(item), "Aguardando entrega");
  assert.equal(householdTotals([item]).owned, 1);
  assert.equal(householdTotals([item]).waiting, 1);
  assert.throws(() => house({ ownedQuantity: 5 }));
  assert.throws(() => house({ url: "https://" }));
  assert.throws(() => house({ url: "javascript:alert(1)" }));
  assert.throws(() =>
    house({ url: "https://usuario:senha@loja.example/item" }),
  );
});
test("cadastro da casa não altera os compromissos ou pagamentos do casamento", () => {
  const plan = createPlan();
  const before = totals(plan);
  const next = updateRecord(plan, "household", house());
  assert.equal(totals(next).contracted, before.contracted);
  assert.equal(totals(next).paid, before.paid);
  const restored = parsePlan(JSON.parse(JSON.stringify(next)));
  assert.equal(restored.household.length, 1);
});
test("entrega pendente entra nos lembretes e sai quando tudo é recebido", () => {
  const plan = createPlan(true);
  plan.household.push(
    house({ status: "Aguardando entrega", deliveryDate: "2027-07-01" }),
  );
  assert.equal(reminderItems(plan).filter((i) => i.kind === "Casa").length, 1);
  plan.household[0].ownedQuantity = 4;
  assert.equal(reminderItems(plan).filter((i) => i.kind === "Casa").length, 0);
});
test("agenda calcula o fuso, duração e antecedência por evento", () => {
  const plan = createPlan(true);
  plan.timeline.push({
    id: newId(),
    name: "Degustação",
    date: "2027-07-01",
    time: "15:00",
    location: "Espaço",
    notes: "",
    updatedAt: nowIso(),
    durationMinutes: 90,
    reminderMinutes: 60,
  });
  const items = calendarEntries(plan, Date.parse("2027-01-01T00:00:00Z"));
  const event = items.find((i) => i.title === "Degustação");
  assert.equal(event.start, Date.parse("2027-07-01T18:00:00Z"));
  assert.equal(event.end - event.start, 90 * 60000);
  assert.equal(event.reminderMinutes, 60);
  assert.equal(event.location, "Espaço");
  const scheduled = notificationSchedule(
    plan,
    Date.parse("2027-01-01T00:00:00Z"),
  ).find((i) => i.body === "Degustação");
  assert.equal(scheduled.schedule.at.toISOString(), "2027-07-01T17:00:00.000Z");
  assert.match(createCalendar(plan), /TRIGGER:-PT60M/);
  assert.match(createCalendar(plan), /DTEND:20270701T193000Z/);
});
test("link Google Agenda prepara os dados e não os envia sem abrir o link", () => {
  const url = new URL(
    googleCalendarUrl({
      id: "x",
      name: "Visita & degustação",
      kind: "Cronograma",
      date: "2027-07-01",
      time: "15:00",
      durationMinutes: 90,
      location: "Espaço",
    }),
  );
  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("text"), "Visita & degustação");
  assert.equal(
    url.searchParams.get("dates"),
    "20270701T180000Z/20270701T193000Z",
  );
});
test("exportação inclui família, mesa e criança, mantendo as colunas antigas", () => {
  const { plan, nucleus } = fixture();
  nucleus.table = "Mesa 4";
  const csv = createCsv(plan, "guests");
  assert.match(csv, /"Família";"Mesa";"Criança"/);
  assert.match(csv, /"Família Oliveira";"Mesa 4";"Sim"/);
});
