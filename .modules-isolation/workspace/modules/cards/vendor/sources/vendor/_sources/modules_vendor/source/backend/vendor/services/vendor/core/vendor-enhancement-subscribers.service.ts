import { logger } from '../../../ports/logger.port';
// ============================================
// Vendor Enhancement Event Subscribers
// Registers event bus subscribers that connect
// vendor enhancement automation to platform
// events (incidents, risk changes, connector
// syncs, task completions, concentration alerts).
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';

import { createVendorFindingFromIncident, closeVendorFindingAndRecalculate } from './vendor-findings.service';
import { createBcpTestRequirementForVendor, createBoardAttentionItemForVendor } from './vendor-cross-module-escalation.service';
import { processConnectorSyncForVendorEvidence } from './vendor-compliance-checks.service';
import { createConcentrationMitigationTasks } from './vendor-risk-analytics.service';

/**
 * Register event bus subscribers for vendor enhancement automation.
 * Should be called once during server startup.
 */
export function registerVendorEnhancementSubscribers(): void {
  // 1. incident.created -> auto-create vendor finding if vendor_id present
  eventBus.subscribe('incident.created', 'vendor-enhancements:incident-link', async (event) => {
    const { tenantId, payload } = event;
    const vendorId = payload?.vendor_id ?? payload?.vendorId;
    if (!vendorId) return;

    const incidentId = payload?.incident_id ?? payload?.incidentId ?? event.entityId;
    const incidentTitle = payload?.title ?? payload?.incidentTitle ?? 'Untitled Incident';
    const severity = payload?.severity ?? event.severity ?? 'medium';

    await createVendorFindingFromIncident(tenantId, (incidentId as any), vendorId, incidentTitle, severity);
  });

  // 2. vendor.concentration_high -> create BCP test requirement
  eventBus.subscribe('vendor.concentration_high', 'vendor-enhancements:bcp-integration', async (event) => {
    const { tenantId, payload } = event;
    const vendorId = payload?.vendor_id ?? payload?.vendorId ?? event.entityId;
    const vendorName = payload?.vendor_name ?? payload?.vendorName ?? 'Unknown Vendor';
    const concentrationPercentage = Number(payload?.concentration_percentage ?? payload?.concentrationPercentage ?? 80);

    if (!vendorId) return;

    await createBcpTestRequirementForVendor(tenantId, (vendorId as any), vendorName, concentrationPercentage);

    // Also create concentration mitigation tasks
    const concentrationType = payload?.concentration_type ?? payload?.concentrationType ?? 'service';
    const threshold = Number(payload?.threshold ?? 60);
    await createConcentrationMitigationTasks(

      tenantId, (vendorId as any), vendorName, concentrationType, concentrationPercentage, threshold,
    );
  });

  // 3. vendor.risk_changed with tier=critical -> create board attention item
  eventBus.subscribe('vendor.risk_changed', 'vendor-enhancements:board-escalation', async (event) => {
    const { tenantId, payload } = event;
    const riskTier = payload?.risk_tier ?? payload?.riskTier ?? payload?.newTier;
    if (riskTier !== 'critical') return;

    const vendorId = payload?.vendor_id ?? payload?.vendorId ?? event.entityId;
    const vendorName = payload?.vendor_name ?? payload?.vendorName ?? 'Unknown Vendor';
    const riskScore = Number(payload?.risk_score ?? payload?.riskScore ?? payload?.newScore ?? 0);

    if (!vendorId) return;

    await createBoardAttentionItemForVendor(tenantId, (vendorId as any), vendorName, riskTier, riskScore);
  });

  // 4. process_task.completed where source_type='vendor' -> update vendor finding + recalculate score
  eventBus.subscribe('process_task.completed', 'vendor-enhancements:remediation-feedback', async (event) => {
    const { tenantId, payload } = event;
    const entityType = payload?.entityType ?? payload?.entity_type;
    const taskType = payload?.taskType ?? payload?.task_type;

    // Only process vendor-related task completions

    if (!entityType?.startsWith('vendor') && !taskType?.startsWith('vendor')) return;

    const triggerSource = payload?.triggerSource ?? payload?.trigger_source;
    if (triggerSource !== 'vendor-enhancements') return;

    const entityId = payload?.entityId ?? payload?.entity_id;
    if (!entityId) return;

    // Look up the vendor finding linked to this entity
    const schema = tenantSchema(tenantId);
    const findingRes = await safeQuery(
      `SELECT vf.finding_id, vf.vendor_id
       FROM "${schema}".vendor_findings vf
       WHERE vf.source_id = $1 AND vf.status = 'open'
       LIMIT 1`,
      [entityId],
    );

    if (findingRes.rows.length > 0) {
      const { finding_id, vendor_id } = getFirstRow(findingRes);
      await closeVendorFindingAndRecalculate(
        tenantId,
        vendor_id,
        finding_id,
        `Auto-closed via process task completion. Task type: ${taskType}`,
      );
    }
  });

  // 5. connector.sync_completed -> check for vendor evidence auto-satisfaction
  eventBus.subscribe('connector.sync_completed', 'vendor-enhancements:evidence-auto-collection', async (event) => {
    const { tenantId, payload } = event;
    const connectorId = payload?.connector_id ?? payload?.connectorId ?? event.entityId;
    const connectorType = payload?.connector_type ?? payload?.connectorType ?? '';
    const syncedRecords = payload?.synced_records ?? payload?.syncedRecords ?? [];

    if (!connectorId || !Array.isArray(syncedRecords) || syncedRecords.length === 0) return;

    const satisfied = await processConnectorSyncForVendorEvidence(

      tenantId, (connectorId as any), connectorType, syncedRecords,
    );

    if (satisfied > 0) {
      logger.info(`[VendorEnhancements] Auto-satisfied ${satisfied} vendor evidence requirements from connector sync (${connectorType})`);
    }
  });
}
