// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: CCM + CONNECTOR HUBS → other hubs
// Subscribers: ccm.stale_detected, connector.sync_completed,
//   erp/siem/iam.sync_completed, connector.sync_failed,
//   connector.connected, connector.disconnected, connector.health_degraded
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeNotifyAdmins, safePublish,
  daysFromNow,
  recordAudit,
} from '../helpers';
import { mapConnectorOutputToEvidence } from '../../../../modules/integrations/services/connector-evidence-mapper.service.js';

export function registerCcmConnectorHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. CCM (Continuous Control Monitoring) → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // ccm.stale_detected → Evidence Hub: request fresh evidence
  //                    → Compliance Hub: flag stale controls
  //                    → Risk Hub: increase exposure
  sub('ccm.stale_detected', 'xhub-ccm→evidence-request', async (e) => {
    const { tenantId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] CCM: ${payload.staleCount || 0} stale controls detected`,
      description: `Continuous Control Monitoring found ${payload.staleCount} stale controls. Evidence refresh required.`,
      dueDate: daysFromNow(7), entityType: 'ccm', entityId: tenantId,
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'ccm_stale_controls', staleCount: payload.staleCount },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. CONNECTOR HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // connector.sync_completed → Evidence Hub: auto-collect synced data as evidence
  //                          → Compliance Hub: recalculate posture with fresh data
  //                          → Analytics Hub: update integration metrics
  //                          → Audit Hub: log successful data ingestion
  sub('connector.sync_completed', 'xhub-connector→evidence-collect', async (e) => {
    const { tenantId, entityId, payload } = e;

    // Auto-map connector output to pending evidence tasks and submit
    await mapConnectorOutputToEvidence(tenantId, {

      connectorType: payload?.connectorType ?? payload?.connectorName ?? (e as Record<string, unknown>).entityType as string ?? 'connector',
      connectionId: entityId ?? '',

      recordsFetched: payload?.recordsFetched ?? payload?.recordsCollected ?? 0,

      recordsNew: payload?.recordsNew ?? payload?.recordsCreated ?? 0,
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    await safeCreateTask(tenantId, {
      title: `[Auto] Evidence from connector sync: ${payload.connectorName || entityId}`,
      description: `Connector "${payload.connectorName || entityId}" synced ${payload.recordsFetched || 0} records. Validate and attach as evidence to relevant controls.`,
      dueDate: daysFromNow(7), entityType: 'connector', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'connector_sync_completed', connectorId: entityId, records: payload.recordsFetched },
    });

    await recordAudit({
      tenantId, userId: 'agrc-os', module: 'cross_hub', action: 'create',
      entityType: 'connector_sync', entityId: entityId || '',
      afterState: { trigger: 'connector.sync_completed', records: payload.recordsFetched },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // erp.sync_completed → Evidence Hub: auto-collect from ERP connector
  sub('erp.sync_completed', 'xhub-erp→evidence-collect', async (e) => {
    const { tenantId, entityId, payload } = e;
    await mapConnectorOutputToEvidence(tenantId, {
      connectorType: 'erp',
      connectionId: entityId ?? '',

      recordsFetched: payload?.recordsFetched ?? 0,

      recordsNew: payload?.recordsCreated ?? payload?.recordsNew ?? 0,
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // siem.sync_completed → Evidence Hub: auto-collect from SIEM connector
  sub('siem.sync_completed', 'xhub-siem→evidence-collect', async (e) => {
    const { tenantId, entityId, payload } = e;
    await mapConnectorOutputToEvidence(tenantId, {
      connectorType: 'siem',
      connectionId: entityId ?? '',

      recordsFetched: payload?.recordsFetched ?? 0,

      recordsNew: payload?.recordsCreated ?? payload?.recordsNew ?? 0,
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // iam.sync_completed → Evidence Hub: auto-collect from IAM connector
  sub('iam.sync_completed', 'xhub-iam→evidence-collect', async (e) => {
    const { tenantId, entityId, payload } = e;
    await mapConnectorOutputToEvidence(tenantId, {
      connectorType: 'iam',
      connectionId: entityId ?? '',

      recordsFetched: payload?.recordsFetched ?? 0,

      recordsNew: payload?.recordsCreated ?? payload?.recordsNew ?? 0,
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // connector.sync_failed → Incident Hub: create incident for data ingestion failure
  //                       → Operations Hub: flag health degradation
  //                       → Risk Hub: flag data freshness risk
  //                       → Team Hub: notify connector owner
  sub('connector.sync_failed', 'xhub-connector→incident-create', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);

    try {
      await safeQuery(
        `INSERT INTO "${schema}".incidents (title, description, severity, status, source)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `[Auto] Connector sync failure: ${payload.connectorName || entityId}`,
          `Connector "${payload.connectorName || entityId}" failed to sync. Error: ${payload.error || 'Unknown'}. Data freshness compromised.`,
          'high', 'open', 'agrc-os-cross-hub',
        ]
      );
    } catch { /* incidents table may not exist */ }

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,

      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'connector_sync_failed', connectorId: entityId, error: payload.error },
    });

    try {
      const { createRisk } = await import('../../../../modules/risk/services/core/risk.service.js');
      await createRisk(tenantId, {
        title: `[Auto] Data freshness risk: connector ${payload.connectorName || entityId}`,
        description: `Connector sync failed — data may be stale. Controls relying on this data source may have coverage gaps.`,
        category: 'operational', likelihood: 3, impact: 3,
      });
    } catch { /* best effort */ }

    await safeNotifyAdmins(tenantId, {
      type: 'connector_sync_failed',
      title: '[AGRC-OS] Connector Sync Failed',
      body: `Connector "${payload.connectorName || entityId}" sync failed: ${payload.error || 'any error'}. Immediate action required.`,
      link: '/connector-hub',
    });
  });

  // connector.connected → Automation Hub: trigger initial sync
  //                     → Knowledge Hub: log new integration
  //                     → Compliance Hub: update coverage — new data source available
  //                     → Audit Hub: record new integration for audit trail
  sub('connector.connected', 'xhub-connector→automation-sync', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'initial_connector_sync', connectorId: entityId, connectorType: payload.connectorType },
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Configure evidence mapping for: ${payload.connectorName || entityId}`,
      description: `New connector "${payload.connectorName}" connected (type: ${payload.connectorType || 'any'}). Map data fields to controls and evidence requirements.`,
      dueDate: daysFromNow(7), entityType: 'connector', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'connector_added', connectorId: entityId },
    });

    await recordAudit({
      tenantId, userId: 'agrc-os', module: 'cross_hub', action: 'create',
      entityType: 'connector_integration', entityId: entityId || '',
      afterState: { trigger: 'connector.connected', connectorType: payload.connectorType },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // connector.disconnected → Risk Hub: flag data coverage gap
  //                        → Compliance Hub: evidence coverage may drop
  //                        → Evidence Hub: mark evidence from this source as potentially stale
  //                        → Operations Hub: alert ops
  sub('connector.disconnected', 'xhub-connector→risk-coverage', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const { createRisk } = await import('../../../../modules/risk/services/core/risk.service.js');
      await createRisk(tenantId, {
        title: `[Auto] Data coverage gap: connector ${payload.connectorName || entityId} disconnected`,
        description: `Connector "${payload.connectorName}" was disconnected. Evidence and controls mapped to this data source may lose coverage.`,
        category: 'operational', likelihood: 4, impact: 3,
      });
    } catch { /* best effort */ }

    await safePublish({
      eventType: 'evidence.coverage_low', tenantId,

      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'connector_disconnected', connectorId: entityId, coverage: 0 },
    });

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,

      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'connector_disconnected', connectorId: entityId },
    });
  });

  // connector.health_degraded → Operations Hub: escalate
  //                           → Incident Hub: create incident if critical
  //                           → Risk Hub: flag integration reliability risk
  sub('connector.health_degraded', 'xhub-connector→ops-escalate', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,

      sourceService: 'cross-hub-integration', severity: e.severity,
      payload: { reason: 'connector_health_degraded', connectorId: entityId, health: payload.healthScore },
    });

    if (e.severity === 'critical') {
      const schema = tenantSchema(tenantId);
      try {
        await safeQuery(
          `INSERT INTO "${schema}".incidents (title, description, severity, status, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `[Auto] Connector critically degraded: ${payload.connectorName || entityId}`,
            `Connector health dropped to ${payload.healthScore || 0}%. Automated incident for investigation.`,
            'high', 'open', 'agrc-os-cross-hub',
          ]
        );
      } catch { /* best effort */ }
    }

    await safeNotifyAdmins(tenantId, {
      type: 'connector_health_degraded',
      title: '[AGRC-OS] Connector Health Degraded',
      body: `Connector "${payload.connectorName || entityId}" health at ${payload.healthScore || 'any'}%. ${e.severity === 'critical' ? 'CRITICAL — incident created.' : 'Monitor closely.'}`,
      link: '/connector-health',
    });
  });
}
