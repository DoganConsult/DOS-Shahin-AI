/**
 * @deprecated Phase A cleanup — this file is a duplicate of the canonical
 * agent-SoD engine. The de-facto canonical lives at
 * platform/dauth/packages/shared/src/sod/agent-sod-engine.ts because the
 * dauth-shared package barrel is the only consumer-facing export surface for
 * `evaluateAgentSod`, and dauth-core depends on dauth-shared (a re-export in
 * the other direction would create a circular dependency). This file has
 * zero direct importers — `core/sod/index.ts` does not re-export it.
 *
 * Slated for deletion once scripts/check-no-fork.mjs has been green for one
 * CI cycle. Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md
 */
export { evaluateAgentSod, type SodOutcome, type ActorPair, type AgentSodDecision, } from '@dos/dauth-shared';
export type { PrincipalType } from '../identity/identity.service';
