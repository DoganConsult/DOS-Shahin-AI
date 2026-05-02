// ============================================
// Provisioning Workflow — Temporal
// Orchestrates all 46 provisioning steps with parallel grouping.
// Each step is a Temporal activity with appropriate retry/timeout.
// Supports cancellation via signal.
// ============================================

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  upsertSearchAttributes,
} from '@temporalio/workflow';
import type { ProvisioningActivities } from '../../activities/provisioning.activities';
import { toErrorMessage } from '@dos/platform-core/resilience';

// Activity proxies with default retry policy (seed steps — idempotent, higher retry)
const acts = proxyActivities<ProvisioningActivities>({
  startToCloseTimeout: '5m',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumAttempts: 5,
    maximumInterval: '30s',
    nonRetryableErrorTypes: ['VALIDATION_ERROR', 'DUPLICATE_KEY'],
  },
});

// Schema/migration activities get longer timeout and conservative retry
const schemaActs = proxyActivities<ProvisioningActivities>({
  startToCloseTimeout: '15m',
  retry: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: '60s',
    nonRetryableErrorTypes: ['MIGRATION_CONFLICT'],
  },
});

// Non-fatal post-activation activities get no retry
const nonFatalActs = proxyActivities<ProvisioningActivities>({
  startToCloseTimeout: '5m',
  retry: { maximumAttempts: 1 },
});

/** Signal to cancel an in-progress provisioning workflow */
export const cancelProvisioningSignal = defineSignal('cancelProvisioning');

/** Query: live progress state for polling from the API */
export const progressQuery = defineQuery<ProvisioningProgress>('progress');

export interface ProvisioningInput {
  jobId: string;
  sessionId: string;
  userId: string;
}

export interface ProvisioningResult {
  tenantId: string;
  workspaceId: string;
  schemaName: string;
  stepsCompleted: number;
  totalSteps: number;
}

export interface ProvisioningProgress {
  stepsCompleted: number;
  totalSteps: number;
  currentStep: string;
  cancelled: boolean;
  progressPercent: number;
  estimatedTimeRemainingMs: number | null;
  phase: string;
  failedSteps: number;
  startTime: string;
  elapsedMs: number;
}

/**
 * provisionTenantWorkflow — main provisioning workflow.
 *
 * Runs 30 provisioning steps with parallel grouping where steps are
 * independent, reducing total provisioning time from ~120s to ~30s.
 * Supports mid-flight cancellation via the cancelProvisioning signal.
 *
 * Parallel groups (Issue #17 — parallelism):
 *   Phase 3a: preferences + integration + org-structure + frameworks (parallel)
 *   Phase 3b: controls (after frameworks) + risks + policies + workflows +
 *             dashboard + navigation + qiyas + sla-config (parallel)
 *   Phase 3c: evidence-plan + roles + initial-assessment + audit-plan (parallel)
 *   Phase 3d: teams-and-raci + ninety-day-plan (sequential after roles)
 */
