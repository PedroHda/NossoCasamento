import {
  planSchema,
  nowIso,
  type Plan,
  type Guest,
  type Family,
} from "./schema.ts";
export type FamilyStatus =
  "Pendentes" | "Parcial" | "Confirmados" | "Recusaram" | "Talvez";
export function guestCounts(guests: Guest[]) {
  let invited = 0,
    confirmed = 0,
    pending = 0,
    declined = 0,
    maybe = 0;
  for (const guest of guests) {
    const total = 1 + guest.companions;
    invited += total;
    if (guest.status === "Confirmado") {
      const accepted = 1 + (guest.confirmedCompanions ?? guest.companions);
      confirmed += accepted;
      declined += total - accepted;
    } else if (guest.status === "Não vai") declined += total;
    else if (guest.status === "Talvez") maybe += total;
    else pending += total;
  }
  return {
    invited,
    confirmed,
    pending,
    declined,
    maybe,
    children: guests.filter((g) => g.child && g.status === "Confirmado").length,
  };
}
export function familyStatus(guests: Guest[]): FamilyStatus {
  if (!guests.length) return "Pendentes";
  const counts = guestCounts(guests);
  if (counts.pending === counts.invited) return "Pendentes";
  if (counts.declined === counts.invited) return "Recusaram";
  if (counts.maybe === counts.invited) return "Talvez";
  if (guests.every((guest) => guest.status === "Confirmado"))
    return "Confirmados";
  return "Parcial";
}
export function familyGroups(plan: Plan) {
  const groups: {
    family: Family | null;
    id: string;
    name: string;
    members: Guest[];
    status: FamilyStatus;
    counts: ReturnType<typeof guestCounts>;
  }[] = plan.families.map((family) => {
    const members = plan.guests.filter((g) => g.familyId === family.id);
    return {
      family,
      id: family.id,
      name: family.name,
      members,
      status: familyStatus(members),
      counts: guestCounts(members),
    };
  });
  for (const guest of plan.guests.filter(
    (g) => !g.familyId || !plan.families.some((f) => f.id === g.familyId),
  ))
    groups.push({
      family: null,
      id: guest.id,
      name: guest.name,
      members: [guest],
      status: familyStatus([guest]),
      counts: guestCounts([guest]),
    });
  return groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
export function setFamilyAttendance(
  plan: Plan,
  familyId: string,
  status: Guest["status"],
): Plan {
  if (!plan.families.some((f) => f.id === familyId))
    throw new Error("Esta família não está mais na lista.");
  const stamp = nowIso();
  return planSchema.parse({
    ...plan,
    guests: plan.guests.map((g) =>
      g.familyId === familyId
        ? {
            ...g,
            status,
            confirmedCompanions:
              status === "Confirmado"
                ? g.companions
                : status === "Não vai"
                  ? 0
                  : null,
            updatedAt: stamp,
          }
        : g,
    ),
  });
}
