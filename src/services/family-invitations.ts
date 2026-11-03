import { z } from "zod";
import {
  date,
  time,
  identifier,
  planSchema,
  type Plan,
  type Family,
} from "../domain/schema.ts";
import {
  encodeCode,
  decodeCode,
  parseResponse,
  applyResponse,
} from "./invitations.ts";
const member = z.object({
  token: identifier,
  name: z.string().min(1).max(160),
  maxCompanions: z.number().int().min(0).max(20),
  child: z.boolean(),
});
export const familyInvitationSchema = z
  .object({
    version: z.literal(2),
    kind: z.literal("family"),
    token: identifier,
    family: z.string().min(1).max(160),
    couple: z.string().max(80),
    date,
    time,
    location: z.string().max(200),
    members: z.array(member).min(1).max(80),
  })
  .refine(
    (invite) =>
      new Set(invite.members.map((m) => m.token)).size ===
      invite.members.length,
    "Há pessoas repetidas no convite.",
  );
const memberResponse = z.object({
  token: identifier,
  status: z.enum(["Confirmado", "Não vai", "Talvez"]),
  companions: z.number().int().min(0).max(20),
  dietary: z.string().trim().max(300),
});
export const familyResponseSchema = z
  .object({
    version: z.literal(2),
    kind: z.literal("family"),
    token: identifier,
    updatedAt: z.string().datetime(),
    members: z.array(memberResponse).min(1).max(80),
  })
  .refine(
    (response) =>
      new Set(response.members.map((m) => m.token)).size ===
      response.members.length,
    "Há respostas duplicadas para a mesma pessoa.",
  );
export type FamilyInvitationData = z.infer<typeof familyInvitationSchema>;
export type FamilyReply = z.infer<typeof familyResponseSchema>;
export function familyInvitationFor(
  plan: Plan,
  family: Family,
): FamilyInvitationData {
  return familyInvitationSchema.parse({
    version: 2,
    kind: "family",
    token: family.inviteToken,
    family: family.name,
    couple: plan.settings.couple,
    date: plan.settings.weddingDate,
    time: plan.settings.weddingTime,
    location: plan.settings.location,
    members: plan.guests
      .filter((g) => g.familyId === family.id)
      .map((g) => ({
        token: g.inviteToken,
        name: g.name,
        maxCompanions: g.companions,
        child: g.child,
      })),
  });
}
export function familyInvitationUrl(
  plan: Plan,
  family: Family,
  fallback: string,
) {
  const url = new URL(plan.settings.publicUrl || fallback);
  const code = encodeCode(familyInvitationFor(plan, family));
  if (code.length > 24000)
    throw new Error(
      "Este núcleo é grande demais para um único link. Divida os convites em grupos menores.",
    );
  url.hash = `family/${code}`;
  return url.toString();
}
export const parseFamilyInvitation = (code: string) =>
  familyInvitationSchema.parse(decodeCode(code));
export function parseAnyResponse(code: string) {
  const raw = decodeCode(code.trim());
  return raw && typeof raw === "object" && "version" in raw && raw.version === 2
    ? familyResponseSchema.parse(raw)
    : parseResponse(code);
}
export function applyFamilyResponse(plan: Plan, input: FamilyReply): Plan {
  const response = familyResponseSchema.parse(input);
  const family = plan.families.find((f) => f.inviteToken === response.token);
  if (!family)
    throw new Error(
      "Esta confirmação não pertence a uma família da sua lista.",
    );
  const next = structuredClone(plan);
  const stamp = new Date().toISOString();
  for (const reply of response.members) {
    const guest = next.guests.find(
      (g) => g.inviteToken === reply.token && g.familyId === family.id,
    );
    if (!guest)
      throw new Error(
        "Um membro deste convite mudou de família ou foi removido. Peça uma confirmação atualizada.",
      );
    if (reply.companions > guest.companions)
      throw new Error(
        `A confirmação de ${guest.name} excede o limite de acompanhantes.`,
      );
    if (guest.lastResponseAt && response.updatedAt < guest.lastResponseAt)
      throw new Error(`Há uma confirmação mais recente para ${guest.name}.`);
    if (
      guest.lastResponseAt === response.updatedAt &&
      (guest.status !== reply.status ||
        guest.confirmedCompanions !==
          (reply.status === "Confirmado" ? reply.companions : 0) ||
        guest.dietary !== reply.dietary)
    )
      throw new Error(
        "Há respostas diferentes com a mesma data. Confira o código mais recente.",
      );
    guest.status = reply.status;
    guest.confirmedCompanions =
      reply.status === "Confirmado" ? reply.companions : 0;
    guest.dietary = reply.dietary;
    guest.lastResponseAt = response.updatedAt;
    guest.updatedAt = stamp;
  }
  const target = next.families.find((f) => f.id === family.id)!;
  target.lastResponseAt = response.updatedAt;
  target.updatedAt = stamp;
  return planSchema.parse(next);
}
export function applyAnyResponse(
  plan: Plan,
  response: ReturnType<typeof parseAnyResponse>,
) {
  return response.version === 2
    ? applyFamilyResponse(plan, response)
    : planSchema.parse(applyResponse(plan, response));
}
