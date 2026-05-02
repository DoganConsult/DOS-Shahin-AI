import { logger } from '../../ports/logger.port';
// ============================================================================
// Shahin — Governance Baseline Seeders: Orchestrator
// Central entry point that runs all governance baseline seeders in order.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { uuid } from './_shared';

import { seedCommittees } from './seed-committees';
import { seedProcedures, seedGovernanceProcedures } from './seed-procedures';
import { seedMandates } from './seed-mandates-obligations';
import { seedObjectives } from './seed-objectives';
import { seedDelegations } from './seed-delegations';
import { seedRACIAssignments } from './seed-raci';
import { seedMeetingsAndDecisions } from './seed-meetings-decisions';
import { seedActionItems } from './seed-action-items';
import { seedPolicyReviews, seedAcknowledgementCampaigns } from './seed-policy-reviews';
import { seedResponsibilities } from './seed-responsibilities';
import { seedRACITemplates } from './seed-raci-templates';
import { seedGovernanceStructure } from './seed-structure';
import { seedBoardPack, seedExecutiveSummary } from './seed-board-pack';
import { seedExceptions } from './seed-exceptions';
import { seedCrossModuleLinks } from './seed-cross-module-links';
import { seedAuthorityMatrix, seedGovernanceAuthorityLevels } from './seed-authority';
import { seedGovernanceHealthThresholds, seedGovernanceSignalRules } from './seed-health-signals';

export interface BaselineSeedResult {
  fireId: string;
  committees: { seeded: number; skipped: number };
  procedures: { seeded: number };
  governanceProcedures: { seeded: number };
  mandates: { seeded: number };
  objectives: { seeded: number };
  delegations: { seeded: number };
  raci: { seeded: number };
  meetingsAndDecisions: { meetings: number; decisions: number; votes: number };
  actionItems: { seeded: number };
  policyReviews: { seeded: number };
  ackCampaigns: { seeded: number };
  responsibilities: { seeded: number; assignments: number };
  raciTemplates: { templates: number; assignments: number };
  structure: { domains: number; bodies: number; reportingLines: number; legalEntities: number; departments: number };
  boardPack: { seeded: number; items: number };
  executiveSummary: { seeded: number };
  exceptions: { seeded: number };
  crossModuleLinks: { obligationControlLinks: number; procedureControlLinks: number; registerEntries: number; policyControlLinks: number };
  authorityMatrix: { seeded: number };
  healthThresholds: { seeded: number };
  signalRules: { seeded: number };
  authorityLevels: { seeded: number };
  initialHealthScore: { computed: boolean; score?: number; grade?: string };
}

export async function seedGovernanceBaseline(
  tenantId: string,
  userId?: string,
): Promise<BaselineSeedResult> {
  const schema = tenantSchema(tenantId);
  const fireId = uuid();

  // Log start
  await safeQuery(
    `INSERT INTO "${schema}".governance_auto_fire_log
       (fire_id, tenant_id, fire_type, triggered_by, status)
     VALUES ($1, $2, 'baseline_seed', $3, 'running')`,
    [fireId, tenantId, userId],
  );

  let result: BaselineSeedResult;
  try {
    const committees = await seedCommittees(tenantId, userId);
    const procedures = await seedProcedures(tenantId);
    const governanceProcedures = await seedGovernanceProcedures(tenantId);
    const mandates = await seedMandates(tenantId);
    const objectives = await seedObjectives(tenantId);
    const delegations = await seedDelegations(tenantId);
    const raci = await seedRACIAssignments(tenantId);
    const meetingsAndDecisions = await seedMeetingsAndDecisions(tenantId);
    const actionItems = await seedActionItems(tenantId);
    const policyReviews = await seedPolicyReviews(tenantId);
    const ackCampaigns = await seedAcknowledgementCampaigns(tenantId);
    const responsibilities = await seedResponsibilities(tenantId);
    const raciTemplates = await seedRACITemplates(tenantId);
    const structure = await seedGovernanceStructure(tenantId);
    const boardPack = await seedBoardPack(tenantId);
    const executiveSummary = await seedExecutiveSummary(tenantId);
    const exceptions = await seedExceptions(tenantId);
    const crossModuleLinks = await seedCrossModuleLinks(tenantId);
    const authorityMatrix = await seedAuthorityMatrix(tenantId);
    const healthThresholds = await seedGovernanceHealthThresholds(tenantId);
    const signalRules = await seedGovernanceSignalRules(tenantId);
    const authorityLevels = await seedGovernanceAuthorityLevels(tenantId);

    let initialHealthScore: { computed: boolean; score?: number; grade?: string } = { computed: false };
    try {
      const { computeGovernanceHealth } = await import('../governance/governance-health.service.js');
      const health = await computeGovernanceHealth(tenantId);
      initialHealthScore = { computed: true, score: health.overall_score, grade: health.overall_grade };
    } catch {}

    result = {
      fireId, committees, procedures, governanceProcedures, mandates, objectives, delegations, raci,
      meetingsAndDecisions, actionItems, policyReviews, ackCampaigns,
      responsibilities, raciTemplates, structure, boardPack, executiveSummary,
      exceptions, crossModuleLinks, authorityMatrix, healthThresholds, signalRules, authorityLevels,
      initialHealthScore,
    };

    await safeQuery(
      `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'completed', completed_at = NOW(), components_fired = $2
       WHERE fire_id = $1`,
      [fireId, JSON.stringify(result)],
    );
  } catch (err: unknown) {
    await safeQuery(
      `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE fire_id = $1`,
      [fireId, toErrorMessage(err)],
    );
    throw err;
  }

  logger.info(`[GovernanceAutoFire] Baseline seeded for tenant ${tenantId}:`, JSON.stringify(result));
  return result;
}
