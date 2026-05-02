import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { NOTIFICATION_EVENT_CONTRACT } from './notification.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function insertNotification(tenantId: string, opts: { type: string; title: string; body: string; priority: string; entityType: string; entityId: string; source: string }): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".notifications (notification_id, type, title, body, priority, entity_type, entity_id, source, status, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
    [opts.type, opts.title, opts.body, opts.priority, opts.entityType, opts.entityId, opts.source],
  );
}

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const newScore = payload.newScore as number || payload.score as number;
  if ((newScore ?? 0) >= 15) {
    await insertNotification(tenantId, {
      type: 'risk_alert', title: `Risk score elevated to ${newScore}`,
      body: `A risk score has reached ${newScore}. Immediate attention required.`,
      priority: (newScore ?? 0) >= 20 ? 'critical' : 'high',
      entityType: 'risk', entityId: payload.entityId as string || '', source: 'risk.score_changed',
    });
  }
}

async function handleKriBreached(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'kri_breach', title: `KRI threshold breached`,
    body: `Key Risk Indicator "${payload.kriName || payload.entityId}" has exceeded its threshold.`,
    priority: 'critical',
    entityType: 'kri', entityId: payload.entityId as string || '', source: 'risk.kri_threshold_breached',
  });
}

async function handleComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';
  await insertNotification(tenantId, {
    type: 'compliance_alert', title: `Compliance gap detected (${severity})`,
    body: `A ${severity} compliance gap has been detected. Review and initiate remediation.`,
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'compliance_gap', entityId: payload.entityId as string || '', source: 'compliance.gap_detected',
  });
}

async function handlePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const newPosture = payload.newPosture as string;
  if (newPosture === 'non_compliant' || newPosture === 'at_risk') {
    await insertNotification(tenantId, {
      type: 'compliance_alert', title: `Compliance posture degraded to ${newPosture}`,
      body: `Organization compliance posture has changed. Executive review recommended.`,
      priority: newPosture === 'non_compliant' ? 'critical' : 'high',
      entityType: 'compliance_posture', entityId: payload.frameworkCode as string || 'general', source: 'compliance.posture_changed',
    });
  }
}

async function handleEvidenceExpired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'evidence_expiry', title: `Evidence expired`,
    body: `Evidence for control ${payload.controlId || payload.entityId} has expired. Resubmission required.`,
    priority: 'high',
    entityType: 'evidence', entityId: payload.entityId as string || '', source: 'evidence.expired',
  });
}

async function handleIncidentCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';
  await insertNotification(tenantId, {
    type: 'incident_alert', title: `Incident classified: ${severity}`,
    body: `An incident has been classified as ${severity}. Response team notification.`,
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'incident', entityId: payload.entityId as string || '', source: 'incident.classified',
  });
}

async function handleSlaWarning(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'sla_warning', title: `SLA warning: approaching deadline`,
    body: `Workflow task is approaching its SLA deadline. Action required before breach.`,
    priority: 'high',
    entityType: 'workflow_task', entityId: payload.entityId as string || '', source: 'workflow.sla_warning',
  });
}

async function handleSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'sla_breach', title: `SLA breached`,
    body: `Workflow SLA has been breached. Escalation may be required.`,
    priority: 'critical',
    entityType: 'workflow_task', entityId: payload.entityId as string || '', source: 'workflow.sla_breached',
  });
}

async function handleTaskAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'task_assignment', title: `New task assigned`,
    body: `A workflow task has been assigned. Review and action.`,
    priority: 'medium',
    entityType: 'workflow_task', entityId: payload.taskId as string || payload.entityId as string || '', source: 'workflow.task_assigned',
  });
}

async function handleApprovalRequested(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'approval_request', title: `Approval requested`,
    body: `An approval request is pending your review.`,
    priority: 'high',
    entityType: 'approval', entityId: payload.entityId as string || '', source: 'workflow.approval_requested',
  });
}

async function handleAuditFinding(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';
  await insertNotification(tenantId, {
    type: 'audit_alert', title: `Audit finding created (${severity})`,
    body: `An audit finding has been raised. Review and assign remediation.`,
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding', entityId: payload.entityId as string || '', source: 'audit.finding_created',
  });
}

async function handleVendorSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'vendor_sla', title: `Vendor SLA breached`,
    body: `A vendor has breached their SLA. Review vendor relationship and escalate.`,
    priority: 'high',
    entityType: 'vendor', entityId: payload.entityId as string || '', source: 'vendor.sla_breached',
  });
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'policy_update', title: `Policy approved`,
    body: `A policy has been approved. Stakeholders should review for impact.`,
    priority: 'medium',
    entityType: 'policy', entityId: payload.entityId as string || '', source: 'policy.approved',
  });
}