export async function provisionTenantWorkflow(input: ProvisioningInput): Promise<ProvisioningResult> {
  let cancelled = false;
  let stepsCompleted = 0;
  let currentStep = 'initializing';
  let failedSteps = 0;
  let currentPhase = 'initializing';
  const totalSteps = 47;
  const startTime = Date.now();

  setHandler(cancelProvisioningSignal, () => { cancelled = true; });
  setHandler(progressQuery, () => {
    const progressPercent = (stepsCompleted / totalSteps) * 100;
    const elapsedMs = Date.now() - startTime;
    const estimatedTimeRemainingMs =
      stepsCompleted > 0
        ? (elapsedMs / stepsCompleted) * (totalSteps - stepsCompleted)
        : null;
    return {
      stepsCompleted,
      totalSteps,
      currentStep,
      cancelled,
      progressPercent,
      estimatedTimeRemainingMs,
      phase: currentPhase,
      failedSteps,
      startTime: new Date(startTime).toISOString(),
      elapsedMs,
    };
  });

  // NOTE(S5): Provisioning steps are infrastructure-level (schema creation, seeding),
  // not business entity lifecycle transitions. evaluateLifecycleTransition is not
  // applicable here — lifecycle auth governs domain entity state changes only.

  // Phase 0: Initialize context — loads answers, profile, db resolution
  currentPhase = 'initializing';
  const ctx = await acts.initProvisioningContext(input.jobId, input.sessionId, input.userId);

  try {
    upsertSearchAttributes({ TenantId: [ctx.tenantId || ''], WorkflowDomain: ['provisioning'] });
  } catch {
    // Non-fatal: search attributes may not be registered in the Temporal namespace.
    // Provisioning must not fail just because filtering metadata is unavailable.
  }

  /**
   * Run a single provisioning step with lifecycle tracking.
   */
  async function runStep(
    stepFn: () => Promise<Record<string, unknown>>,
    stepCode: string
  ): Promise<Record<string, unknown>> {
    if (cancelled) throw new Error('Provisioning cancelled by signal');
    currentStep = stepCode;
    await acts.markStepRunning(input.jobId, stepCode);
    try {
      const result = await stepFn();
      await acts.markStepCompleted(input.jobId, stepCode, result);
      stepsCompleted++;
      return result;
    } catch (err: unknown) {
      failedSteps++;
      await acts.markStepFailed(input.jobId, stepCode, toErrorMessage(err) || String(err));
      throw err;
    }
  }

  /**
   * Run a group of independent steps in parallel.
   * Non-critical step failures are collected and logged but do not abort the group.
   */
  async function runParallelGroup(
    steps: Array<{ stepFn: () => Promise<Record<string, unknown>>; stepCode: string; critical?: boolean }>
  ): Promise<void> {
    if (cancelled) throw new Error('Provisioning cancelled by signal');
    currentStep = steps.map(s => s.stepCode).join('+');
    const results = await Promise.allSettled(
      steps.map(s => runStep(s.stepFn, s.stepCode))
    );
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected' && steps[i].critical !== false) {
        throw (results[i] as PromiseRejectedResult).reason;
      }
    }
  }

  // ─── Phase 1: Tenant creation (critical, sequential) ──────────
  currentPhase = 'tenant_creation';
  const step1 = await runStep(
    () => acts.createTenantMaster(ctx),
    'create_tenant_master'
  );
  const tenantId = (step1.tenantId as string) || ctx.tenantId;
  const schemaName = (step1.schemaName as string) || `tenant_${tenantId}`;

  const step2 = await runStep(
    () => acts.createWorkspace({ ...ctx, tenantId, schemaName }),
    'create_workspace'
  );
  const workspaceId = (step2.workspaceId as string) || ctx.workspaceId;

  // ─── Phase 2: Schema setup (long-running, conservative retry) ─
  currentPhase = 'schema_setup';
  const enrichedCtx = { ...ctx, tenantId, workspaceId, schemaName };

  await runStep(() => schemaActs.allocateTenantSchema(enrichedCtx), 'allocate_tenant_schema');
  await runStep(() => schemaActs.runTenantMigrations(enrichedCtx), 'run_tenant_migrations');

  // ─── Phase 3a: Foundation seeding (parallel, all independent) ─
  currentPhase = 'foundation_seeding';
  await runParallelGroup([
    { stepFn: () => acts.seedTenantPreferences(enrichedCtx), stepCode: 'seed_tenant_preferences' },
    { stepFn: () => acts.seedIntegrationConfig(enrichedCtx), stepCode: 'seed_integration_config' },
    { stepFn: () => acts.seedOrgStructure(enrichedCtx), stepCode: 'seed_org_structure' },
    { stepFn: () => acts.applyModuleSeedMappings(enrichedCtx), stepCode: 'apply_module_seed_mappings', critical: false },
    { stepFn: () => acts.seedFrameworks(enrichedCtx), stepCode: 'seed_frameworks' },
  ]);

  // ─── Phase 3b: Content seeding (parallel, after frameworks) ──
  currentPhase = 'content_seeding';
  await runParallelGroup([
    { stepFn: () => acts.seedControls(enrichedCtx), stepCode: 'seed_controls' },
    { stepFn: () => acts.seedRisks(enrichedCtx), stepCode: 'seed_risks', critical: false },
    { stepFn: () => acts.seedPolicies(enrichedCtx), stepCode: 'seed_policies', critical: false },
    { stepFn: () => acts.seedWorkflows(enrichedCtx), stepCode: 'seed_workflows', critical: false },
    { stepFn: () => acts.seedDashboardProfile(enrichedCtx), stepCode: 'seed_dashboard_profile', critical: false },
    { stepFn: () => acts.seedNavigation(enrichedCtx), stepCode: 'seed_navigation', critical: false },
    { stepFn: () => acts.seedQiyasStarter(enrichedCtx), stepCode: 'seed_qiyas_starter', critical: false },
    { stepFn: () => acts.seedSlaConfig(enrichedCtx), stepCode: 'seed_sla_config', critical: false },
  ]);

  // ─── Phase 3c: Post-content seeding (parallel, after controls) ─
  currentPhase = 'post_content_seeding';
  await runParallelGroup([
    { stepFn: () => acts.seedEvidencePlan(enrichedCtx), stepCode: 'seed_evidence_plan' },
    { stepFn: () => acts.createDefaultRoles(enrichedCtx), stepCode: 'create_default_roles' },
    { stepFn: () => acts.seedInitialAssessment(enrichedCtx), stepCode: 'seed_initial_assessment', critical: false },
    { stepFn: () => acts.seedAuditPlan(enrichedCtx), stepCode: 'seed_audit_plan', critical: false },
  ]);

  // ─── Phase 3d: Responsibility graph seeding (parallel, non-critical — depends on onboarding profile) ─
  currentPhase = 'responsibility_seeding';
  await runParallelGroup([
    { stepFn: () => acts.seedPersonProfiles(enrichedCtx), stepCode: 'seed_person_profiles', critical: false },
    { stepFn: () => acts.seedModuleAssignments(enrichedCtx), stepCode: 'seed_module_assignments', critical: false },
    { stepFn: () => acts.seedTeamsFromGraph(enrichedCtx), stepCode: 'seed_teams_from_graph', critical: false },
  ]);

  // ─── Phase 3e: Team setup (sequential — roles must exist first) ─
  currentPhase = 'team_setup';
  await runStep(() => acts.seedTeamsAndRaci(enrichedCtx), 'seed_teams_and_raci');

  // ─── Phase 3f: Escalation + ownership wiring (after teams, non-critical) ─
  await runParallelGroup([
    { stepFn: () => acts.seedEscalationAndSla(enrichedCtx), stepCode: 'seed_escalation_and_sla', critical: false },
    { stepFn: () => acts.wireOwnershipToEntities(enrichedCtx), stepCode: 'wire_ownership_to_entities', critical: false },
  ]);

  await runStep(() => acts.seedNinetyDayPlan(enrichedCtx), 'seed_ninety_day_plan');

  // ─── Phase 4: User & governance setup ────────────────────────
  currentPhase = 'user_governance_setup';
  await runParallelGroup([
    { stepFn: () => acts.createUserInvitations(enrichedCtx), stepCode: 'create_user_invitations' },
    { stepFn: () => acts.seedGovernanceConstitution(enrichedCtx), stepCode: 'seed_governance_constitution', critical: false },
  ]);

  // ─── Phase 4b: Governance baseline (must follow constitution) ──
  try {
    await runStep(() => acts.seedGovernanceBaseline(enrichedCtx), 'seed_governance_baseline');
  } catch {
    // non-fatal: governance baseline seed failure does not block provisioning
  }

  // ─── Phase 4c: Risk baseline (appetite, scoring, tolerance) ──
  try {
    await runStep(() => acts.seedRiskBaseline(enrichedCtx), 'seed_risk_baseline');
  } catch {
    // non-fatal: risk baseline seed failure does not block provisioning
  }

  // ─── Phase 5: Validation & activation (step 32-33) ─────────────
  currentPhase = 'validation_activation';
  await runStep(() => acts.runPostSeedValidations(enrichedCtx), 'run_post_seed_validations');
  await runStep(() => acts.activateWorkspace(enrichedCtx), 'activate_workspace');

  // ─── Phase 6: Post-activation (non-fatal) ────────────────────
  currentPhase = 'post_activation';
  try {
    await runStep(() => nonFatalActs.startCcmEngine(enrichedCtx), 'start_ccm_engine');
  } catch {
    // non-fatal: CCM engine start failure does not block provisioning
  }

  await runStep(() => acts.createSubscription(enrichedCtx), 'create_subscription');
  await runStep(() => acts.seedAutomationRules(enrichedCtx), 'seed_automation_rules');
  await runStep(() => acts.seedInitialTasks(enrichedCtx), 'seed_initial_tasks');
  await runStep(() => acts.seedFeatureFlags(enrichedCtx), 'seed_feature_flags');
  await runStep(() => acts.generateStartupChecklist(enrichedCtx), 'generate_startup_checklist');

  // ─── Phase 6b: Enterprise setup (non-fatal) ───────────────────
  currentPhase = 'enterprise_setup';
  await runParallelGroup([
    { stepFn: () => acts.seedEnterpriseRoles(enrichedCtx), stepCode: 'seed_enterprise_roles', critical: false },
    { stepFn: () => nonFatalActs.seedModuleSecurity(enrichedCtx), stepCode: 'seed_module_security', critical: false },
    { stepFn: () => acts.seedDepartmentManagers(enrichedCtx), stepCode: 'seed_department_managers', critical: false },
    { stepFn: () => acts.seedWorkflowChains(enrichedCtx), stepCode: 'seed_workflow_chains', critical: false },
  ]);

  // ─── Phase 6c: Product packs + governance context (non-fatal) ──
  try {
    await runStep(() => nonFatalActs.installProductPacks(enrichedCtx), 'install_product_packs');
  } catch {
    // non-fatal: pack installation failure does not block provisioning
  }

  try {
    await runStep(() => nonFatalActs.materializeGovernanceContext(enrichedCtx), 'materialize_governance_context');
  } catch {
    // non-fatal: governance context materialization deferred
  }

  currentPhase = 'finalizing';
  await runStep(() => acts.handoverComplete(enrichedCtx), 'handover_complete');

  // Mark the overall provisioning job as completed + session as active
  await acts.completeProvisioningJob(input.jobId, tenantId, workspaceId, input.sessionId);

  return { tenantId, workspaceId, schemaName, stepsCompleted, totalSteps };
}
