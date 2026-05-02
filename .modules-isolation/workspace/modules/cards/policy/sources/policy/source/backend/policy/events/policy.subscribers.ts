/**
 * Policy Module -- Event Subscribers
 *
 * Handles cross-module event integration. Each handler logs receipt,
 * performs business logic, and handles errors gracefully.
 *
 * @owner policy
 * @module policy
 */

import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { POLICY_EVENT_CONTRACT } from './policy.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

// ── Existing Handlers ───────────────────────────────────────────────

async function handleFrameworkMappingUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const frameworkId = payload.entityId as string || payload.frameworkId as string;

  const linkedPolicies = await safeQuery(
    `SELECT policy_id FROM "${schema}".policies
     WHERE framework_ids @> ARRAY[$1]::text[] OR linked_framework_id = $1
     LIMIT 50`,
    [frameworkId],
  );

  if (linkedPolicies.rows.length > 0) {
    await createProcessTask(tenantId, {
      title: `Policy review: Framework mapping updated`,
      description: `Compliance framework mapping has changed. Review ${linkedPolicies.rows.length} linked policy(ies) for alignment.`,
      taskType: 'policy_creation',
      priority: 'medium',
      entityType: 'framework',
      entityId: frameworkId,
      triggerSource: 'compliance.framework_mapping_updated',
    });
  }
}

async function handleCharterApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const charterId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Policy alignment: Governance charter approved`,
    description: `A governance charter has been approved. Review related policies for alignment.`,
    taskType: 'policy_creation',
    priority: 'medium',
    entityType: 'charter',
    entityId: charterId,
    triggerSource: 'governance.charter_approved',
  });
}

async function handleRiskAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;
  const score = payload.newScore as number || payload.score as number;

  if (score !== undefined && score >= 15) {
    await createProcessTask(tenantId, {
      title: `Policy review: High-risk assessment completed`,
      description: `A risk assessment completed with high score. Review policies linked to this risk area.`,
      taskType: 'policy_creation',
      priority: 'high',
      entityType: 'risk',
      entityId: riskId,
      triggerSource: 'risk.assessment_completed',
    });
  }
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('policy') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".policies
     SET status = $1, updated_at = NOW()
     WHERE policy_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

// ── New Cross-Module Handlers ───────────────────────────────────────

/**
 * Handle team structure changes by reassessing policy ownership.
 * When team structure changes, policies owned by affected members
 * may need reassignment.
 */
async function handleTeamStructureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const teamId = payload.entityId as string || payload.teamId as string;
  const changeType = payload.changeType as string;

  logger.info('[policy-subscriber] Team structure changed, reassessing policy ownership', {
    tenantId,
    teamId,
    changeType,
  });

  // Find policies owned by members of the affected team
  const affectedPolicies = await safeQuery(
    `SELECT pr.policy_id, pr.owner_id, pr.title
     FROM "${schema}".policy_rule pr
     WHERE pr.owner_id IN (
       SELECT user_id FROM "${schema}".team_members
       WHERE team_id = $1 AND left_at IS NOT NULL
       AND left_at >= NOW() - INTERVAL '7 days'
     )
     AND pr.status NOT IN ('archived', 'deprecated')
     LIMIT 100`,
    [teamId],
  ).catch(() => ({ rows: [] }));

  if (affectedPolicies.rows.length > 0) {
    await createProcessTask(tenantId, {
      title: `Policy ownership review: Team structure changed`,
      description: `Team structure changed. ${affectedPolicies.rows.length} policy(ies) may need ownership reassignment.`,
      taskType: 'policy_creation',
      priority: 'high',
      entityType: 'team',
      entityId: teamId,
      triggerSource: 'team.structure_changed',
    });
  }
}

/**
 * Handle onboarding completion by assigning initial policies to new tenant.
 * New tenants receive baseline policy templates to accelerate setup.
 */
async function handleOnboardingCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const userId = payload.entityId as string || payload.userId as string;

  logger.info('[policy-subscriber] Onboarding completed, assigning initial policies', {
    tenantId,
    userId,
  });

  // Check if tenant already has policies provisioned
  const existingPolicies = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".policy_rule WHERE status != 'archived'`,
  ).catch(() => ({ rows: [{ cnt: 0 }] }));

  const count = parseInt(existingPolicies.rows[0]?.cnt ?? '0', 10);
  if (count === 0) {
    await createProcessTask(tenantId, {
      title: `Initial policy setup: Onboarding completed`,
      description: `Tenant onboarding completed. Create baseline policies from templates for new organization.`,
      taskType: 'policy_creation',
      priority: 'medium',
      entityType: 'tenant',
      entityId: tenantId,
      triggerSource: 'onboarding.completed',
    });
  }
}

