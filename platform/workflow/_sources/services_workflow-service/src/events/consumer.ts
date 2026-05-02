import { subscribeEvent, logger } from '@dos/module-sdk';
import type { PlatformEvent } from '@dos/types';
import { createWorkflowInstance } from '../domain/workflow.service';
import { createWorkItem } from '../domain/work-item.service';

async function handleRiskStatusChanged(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;

  const payload = event.payload as Record<string, any>;
  const status = payload?.status || payload?.newStatus;

  if (status === 'critical' || status === 'high') {
    try {
      await createWorkItem(tenantId, {
        title: `Risk escalation: ${payload?.name || event.entityId}`,
        description: `Risk status changed to ${status}. Review and remediate.`,
        taskType: 'risk_review',
        source: 'risk',
        sourceId: event.entityId,
        priority: status === 'critical' ? 'critical' : 'high',
        entityType: event.entityType,
        entityId: event.entityId,
      });
      logger.info('[WorkflowConsumer] Created work item for risk escalation', { entityId: event.entityId, status });
    } catch (err: any) {
      logger.error('[WorkflowConsumer] Failed to create risk work item', { error: err?.message });
    }
  }
}

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;

  const payload = event.payload as Record<string, any>;

  try {
    await createWorkItem(tenantId, {
      title: `Compliance gap: ${payload?.frameworkName || payload?.controlId || event.entityId}`,
      description: `Compliance gap detected. Assessment and remediation required.`,
      taskType: 'compliance_remediation',
      source: 'compliance',
      sourceId: event.entityId,
      priority: 'high',
      entityType: event.entityType,
      entityId: event.entityId,
    });
    logger.info('[WorkflowConsumer] Created work item for compliance gap', { entityId: event.entityId });
  } catch (err: any) {
    logger.error('[WorkflowConsumer] Failed to create compliance work item', { error: err?.message });
  }
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;

  const payload = event.payload as Record<string, any>;
  const severity = payload?.severity || payload?.classification;

  try {
    await createWorkflowInstance({
      tenantId,
      workflowType: 'incident_response',
      name: `Incident response: ${payload?.title || event.entityId}`,
      createdBy: event.userId || 'system',
      entityType: 'incident',
      entityId: event.entityId!,
      context: { severity, classification: payload?.classification, source: 'event' },
    });
    logger.info('[WorkflowConsumer] Created workflow instance for incident', { entityId: event.entityId, severity });
  } catch (err: any) {
    logger.error('[WorkflowConsumer] Failed to create incident workflow', { error: err?.message });
  }
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;

  const payload = event.payload as Record<string, any>;

  try {
    await createWorkItem(tenantId, {
      title: `Audit finding: ${payload?.title || event.entityId}`,
      description: `New audit finding requires remediation action plan.`,
      taskType: 'audit_remediation',
      source: 'audit',
      sourceId: event.entityId,
      priority: payload?.severity === 'critical' ? 'critical' : 'high',
      entityType: event.entityType,
      entityId: event.entityId,
    });
    logger.info('[WorkflowConsumer] Created work item for audit finding', { entityId: event.entityId });
  } catch (err: any) {
    logger.error('[WorkflowConsumer] Failed to create audit work item', { error: err?.message });
  }
}

async function handleTenantProvisioned(event: PlatformEvent): Promise<void> {
  logger.info('[WorkflowConsumer] Tenant provisioned — workflow tables should be created via migration', {
    entityId: event.entityId,
    tenantId: event.tenantId,
  });
}

export function initConsumers(): void {
  subscribeEvent('risk.status_changed', 'workflow-service', handleRiskStatusChanged);
  subscribeEvent('compliance.gap_detected', 'workflow-service', handleComplianceGapDetected);
  subscribeEvent('incident.classified', 'workflow-service', handleIncidentClassified);
  subscribeEvent('audit.finding_created', 'workflow-service', handleAuditFindingCreated);
  subscribeEvent('provisioning.tenant_provisioned', 'workflow-service', handleTenantProvisioned);

  logger.info('Workflow service event consumers initialized');
}
