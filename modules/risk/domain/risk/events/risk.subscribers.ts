import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit } from '../../../infrastructure/adapters/audit.adapter';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { RISK_EVENT_CONTRACT } from './risk.events';
import { swallow, EC } from '@dos/platform-core/resilience';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const gapId = payload.entityId as string || payload.gapId as string;
  const severity = payload.severity as string || 'medium';

  await safeQuery(
    `INSERT INTO "${schema}".risk_compliance_links (gap_id, source_module, severity, status, created_at)
     VALUES ($1, 'compliance', $2, 'pending_review', NOW())
     ON CONFLICT DO NOTHING`,
    [gapId, severity],
  );

  await createProcessTask(tenantId, {
    title: `Risk Review: Compliance gap detected (${severity})`,
    description: `A compliance gap has been detected. Review risk implications and update risk register if needed.`,
    taskType: 'risk_assessment',
    priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });

  swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: SYSTEM_JOB_ACTOR, module: 'risk', action: 'create',
    entityType: 'risk_compliance_link', entityId: gapId,
  }));
}

async function handleVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const vendorId = payload.entityId as string || payload.vendorId as string;
  const riskRating = payload.riskRating as string || payload.newState as string;
  const riskScore = payload.riskScore as number ?? 0;

  try {
    // TODO: Re-enable when cross-module-state-propagator.service is available
    // const { propagateVendorRiskToRegister } = await import('../../platform/services/cross/cross-module-state-propagator.service.js');
    // await propagateVendorRiskToRegister(tenantId, vendorId, riskRating, riskScore);
  } catch { /* propagator non-fatal */ }

  const linkedRisks = await safeQuery(
    `SELECT risk_id FROM "${schema}".risk_vendor_links WHERE vendor_id = $1`,
    [vendorId],
  );

  for (const row of linkedRisks.rows) {
    await createProcessTask(tenantId, {
      title: `Reassess risk: Vendor risk level changed to ${riskRating}`,
      description: `Vendor risk rating has changed. Reassess linked risk and update treatment plan.`,
      taskType: 'risk_assessment',
      priority: riskRating === 'critical' ? 'critical' : 'high',
      entityType: 'risk',
      entityId: row.risk_id as string,
      triggerSource: 'vendor.risk_changed',
    });
  }
}

async function handleAssetClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const assetId = payload.entityId as string || payload.assetId as string;
  const criticality = payload.criticality as string || payload.classification as string;

  if (criticality === 'critical' || criticality === 'high') {
    const linkedRisks = await safeQuery(
      `SELECT risk_id FROM "${schema}".risk_asset_links WHERE asset_id = $1`,
      [assetId],
    );

    for (const row of linkedRisks.rows) {
      await createProcessTask(tenantId, {
        title: `Risk review: High-criticality asset classified`,
        description: `Asset classified as ${criticality}. Review linked risk assessment.`,
        taskType: 'risk_assessment',
        priority: 'high',
        entityType: 'risk',
        entityId: row.risk_id as string,
        triggerSource: 'asset.classified',
      });
    }
  }
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const incidentId = payload.entityId as string || payload.incidentId as string;
  const severity = payload.severity as string || 'medium';

  await safeQuery(
    `INSERT INTO "${schema}".risk_compliance_links (gap_id, source_module, severity, status, created_at)
     VALUES ($1, 'incident', $2, 'pending_review', NOW())
     ON CONFLICT DO NOTHING`,
    [incidentId, severity],
  );

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Risk assessment: Incident classified as ${severity}`,
      description: `Incident has been classified. Assess impact on risk register and update risk scores.`,
      taskType: 'risk_assessment',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.classified',
    });
  }
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const findingId = payload.entityId as string || payload.findingId as string;
  const severity = payload.severity as string || 'medium';
  const controlId = payload.controlId as string ?? null;

  try {
    // TODO: Re-enable when cross-module-state-propagator.service is available
    // const { propagateAuditFindingToRiskAndControl } = await import('../../platform/services/cross/cross-module-state-propagator.service.js');
    // await propagateAuditFindingToRiskAndControl(tenantId, findingId, controlId, severity);
  } catch { /* propagator non-fatal */ }

  await createProcessTask(tenantId, {
    title: `Risk review: Audit finding raised`,
    description: `An audit finding has been raised. Evaluate whether new risks should be registered or existing risks re-scored.`,
    taskType: 'risk_assessment',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const _schema = tenantSchema(tenantId);
  const failingCount = payload.failingControls as number || 0;
  if (failingCount > 0) {
    await createProcessTask(tenantId, {
      title: `Risk re-score: ${failingCount} controls failing effectiveness`,
      description: `Failing controls increase residual risk. Re-score linked risks.`,
      taskType: 'risk_assessment', priority: 'high',
      entityType: 'control', entityId: payload.entityId as string || '',
      triggerSource: 'control.effectiveness_low',
    });
  }
}

async function handleEvidenceCoverageLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Risk review: Control "${payload.controlName}" lacks evidence`,
    description: `Control without evidence cannot mitigate risk. Flag linked risks for re-assessment.`,
    taskType: 'risk_assessment', priority: 'medium',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'evidence.coverage_low',
  });
}

