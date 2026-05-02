import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { WORKFLOW_EVENT_CONTRACT } from './workflow.events';
import { swallow, catchHandler, EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  const linkedInstances = await safeQuery(
    `SELECT instance_id FROM "${schema}".workflow_instances
     WHERE entity_type = 'risk' AND entity_id = $1 AND status = 'active'`,
    [riskId],
  );

  for (const row of linkedInstances.rows) {
    await safeQuery(
      `UPDATE "${schema}".workflow_instances
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{entity_status}', $1::jsonb),
           updated_at = NOW()
       WHERE instance_id = $2`,
      [JSON.stringify(newStatus), row.instance_id],
    );
  }
}

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string || payload.gapId as string;
  const severity = payload.severity as string || 'medium';

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Workflow: Auto-initiate remediation workflow for compliance gap`,
      description: `A ${severity} compliance gap has been detected. Initiate remediation workflow if auto-trigger rules match.`,
      taskType: 'workflow_trigger',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'compliance_gap',
      entityId: gapId,
      triggerSource: 'compliance.gap_detected',
    });
  }
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Workflow: Auto-initiate incident response workflow`,
      description: `A ${severity} incident has been classified. Trigger incident response workflow if configured.`,
      taskType: 'workflow_trigger',
      priority: 'critical',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.classified',
    });
  }
}

async function handleEvidenceCollected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const _evidenceId = payload.entityId as string;
  const controlId = payload.controlId as string;

  if (controlId) {
    const pendingTasks = await safeQuery(
      `SELECT task_id FROM "${schema}".workflow_tasks
       WHERE entity_type = 'evidence' AND entity_id = $1 AND status = 'pending'`,
      [controlId],
    );

    for (const row of pendingTasks.rows) {
      await safeQuery(
        `UPDATE "${schema}".workflow_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE task_id = $1`,
        [row.task_id],
      );
    }
  }
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Workflow: Audit finding — trigger remediation workflow`,
    description: `An audit finding has been created. Check if auto-remediation workflow should be triggered.`,
    taskType: 'workflow_trigger',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const policyId = payload.entityId as string;

  const pendingTasks = await safeQuery(
    `SELECT task_id FROM "${schema}".workflow_tasks
     WHERE entity_type = 'policy' AND entity_id = $1 AND status = 'pending_approval'`,
    [policyId],
  );

  for (const row of pendingTasks.rows) {
    await safeQuery(
      `UPDATE "${schema}".workflow_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE task_id = $1`,
      [row.task_id],
    );
  }
}

async function handleVendorSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string || payload.vendorId as string;

  await createProcessTask(tenantId, {
    title: `Workflow: Vendor SLA breach — escalation workflow`,
    description: `A vendor SLA has been breached. Trigger escalation workflow for vendor management.`,
    taskType: 'workflow_trigger',
    priority: 'high',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'vendor.sla_breached',
  });
}

async function handleExceptionApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const exceptionId = payload.entityId as string;

  const pendingTasks = await safeQuery(
    `SELECT task_id FROM "${schema}".workflow_tasks
     WHERE entity_type = 'exception' AND entity_id = $1 AND status = 'pending_approval'`,
    [exceptionId],
  );

  for (const row of pendingTasks.rows) {
    await safeQuery(
      `UPDATE "${schema}".workflow_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE task_id = $1`,
      [row.task_id],
    );
  }
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: Risk appetite breach — escalation workflow`,
    description: `Risk "${payload.riskName}" (score ${payload.riskScore}) exceeds appetite (max ${payload.maxScore}). Trigger escalation.`,
    taskType: 'workflow_trigger', priority: 'critical',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.exceeded_appetite',
  });
}

async function handleRiskMitigationRequired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: Untreated high risk requires mitigation plan`,
    description: `Risk "${payload.riskName}" (score ${payload.score}) has no treatment plan. Initiate mitigation workflow.`,
    taskType: 'workflow_trigger', priority: 'high',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.mitigation_required',
  });
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: Incident SLA breached — escalation required`,
    description: `${payload.breachedCount || 1} incident SLA(s) breached. Trigger escalation workflow.`,
    taskType: 'workflow_trigger', priority: 'critical',
    entityType: 'incident', entityId: payload.entityId as string || '',
    triggerSource: 'incident.sla_breached',
  });
}

