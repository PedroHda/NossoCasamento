import test from "node:test";
import assert from "node:assert/strict";
import { createPlan, parsePlan } from "../src/domain/migration.ts";
import { householdSchema, newId, nowIso } from "../src/domain/schema.ts";
import {
  HOUSEHOLD_RESEARCH,
  HOUSEHOLD_RESEARCH_ID,
  researchPrice,
  researchTotal,
} from "../src/data/household-prices.ts";
import { applyHouseholdResearch } from "../src/domain/household-research.ts";
import { householdTotals } from "../src/domain/household.ts";
import { totals, moveToTrash, emptyTrash } from "../src/domain/planning.ts";
import {
  LocalPlanningRepository,
  STORAGE_KEY,
} from "../src/data/local-repository.ts";
import { ensureHouseholdResearch } from "../src/services/household-research.ts";

class Storage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}
function house(overrides = {}) {
  return householdSchema.parse({
    id: newId(),
    name: "Cortina da sala",
    updatedAt: nowIso(),
    room: "Sala",
    category: "Decoração",
    quantity: 1,
    ownedQuantity: 1,
    estimatedUnitAmount: 500,
    status: "Em casa",
    priority: "Importante",
    ...overrides,
  });
}
test("pesquisa tem 16 grupos, 21 unidades e média arredondada com fontes", () => {
  assert.equal(HOUSEHOLD_RESEARCH.length, 16);
  assert.equal(
    HOUSEHOLD_RESEARCH.reduce((n, i) => n + i.quantity, 0),
    21,
  );
  assert.equal(researchTotal(), 12570);
  for (const item of HOUSEHOLD_RESEARCH) {
    assert.ok(item.offers.length >= 2 && item.offers.length <= 3);
    item.offers.forEach((o) => {
      assert.ok(o.amount > 0);
      assert.match(o.url, /^https:\/\//);
    });
    const price = researchPrice(item);
    assert.ok(price.unit >= price.mean && price.unit - price.mean < 10);
    assert.equal(price.unit % 10, 0);
  }
});
test("primeira inclusão não altera casamento e não duplica ao reabrir", () => {
  const original = createPlan();
  const before = totals(original);
  const plan = applyHouseholdResearch(original);
  assert.equal(plan.household.length, 16);
  assert.equal(original.household.length, 0);
  assert.equal(householdTotals(plan.household).estimatedMissing, 12570);
  assert.equal(totals(plan).contracted, before.contracted);
  assert.equal(totals(plan).paid, before.paid);
  assert.strictEqual(applyHouseholdResearch(plan), plan);
  assert.deepEqual(plan.appliedHouseholdResearch, [HOUSEHOLD_RESEARCH_ID]);
});
test("mantém preço próprio, quantidades recebidas, notas, datas, link e identidade", () => {
  const plan = createPlan(true);
  const item = house({
    notes: "Não apagar",
    url: "https://loja.example/item",
    purchaseDate: "2026-11-20",
    store: "Minha loja",
  });
  plan.household.push(item);
  const next = applyHouseholdResearch(plan);
  const saved = next.household.find((i) => i.id === item.id);
  assert.equal(saved.estimatedUnitAmount, 500);
  assert.equal(saved.ownedQuantity, 1);
  assert.equal(saved.quantity, 4);
  assert.equal(saved.notes, "Não apagar");
  assert.equal(saved.url, item.url);
  assert.equal(saved.store, item.store);
  assert.equal(saved.purchaseDate, item.purchaseDate);
  assert.equal(saved.status, "A comprar");
  assert.equal(
    next.household.filter((i) => i.name.startsWith("Cortina")).length,
    1,
  );
});
test("cortinas cadastradas por cômodo não geram quatro unidades extras", () => {
  const plan = createPlan(true);
  plan.household = ["sala", "quarto 1", "quarto 2", "corredor"].map((n) =>
    house({ name: `Cortina ${n}`, estimatedUnitAmount: 0 }),
  );
  const next = applyHouseholdResearch(plan);
  const curtains = next.household.filter((i) => i.name.startsWith("Cortina"));
  assert.equal(curtains.length, 4);
  assert.equal(
    curtains.reduce((s, i) => s + i.quantity, 0),
    4,
  );
  assert.equal(
    curtains.reduce((s, i) => s + i.ownedQuantity, 0),
    4,
  );
  assert.ok(curtains.every((i) => i.estimatedUnitAmount === 370));
});
test("lixeira da cozinha não substitui a lixeira pedida para o banheiro", () => {
  const plan = createPlan(true);
  plan.household.push(house({ name: "Lixeira", room: "Cozinha" }));
  const next = applyHouseholdResearch(plan);
  assert.equal(
    next.household.filter((i) => i.name.startsWith("Lixeira")).length,
    2,
  );
});
test("exclusões não reaparecem e itens arquivados não são ressuscitados", () => {
  const plan = applyHouseholdResearch(createPlan(true));
  const item = plan.household[0];
  const removed = moveToTrash(plan, "household", item.id);
  assert.equal(applyHouseholdResearch(removed).household.length, 15);
  assert.equal(
    applyHouseholdResearch(emptyTrash(removed)).household.length,
    15,
  );
  const before = createPlan(true);
  before.household = [
    house({ name: "Liquidificador", estimatedUnitAmount: 0 }),
  ];
  const archived = moveToTrash(before, "household", before.household[0].id);
  const seeded = applyHouseholdResearch(archived);
  assert.equal(
    seeded.household.some((i) => i.name === "Liquidificador"),
    false,
  );
  assert.equal(seeded.trash.length, 1);
});
test("backup antigo recebe marcador padrão e backup novo preserva inclusão única", () => {
  const old = JSON.parse(JSON.stringify(createPlan(true)));
  delete old.appliedHouseholdResearch;
  const migrated = parsePlan(old);
  assert.deepEqual(migrated.appliedHouseholdResearch, []);
  const plan = applyHouseholdResearch(migrated);
  const restored = parsePlan(JSON.parse(JSON.stringify(plan)));
  assert.equal(applyHouseholdResearch(restored).household.length, 16);
});
test("reset consciente mantém marcador e reposição explícita reaplica a lista", () => {
  const seeded = applyHouseholdResearch(createPlan(true));
  const reset = {
    ...createPlan(true),
    appliedHouseholdResearch: seeded.appliedHouseholdResearch,
  };
  assert.strictEqual(applyHouseholdResearch(reset), reset);
  assert.equal(reset.household.length, 0);
  assert.equal(applyHouseholdResearch(reset, true).household.length, 16);
});
test("duas aberturas concorrentes gravam uma inclusão sem duplicação", async () => {
  const storage = new Storage();
  const repository = new LocalPlanningRepository(storage);
  const before = await repository.save(createPlan(true), 0);
  await Promise.all([
    ensureHouseholdResearch(repository, before),
    ensureHouseholdResearch(repository, before),
  ]);
  const saved = await repository.load();
  assert.equal(saved.household.length, 16);
  assert.equal(saved.revision, 2);
  const again = await ensureHouseholdResearch(repository, saved);
  assert.equal(again.revision, 2);
});
test("falha de armazenamento mantém os dados anteriores sem gravação parcial", async () => {
  const storage = new Storage();
  const repository = new LocalPlanningRepository(storage);
  const before = await repository.save(createPlan(true), 0);
  const raw = storage.getItem(STORAGE_KEY);
  storage.setItem = () => {
    throw new DOMException("Full", "QuotaExceededError");
  };
  await assert.rejects(ensureHouseholdResearch(repository, before));
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});
