import { safeQuery } from "@dos/db";

// ============================================================================
// Shahin — Governance Baseline Seeders Service (barrel)
// Split into focused sub-modules under ./seeders/ for maintainability.
// This file re-exports all public APIs to preserve existing import paths.
// ============================================================================

export {
  seedCommittees,
  seedProcedures,
  seedGovernanceProcedures,
  seedMandates,
  seedObjectives,
  seedDelegations,
  seedRACIAssignments,
  seedMeetingsAndDecisions,
  seedActionItems,
  seedPolicyReviews,
  seedAcknowledgementCampaigns,
  seedResponsibilities,
  seedRACITemplates,
  seedGovernanceStructure,
  seedBoardPack,
  seedExecutiveSummary,
  seedExceptions,
  seedCrossModuleLinks,
  seedAuthorityMatrix,
  seedGovernanceAuthorityLevels,
  seedGovernanceHealthThresholds,
  seedGovernanceSignalRules,
  seedGovernanceBaseline,

  BaselineSeedResult,
} from '../../seeders/index.js';