async function handleRaciGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const missing = (payload.missingRoles as string[])?.join(', ') || 'unknown';
  await createProcessTask(tenantId, {
    title: `Workflow: RACI gap — missing ${missing}`,
    description: `Entity ${payload.entityType}/${payload.entityId} is missing RACI roles: ${missing}. Assign ownership.`,
    taskType: 'workflow_trigger', priority: missing.includes('responsible') || missing.includes('accountable') ? 'critical' : 'high',
    entityType: payload.entityType as string || 'grc_entity', entityId: payload.entityId as string || '',
    triggerSource: 'raci.gap_detected',
  });
}

async function handleRaciExpired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: ${payload.expiredCount || 1} RACI assignment(s) expired — reassignment needed`,
    description: `Expired RACI assignments detected. Trigger reassignment workflow.`,
    taskType: 'workflow_trigger', priority: 'high',
    entityType: 'raci_assignment', entityId: payload.entityId as string || '',
    triggerSource: 'raci.expired',
  });
}

async function handleVendorContractExpiring(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: Vendor contract expiring — ${payload.vendorName}`,
    description: `Vendor "${payload.vendorName}" contract expires ${payload.expiryDate}. Initiate renewal workflow.`,
    taskType: 'workflow_trigger', priority: (payload.riskTier as string) === 'critical' ? 'critical' : 'high',
    entityType: 'vendor', entityId: payload.entityId as string || '',
    triggerSource: 'vendor.contract_expiring',
  });
}

async function handleAuditRemediationDue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: Audit remediation due — non-compliant finding`,
    description: `Assessment finding "${payload.findingTitle}" is ${payload.status}. Initiate remediation workflow.`,
    taskType: 'workflow_trigger', priority: 'high',
    entityType: 'assessment_item', entityId: payload.entityId as string || '',
    triggerSource: 'audit.remediation_due',
  });
}

async function handleBcpExerciseOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: BCP exercise overdue — ${payload.title}`,
    description: `BCP exercise "${payload.title}" was scheduled for ${payload.scheduledDate}. Reschedule immediately.`,
    taskType: 'workflow_trigger', priority: 'high',
    entityType: 'bcp_exercise', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.exercise_overdue',
  });
}

async function handleTrainingComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Workflow: ${payload.overdueCount} training assignment(s) overdue`,
    description: `Training compliance gap detected. Trigger follow-up workflow for overdue assignments.`,
    taskType: 'workflow_trigger', priority: (payload.overdueCount as number) > 10 ? 'critical' : 'high',
    entityType: 'training', entityId: payload.entityId as string || '',
    triggerSource: 'training.compliance_gap',
  });
}

// ── Cross-Module Integration Handlers ────────────────────────────────────────

async function handleTeamMemberRemoved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const userId = payload.userId as string || payload.memberId as string;
  if (!userId) return;

  // Reassign active workflow tasks from the removed member to their team lead or unassigned
  const openTasks = await safeQuery(
    `SELECT task_id, instance_step_id FROM "${schema}".workflow_tasks
     WHERE assignee_id = $1 AND status = 'open' AND deleted_at IS NULL`,
    [userId],
  ).catch(() => ({ rows: [] }));

  const teamLeadId = (payload.teamLeadId as string) || null;

  for (const row of openTasks.rows) {
    await safeQuery(
      `UPDATE "${schema}".workflow_tasks
       SET assignee_id = $1, updated_at = NOW(),
           metadata = jsonb_set(COALESCE(metadata, '{}'), '{reassigned_reason}', '"team_member_removed"'::jsonb)
       WHERE task_id = $2`,
      [teamLeadId, row.task_id],
    ).catch(catchHandler(EC.DB_CLEANUP, ({
      tenantId,
      operation: 'workflow:reassign-open-task',
      taskId: row.task_id as string,
    }) as any));
  }

  if (openTasks.rows.length > 0) {

    swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'workflow.task_reassigned' as any,
      tenantId,
      severity: 'info',
      payload: {
        moduleCode: 'workflow',
        previousAssignee: userId,
        newAssignee: teamLeadId,
        taskCount: openTasks.rows.length,
        reason: 'team_member_removed',
      },
    }), { tenantId, operation: 'eventBus:workflow.task_reassigned' });
  }
}

async function handleDashboardWidgetCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const widgetId = payload.widgetId as string || payload.entityId as string;
  const widgetType = payload.widgetType as string || '';

  // Register workflow-related widgets for cross-referencing
  if (widgetType.startsWith('workflow') || widgetType.includes('workflow')) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_event_log (event_type, entity_id, tenant_id, payload, created_at)
       VALUES ('dashboard.widget_registered', $1, $2, $3, NOW())
       ON CONFLICT DO NOTHING`,
      [widgetId, tenantId, JSON.stringify({ widgetType, source: 'dashboard.widget_created' })],
    ).catch(catchHandler(EC.FALLBACK_QUERY, ({
      tenantId,
      operation: 'workflow:register-widget-log',
      widgetId,
    }) as any));
  }
}