async function handleExceptionApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'exception_update', title: `Exception approved`,
    body: `An exception has been approved. Monitor compensating controls.`,
    priority: 'medium',
    entityType: 'exception', entityId: payload.entityId as string || '', source: 'exception.approved',
  });
}

async function handleTrainingOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'training_overdue', title: `Training assignment overdue`,
    body: `A training assignment is overdue. Follow up with assigned personnel.`,
    priority: 'high',
    entityType: 'training_assignment', entityId: payload.entityId as string || '', source: 'training.assignment_overdue',
  });
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'risk_appetite_breach', title: `Risk exceeded appetite: ${payload.riskName || payload.entityId}`,
    body: `Risk score ${payload.riskScore} exceeds appetite max ${payload.maxScore}. Immediate executive attention required.`,
    priority: 'critical', entityType: 'risk', entityId: payload.entityId as string || '', source: 'risk.exceeded_appetite',
  });
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'incident_sla_breach', title: `Incident SLA breached (${payload.breachedCount || 1} incidents)`,
    body: `Incident response SLA has been breached. Escalation required.`,
    priority: 'critical', entityType: 'incident', entityId: payload.entityId as string || '', source: 'incident.sla_breached',
  });
}

async function handlePrivacyImpactHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'privacy_alert', title: `High privacy impact: ${payload.processingActivity}`,
    body: `Processing activity "${payload.processingActivity}" has ${payload.impactLevel} impact without DPIA. DPO action required.`,
    priority: 'high', entityType: 'privacy', entityId: payload.entityId as string || '', source: 'privacy.impact_high',
  });
}

async function handleRaciGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const missing = (payload.missingRoles as string[])?.join(', ') || 'unknown';
  await insertNotification(tenantId, {
    type: 'raci_gap', title: `RACI gap: missing ${missing}`,
    body: `Entity ${payload.entityType}/${payload.entityId} missing RACI roles. Assign ownership immediately.`,
    priority: missing.includes('responsible') ? 'critical' : 'high',
    entityType: payload.entityType as string || 'grc_entity', entityId: payload.entityId as string || '', source: 'raci.gap_detected',
  });
}

async function handleRaciRenewalDue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'raci_renewal', title: `RACI assignment expiring: ${payload.raciRole} role`,
    body: `RACI assignment for ${payload.raciRole} role expires ${payload.expiresAt}. Renew or reassign.`,
    priority: 'high', entityType: payload.entityType as string || 'raci', entityId: payload.entityId as string || '', source: 'raci.renewal_due',
  });
}

async function handleVendorContractExpiring(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'vendor_contract', title: `Vendor contract expiring: ${payload.vendorName}`,
    body: `Contract for "${payload.vendorName}" (${payload.riskTier} tier) expires ${payload.expiryDate}. Initiate renewal.`,
    priority: (payload.riskTier as string) === 'critical' ? 'critical' : 'high',
    entityType: 'vendor', entityId: payload.entityId as string || '', source: 'vendor.contract_expiring',
  });
}

async function handleBcpPlanStale(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'bcp_alert', title: `BCP plan stale: ${payload.title}`,
    body: `BCP plan "${payload.title}" not reviewed in 180+ days. Schedule review.`,
    priority: 'high', entityType: 'bcp_plan', entityId: payload.entityId as string || '', source: 'bcp.plan_stale',
  });
}

async function handleTrainingComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'training_gap', title: `${payload.overdueCount} training assignments overdue`,
    body: `Training compliance gap detected. Follow up with assigned personnel.`,
    priority: (payload.overdueCount as number) > 10 ? 'critical' : 'high',
    entityType: 'training', entityId: payload.entityId as string || '', source: 'training.compliance_gap',
  });
}

async function handleEvidenceCoverageLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'evidence_gap', title: `No evidence attached to control: ${payload.controlName}`,
    body: `Control "${payload.controlName}" has no evidence. Upload evidence to maintain compliance.`,
    priority: 'high', entityType: 'control', entityId: payload.entityId as string || '', source: 'evidence.coverage_low',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'control_alert', title: `${payload.failingControls} controls failing effectiveness checks`,
    body: `Control effectiveness is below standards. Review and remediate failing controls.`,
    priority: 'high', entityType: 'control', entityId: payload.entityId as string || '', source: 'control.effectiveness_low',
  });
}

