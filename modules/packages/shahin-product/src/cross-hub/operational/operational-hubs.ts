// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: OPERATIONAL HUBS — barrel re-export
// Split into focused hub files for maintainability.
// Original monolith (1,961 LOC) decomposed into 8 files:
//   workflow-ops-hub, ccm-connector-hub, team-stakeholder-hub,
//   knowledge-hub, raci-hub, training-certification-hub,
//   lifecycle-status-hub, qiyas-maturity-hub, bcp-proactive-hub
// ============================================

import { type SubFn } from './helpers';

import { registerWorkflowOpsHub } from './workflow-ops-hub';
import { registerCcmConnectorHub } from './ccm-connector-hub';
import { registerTeamStakeholderHub } from './team-stakeholder-hub';
import { registerKnowledgeHub } from './knowledge-hub';
import { registerRaciHub } from './raci-hub';
import { registerTrainingCertificationHub } from './training-certification-hub';
import { registerLifecycleStatusHub } from './lifecycle-status-hub';
import { registerQiyasMaturityHub } from './qiyas-maturity-hub';
import { registerBcpProactiveHub } from './bcp-proactive-hub';

/**
 * Registers all operational hub subscribers by delegating to focused sub-modules.
 * Preserves the original single-function API so callers (index.ts) need no changes.
 */
export function registerOperationalHubs(sub: SubFn): void {
  registerWorkflowOpsHub(sub);
  registerCcmConnectorHub(sub);
  registerTeamStakeholderHub(sub);
  registerKnowledgeHub(sub);
  registerRaciHub(sub);
  registerTrainingCertificationHub(sub);
  registerLifecycleStatusHub(sub);
  registerQiyasMaturityHub(sub);
  registerBcpProactiveHub(sub);
}
