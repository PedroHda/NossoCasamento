import { LocalPlanningRepository } from "./local-repository.ts";
import type {
  PlanningRepository,
  IdentityGateway,
  CollaborationGateway,
} from "./contracts.ts";

export interface ApplicationServices {
  repository: PlanningRepository;
  identity?: IdentityGateway;
  collaboration?: CollaborationGateway;
}
/** The only adapter selection point. No database SDK, API URL or secret is configured. */
export function createServices(): ApplicationServices {
  return {
    repository: new LocalPlanningRepository(
      window.localStorage,
      window,
      navigator.locks,
    ),
  };
}
