// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: LIFECYCLE STATUS HUB
// Subscribers: *.lifecycle_changed, *.status_changed
// Propagates lifecycle/status transitions across modules
// for cross-domain visibility and downstream reactions.
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeNotifyAdmins, safePublish,
} from './helpers';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

/**
 * Registers lifecycle status hub subscribers.
 *
 * Listens for lifecycle and status change events from domain modules
 * and propagates them to downstream consumers:
 * - Analytics: updates KPI snapshots
 * - Reporting: triggers report refresh
 * - Governance: tracks oversight activity
 * - Audit trail: records lifecycle transitions
 */
export function registerLifecycleStatusHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // RISK lifecycle changes → compliance posture recalculation + governance
  // ═══════════════════════════════════════════════════════════════════════════

  sub('risk.status_changed', 'xhub-lifecycle→risk-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);

    // If risk moved to critical, escalate to governance hub
    if (payload?.newStatus === 'critical' || payload?.newStatus === 'escalated') {
      await safePublish({
        eventType: 'governance.oversight_required', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'warning',
        payload: {
          reason: 'risk_escalated',
          entityType: 'risk',
          entityId,
          fromStatus: payload?.oldStatus,
          toStatus: payload?.newStatus,
        },
      });

      await safeNotifyAdmins(tenantId, {
        type: 'risk_escalated',
        title: '[AGRC-OS] Risk Escalation',
        body: `Risk "${payload?.title || entityId}" has been escalated to ${payload?.newStatus}. Review required.`,
        link: `/risks/${entityId}`,
      });
    }

    // Record lifecycle transition for analytics
    try {
      await safeQuery(
        `INSERT INTO "${schema}".lifecycle_transitions
           (entity_type, entity_id, from_status, to_status, changed_by, changed_at, source_module)
         VALUES ('risk', $1, $2, $3, $4, NOW(), 'risk')
         ON CONFLICT DO NOTHING`,
        [entityId, payload?.oldStatus || 'unknown', payload?.newStatus || 'unknown', payload?.changedBy || SYSTEM_JOB_ACTOR],
      );
    } catch { /* lifecycle_transitions table may not exist */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROL lifecycle changes → compliance posture + evidence freshness
  // ═══════════════════════════════════════════════════════════════════════════

  sub('control.status_changed', 'xhub-lifecycle→control-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;

    // Trigger incremental compliance recalculation
    await safePublish({
      eventType: 'analytics.compliance_recalc_needed', tenantId,
      sourceService: 'lifecycle-status-hub', severity: 'info',
      payload: {
        reason: 'control_status_changed',
        controlIds: [entityId],
        newTestStatus: payload?.newStatus,
      },
    });

    // If control became ineffective, create remediation task
    if (payload?.newStatus === 'ineffective' || payload?.newStatus === 'failed') {
      await safeCreateTask(tenantId, {
        title: `Remediate ineffective control: ${payload?.controlCode || entityId}`,
        description: `Control ${payload?.controlCode || entityId} test result: ${payload?.newStatus}. Remediation action required.`,
        entityType: 'control',
        entityId,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVIDENCE lifecycle changes → control posture + compliance score
  // ═══════════════════════════════════════════════════════════════════════════

  sub('evidence.status_changed', 'xhub-lifecycle→evidence-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;

    if (payload?.newStatus === 'approved' || payload?.newStatus === 'rejected' || payload?.newStatus === 'expired') {
      await safePublish({
        eventType: 'analytics.compliance_recalc_needed', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'info',
        payload: {
          reason: `evidence_${payload.newStatus}`,
          evidenceIds: [entityId],
        },
      });
    }

    // Expired evidence triggers collection task
    if (payload?.newStatus === 'expired') {
      await safeCreateTask(tenantId, {
        title: `Re-collect expired evidence: ${payload?.evidenceName || entityId}`,
        description: `Evidence has expired and needs re-collection for continued compliance.`,
        entityType: 'evidence',
        entityId,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENT lifecycle changes → risk register + reporting
  // ═══════════════════════════════════════════════════════════════════════════

  sub('incident.status_changed', 'xhub-lifecycle→incident-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;

    // Incident opened or escalated → risk hub notification
    if (payload?.newStatus === 'open' || payload?.newStatus === 'escalated') {
      await safePublish({
        eventType: 'risk.incident_impact', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'warning',
        payload: {
          incidentId: entityId,
          severity: payload?.severity || 'medium',
          status: payload?.newStatus,
        },
      });
    }

    // Incident closed → trigger lessons-learned task
    if (payload?.newStatus === 'closed' || payload?.newStatus === 'resolved') {
      await safeCreateTask(tenantId, {
        title: `Post-incident review: ${payload?.incidentTitle || entityId}`,
        description: `Incident resolved. Complete post-incident review and lessons learned documentation.`,
        entityType: 'incident',
        entityId,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POLICY lifecycle changes → compliance + training
  // ═══════════════════════════════════════════════════════════════════════════

  sub('policy.status_changed', 'xhub-lifecycle→policy-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;

    // Policy published → trigger awareness training
    if (payload?.newStatus === 'published' || payload?.newStatus === 'active') {
      await safePublish({
        eventType: 'training.awareness_needed', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'info',
        payload: {
          reason: 'policy_published',
          policyId: entityId,
          policyTitle: payload?.title,
        },
      });
    }

    // Policy retired → check for dependent controls
    if (payload?.newStatus === 'retired' || payload?.newStatus === 'archived') {
      await safePublish({
        eventType: 'compliance.policy_retired', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'warning',
        payload: {
          policyId: entityId,
          policyTitle: payload?.title,
        },
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDOR lifecycle changes → risk + compliance
  // ═══════════════════════════════════════════════════════════════════════════

  sub('vendor.status_changed', 'xhub-lifecycle→vendor-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;

    if (payload?.newStatus === 'suspended' || payload?.newStatus === 'terminated') {
      await safePublish({
        eventType: 'risk.vendor_risk_changed', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'warning',
        payload: {
          vendorId: entityId,
          vendorName: payload?.vendorName,
          newStatus: payload?.newStatus,
          riskImpact: 'elevated',
        },
      });

      await safeNotifyAdmins(tenantId, {
        type: 'vendor_status_change',
        title: '[AGRC-OS] Vendor Status Change',
        body: `Vendor "${payload?.vendorName || entityId}" status changed to ${payload?.newStatus}. Review vendor risk exposure.`,
        link: `/vendors/${entityId}`,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT lifecycle changes → governance + reporting
  // ═══════════════════════════════════════════════════════════════════════════

  sub('audit.status_changed', 'xhub-lifecycle→audit-status-propagate', async (e) => {
    const { tenantId, entityId, payload } = e;

    // Audit completed → trigger report generation
    if (payload?.newStatus === 'completed' || payload?.newStatus === 'closed') {
      await safePublish({
        eventType: 'reporting.refresh_needed', tenantId,
        sourceService: 'lifecycle-status-hub', severity: 'info',
        payload: {
          reason: 'audit_completed',
          auditId: entityId,
          auditTitle: payload?.title,
        },
      });
    }

    // Audit finding added → create remediation task
    if (payload?.newStatus === 'finding_added') {
      await safeCreateTask(tenantId, {
        title: `Address audit finding: ${payload?.findingTitle || entityId}`,
        description: `New finding from audit requires remediation action.`,
        entityType: 'audit_finding',
        entityId: payload?.findingId || entityId,
      });
    }
  });
}