async function handleBcpExerciseOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'bcp_exercise', title: `BCP exercise overdue: ${payload.title}`,
    body: `BCP exercise "${payload.title}" was scheduled for ${payload.scheduledDate}. Reschedule immediately.`,
    priority: 'high', entityType: 'bcp_exercise', entityId: payload.entityId as string || '', source: 'bcp.exercise_overdue',
  });
}

// ── Bootstrap Event Handlers ────────────────────────────────────

async function handleBootstrapSessionBlocked(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  const state = payload.data?.state as string || payload.state as string || 'unknown';

  const reason = payload.data?.reason as string || 'Session blocked';
  await insertNotification(tenantId, {
    type: 'bootstrap_alert', title: `User session blocked: ${state}`,
    body: `A user session has been blocked in state "${state}". Reason: ${reason}. Admin investigation may be required.`,
    priority: state === 'TENANT_SUSPENDED' ? 'critical' : 'high',
    entityType: 'session', entityId: payload.entityId as string || '', source: 'bootstrap.session_blocked',
  });
}

async function handleBootstrapFirstRunStarted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload: _payload } = event;
  if (!tenantId || !_payload) return;
  await insertNotification(tenantId, {
    type: 'bootstrap_info', title: `First-run setup started`,
    body: `Tenant first-run checklist has been initiated. Complete all required items to activate the workspace.`,
    priority: 'medium',
    entityType: 'checklist', entityId: tenantId, source: 'bootstrap.first_run_started',
  });
}

async function handleBootstrapFirstRunCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload: _payload } = event;
  if (!tenantId || !_payload) return;
  await insertNotification(tenantId, {
    type: 'bootstrap_success', title: `First-run setup completed`,
    body: `All required first-run checklist items have been completed. The workspace is now fully operational.`,
    priority: 'medium',
    entityType: 'checklist', entityId: tenantId, source: 'bootstrap.first_run_completed',
  });
}

async function handleBootstrapStaleSession(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await insertNotification(tenantId, {
    type: 'bootstrap_warning', title: `Stale bootstrap session detected`,
    body: `A stale onboarding/bootstrap session has been detected. Review and clean up or resume.`,
    priority: 'high',
    entityType: 'session', entityId: payload.entityId as string || '', source: 'bootstrap.stale_session_detected',
  });
}

async function handleControlDeficiency(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string || '';
  const severity = payload.severity as string || 'medium';

  await insertNotification(tenantId, {
    type: 'control_deficiency', title: `Control deficiency detected`,
    body: `A control deficiency (${severity}) has been detected. Review control ${controlId} and assign remediation.`,
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'control', entityId: controlId, source: 'controls.deficiency_detected',
  });
}

async function handleGovernanceHealthScore(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const score = payload.score as number ?? payload.healthScore as number ?? 0;

  if (score < 60) {
    await insertNotification(tenantId, {
      type: 'governance_health_alert', title: `Governance health score degraded to ${score}`,
      body: `Governance health score has dropped below 60. Board-level review may be required.`,
      priority: 'high',
      entityType: 'governance_health', entityId: payload.entityId as string || '', source: 'governance.health_score_updated',
    });
  }
}

