import type { Plan } from "../domain/schema.ts";
import { applyHouseholdResearch } from "../domain/household-research.ts";
import {
  RevisionConflictError,
  type PlanningRepository,
} from "../data/contracts.ts";

/** Concurrent first opens must not duplicate the catalog or overwrite edits. */
export async function ensureHouseholdResearch(
  repository: PlanningRepository,
  plan: Plan,
): Promise<Plan> {
  let current = plan;
  for (let attempt = 0; attempt < 3; attempt++) {
    const prepared = applyHouseholdResearch(current);
    if (prepared === current) return current;
    try {
      return await repository.save(prepared, current.revision);
    } catch (error) {
      if (!(error instanceof RevisionConflictError) || attempt === 2)
        throw error;
      const loaded = await repository.load();
      if (!loaded) throw error;
      current = loaded;
    }
  }
  throw new Error(
    "Não foi possível adicionar a pesquisa. Reabra o app e tente novamente.",
  );
}