async function handleNavigationItemUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const moduleCode = payload.moduleCode as string || '';

  // Only act on workflow-related navigation updates
  if (moduleCode !== 'workflow') return;

  // Log the navigation change for audit trail
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".workflow_event_log (event_type, entity_id, tenant_id, payload, created_at)
     VALUES ('navigation.workflow_nav_updated', $1, $2, $3, NOW())`,
    [
      payload.itemId as string || 'unknown',
      tenantId,
      JSON.stringify({ action: payload.action, path: payload.path, source: 'navigation.item_updated' }),
    ],
  ).catch(catchHandler(EC.FALLBACK_QUERY, ({
    tenantId,
    operation: 'workflow:navigation-log',
    moduleCode,
  }) as any));
}

async function handleTenantProvisioned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);

  // Seed default workflow templates for the newly provisioned tenant
  const existingTemplates = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_definitions WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ cnt: 0 }] }));

  const count = parseInt(existingTemplates.rows[0]?.cnt ?? '0', 10);

  // Only seed if no templates exist (fresh tenant)
  if (count === 0) {
    await createProcessTask(tenantId, {
      title: 'Workflow: Seed default workflow templates for new tenant',
      description: `Tenant ${tenantId} has been provisioned. Seed standard workflow templates (approval, remediation, incident response).`,
      taskType: 'workflow_trigger',
      priority: 'medium',
      entityType: 'tenant',
      entityId: tenantId,
      triggerSource: 'provisioning.tenant_provisioned',
    });

    swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'workflow.instance_created' as string,
          tenantId,
          severity: 'info',
          payload: {
            moduleCode: 'workflow',
            action: 'template_seeding_requested',
            entityType: 'tenant',
            entityId: tenantId,
          },
        } as any)), { tenantId, operation: 'eventBus:workflow.instance_created' });
  }
}

async function handleOnboardingCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = payload.userId as string || payload.entityId as string;

  // Trigger post-onboarding workflows (e.g., initial assessment, training assignment)
  await createProcessTask(tenantId, {
    title: 'Workflow: Post-onboarding workflow trigger',
    description: `User ${userId} has completed onboarding. Trigger any configured post-onboarding workflows.`,
    taskType: 'workflow_trigger',
    priority: 'medium',
    entityType: 'user',
    entityId: userId || '',
    triggerSource: 'onboarding.completed',
  });

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'workflow.instance_created' as string,
      tenantId,
      severity: 'info',
      payload: {
        moduleCode: 'workflow',
        action: 'post_onboarding_trigger',
        entityType: 'user',
        entityId: userId,
      },
    } as any)), { tenantId, operation: 'eventBus:workflow.instance_created' });
}

async function handleDoraObligationCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const obligationId = payload.entityId as string || payload.obligationId as string;
  const pillar = payload.pillar as string || 'unknown';
  const severity = payload.severity as string || 'medium';

  // Create a compliance workflow for the new DORA obligation
  await createProcessTask(tenantId, {
    title: `Workflow: DORA obligation compliance — ${pillar}`,
    description: `A new DORA obligation (${obligationId}) has been created under pillar "${pillar}". Initiate compliance workflow.`,
    taskType: 'workflow_trigger',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'dora_obligation',
    entityId: obligationId || '',
    triggerSource: 'dora.obligation_created',
  });

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'workflow.instance_created' as string,
      tenantId,
      severity: 'info',
      payload: {
        moduleCode: 'workflow',
        action: 'dora_compliance_workflow',
        entityType: 'dora_obligation',
        entityId: obligationId,
        pillar,
      },
    } as any)), { tenantId, operation: 'eventBus:workflow.instance_created' });
}

async function handleGovernanceSignalDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const signalId = payload.entityId as string || payload.signalId as string;
  const signalType = payload.signalType as string || 'unknown';
  const severity = payload.severity as string || 'medium';

  // Create an investigation workflow for the governance signal
  await createProcessTask(tenantId, {
    title: `Workflow: Governance signal investigation — ${signalType}`,
    description: `Governance AI has detected a ${severity} signal (${signalId}, type: ${signalType}). Initiate investigation workflow.`,
    taskType: 'workflow_trigger',
    priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
    entityType: 'governance_signal',
    entityId: signalId || '',
    triggerSource: 'governance_ai.signal_detected',
  });

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'workflow.instance_created' as string,
      tenantId,
      severity: 'info',
      payload: {
        moduleCode: 'workflow',
        action: 'governance_investigation_workflow',
        entityType: 'governance_signal',
        entityId: signalId,
        signalType,
      },
    } as any)), { tenantId, operation: 'eventBus:workflow.instance_created' });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[workflow] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[workflow] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.status_changed', wrapHandler('handleRiskStatusChanged', handleRiskStatusChanged));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('evidence.collected', wrapHandler('handleEvidenceCollected', handleEvidenceCollected));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('vendor.sla_breached', wrapHandler('handleVendorSlaBreach', handleVendorSlaBreach));
handlers.set('exception.approved', wrapHandler('handleExceptionApproved', handleExceptionApproved));
handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('risk.mitigation_required', wrapHandler('handleRiskMitigationRequired', handleRiskMitigationRequired));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('raci.gap_detected', wrapHandler('handleRaciGapDetected', handleRaciGapDetected));
handlers.set('raci.expired', wrapHandler('handleRaciExpired', handleRaciExpired));
handlers.set('vendor.contract_expiring', wrapHandler('handleVendorContractExpiring', handleVendorContractExpiring));
handlers.set('audit.remediation_due', wrapHandler('handleAuditRemediationDue', handleAuditRemediationDue));
handlers.set('bcp.exercise_overdue', wrapHandler('handleBcpExerciseOverdue', handleBcpExerciseOverdue));
handlers.set('training.compliance_gap', wrapHandler('handleTrainingComplianceGap', handleTrainingComplianceGap));

// Cross-module integration handlers
handlers.set('team.member_removed', wrapHandler('handleTeamMemberRemoved', handleTeamMemberRemoved));
handlers.set('dashboard.widget_created', wrapHandler('handleDashboardWidgetCreated', handleDashboardWidgetCreated));
handlers.set('navigation.item_updated', wrapHandler('handleNavigationItemUpdated', handleNavigationItemUpdated));
handlers.set('provisioning.tenant_provisioned', wrapHandler('handleTenantProvisioned', handleTenantProvisioned));
handlers.set('onboarding.completed', wrapHandler('handleOnboardingCompleted', handleOnboardingCompleted));
handlers.set('dora.obligation_created', wrapHandler('handleDoraObligationCreated', handleDoraObligationCreated));
handlers.set('governance_ai.signal_detected', wrapHandler('handleGovernanceSignalDetected', handleGovernanceSignalDetected));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${WORKFLOW_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerWorkflowEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `workflow:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[workflow] registered ${handlers.size} domain event subscribers`);
}
