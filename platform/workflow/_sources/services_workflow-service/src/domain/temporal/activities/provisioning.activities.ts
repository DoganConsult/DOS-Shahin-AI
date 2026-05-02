/**
 * @owner DOS (platform provisioning)
 * @layer temporal-activity
 */
// ============================================
// Provisioning Activities
// Each function wraps one step from
// ProvisioningStepRunnerService.runSingleStep().
// Called by provisioning.workflow.ts.
// ============================================

import {
  ProvisioningStepRunnerService, ProvisioningJobRepo, ProvisioningStepRepo,
  OnboardingAnswerRepo, OnboardingScoreRepo,
  mapAnswersToNormalizedProfile, resolveRegulatoryProfile,
} from '../../../adapters/onboarding.adapter';
import { query as _query, safeQuery, assertTenantId } from '@dos/db';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { getFirstRow } from '../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

const runner = new ProvisioningStepRunnerService();
const jobRepo = new ProvisioningJobRepo();
const stepRepo = new ProvisioningStepRepo();
const answerRepo = new OnboardingAnswerRepo();
const scoreRepo = new OnboardingScoreRepo();

export interface ProvisioningContext {
  seedProfile: Record<string, unknown> | null;
  answers?: Record<string, string | null>;
  jobId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  workspaceId: string;
  schemaName: string;
  profile: any;
  dbResolution: any;
}

