import { safeQuery } from "@dos/db";

/**
 * @deprecated @removal-date 2026-09-30 @owner governance-os @replacement ../initiative/initiative-registry.service
 * Re-export from canonical location per Law 2 (one canonical owner).
 */
export * from './initiative-registry.service';

// Canonical initiative definitions helper. No-op empty list until the
// canonical initiative-registry.service is fully extracted from the monolith.
// Matches the signature consumed by governance-os controllers/routes.
export interface InitiativeDefinition {
  code: string;
  name: string;
  description?: string;
  category?: string;
  [k: string]: unknown;
}

export function getInitiativeDefinitions(): InitiativeDefinition[] {
  return [];
}
