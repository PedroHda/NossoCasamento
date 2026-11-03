import type { HouseholdItem } from "./schema.ts";
export const missingQuantity = (item: HouseholdItem) =>
  item.quantity - item.ownedQuantity;
export const householdStatus = (item: HouseholdItem) =>
  missingQuantity(item) === 0
    ? "Já temos"
    : item.status === "Aguardando entrega"
      ? "Aguardando entrega"
      : item.status === "Comprado"
        ? "Comprado"
        : item.ownedQuantity > 0
          ? "Parcial"
          : item.status === "Pesquisando"
            ? "Pesquisando"
            : "Falta comprar";
export function householdTotals(items: HouseholdItem[]) {
  const rooms = [...new Set(items.map((i) => i.room))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  return {
    total: items.reduce((s, i) => s + i.quantity, 0),
    owned: items.reduce((s, i) => s + i.ownedQuantity, 0),
    missing: items.reduce((s, i) => s + missingQuantity(i), 0),
    estimatedMissing:
      items.reduce(
        (s, i) =>
          s + Math.round(i.estimatedUnitAmount * 100) * missingQuantity(i),
        0,
      ) / 100,
    waiting: items.filter(
      (i) => missingQuantity(i) > 0 && i.status === "Aguardando entrega",
    ).length,
    rooms: rooms.map((room) => {
      const list = items.filter((i) => i.room === room);
      return {
        room,
        owned: list.reduce((s, i) => s + i.ownedQuantity, 0),
        total: list.reduce((s, i) => s + i.quantity, 0),
        estimate:
          list.reduce(
            (s, i) =>
              s + Math.round(i.estimatedUnitAmount * 100) * missingQuantity(i),
            0,
          ) / 100,
      };
    }),
  };
}
