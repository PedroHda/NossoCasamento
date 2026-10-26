import { z } from "zod";
import { date, time, type Guest, type Plan } from "../domain/schema.ts";

const invitationSchema = z.object({
  version: z.literal(1),
  token: z.string().min(1).max(100),
  guest: z.string().min(1).max(160),
  couple: z.string().max(80),
  date,
  time,
  location: z.string().max(200),
  maxCompanions: z.number().int().min(0).max(20),
});
export type Invitation = z.infer<typeof invitationSchema>;
const responseSchema = z.object({
  version: z.literal(1),
  token: z.string().min(1).max(100),
  status: z.enum(["Confirmado", "Não vai"]),
  companions: z.number().int().min(0).max(20),
  dietary: z.string().trim().max(300),
  updatedAt: z.string().datetime(),
});
export type GuestResponse = z.infer<typeof responseSchema>;
export function encodeCode(value: unknown): string {
  return btoa(
    String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function decodeCode(code: string): unknown {
  if (code.length > 6000 || !/^[A-Za-z0-9_-]+$/.test(code))
    throw new Error("Código de convite ou resposta inválido.");
  try {
    return JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(code.replaceAll("-", "+").replaceAll("_", "/")),
          (char) => char.charCodeAt(0),
        ),
      ),
    );
  } catch {
    throw new Error("Não foi possível ler esse código.");
  }
}
export function invitationFor(plan: Plan, guest: Guest): Invitation {
  return invitationSchema.parse({
    version: 1,
    token: guest.inviteToken,
    guest: guest.name,
    couple: plan.settings.couple,
    date: plan.settings.weddingDate,
    time: plan.settings.weddingTime,
    location: plan.settings.location,
    maxCompanions: guest.companions,
  });
}
export function invitationUrl(plan: Plan, guest: Guest, fallback: string) {
  const url = new URL(plan.settings.publicUrl || fallback);
  url.hash = `rsvp/${encodeCode(invitationFor(plan, guest))}`;
  return url.toString();
}
export const parseInvitation = (code: string) =>
  invitationSchema.parse(decodeCode(code));
export const parseResponse = (code: string) =>
  responseSchema.parse(decodeCode(code.trim()));
export function applyResponse(plan: Plan, response: GuestResponse): Plan {
  const checked = responseSchema.parse(response);
  const guest = plan.guests.find((item) => item.inviteToken === checked.token);
  if (!guest)
    throw new Error(
      "Esta resposta não pertence a um convite da sua lista atual.",
    );
  if (checked.companions > guest.companions)
    throw new Error(
      "A resposta inclui mais acompanhantes do que o convite permite.",
    );
  return {
    ...plan,
    guests: plan.guests.map((item) =>
      item.id === guest.id
        ? {
            ...item,
            status: checked.status,
            confirmedCompanions:
              checked.status === "Confirmado" ? checked.companions : 0,
            dietary: checked.dietary,
            lastResponseAt: checked.updatedAt,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  };
}
