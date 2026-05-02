import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit as _recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { ASSET_EVENT_CONTRACT } from './asset.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string || payload.riskId as string;
  const newScore = payload.newScore as number || payload.score as number;

  const linkedAssets = await safeQuery(
    `SELECT asset_id FROM "${schema}".risk_asset_links WHERE risk_id = $1`,
    [riskId],
  );

  for (const row of linkedAssets.rows) {
    if ((newScore ?? 0) >= 15) {
      await safeQuery(
        `UPDATE "${schema}".assets SET risk_level = 'critical', updated_at = NOW() WHERE asset_id = $1`,
        [row.asset_id],
      );
      await createProcessTask(tenantId, {
        title: `Asset review: Linked risk score changed to ${newScore}`,
        description: `A linked risk score has changed significantly. Review asset classification and protection measures.`,
        taskType: 'asset_review',
        priority: 'critical',
        entityType: 'asset',
        entityId: row.asset_id as string,
        triggerSource: 'risk.score_changed',
      });
    }
  }
}

async function handleVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const vendorId = payload.entityId as string || payload.vendorId as string;
  const riskRating = payload.riskRating as string || payload.newState as string;

  const linkedAssets = await safeQuery(
    `SELECT asset_id, name FROM "${schema}".assets WHERE vendor_id = $1 OR metadata->>'vendor_id' = $1`,
    [vendorId],
  );

  for (const row of linkedAssets.rows) {
    await createProcessTask(tenantId, {
      title: `Asset review: Vendor risk changed to ${riskRating}`,
      description: `Vendor risk level has changed. Review asset ${row.name || row.asset_id} managed by this vendor.`,
      taskType: 'asset_review',
      priority: riskRating === 'critical' ? 'critical' : 'high',
      entityType: 'asset',
      entityId: row.asset_id as string,
      triggerSource: 'vendor.risk_changed',
    });
  }
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const incidentId = payload.entityId as string || payload.incidentId as string;
  const severity = payload.severity as string || 'medium';
  const affectedAssetId = payload.assetId as string;

  if (affectedAssetId) {
    await safeQuery(
      `UPDATE "${schema}".assets
       SET metadata = jsonb_set(COALESCE(metadata,'{}'), '{last_incident_id}', $1::jsonb),
           updated_at = NOW()
       WHERE asset_id = $2`,
      [JSON.stringify(incidentId), affectedAssetId],
    );
  }

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Asset impact assessment: ${severity} incident classified`,
      description: `A ${severity} incident has been classified. Identify and assess impacted assets.`,
      taskType: 'asset_review',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.classified',
    });
  }
}

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string || payload.gapId as string;
  const controlId = payload.controlId as string;

  await createProcessTask(tenantId, {
    title: `Asset compliance: Gap detected in linked control`,
    description: `A compliance gap has been detected. Review assets linked to control ${controlId || gapId} for exposure.`,
    taskType: 'asset_review',
    priority: 'high',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('asset') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".assets SET status = $1, updated_at = NOW() WHERE asset_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Asset impact: Incident SLA breached`,
    description: `Incident SLA has been breached. Assess impact on linked assets and update asset risk classification.`,
    taskType: 'asset_review',
    priority: 'critical',
    entityType: 'incident',
    entityId: payload.entityId as string || '',
    triggerSource: 'incident.sla_breached',
  });
}

async function handleIncidentBreachReported(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Asset exposure: Data breach reported`,
    description: `A data breach has been reported. Identify exposed assets and update asset classification for affected records.`,
    taskType: 'asset_review',
    priority: 'critical',
    entityType: 'incident',
    entityId: payload.entityId as string || '',
    triggerSource: 'incident.breach_reported',
  });
}

async function handleControlEffectivenessFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Asset protection: Control effectiveness failure`,
    description: `Controls are failing effectiveness. Review assets protected by affected controls and update risk classification.`,
    taskType: 'asset_review',
    priority: 'high',
    entityType: 'control',
    entityId: payload.entityId as string || '',
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleControlDeficiencyDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';
  await createProcessTask(tenantId, {
    title: `Asset protection: Control deficiency detected`,
    description: `A control deficiency has been detected. Review asset protection coverage and custody assignments.`,
    taskType: 'asset_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'control',
    entityId: payload.entityId as string || '',
    triggerSource: 'controls.deficiency_detected',
  });
}

async function handleRemediationOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Asset risk: Remediation overdue — asset exposure increasing`,
    description: `A remediation plan is overdue. Assets linked to the affected area remain at elevated risk.`,
    taskType: 'asset_review',
    priority: 'high',
    entityType: 'remediation_plan',
    entityId: payload.entityId as string || '',
    triggerSource: 'remediation.overdue',
  });
}

// -- foundation.position.holder.unassigned (F-003) ---------------------------
//
// When a Foundation position holder is unassigned, every asset_owners row
// pointing at the vacated user must be revoked, and a reassignment task
// created per orphaned asset. Idempotent.
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".asset_owners
     SET revoked_at = NOW()
     WHERE owner_user_id = $1 AND entity_type = 'asset' AND revoked_at IS NULL
     RETURNING entity_id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign asset owner (Foundation position vacated)`,
      description: `Previous owner was removed from their Foundation position. Pick a new owner.`,
      taskType: 'asset_reassignment',
      priority: 'high',
      entityType: 'asset',
      entityId: row.entity_id as string,
      triggerSource: 'foundation.position.holder.unassigned',
    });
    _swallow(_EC.EVENT_BUS, _recordAudit({
      tenantId, userId: 'system', module: 'asset', action: 'update',
      entityType: 'asset', entityId: row.entity_id as string,
    }));
  }
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[asset] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[asset] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('vendor.risk_changed', wrapHandler('handleVendorRiskChanged', handleVendorRiskChanged));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('incident.breach_reported', wrapHandler('handleIncidentBreachReported', handleIncidentBreachReported));
handlers.set('controls.effectiveness_failed', wrapHandler('handleControlEffectivenessFailed', handleControlEffectivenessFailed));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiencyDetected', handleControlDeficiencyDetected));
handlers.set('remediation.overdue', wrapHandler('handleRemediationOverdue', handleRemediationOverdue));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${ASSET_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerAssetEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `asset:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[asset] registered ${handlers.size} domain event subscribers`);
}