async function handleComplianceFrameworkGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const frameworkName = payload.frameworkName as string || 'Unknown';
  const coverage = payload.coverage as number ?? 0;

  await insertNotification(tenantId, {
    type: 'framework_gap', title: `Framework coverage gap: ${frameworkName} at ${coverage}%`,
    body: `Framework "${frameworkName}" has only ${coverage}% control coverage. Assign controls to close the gap.`,
    priority: coverage < 50 ? 'critical' : 'high',
    entityType: 'framework', entityId: payload.entityId as string || '', source: 'compliance.framework_gap_identified',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[notification] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[notification] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('risk.kri_threshold_breached', wrapHandler('handleKriBreached', handleKriBreached));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGap', handleComplianceGap));
handlers.set('compliance.posture_changed', wrapHandler('handlePostureChanged', handlePostureChanged));
handlers.set('evidence.expired', wrapHandler('handleEvidenceExpired', handleEvidenceExpired));
handlers.set('incident.classified', wrapHandler('handleIncidentCreated', handleIncidentCreated));
handlers.set('workflow.sla_warning', wrapHandler('handleSlaWarning', handleSlaWarning));
handlers.set('workflow.sla_breached', wrapHandler('handleSlaBreach', handleSlaBreach));
handlers.set('workflow.task_assigned', wrapHandler('handleTaskAssigned', handleTaskAssigned));
handlers.set('workflow.approval_requested', wrapHandler('handleApprovalRequested', handleApprovalRequested));
handlers.set('audit.finding_created', wrapHandler('handleAuditFinding', handleAuditFinding));
handlers.set('vendor.sla_breached', wrapHandler('handleVendorSlaBreach', handleVendorSlaBreach));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('exception.approved', wrapHandler('handleExceptionApproved', handleExceptionApproved));
handlers.set('training.assignment_overdue', wrapHandler('handleTrainingOverdue', handleTrainingOverdue));
handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('privacy.impact_high', wrapHandler('handlePrivacyImpactHigh', handlePrivacyImpactHigh));
handlers.set('raci.gap_detected', wrapHandler('handleRaciGapDetected', handleRaciGapDetected));
handlers.set('raci.renewal_due', wrapHandler('handleRaciRenewalDue', handleRaciRenewalDue));
handlers.set('vendor.contract_expiring', wrapHandler('handleVendorContractExpiring', handleVendorContractExpiring));
handlers.set('bcp.plan_stale', wrapHandler('handleBcpPlanStale', handleBcpPlanStale));
handlers.set('training.compliance_gap', wrapHandler('handleTrainingComplianceGap', handleTrainingComplianceGap));
handlers.set('evidence.coverage_low', wrapHandler('handleEvidenceCoverageLow', handleEvidenceCoverageLow));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('bcp.exercise_overdue', wrapHandler('handleBcpExerciseOverdue', handleBcpExerciseOverdue));
handlers.set('bootstrap.session_blocked', wrapHandler('handleBootstrapSessionBlocked', handleBootstrapSessionBlocked));
handlers.set('bootstrap.first_run_started', wrapHandler('handleBootstrapFirstRunStarted', handleBootstrapFirstRunStarted));
handlers.set('bootstrap.first_run_completed', wrapHandler('handleBootstrapFirstRunCompleted', handleBootstrapFirstRunCompleted));
handlers.set('bootstrap.stale_session_detected', wrapHandler('handleBootstrapStaleSession', handleBootstrapStaleSession));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiency', handleControlDeficiency));
handlers.set('governance.health_score_updated', wrapHandler('handleGovernanceHealthScore', handleGovernanceHealthScore));
handlers.set('compliance.framework_gap_identified', wrapHandler('handleComplianceFrameworkGap', handleComplianceFrameworkGap));

// ── Widget events ─────────────────────────────────────────────────────────

async function handleWidgetSuspended(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const toStatus = payload.toStatus as string || '';
  if (toStatus !== 'suspended') return;
  const widgetKey = payload.widgetKey as string || event.entityId as string || 'unknown';
  await insertNotification(tenantId, {
    type: 'widget_suspended', title: `Widget suspended: ${widgetKey}`,
    body: `Widget "${widgetKey}" has been suspended. Dashboard users may experience missing data. Review and restore if appropriate.`,
    priority: 'high',
    entityType: 'widget', entityId: event.entityId as string || '', source: 'widgets.status.changed',
  });
}

async function handleWidgetErrorSurge(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const widgetKey = payload.widgetKey as string || 'unknown';
  await insertNotification(tenantId, {
    type: 'widget_error', title: `Widget error surge: ${widgetKey}`,
    body: `Widget "${widgetKey}" is experiencing elevated error rates. Investigate data source connectivity.`,
    priority: 'high',
    entityType: 'widget', entityId: event.entityId as string || '', source: 'widgets.data.refreshed',
  });
}

handlers.set('widgets.status.changed', wrapHandler('handleWidgetSuspended', handleWidgetSuspended));
handlers.set('widgets.data.refreshed', wrapHandler('handleWidgetErrorSurge', handleWidgetErrorSurge));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${NOTIFICATION_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerNotificationEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `notification:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[notification] registered ${handlers.size} domain event subscribers`);
}

// ── Cross-module: inbox, packs, integrations notifications ──

function handleInboxBroadcast(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Notification] inbox broadcast delivery', { tenantId: event.tenantId });
}

function handlePackInstallResult(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Notification] pack install result', { tenantId: event.tenantId });
}

function handleIntegrationSyncFailure(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Notification] integration sync event', { tenantId: event.tenantId });
}

try {
  eventBus.subscribe('inbox.broadcast.create' as any, 'notification:inbox.broadcast', (handleInboxBroadcast as any));
  eventBus.subscribe('packs.auto_update' as any, 'notification:packs.update', (handlePackInstallResult as any));
  eventBus.subscribe('integrations.webhooks' as any, 'notification:integrations.webhook', (handleIntegrationSyncFailure as any));
} catch { /* pass */ }
