import { planSchema, nowIso, type Plan } from "../domain/schema.ts";
import { migrateV1 } from "../domain/migration.ts";
import { RevisionConflictError, type PlanningRepository } from "./contracts.ts";

export const STORAGE_KEY = "nosso-casamento:v2";
export const LEGACY_KEY = "nosso-casamento:v1";
export class LocalPlanningRepository implements PlanningRepository {
  readonly mode = "local" as const;
  private storage: Storage;
  private events?: Pick<Window, "addEventListener" | "removeEventListener">;
  private locks?: LockManager;
  constructor(
    storage: Storage,
    events?: Pick<Window, "addEventListener" | "removeEventListener">,
    locks?: LockManager,
  ) {
    this.storage = storage;
    this.events = events;
    this.locks = locks;
  }
  private read(): Plan | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return planSchema.parse(JSON.parse(raw));
    } catch {
      throw new Error(
        "Os dados locais não puderam ser lidos. Preserve uma cópia antes de importar um backup.",
      );
    }
  }
  private async locked<T>(operation: () => T): Promise<T> {
    return this.locks
      ? this.locks.request(STORAGE_KEY, operation)
      : operation();
  }
  async load(): Promise<Plan | null> {
    return this.locked(() => {
      const existing = this.read();
      if (existing) return existing;
      const legacy = this.storage.getItem(LEGACY_KEY);
      if (!legacy) return null;
      // The previous key is intentionally kept as an untouched recovery copy.
      const migrated = migrateV1(JSON.parse(legacy));
      migrated.revision = 1;
      this.storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    });
  }
  async save(plan: Plan, expectedRevision: number): Promise<Plan> {
    return this.locked(() => {
      const current = this.read();
      if ((current?.revision || 0) !== expectedRevision)
        throw new RevisionConflictError();
      const saved = planSchema.parse({
        ...plan,
        revision: expectedRevision + 1,
        updatedAt: nowIso(),
      });
      this.storage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return saved;
    });
  }
  async replace(plan: Plan): Promise<Plan> {
    return this.locked(() => {
      // Only called after the user explicitly confirms replacing local data.
      let revision = 0;
      try {
        revision = this.read()?.revision || 0;
      } catch {
        /* The recovery UI offers a raw export before replacement. */
      }
      const saved = planSchema.parse({
        ...plan,
        revision: revision + 1,
        updatedAt: nowIso(),
      });
      this.storage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return saved;
    });
  }
  subscribe(onChange: () => void) {
    const listener = (event: Event) => {
      if (
        (event as StorageEvent).key === STORAGE_KEY ||
        (event as StorageEvent).key === null
      )
        onChange();
    };
    this.events?.addEventListener("storage", listener);
    return () => this.events?.removeEventListener("storage", listener);
  }
  async rawBackup() {
    return (
      this.storage.getItem(STORAGE_KEY) || this.storage.getItem(LEGACY_KEY)
    );
  }
}
