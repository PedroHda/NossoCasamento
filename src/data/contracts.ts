import type { Plan } from "../domain/schema.ts";

/** Implement this contract for an API later. The UI never talks directly to storage. */
export interface PlanningRepository {
  readonly mode: "local" | "remote";
  load(): Promise<Plan | null>;
  save(plan: Plan, expectedRevision: number): Promise<Plan>;
  replace(plan: Plan): Promise<Plan>;
  subscribe(onChange: () => void): () => void;
  rawBackup(): Promise<string | null>;
}
export interface Session {
  userId: string;
  email: string;
  planningId: string;
}
/** Future authentication adapter: there is no fake login or credential storage. */
export interface IdentityGateway {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  subscribe(listener: (session: Session | null) => void): () => void;
}
export interface CollaborationGateway {
  inviteMember(planningId: string, email: string): Promise<void>;
  acceptInvitation(token: string): Promise<string>;
}
export class RevisionConflictError extends Error {
  constructor() {
    super(
      "O planejamento mudou em outra aba. Atualizamos a tela; confira os dados e tente novamente.",
    );
    this.name = "RevisionConflictError";
  }
}