/**
 * Handle workflow instance completion for policy-related workflows.
 * Updates policy status when a policy review or approval workflow completes.
 */
async function handleWorkflowCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const outcome = payload.outcome as string || payload.result as string;

  if (!entityType?.startsWith('policy') || !entityId) return;

  logger.info('[policy-subscriber] Workflow completed for policy entity', {
    tenantId,
    entityType,
    entityId,
    outcome,
  });

  // Update policy status based on workflow outcome
  if (outcome === 'approved') {
    await safeQuery(
      `UPDATE "${schema}".policy_rule
       SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE policy_id = $1 AND status IN ('draft', 'review')`,
      [entityId],
    ).catch(err => {
      logger.error('[policy-subscriber] Failed to update policy after workflow approval', {
        entityId,
        error: (err as Error).message,
      });
    });
  } else if (outcome === 'rejected') {
    await safeQuery(
      `UPDATE "${schema}".policy_rule
       SET status = 'draft', updated_at = NOW()
       WHERE policy_id = $1 AND status = 'review'`,
      [entityId],
    ).catch(err => {
      logger.error('[policy-subscriber] Failed to update policy after workflow rejection', {
        entityId,
        error: (err as Error).message,
      });
    });
  }
}

/**
 * Handle DORA obligation creation by creating a compliance policy draft.
 * When a new DORA obligation is created, a corresponding policy may be needed.
 */
async function handleDoraObligationCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const obligationId = payload.entityId as string || payload.obligationId as string;
  const obligationTitle = payload.title as string || 'DORA Obligation';

  logger.info('[policy-subscriber] DORA obligation created, evaluating policy need', {
    tenantId,
    obligationId,
  });

  await createProcessTask(tenantId, {
    title: `Policy draft: DORA obligation "${obligationTitle}"`,
    description: `A new DORA obligation has been created. Evaluate whether a corresponding compliance policy is required.`,
    taskType: 'policy_creation',
    priority: 'high',
    entityType: 'dora_obligation',
    entityId: obligationId,
    triggerSource: 'dora.obligation_created',
  });
}

/**
 * Handle governance AI signal detection by flagging related policies for review.
 * AI-detected governance signals may indicate policy drift or compliance gaps.
 */
