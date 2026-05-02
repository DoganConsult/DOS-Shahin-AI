import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { ANALYTICS_EVENT_CONTRACT } from './analytics.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { insertAuditEvent } from '../services/misc/clickhouse-analytics.service';
import { isClickHouseEnabled } from '../../../../config/clickhouse-client';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function upsertMetric(schema: string, metricType: string, dimension: string, value: number, source: string): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".analytics_metrics (metric_id, metric_type, dimension, value, source, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
     ON CONFLICT DO NOTHING`,
    [metricType, dimension, value, source],
  );
}

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const newScore = payload.newScore as number || payload.score as number;
  await upsertMetric(schema, 'risk_score', payload.entityId as string || 'unknown', newScore ?? 0, 'risk.score_changed');
}

async function handlePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const posture = payload.newPosture as string;
  const postureScore = posture === 'compliant' ? 100 : posture === 'at_risk' ? 50 : posture === 'non_compliant' ? 0 : 75;
  await upsertMetric(schema, 'compliance_posture', payload.frameworkCode as string || 'general', postureScore, 'compliance.posture_changed');
}

async function handleEvidenceCollected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'evidence_collection', payload.controlId as string || 'general', 1, 'evidence.collected');
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const severity = payload.severity as string || 'medium';
  const severityScore = severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
  await upsertMetric(schema, 'incident_severity', payload.entityId as string || 'unknown', severityScore, 'incident.classified');
}

async function handleAuditFinding(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const severity = payload.severity as string || 'medium';
  const severityScore = severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
  await upsertMetric(schema, 'audit_finding', payload.entityId as string || 'unknown', severityScore, 'audit.finding_created');
}

async function handleWorkflowCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const durationMs = payload.durationMs as number || 0;
  await upsertMetric(schema, 'workflow_duration', payload.entityId as string || 'unknown', durationMs, 'workflow.instance_completed');
}

async function handleVendorSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'vendor_sla_breach', payload.entityId as string || 'unknown', 1, 'vendor.sla_breached');
}

async function handleTrainingOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'training_overdue', payload.entityId as string || 'unknown', 1, 'training.assignment_overdue');
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'risk_appetite_breach', payload.entityId as string || 'unknown', payload.riskScore as number || 0, 'risk.exceeded_appetite');
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'control_effectiveness_low', 'aggregate', payload.failingControls as number || 0, 'control.effectiveness_low');
}

async function handleBcpRtoRpoDrift(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const driftPct = payload.targetRto ? Math.round(((payload.actualRto as number) / (payload.targetRto as number) - 1) * 100) : 0;
  await upsertMetric(schema, 'bcp_rto_drift', payload.entityId as string || 'unknown', driftPct, 'bcp.rto_rpo_drift');
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'incident_sla_breach', payload.entityId as string || 'unknown', payload.breachedCount as number || 1, 'incident.sla_breached');
}

async function handleTrainingComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'training_compliance_gap', 'aggregate', payload.overdueCount as number || 0, 'training.compliance_gap');
}

// ── Additional Cross-Module Event Handlers (MP-12 SS2.4) ────────

async function handleRiskAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'risk_assessment_completed', payload.entityId as string || 'unknown', 1, 'risk.assessment_completed');
}

async function handleComplianceAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const score = payload.score as number || payload.assessmentScore as number || 0;
  await upsertMetric(schema, 'compliance_assessment_score', payload.entityId as string || 'unknown', score, 'compliance.assessment_completed');
}

async function handleIncidentCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'incident_count', payload.entityId as string || 'unknown', 1, 'incident.created');
}

async function handleAuditStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const status = payload.newStatus as string || payload.status as string || 'unknown';
  const statusScore = status === 'completed' ? 100 : status === 'in_progress' ? 50 : status === 'failed' ? 0 : 25;
  await upsertMetric(schema, 'audit_status', payload.entityId as string || 'unknown', statusScore, 'audit.status_changed');
}

async function handleVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskScore = payload.riskScore as number || payload.newRiskScore as number || 0;
  await upsertMetric(schema, 'vendor_risk_score', payload.entityId as string || 'unknown', riskScore, 'vendor.risk_changed');
}

async function handleVendorOnboarded(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'vendor_onboarded', payload.entityId as string || 'unknown', 1, 'vendor.onboarded');
}

async function handlePolicyStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const status = payload.newStatus as string || 'unknown';
  const statusScore = status === 'approved' ? 100 : status === 'draft' ? 25 : status === 'in_review' ? 50 : status === 'expired' ? 0 : 50;
  await upsertMetric(schema, 'policy_status', payload.entityId as string || 'unknown', statusScore, 'policy.status_changed');
}

async function handleRemediationTaskCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const daysToResolve = payload.daysToResolve as number || 0;
  await upsertMetric(schema, 'remediation_completion', payload.entityId as string || 'unknown', daysToResolve, 'remediation.task_completed');
}

// ── Bootstrap Event Handlers ────────────────────────────────────

async function handleBootstrapSessionResolved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);

  const payloadRecord = payload as Record<string, unknown> & { data?: Record<string, unknown> };
  const nestedState = payloadRecord.data?.state;
  const directState = payloadRecord.state;
  const state = typeof nestedState === 'string' ? nestedState : typeof directState === 'string' ? directState : 'unknown';
  const stateScore = state === 'READY' ? 100 : state === 'WORKSPACE_READY_FIRST_RUN' ? 80 : 0;
  await upsertMetric(schema, 'bootstrap_session_state', payload.entityId as string || 'unknown', stateScore, 'bootstrap.session_resolved');
}

async function handleBootstrapContextLoaded(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'bootstrap_context_loaded', payload.entityId as string || 'unknown', 1, 'bootstrap.context_loaded');
}

async function handleBootstrapFirstRunCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'bootstrap_first_run_completed', tenantId, 1, 'bootstrap.first_run_completed');
}

async function handleBootstrapResolutionSlow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);

  const payloadRecord = payload as Record<string, unknown> & { data?: Record<string, unknown> };
  const nestedDuration = payloadRecord.data?.durationMs;
  const directDuration = payloadRecord.durationMs;
  const durationMs = typeof nestedDuration === 'number' ? nestedDuration : typeof directDuration === 'number' ? directDuration : 0;
  await upsertMetric(schema, 'bootstrap_sla_violation', payload.entityId as string || 'unknown', durationMs, 'bootstrap.resolution_slow');
}

async function handleComplianceFrameworkGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const frameworkName = payload.frameworkName as string || 'unknown';
  const coverage = payload.coverage as number ?? 0;

  await safeQuery(
    `INSERT INTO "${schema}".analytics_metrics (metric_type, module, entity_type, entity_id, value, metadata, recorded_at)
     VALUES ('framework_coverage_gap', 'compliance', 'framework', $1, $2, $3::jsonb, NOW())`,
    [payload.entityId as string || '', coverage, JSON.stringify({ frameworkName, coverage })],
  );
}

async function handleControlDeficiency(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".analytics_metrics (metric_type, module, entity_type, entity_id, value, metadata, recorded_at)
     VALUES ('control_deficiency', 'controls', 'control', $1, 1, $2::jsonb, NOW())`,
    [payload.entityId as string || '', JSON.stringify({ severity: payload.severity || 'medium' })],
  );
}

