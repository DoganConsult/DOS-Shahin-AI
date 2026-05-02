// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
// ============================================
// Cross-Hub: EVIDENCE HUB → other hubs
// Subscribers: evidence.expired, evidence.uploaded, evidence.coverage_low
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeCreateActionItem, safePublish,
  daysFromNow, getFirstAdmin,
} from './helpers';

export function registerEvidenceHub(sub: SubFn): void {

  // evidence.expired → Compliance Hub: flag compliance gap
  //                  → Risk Hub: increase risk score
  //                  → Audit Hub: create audit finding
  //                  → Operations Hub: alert operations
  //                  → Evidence Hub: auto-renewal request (Gap 4 fix)
  sub('evidence.expired', 'xhub-evidence→compliance-flag', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Compliance Hub: flag gap
    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'evidence', entityId,
      payload: { reason: 'evidence_expired', controlId: payload.controlId, evidenceId: entityId },
    });

    // → Audit Hub: create finding
    await safeCreateActionItem(tenantId, {
      title: `[Auto] Expired evidence: ${payload.evidenceName || entityId}`,
      sourceType: 'evidence', sourceId: entityId || '',
      assignedTo: await getFirstAdmin(tenantId), deadline: daysFromNow(7),
    });

    // → Risk Hub: flag increased exposure
    await safePublish({
      eventType: 'risk.score_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'evidence_expired', evidenceId: entityId, controlId: payload.controlId },
    });

    // Gap 4: Evidence expiry → auto-renewal request
    try {
      const schema = tenantSchema(tenantId);
      const admin = await getFirstAdmin(tenantId);
      if (payload.controlId) {
        await safeQuery(
          `INSERT INTO "${schema}".evidence_requests
             (control_id, requesting_team_id, due_date, status, evidence_type, description)
           VALUES ($1, NULL, $2, 'pending', 'renewal', $3)
           ON CONFLICT DO NOTHING`,
          [payload.controlId, daysFromNow(14), `Renewal request: evidence expired for control ${payload.controlId}`]
        );
      }
      await safeCreateTask(tenantId, {
        title: `[Auto] Evidence renewal: ${payload.evidenceName || entityId}`,
        description: `Evidence has expired. Collect updated evidence for control ${payload.controlId || 'any'}.`,
        assignedTo: admin, dueDate: daysFromNow(14),
        entityType: 'evidence', entityId: entityId || '',
      });
    } catch { /* evidence renewal non-fatal */ }
  });

  // evidence.uploaded → Compliance Hub: re-check compliance posture
  //                   → Audit Hub: mark evidence collected for audit prep
  //                   → Evidence Quality Scoring: score the uploaded evidence
  sub('evidence.uploaded', 'xhub-evidence→compliance-recheck', async (e) => {
    const { tenantId, payload, entityId } = e;

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'evidence_uploaded', controlId: payload.controlId },
    });

    // Trigger evidence quality scoring
    if (entityId) {
      try {
        const { scoreEvidenceQuality } = await import('../../../modules/evidence/services/analysis/evidence-quality-scoring.service');
        await scoreEvidenceQuality(tenantId, entityId);
      } catch (err) {
        logger.warn(`[EvidenceHub] Failed to score evidence quality for ${entityId}:`, err instanceof Error ? err.message : String(err));
      }
    }
  });

  // evidence.coverage_low → Risk Hub: flag coverage risk
  //                       → Automation Hub: trigger auto-collection rules
  sub('evidence.coverage_low', 'xhub-evidence→risk-coverage', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'risk.mitigation_required', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'evidence_coverage_low', coverage: payload.coverage, threshold: payload.threshold },
    });

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'auto_evidence_collection', coverage: payload.coverage },
    });
  });
}
