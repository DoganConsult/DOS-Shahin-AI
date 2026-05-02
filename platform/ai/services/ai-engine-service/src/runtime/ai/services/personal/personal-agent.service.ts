// @ts-nocheck
import { safeQuery } from "@dos/db";

// ============================================================================
// Personal Agent Service -- Barrel Re-export
//
// This module was split into focused service files for maintainability.
// All public exports are re-exported here so that existing consumers
// continue to work without any import path changes.
// ============================================================================

// --- Types & Interfaces ---
export type {
  ActivationMode,
  PersonalAgentAssignment,
  AgentActivity,
  ProcessGovernanceRule,
  SlaActivationRule,
  AgentDashboardSummary,
} from './personal-agent.types';
export { riskLevelOrder } from './personal-agent.types';

// --- Assignment Management ---
export {
  assignPersonalAgent,
  getPersonalAgentAssignment,
  updatePersonalAgentAssignment,
  getUserRoles,
  getUserPermissions,
  mapAssignmentRow,
} from './personal-agent-assignment.service';

// --- Activity Execution ---
export {
  executeAgentActivity,
  executeActivityAction,
} from './personal-agent-activity.service';

// --- Approval & Confirmation ---
export {
  getAgentActivity,
  approveAgentActivity,
  rejectAgentActivity,
  confirmAgentActivity,
  mapActivityRow,
} from './personal-agent-approval.service';

// --- SLA-Based Activation ---
export {
  checkSlaAndActivateAgent,
} from './personal-agent-sla.service';

// --- Dashboard & Analytics ---
export {
  getAgentDashboardSummary,
  getAgentAuditTrail,
  getAgentActivityTimeline,
} from './personal-agent-dashboard.service';

// --- Auto-Assignment ---
export {
  autoAssignAgentsForTenantMode,
} from './personal-agent-auto-assign.service';

// --- Diagnostics ---
export {
  getPersonalAgentDiagnostics,
} from './personal-agent-diagnostics.service';