async function handleGovernanceHealthScore(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const score = payload.score as number ?? payload.healthScore as number ?? 0;

  await safeQuery(
    `INSERT INTO "${schema}".analytics_metrics (metric_type, module, entity_type, entity_id, value, metadata, recorded_at)
     VALUES ('governance_health_score', 'governance', 'health_score', $1, $2, $3::jsonb, NOW())`,
    [payload.entityId as string || '', score, JSON.stringify({ score, trend: payload.trend || 'stable' })],
  );
}

async function handleBcpMaturityRegression(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const currentScore = payload.currentScore as number ?? 0;
  const previousScore = payload.previousScore as number ?? 0;

  await safeQuery(
    `INSERT INTO "${schema}".analytics_metrics (metric_type, module, entity_type, entity_id, value, metadata, recorded_at)
     VALUES ('bcp_maturity_regression', 'bcp', 'maturity', $1, $2, $3::jsonb, NOW())`,
    [payload.entityId as string || '', currentScore, JSON.stringify({ previousScore, currentScore, drop: previousScore - currentScore })],
  );
}

/**
 * Emit every handled domain event to ClickHouse audit_events table.
 * Uses the batch buffer (5s / 500-row flush) — fire-and-forget, non-blocking.
 */
function emitToClickHouse(event: PlatformEvent, action: string): void {
  if (!isClickHouseEnabled()) return;
  try {
    insertAuditEvent({
      event_id: (event as any).eventId || crypto.randomUUID(),
      tenant_id: event.tenantId || '',
      timestamp: new Date().toISOString(),
      user_id: (event as any).userId || '',
      module: (event as any).source || '',
      action,
      entity_type: (event.payload?.entityType as string) || '',
      entity_id: (event.payload?.entityId as string) || (event as any).entityId || '',
      metadata: JSON.stringify(event.payload || {}),
    });
  } catch (err) {
    logger.warn(`[analytics] ClickHouse emit failed for ${action}: ${(err as Error).message}`);
  }
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      emitToClickHouse(event, name);
      logger.info(`[analytics] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[analytics] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('compliance.posture_changed', wrapHandler('handlePostureChanged', handlePostureChanged));
handlers.set('evidence.collected', wrapHandler('handleEvidenceCollected', handleEvidenceCollected));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('audit.finding_created', wrapHandler('handleAuditFinding', handleAuditFinding));
handlers.set('workflow.instance_completed', wrapHandler('handleWorkflowCompleted', handleWorkflowCompleted));
handlers.set('vendor.sla_breached', wrapHandler('handleVendorSlaBreach', handleVendorSlaBreach));
handlers.set('training.assignment_overdue', wrapHandler('handleTrainingOverdue', handleTrainingOverdue));
handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('risk.assessment_completed', wrapHandler('handleRiskAssessmentCompleted', handleRiskAssessmentCompleted));
handlers.set('compliance.assessment_completed', wrapHandler('handleComplianceAssessmentCompleted', handleComplianceAssessmentCompleted));
handlers.set('incident.created', wrapHandler('handleIncidentCreated', handleIncidentCreated));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('audit.status_changed', wrapHandler('handleAuditStatusChanged', handleAuditStatusChanged));
handlers.set('vendor.risk_changed', wrapHandler('handleVendorRiskChanged', handleVendorRiskChanged));
handlers.set('vendor.onboarded', wrapHandler('handleVendorOnboarded', handleVendorOnboarded));
handlers.set('policy.status_changed', wrapHandler('handlePolicyStatusChanged', handlePolicyStatusChanged));
handlers.set('remediation.task_completed', wrapHandler('handleRemediationTaskCompleted', handleRemediationTaskCompleted));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('bcp.rto_rpo_drift', wrapHandler('handleBcpRtoRpoDrift', handleBcpRtoRpoDrift));
handlers.set('training.compliance_gap', wrapHandler('handleTrainingComplianceGap', handleTrainingComplianceGap));
handlers.set('bootstrap.session_resolved', wrapHandler('handleBootstrapSessionResolved', handleBootstrapSessionResolved));
handlers.set('bootstrap.context_loaded', wrapHandler('handleBootstrapContextLoaded', handleBootstrapContextLoaded));
handlers.set('bootstrap.first_run_completed', wrapHandler('handleBootstrapFirstRunCompleted', handleBootstrapFirstRunCompleted));
handlers.set('bootstrap.resolution_slow', wrapHandler('handleBootstrapResolutionSlow', handleBootstrapResolutionSlow));

// ── Team events ──────────────────────────────────────────────────────────

async function handleTeamCreated(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await upsertMetric(tenantSchema(tenantId), 'team_created', event.entityId as string || 'unknown', 1, 'team.created');
}

async function handleTeamMemberAdded(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await upsertMetric(tenantSchema(tenantId), 'team_member_added', event.entityId as string || 'unknown', 1, 'team.member_added');
}

async function handleTeamArchived(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await upsertMetric(tenantSchema(tenantId), 'team_archived', event.entityId as string || 'unknown', 1, 'team.archived');
}

handlers.set('team.created', wrapHandler('handleTeamCreated', handleTeamCreated));
handlers.set('team.member_added', wrapHandler('handleTeamMemberAdded', handleTeamMemberAdded));
handlers.set('team.archived', wrapHandler('handleTeamArchived', handleTeamArchived));

// ── Journey events ───────────────────────────────────────────────────────

async function handleJourneyMilestoneAchieved(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await upsertMetric(tenantSchema(tenantId), 'journey_milestone_achieved', event.entityId as string || 'unknown', 1, 'journey.milestone_achieved');
}

async function handleJourneyMaturityChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const maturity = payload.newLevel as number || payload.overallMaturity as number || 0;
  await upsertMetric(tenantSchema(tenantId), 'journey_maturity_level', event.entityId as string || 'unknown', maturity, 'journey.maturity_level_changed');
}

async function handleJourneyRoadmapCreated(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await upsertMetric(tenantSchema(tenantId), 'journey_roadmap_created', event.entityId as string || 'unknown', 1, 'journey.roadmap_created');
}

handlers.set('journey.milestone_achieved', wrapHandler('handleJourneyMilestoneAchieved', handleJourneyMilestoneAchieved));
handlers.set('journey.maturity_level_changed', wrapHandler('handleJourneyMaturityChanged', handleJourneyMaturityChanged));
handlers.set('journey.roadmap_created', wrapHandler('handleJourneyRoadmapCreated', handleJourneyRoadmapCreated));
handlers.set('compliance.framework_gap_identified', wrapHandler('handleComplianceFrameworkGap', handleComplianceFrameworkGap));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiency', handleControlDeficiency));
handlers.set('governance.health_score_updated', wrapHandler('handleGovernanceHealthScore', handleGovernanceHealthScore));
handlers.set('bcp.maturity_regression', wrapHandler('handleBcpMaturityRegression', handleBcpMaturityRegression));

// ── Widget events ─────────────────────────────────────────────────────────

async function handleWidgetStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const toStatus = payload.toStatus as string || payload.status as string || 'unknown';
  const statusScore = toStatus === 'published' ? 1 : toStatus === 'suspended' ? -1 : 0;
  await upsertMetric(schema, 'widget_status_transition', event.entityId as string || 'unknown', statusScore, 'widgets.status.changed');
}

async function handleWidgetDataRefreshed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'widget_data_refresh', payload.sourceModule as string || 'unknown', 1, 'widgets.data.refreshed');
}

async function handleWidgetAIUsage(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const totalTokens = ((payload.inputTokens as number) || 0) + ((payload.outputTokens as number) || 0);
  await upsertMetric(schema, 'widget_ai_tokens', payload.operation as string || 'unknown', totalTokens, 'widgets.ai.usage');
}

handlers.set('widgets.status.changed', wrapHandler('handleWidgetStatusChanged', handleWidgetStatusChanged));
handlers.set('widgets.data.refreshed', wrapHandler('handleWidgetDataRefreshed', handleWidgetDataRefreshed));
handlers.set('widgets.ai.usage', wrapHandler('handleWidgetAIUsage', handleWidgetAIUsage));

// ── Navigation events → Analytics (bidirectional) ─────────────────

handlers.set('navigation.menu.refreshed', wrapHandler('handleNavMenuRefreshed', async (event: PlatformEvent) => {
  const { tenantId } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'navigation_refresh', 'menu', 1, 'navigation.menu.refreshed');
}));

handlers.set('navigation.registry.published', wrapHandler('handleNavRegistryPublished', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'navigation_publish', payload?.navKey as string ?? 'unknown', 1, 'navigation.registry.published');
}));

handlers.set('navigation.seed.completed', wrapHandler('handleNavSeedCompleted', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const inserted = payload?.inserted as number ?? 0;
  await upsertMetric(schema, 'navigation_seed', payload?.productKey as string ?? 'shahin-ai', inserted, 'navigation.seed.completed');
}));

// Module activation/deactivation → analytics tracking
handlers.set('module.enabled', wrapHandler('handleModuleEnabled', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'module_activation', payload?.moduleCode as string ?? 'unknown', 1, 'module.enabled');
}));

handlers.set('module.disabled', wrapHandler('handleModuleDisabled', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await upsertMetric(schema, 'module_deactivation', payload?.moduleCode as string ?? 'unknown', 1, 'module.disabled');
}));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${ANALYTICS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerAnalyticsEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `analytics:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[analytics] registered ${handlers.size} domain event subscribers`);
}

// ── Cross-module: consume-only module events for analytics ──────

function handleGovernanceOsMaturityChange(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Analytics] governance-os maturity change detected', { tenantId: event.tenantId });
}

function handleQiyasAssessmentCompleted(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Analytics] qiyas assessment completed', { tenantId: event.tenantId });
}

function handleKsaRegulatoryChange(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Analytics] ksa-regulatory change detected', { tenantId: event.tenantId });
}

function handleLocalKnowledgeIngested(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Analytics] local-knowledge document ingested', { tenantId: event.tenantId });
}

function handleRecordsRetentionEvent(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Analytics] records retention event', { tenantId: event.tenantId });
}

function handlePortalsActivity(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Analytics] portals activity detected', { tenantId: event.tenantId });
}

// Register consume-only module subscriptions
try {
  eventBus.subscribe('governance-os.framework.activated' as any, 'analytics:governance-os.framework.activated', (handleGovernanceOsMaturityChange as any));
  eventBus.subscribe('qiyas.assessment_completed' as any, 'analytics:qiyas.assessment_completed', (handleQiyasAssessmentCompleted as any));
  eventBus.subscribe('ksa_regulatory.framework_updated_processed' as any, 'analytics:ksa_regulatory.framework_updated', (handleKsaRegulatoryChange as any));
  eventBus.subscribe('local_knowledge.document_ingested_processed' as any, 'analytics:local_knowledge.ingested', (handleLocalKnowledgeIngested as any));
  eventBus.subscribe('records.hold.place' as any, 'analytics:records.hold.place', (handleRecordsRetentionEvent as any));
  eventBus.subscribe('portals.portal.create' as any, 'analytics:portals.created', (handlePortalsActivity as any));
} catch { /* event types may not be registered */ }