export interface ProvisioningActivities {
  initProvisioningContext(jobId: string, sessionId: string, userId: string): Promise<ProvisioningContext>;
  markStepRunning(jobId: string, stepCode: string): Promise<void>;
  markStepCompleted(jobId: string, stepCode: string, result: Record<string, unknown>): Promise<void>;
  markStepFailed(jobId: string, stepCode: string, error: string): Promise<void>;
  completeProvisioningJob(jobId: string, tenantId: string, workspaceId: string, sessionId: string): Promise<void>;
  createTenantMaster(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  createWorkspace(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  allocateTenantSchema(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  runTenantMigrations(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedTenantPreferences(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedIntegrationConfig(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedOrgStructure(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedFrameworks(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedControls(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedRisks(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedPolicies(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedEvidencePlan(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedWorkflows(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedDashboardProfile(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedNavigation(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedQiyasStarter(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  createDefaultRoles(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedTeamsAndRaci(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedNinetyDayPlan(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedSlaConfig(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedInitialAssessment(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedAuditPlan(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  createUserInvitations(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  runPostSeedValidations(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  activateWorkspace(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedOpenFGATuples(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  startCcmEngine(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  createSubscription(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  generateStartupChecklist(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedGovernanceConstitution(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedGovernanceBaseline(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedRiskBaseline(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedAutomationRules(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedInitialTasks(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedFeatureFlags(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedPersonProfiles(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedModuleAssignments(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedTeamsFromGraph(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedEscalationAndSla(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  wireOwnershipToEntities(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedEnterpriseRoles(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedDepartmentManagers(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedWorkflowChains(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  applyModuleSeedMappings(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedModuleSecurity(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  installProductPacks(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  materializeGovernanceContext(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  handoverComplete(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
  seedRbacV2Engine(ctx: ProvisioningContext): Promise<Record<string, unknown>>;
}

export async function initProvisioningContext(
  jobId: string,
  sessionId: string,
  userId: string,
): Promise<ProvisioningContext> {
  const job = await jobRepo.findById(jobId);
  if (!job) throw new Error(`Provisioning job not found: ${jobId}`);

  const answerMap = await answerRepo.getAnswerMap(sessionId);
  const scores = await scoreRepo.listBySession(sessionId);
  const readinessScore = scores[0]?.score_value ?? 0;
  const profile = await mapAnswersToNormalizedProfile(answerMap, readinessScore);

  const sectorCode = (profile?.regulatory?.sectorCode as string | undefined) || 'J';
  const dbResolution = await resolveRegulatoryProfile(sectorCode);

  let tenantId = job.tenant_id || '';
  if (!tenantId && job.requested_by_user_id && job.requested_by_user_id !== SYSTEM_JOB_ACTOR) {
    try {
      const userRow = await safeQuery(
        `SELECT tenant_id FROM public.users WHERE user_id = $1 LIMIT 1`,
        [job.requested_by_user_id]
      );
      tenantId = getFirstRow(userRow)?.tenant_id ?? '';
    } catch { /* ignore */ }
  }

  return {
    jobId,
    sessionId,
    userId,
    tenantId,
    workspaceId: job.workspace_id || '',
    schemaName: tenantId ? `tenant_${tenantId}` : (job.schema_name || ''),
    profile,
    dbResolution,
    seedProfile: null,
  };
}

export async function markStepRunning(jobId: string, stepCode: string): Promise<void> {
  const steps = await stepRepo.listByJob(jobId);
  const step = steps.find((s: Record<string, unknown>) => s.step_code === stepCode);
  if (step) await stepRepo.markRunning(step.id);
}

export async function markStepCompleted(
  jobId: string,
  stepCode: string,
  result: Record<string, unknown>,
): Promise<void> {
  const steps = await stepRepo.listByJob(jobId);
  const step = steps.find((s: Record<string, unknown>) => s.step_code === stepCode);
  if (step) {
    await stepRepo.markCompleted(step.id, result);
    await stepRepo.addEvent(jobId, step.id, 'step_completed', 'info', `${stepCode} completed`, result);
  }
}

export async function markStepFailed(
  jobId: string,
  stepCode: string,
  error: string,
): Promise<void> {
  const steps = await stepRepo.listByJob(jobId);
  const step = steps.find((s: Record<string, unknown>) => s.step_code === stepCode);
  if (step) {
    await stepRepo.markFailed(step.id, error);
    await stepRepo.addEvent(jobId, step.id, 'step_failed', 'error', error);
  }
}

export async function completeProvisioningJob(
  jobId: string,
  tenantId: string,
  workspaceId: string,
  sessionId: string,
): Promise<void> {
  assertTenantId(tenantId);
  await jobRepo.markCompleted(jobId, { tenantId, workspaceId });
  const { OnboardingSessionRepo } = await import('../../module-adapters/onboarding/repositories/onboarding-session.repo.js');
  const sessionRepo = new OnboardingSessionRepo();
  await sessionRepo.markActive(sessionId, tenantId, workspaceId);
}

async function runStep(ctx: ProvisioningContext, stepCode: string): Promise<Record<string, unknown>> {
  assertTenantId(ctx.tenantId);
  return runner.runSingleStep(stepCode, (ctx as any));
}

export async function createTenantMaster(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'create_tenant_master');
}

export async function createWorkspace(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'create_workspace');
}

export async function allocateTenantSchema(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'allocate_tenant_schema');
}

export async function runTenantMigrations(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  const dbTimeout = createTypedTimeout('db', 'runTenantMigrations', 120_000);
  return dbTimeout(() => runStep(ctx, 'run_tenant_migrations'));
}

export async function seedTenantPreferences(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_tenant_preferences');
}

export async function seedIntegrationConfig(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_integration_config');
}

export async function seedOrgStructure(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_org_structure');
}

export async function seedFrameworks(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  const dbTimeout = createTypedTimeout('db', 'seedFrameworks', 60_000);
  return dbTimeout(() => runStep(ctx, 'seed_frameworks'));
}

export async function seedControls(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  const dbTimeout = createTypedTimeout('db', 'seedControls', 60_000);
  return dbTimeout(() => runStep(ctx, 'seed_controls'));
}

export async function seedRisks(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_risks');
}

export async function seedPolicies(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_policies');
}

export async function seedEvidencePlan(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_evidence_plan');
}

export async function seedWorkflows(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_workflows');
}

export async function seedDashboardProfile(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_dashboard_profile');
}

export async function seedNavigation(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_navigation');
}

export async function seedQiyasStarter(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_qiyas_starter');
}

export async function createDefaultRoles(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'create_default_roles');
}

export async function seedTeamsAndRaci(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_teams_and_raci');
}

export async function seedNinetyDayPlan(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_ninety_day_plan');
}

export async function seedSlaConfig(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_sla_config');
}

export async function seedInitialAssessment(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_initial_assessment');
}

export async function seedAuditPlan(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_audit_plan');
}

export async function createUserInvitations(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'create_user_invitations');
}

export async function runPostSeedValidations(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'run_post_seed_validations');
}

export async function activateWorkspace(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'activate_workspace');
}

export async function seedOpenFGATuples(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  assertTenantId(ctx.tenantId);
  try {
    const { seedTenantTuples, seedModuleTuples } = await import('../../middleware/openfga-guard.js');
    const { openfgaConnected } = await import('../../config/openfga.js');
    if (!openfgaConnected()) {
      return { step: 'seed_openfga_tuples', skipped: true, reason: 'OpenFGA not connected' };
    }
    const _orgId = ctx.tenantId;
    await seedTenantTuples(ctx.tenantId, [{ userId: ctx.userId, roleCode: 'admin' }]);
    const { CANONICAL_AGRC_MODULE_CODES } = await import('../../config/canonical-modules.js');
    await seedModuleTuples(ctx.workspaceId || ctx.tenantId, CANONICAL_AGRC_MODULE_CODES as unknown as string[]);
    return { step: 'seed_openfga_tuples', tuplesSeeded: true, moduleCount: CANONICAL_AGRC_MODULE_CODES.length };
  } catch (err: unknown) {
    return { step: 'seed_openfga_tuples', skipped: true, error: (err as Error).message };
  }
}

export async function startCcmEngine(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'start_ccm_engine');
}

export async function createSubscription(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'create_subscription');
}

export async function generateStartupChecklist(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'generate_startup_checklist');
}

export async function seedGovernanceConstitution(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_governance_constitution');
}

export async function seedGovernanceBaseline(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_governance_baseline');
}

export async function seedRiskBaseline(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_risk_baseline');
}

export async function seedAutomationRules(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_automation_rules');
}

export async function seedInitialTasks(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_initial_tasks');
}

export async function seedFeatureFlags(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_feature_flags');
}

export async function seedPersonProfiles(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_person_profiles');
}

export async function seedModuleAssignments(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_module_assignments');
}

export async function seedTeamsFromGraph(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_teams_from_graph');
}

export async function seedEscalationAndSla(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_escalation_and_sla');
}

export async function wireOwnershipToEntities(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'wire_ownership_to_entities');
}

export async function seedEnterpriseRoles(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_enterprise_roles');
}

export async function seedDepartmentManagers(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_department_managers');
}

export async function seedWorkflowChains(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_workflow_chains');
}

export async function applyModuleSeedMappings(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'apply_module_seed_mappings');
}

export async function seedModuleSecurity(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'seed_module_security');
}

export async function installProductPacks(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'install_product_packs');
}

export async function materializeGovernanceContext(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'materialize_governance_context');
}

export async function handoverComplete(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  return runStep(ctx, 'handover_complete');
}

export async function seedRbacV2Engine(ctx: ProvisioningContext): Promise<Record<string, unknown>> {
  assertTenantId(ctx.tenantId);
  const { provisionRbacV2ForTenant } = await import(

    '../../modules/platform/services/tenant-rbac-v2-provisioner.service.js'
  );
  const tier = (ctx.profile?.subscription?.tier as 'starter' | 'professional' | 'enterprise') || 'starter';
  await provisionRbacV2ForTenant(ctx.tenantId);
  return { step: 'seed_rbac_v2_engine', tier, provisioned: true };
}
