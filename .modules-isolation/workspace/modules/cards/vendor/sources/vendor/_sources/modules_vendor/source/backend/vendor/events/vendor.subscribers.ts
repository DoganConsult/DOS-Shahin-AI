import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { VENDOR_EVENT_CONTRACT } from './vendor.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string;

  const linkedVendors = await safeQuery(
    `SELECT vendor_id FROM "${schema}".risk_vendor_links WHERE risk_id = $1`,
    [riskId],
  );

  for (const row of linkedVendors.rows) {
    await createProcessTask(tenantId, {
      title: `Vendor review: Linked risk score changed`,
      description: `A risk linked to this vendor has changed. Review vendor risk rating.`,
      taskType: 'verification',
      priority: 'medium',
      entityType: 'vendor',
      entityId: row.vendor_id as string,
      triggerSource: 'risk.score_changed',
    });
  }
}

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Vendor compliance: Gap detected`,
    description: `A compliance gap may affect vendor compliance status. Review vendor obligations.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Vendor audit: Finding raised`,
    description: `An audit finding may involve vendor-related controls. Review vendor impact.`,
    taskType: 'vendor_audit_finding',
    priority: 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const severity = payload.severity as string;

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Vendor alert: Incident classified`,
      description: `A ${severity} incident may involve vendor services. Review vendor dependency.`,
      taskType: 'verification',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.classified',
    });
  }
}

async function handleBcpCrisisDeclared(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const _crisisId = payload.entityId as string;

  const criticalVendors = await safeQuery(
    `SELECT vendor_id, name FROM "${schema}".vendors
     WHERE risk_rating IN ('critical', 'high') AND status = 'active'
     LIMIT 20`,
  );

  for (const v of criticalVendors.rows) {
    await createProcessTask(tenantId, {
      title: `BCP Crisis: Verify vendor ${v.name || 'Unknown'} continuity`,
      description: `A crisis has been declared. Verify this critical/high-risk vendor can maintain service.`,
      taskType: 'verification',
      priority: 'critical',
      entityType: 'vendor',
      entityId: v.vendor_id as string,
      triggerSource: 'bcp.crisis_declared',
    });
  }
}

async function handleVendorContractExpiring(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Vendor: Contract expiring — ${payload.vendorName}`,
    description: `Vendor "${payload.vendorName}" contract expires ${payload.expiryDate}. Initiate internal review and renewal process.`,
    taskType: 'verification', priority: (payload.riskTier as string) === 'critical' ? 'critical' : 'high',
    entityType: 'vendor', entityId: payload.entityId as string || '',
    triggerSource: 'vendor.contract_expiring',
  });
}

async function handleBcpDependencyCritical(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Vendor: Critical BCP dependency — ${payload.nodeName}`,
    description: `Critical dependency node "${payload.nodeName}" in map "${payload.mapTitle}" needs vendor continuity review.`,
    taskType: 'verification', priority: (payload.criticality as string) === 'critical' ? 'critical' : 'high',
    entityType: 'bcm_dependency', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.dependency_critical',
  });
}

async function handleRiskVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.vendorId as string || payload.entityId as string;
  const newRiskScore = payload.newRiskScore as number || payload.riskScore as number;
  if (!vendorId) return;

  await createProcessTask(tenantId, {
    title: `Vendor risk changed: Score updated to ${newRiskScore}`,
    description: `Vendor risk score has been updated. Review vendor tier classification and assessment schedule.`,
    taskType: 'verification',
    priority: (newRiskScore || 0) > 70 ? 'critical' : 'high',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'risk.vendor_risk_changed',
  });
}

async function handleComplianceVendorFinding(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.vendorId as string;
  const findingId = payload.findingId as string || payload.entityId as string;
  if (!vendorId || !findingId) return;

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".vendor_findings (vendor_id, title, description, severity, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'open', NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [vendorId, `Compliance finding: ${payload.title || findingId}`, payload.description || 'Auto-created from compliance finding', payload.severity || 'medium'],
  );
}

async function handleIncidentVendorInvolved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.vendorId as string;
  const incidentId = payload.incidentId as string || payload.entityId as string;
  if (!vendorId) return;

  await createProcessTask(tenantId, {
    title: `Vendor incident: Vendor involved in incident ${incidentId}`,
    description: `Vendor "${payload.vendorName || vendorId}" has been identified in an incident. Review vendor services and impact.`,
    taskType: 'verification',
    priority: 'critical',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'incident.vendor_involved',
  });
}

async function handleEvidenceVendorRejected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.vendorId as string;
  if (!vendorId) return;

  await createProcessTask(tenantId, {
    title: `Vendor evidence rejected: Review required`,
    description: `Evidence submitted by vendor has been rejected. Follow up with vendor for corrected submission.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'evidence.vendor_evidence_rejected',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('vendor') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".vendors
     SET status = $1, updated_at = NOW()
     WHERE vendor_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[vendor] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[vendor] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('bcp.crisis_declared', wrapHandler('handleBcpCrisisDeclared', handleBcpCrisisDeclared));
handlers.set('vendor.contract_expiring', wrapHandler('handleVendorContractExpiring', handleVendorContractExpiring));
handlers.set('bcp.dependency_critical', wrapHandler('handleBcpDependencyCritical', handleBcpDependencyCritical));
handlers.set('risk.vendor_risk_changed', wrapHandler('handleRiskVendorRiskChanged', handleRiskVendorRiskChanged));
handlers.set('compliance.vendor_finding', wrapHandler('handleComplianceVendorFinding', handleComplianceVendorFinding));
handlers.set('incident.vendor_involved', wrapHandler('handleIncidentVendorInvolved', handleIncidentVendorInvolved));
handlers.set('evidence.vendor_evidence_rejected', wrapHandler('handleEvidenceVendorRejected', handleEvidenceVendorRejected));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

// -- foundation.position.holder.unassigned (F-007) ---------------------------
//
// When a Foundation position holder is unassigned, every vendor due-diligence
// task assigned to the vacated user is unassigned, and a reassignment task is
// created so the relationship can be reassigned.
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".vendor_due_diligence
     SET assigned_to = NULL
     WHERE assigned_to = $1
     RETURNING id, vendor_id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign vendor due-diligence (Foundation position vacated)`,
      description: `Previous assignee was removed from their Foundation position. Pick a new owner.`,
      taskType: 'vendor_reassignment',
      priority: 'high',
      entityType: 'vendor',
      entityId: row.vendor_id as string,
      triggerSource: 'foundation.position.holder.unassigned',
    });
  }
}

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${VENDOR_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerVendorEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `vendor:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[vendor] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('vendor');
}
