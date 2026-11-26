import {
  HOUSEHOLD_RESEARCH,
  HOUSEHOLD_RESEARCH_ID,
  HOUSEHOLD_RESEARCH_DATE,
  researchPrice,
  type ResearchedItem,
} from "../data/household-prices.ts";
import {
  planSchema,
  nowIso,
  newId,
  type Plan,
  type HouseholdItem,
} from "./schema.ts";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function matchesResearchItem(name: string, item: ResearchedItem) {
  const candidate = normalize(name);
  return item.aliases.some((alias) => {
    const key = normalize(alias);
    return candidate === key || candidate.startsWith(`${key} `);
  });
}
function sameItem(record: HouseholdItem, item: ResearchedItem, id: string) {
  if (record.id === id) return true;
  if (!matchesResearchItem(record.name, item)) return false;
  // A kitchen bin is not the requested bathroom bin.
  if (
    item.key === "lixeira" &&
    !normalize(record.name).includes("banheiro") &&
    !["banheiro", "a definir", "casa"].includes(normalize(record.room))
  )
    return false;
  return true;
}
/** Adds the authorized shopping list once, preserving user records and deletions. */
export function applyHouseholdResearch(plan: Plan, force = false): Plan {
  if (!force && plan.appliedHouseholdResearch.includes(HOUSEHOLD_RESEARCH_ID))
    return plan;
  const next = structuredClone(plan);
  const stamp = nowIso();
  const usedIds = new Set<string>(
    [
      ...plan.expenses,
      ...plan.guests,
      ...plan.families,
      ...plan.household,
      ...plan.tasks,
      ...plan.vendors,
      ...plan.timeline,
      ...plan.trash,
      ...plan.trash.map((i) => i.record),
    ].map((i) => i.id),
  );
  for (const entry of HOUSEHOLD_RESEARCH) {
    const id = `research-${HOUSEHOLD_RESEARCH_ID}-${entry.key}`;
    const existing = next.household.filter((i) => sameItem(i, entry, id));
    const archived = next.trash.flatMap((i) =>
      i.collection === "household" && sameItem(i.record, entry, id)
        ? [i.record]
        : [],
    );
    const price = researchPrice(entry);
    const note =
      `Pesquisa ${HOUSEHOLD_RESEARCH_DATE}: média da amostra R$ ${price.mean.toFixed(2)}; estimativa unitária R$ ${price.unit.toFixed(2)}. ${entry.reference} ${entry.notes}`.slice(
        0,
        1000,
      );
    if (existing.length) {
      const represented = [...existing, ...archived].reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      existing[0].quantity += Math.max(0, entry.quantity - represented);
      for (const record of existing) {
        // Keep manual prices, owned quantities, notes, dates, links and IDs.
        if (!record.estimatedUnitAmount)
          record.estimatedUnitAmount = price.unit;
        if (!record.notes) record.notes = note;
        if (!record.url) record.url = entry.offers[0].url;
        if (!record.store)
          record.store = [...new Set(entry.offers.map((o) => o.store))].join(
            " / ",
          );
        if (
          record.status === "Em casa" &&
          record.ownedQuantity < record.quantity
        )
          record.status = "A comprar";
        record.updatedAt = stamp;
      }
      continue;
    }
    if (archived.length) continue;
    const record: HouseholdItem = {
      id: usedIds.has(id) ? newId() : id,
      name: entry.name,
      updatedAt: stamp,
      room: entry.room,
      category: entry.category,
      quantity: entry.quantity,
      ownedQuantity: 0,
      estimatedUnitAmount: price.unit,
      status: "Pesquisando",
      priority: "Importante",
      store: [...new Set(entry.offers.map((o) => o.store))].join(" / "),
      url: entry.offers[0].url,
      purchaseDate: "",
      deliveryDate: "",
      owner: "Nós",
      notes: note,
    };
    next.household.push(record);
    usedIds.add(record.id);
  }
  next.appliedHouseholdResearch = [
    ...new Set([...next.appliedHouseholdResearch, HOUSEHOLD_RESEARCH_ID]),
  ];
  return planSchema.parse(next);
}
