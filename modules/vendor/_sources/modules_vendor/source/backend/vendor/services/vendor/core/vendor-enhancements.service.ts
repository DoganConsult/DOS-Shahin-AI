import { safeQuery } from "@dos/db";

// ============================================
// Vendor Enhancements — Barrel Re-Export
// Split into focused service files for maintainability.
// All original exports are preserved via re-export.
// ============================================

// Portal messaging: createVendorMessage, listVendorMessages, markVendorMessageRead
export { createVendorMessage, listVendorMessages, markVendorMessageRead } from './vendor-portal-messaging.service';

// Incident linking & remediation feedback: createVendorFindingFromIncident, closeVendorFindingAndRecalculate
export { createVendorFindingFromIncident, closeVendorFindingAndRecalculate } from './vendor-findings.service';

// Cross-module escalation: createBcpTestRequirementForVendor, createBoardAttentionItemForVendor
export { createBcpTestRequirementForVendor, createBoardAttentionItemForVendor } from './vendor-cross-module-escalation.service';

// Lifecycle workflows: initiateDDWorkflow, escalateOverdueDDSteps, initiateVendorOffboarding
export { initiateDDWorkflow, escalateOverdueDDSteps, initiateVendorOffboarding } from './vendor-lifecycle-workflows.service';

// Compliance checks: processConnectorSyncForVendorEvidence, assessVendorPrivacyCompliance, checkVendorTrainingCompliance
export { processConnectorSyncForVendorEvidence, assessVendorPrivacyCompliance, checkVendorTrainingCompliance } from './vendor-compliance-checks.service';

// Risk analytics: computeVendorBenchmark, cascadeSubVendorRisk, createConcentrationMitigationTasks
export { computeVendorBenchmark, cascadeSubVendorRisk, createConcentrationMitigationTasks } from './vendor-risk-analytics.service';

// Event subscribers
export { registerVendorEnhancementSubscribers } from './vendor-enhancement-subscribers.service';
