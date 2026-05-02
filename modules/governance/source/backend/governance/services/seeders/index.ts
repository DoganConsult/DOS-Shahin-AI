import { safeQuery } from "@dos/db";

// ============================================================================
// Shahin — Governance Baseline Seeders: Barrel Export
// Re-exports all seeder functions from focused sub-modules.
// ============================================================================

export { seedCommittees } from './seed-committees';
export { seedProcedures, seedGovernanceProcedures } from './seed-procedures';
export { seedMandates } from './seed-mandates-obligations';
export { seedObjectives } from './seed-objectives';
export { seedDelegations } from './seed-delegations';
export { seedRACIAssignments } from './seed-raci';
export { seedMeetingsAndDecisions } from './seed-meetings-decisions';
export { seedActionItems } from './seed-action-items';
export { seedPolicyReviews, seedAcknowledgementCampaigns } from './seed-policy-reviews';
export { seedResponsibilities } from './seed-responsibilities';
export { seedRACITemplates } from './seed-raci-templates';
export { seedGovernanceStructure } from './seed-structure';
export { seedBoardPack, seedExecutiveSummary } from './seed-board-pack';
export { seedExceptions } from './seed-exceptions';
export { seedCrossModuleLinks } from './seed-cross-module-links';
export { seedAuthorityMatrix, seedGovernanceAuthorityLevels } from './seed-authority';
export { seedGovernanceHealthThresholds, seedGovernanceSignalRules } from './seed-health-signals';

export { seedGovernanceBaseline, BaselineSeedResult } from './seed-orchestrator';
