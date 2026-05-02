/**
 * AI Governance Service Facade
 *
 * Re-exports key functions and types from the scattered AI governance
 * service files, providing a single import point for consumers.
 */

// ── Config Service ──
export {
  type EnforcementMode,
  getTenantEnforcementMode,
  setTenantEnforcementMode,
  getGlobalFallbackMode,
  setGlobalFallbackMode,
  clearEnforcementCache,
} from './services/ai/operations/ai-governance-config.service';

// ── Ops Service ──
export {
  type BreakGlassStatus,
  type PromotionEnvironment,
  type BreakGlassEntry,
  type PromotionRecord,
  type GovernanceEventSummary,
  createBreakGlass,
  revokeBreakGlass,
  listBreakGlassEntries,
  recordPromotion,
  listPromotions,
  expireBreakGlassEntries,
  invalidateSummaryCache,
  getGovernanceEventSummary,
  listGovernanceAuditEvents,
} from './services/ai/operations/ai-governance-ops.service';

// ── Bootstrap Service ──
export {
  type BootstrapResult,
  type GovernanceHealthReport,
  bootstrapAiGovernance,
  checkGovernanceHealth,
  repairAiGovernance,
} from './services/ai/operations/ai-governance-bootstrap.service';

// ── Lifecycle Service ──
export {
  type ApprovalStatus,
  type DeploymentStatus,
  type SoDPolicy,
  type SoDCheckResult,
  type RegistryType,
  type RegistryTableConfig,
  VALID_APPROVAL,
  VALID_DEPLOYMENT,
  VALID_SOD_POLICIES,
  VALID_REGISTRY_TYPES,
  getSoDPolicy,
  setSoDPolicy,
  assertSoDCompliance,
} from './services/ai-governance-lifecycle.service';