async function handleGovernanceSignalDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const signalType = payload.signalType as string || payload.type as string;
  const signalId = payload.entityId as string || payload.signalId as string;
  const severity = payload.severity as string || 'medium';

  logger.info('[policy-subscriber] Governance signal detected, flagging policies for review', {
    tenantId,
    signalType,
    signalId,
    severity,
  });

  // Record drift event if signal indicates policy drift
  if (signalType === 'policy_drift' || signalType === 'compliance_gap') {
    await safeQuery(
      `INSERT INTO "${schema}".policy_drift_events (tenant_id, signal_id, signal_type, severity, detected_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, signalId, signalType, severity],
    ).catch(err => {
      logger.error('[policy-subscriber] Failed to record drift event', {
        tenantId,
        error: (err as Error).message,
      });
    });
  }

  if (severity === 'high' || severity === 'critical') {
    await createProcessTask(tenantId, {
      title: `Policy review: Governance signal detected (${signalType})`,
      description: `An AI governance signal of severity "${severity}" has been detected. Review related policies for potential drift or compliance gaps.`,
      taskType: 'policy_creation',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'governance_signal',
      entityId: signalId,
      triggerSource: 'governance_ai.signal_detected',
    });
  }
}

/**
 * Handle dashboard widget creation to register policy-specific widgets.
 * When a new dashboard widget is created with policy scope, register it.
 */
async function handleDashboardWidgetCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const widgetType = payload.widgetType as string;
  const widgetId = payload.entityId as string || payload.widgetId as string;
  const moduleScope = payload.moduleScope as string || payload.module as string;

  if (moduleScope !== 'policy') return;

  logger.info('[policy-subscriber] Dashboard widget created for policy module', {
    tenantId,
    widgetId,
    widgetType,
  });

  // Update the policy dashboard cache with the new widget reference
  await safeQuery(
    `INSERT INTO "${schema}".policy_dashboard_cache (widget_id, widget_type, tenant_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (widget_id) DO UPDATE SET updated_at = NOW()`,
    [widgetId, widgetType, tenantId],
  ).catch(err => {
    logger.error('[policy-subscriber] Failed to cache dashboard widget', {
      widgetId,
      error: (err as Error).message,
    });
  });
}

/**
 * Handle navigation item update to refresh policy navigation references.
 * Keeps policy module navigation in sync with platform shell changes.
 */
async function handleNavigationItemUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const itemId = payload.entityId as string || payload.itemId as string;
  const navSection = payload.section as string || payload.navId as string;

  if (navSection !== 'governance' && navSection !== 'policy') return;

  logger.info('[policy-subscriber] Navigation item updated for policy section', {
    tenantId,
    itemId,
    navSection,
  });

  // Navigation refresh is handled by the platform shell; log for audit trail
  logger.info('[policy-subscriber] Policy navigation refresh triggered', {
    tenantId,
    itemId,
  });
}

// ── Handler Registration ────────────────────────────────────────────


// -- foundation.scope_changed (Phase 3) -------------------------------------
//
// When a Foundation org/department/business-unit moves under a new parent,
// policy applicability for records linked to that org node must be
// recomputed. We emit one recompute task per event; idempotency on
// (triggerSource, entityId) is enforced by the task store.
async function handleFoundationScopeChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!entityId) return;
  const entityType = (payload.entityType as string | undefined) ?? 'org_unit';

  await createProcessTask(tenantId, {
    title: `Recompute policy applicability — Foundation scope changed`,
    description: `recompute policy applicability for ${entityType} ${entityId} after parent change.`,
    taskType: 'policy_applicability_recompute',
    priority: 'medium',
    entityType,
    entityId,
    triggerSource: 'foundation.scope_changed',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[policy-subscriber] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[policy-subscriber] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

// Existing event subscriptions
handlers.set('compliance.framework_mapping_updated', wrapHandler('handleFrameworkMappingUpdated', handleFrameworkMappingUpdated));
handlers.set('governance.charter_approved', wrapHandler('handleCharterApproved', handleCharterApproved));
handlers.set('risk.assessment_completed', wrapHandler('handleRiskAssessmentCompleted', handleRiskAssessmentCompleted));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

// New cross-module event subscriptions
handlers.set('team.structure_changed', wrapHandler('handleTeamStructureChanged', handleTeamStructureChanged));
handlers.set('onboarding.completed', wrapHandler('handleOnboardingCompleted', handleOnboardingCompleted));
handlers.set('workflow.instance_completed', wrapHandler('handleWorkflowCompleted', handleWorkflowCompleted));
handlers.set('dora.obligation_created', wrapHandler('handleDoraObligationCreated', handleDoraObligationCreated));
handlers.set('governance_ai.signal_detected', wrapHandler('handleGovernanceSignalDetected', handleGovernanceSignalDetected));
handlers.set('dashboard.widget_created', wrapHandler('handleDashboardWidgetCreated', handleDashboardWidgetCreated));
handlers.set('navigation.item_updated', wrapHandler('handleNavigationItemUpdated', handleNavigationItemUpdated));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${POLICY_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerPolicyEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `policy:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[policy] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('policy');
}

handlers.set('foundation.scope_changed', wrapHandler('handleFoundationScopeChanged', handleFoundationScopeChanged));

// -- Phase 5 (F-040): foundation.org_created -------------------------------
//
// When a new org node is created, policy must seed inheritance bindings so
// the new org sees the parent's policies. We surface a recompute task per
// event; idempotency on (triggerSource, entityId) is enforced by the task
// store.
async function handleFoundationOrgCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const orgId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!orgId) return;
  await createProcessTask(tenantId, {
    title: 'Seed policy inheritance for new org',
    description: `New org node ${orgId} created. Seed policy inheritance bindings from parent.`,
    taskType: 'policy_inheritance_seed',
    priority: 'medium',
    entityType: 'org_unit',
    entityId: orgId,
    triggerSource: 'foundation.org_created',
  });
}
handlers.set('foundation.org_created', wrapHandler('handleFoundationOrgCreated', handleFoundationOrgCreated));