async function handleBcpRtoRpoDrift(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Risk update: BCP RTO/RPO drift — ${payload.strategy}`,
    description: `Actual RTO(${payload.actualRto}h) exceeds target(${payload.targetRto}h). Adjust continuity risk scores.`,
    taskType: 'risk_assessment', priority: 'critical',
    entityType: 'bcp_exercise', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.rto_rpo_drift',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('risk') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".risk_status_history
     SET ended_at = NOW()
     WHERE entity_id = $1 AND ended_at IS NULL`,
    [entityId],
  );

  await safeQuery(
    `INSERT INTO "${schema}".risk_status_history (entity_id, status, started_at)
     VALUES ($1, $2, NOW())`,
    [entityId, newStatus],
  );
}

// -- foundation.position.holder.unassigned (F-002) ---------------------------
//
// When a Foundation position holder is unassigned, every risk owned by that
// user must be reassigned: clear owner_user_id and create a reassignment task
// per orphaned risk. Idempotent — repeat invocation finds no rows to update.
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".risks
     SET owner_user_id = NULL, updated_at = NOW()
     WHERE owner_user_id = $1
     RETURNING risk_id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign risk owner (Foundation position vacated)`,
      description: `Previous owner was removed from their Foundation position. Pick a new owner.`,
      taskType: 'risk_reassignment',
      priority: 'high',
      entityType: 'risk',
      entityId: row.risk_id as string,
      triggerSource: 'foundation.position.holder.unassigned',
    });
    swallow(EC.EVENT_BUS, recordAudit({
      tenantId, userId: SYSTEM_JOB_ACTOR, module: 'risk', action: 'update',
      entityType: 'risk', entityId: row.risk_id as string,
    }));
  }
}


// -- foundation.scope_changed (Phase 3) -------------------------------------
//
// When a Foundation org/department/business-unit moves under a new parent,
// risk applicability for records linked to that org node must be
// recomputed. We emit one recompute task per event; idempotency on
// (triggerSource, entityId) is enforced by the task store.
async function handleFoundationScopeChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!entityId) return;
  const entityType = (payload.entityType as string | undefined) ?? 'org_unit';

  await createProcessTask(tenantId, {
    title: `Recompute risk applicability — Foundation scope changed`,
    description: `recompute risk applicability for ${entityType} ${entityId} after parent change.`,
    taskType: 'risk_applicability_recompute',
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
      logger.info(`[risk] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[risk] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('vendor.risk_changed', wrapHandler('handleVendorRiskChanged', handleVendorRiskChanged));
handlers.set('asset.classified', wrapHandler('handleAssetClassified', handleAssetClassified));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('evidence.coverage_low', wrapHandler('handleEvidenceCoverageLow', handleEvidenceCoverageLow));
handlers.set('bcp.rto_rpo_drift', wrapHandler('handleBcpRtoRpoDrift', handleBcpRtoRpoDrift));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${RISK_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerRiskEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `risk:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[risk] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('risk');
}

handlers.set('foundation.scope_changed', wrapHandler('handleFoundationScopeChanged', handleFoundationScopeChanged));
