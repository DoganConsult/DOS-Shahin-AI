import { subscribeEvent, logger } from '@dos/module-sdk';
import type { PlatformEvent } from '@dos/types';

function handleRiskStatusChanged(event: PlatformEvent): Promise<void> {
  logger.info('Received risk.status_changed event', { entityId: event.entityId, tenantId: event.tenantId });
  return Promise.resolve();
}

function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  logger.info('Received compliance.gap_detected event', { entityId: event.entityId, tenantId: event.tenantId });
  return Promise.resolve();
}

function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  logger.info('Received incident.classified event', { entityId: event.entityId, tenantId: event.tenantId });
  return Promise.resolve();
}

function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  logger.info('Received audit.finding_created event', { entityId: event.entityId, tenantId: event.tenantId });
  return Promise.resolve();
}

function handleTenantProvisioned(event: PlatformEvent): Promise<void> {
  logger.info('Received provisioning.tenant_provisioned event', { entityId: event.entityId, tenantId: event.tenantId });
  return Promise.resolve();
}

export function initConsumers(): void {
  subscribeEvent('risk.status_changed', 'workflow-service', handleRiskStatusChanged);
  subscribeEvent('compliance.gap_detected', 'workflow-service', handleComplianceGapDetected);
  subscribeEvent('incident.classified', 'workflow-service', handleIncidentClassified);
  subscribeEvent('audit.finding_created', 'workflow-service', handleAuditFindingCreated);
  subscribeEvent('provisioning.tenant_provisioned', 'workflow-service', handleTenantProvisioned);

  logger.info('Workflow service event consumers initialized');
}
