// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
// ============================================
// Cross-Hub: COMPLIANCE POSTURE HUB
// Subscribers: control.state_changed, evidence.approved, evidence.rejected, evidence.expired
// Purpose: Real-time incremental compliance posture recalculation
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
} from './helpers';
import { getFirstRow } from '@dos/db';
import type { ControlRow } from '@dos/types/db';

export function registerCompliancePostureHub(sub: SubFn): void {

  // control.state_changed → Analytics: incremental compliance posture recalculation
  // This triggers when a control's status changes (draft → implemented → effective → retired)
  sub('control.state_changed', 'xhub-compliance-posture→control-state', async (e) => {
    const { tenantId, entityId, payload } = e;
    if (!entityId) return;

    try {
      const { recalculateCompliancePostureIncremental } = await import('../../../../analytics/services/analytics/analytics.service');

      // Determine affected frameworks from the control
      const schema = tenantSchema(tenantId);
      const controlResult = await safeQuery(
        `SELECT frameworks, framework_ids
         FROM "${schema}".controls
         WHERE control_id = $1`,
        [entityId]
      );

      const control = getFirstRow(controlResult);
      const frameworkIds = control?.frameworks || control?.framework_ids || [];

      await recalculateCompliancePostureIncremental(tenantId, {
        controlIds: [entityId],
        frameworkIds: Array.isArray(frameworkIds) ? frameworkIds : [],
        reason: `control_state_changed: ${payload?.oldStatus || 'any'} → ${payload?.newStatus || 'any'}`,
      });
    } catch (err: unknown) {
      // Non-fatal: incremental recalculation is best-effort
      logger.warn(`[CompliancePostureHub] Failed to recalculate posture for control.state_changed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // evidence.approved → Analytics: incremental compliance posture recalculation
  // Approved evidence may improve control effectiveness, affecting compliance score
  //                   → Evidence Quality Scoring: re-score evidence after approval
  sub('evidence.approved', 'xhub-compliance-posture→evidence-approved', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      // First, re-score evidence quality (approval may change reviewer sign-off score)
      if (entityId) {
        try {
          const { scoreEvidenceQuality } = await import('../../../../modules/evidence/services/analysis/evidence-quality-scoring.service');
          await scoreEvidenceQuality(tenantId, entityId);
        } catch (err) {
          logger.warn(`[CompliancePostureHub] Failed to score evidence quality for ${entityId}:`, err instanceof Error ? err.message : String(err));
        }
      }

      const { recalculateCompliancePostureIncremental } = await import('../../../../analytics/services/analytics/analytics.service');

      // Find the control(s) linked to this evidence
      const schema = tenantSchema(tenantId);
      const controlResult = await safeQuery(
        `SELECT DISTINCT c.control_id, c.frameworks, c.framework_ids
         FROM "${schema}".controls c
         WHERE c.control_id = (SELECT control_id FROM "${schema}".evidence WHERE evidence_id = $1)
            OR c.control_id IN (
              SELECT control_id FROM "${schema}".control_evidence_mappings WHERE evidence_id = $1
            )
            OR c.control_id IN (
              SELECT control_id FROM "${schema}".evidence_tasks WHERE evidence_id = $1
            )`,
        [entityId]
      );

      const controlIds = controlResult.rows
        .map((r: ControlRow) => r.control_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      const frameworkIds = new Set<string>();
      controlResult.rows.forEach((r: ControlRow) => {
        const fws = r.frameworks || r.framework_ids || [];
        if (Array.isArray(fws)) {
          for (const fw of fws) {
            if (typeof fw === 'string' && fw) frameworkIds.add(fw);
          }
        }
      });

      if (controlIds.length > 0) {
        await recalculateCompliancePostureIncremental(tenantId, {
          controlIds,
          frameworkIds: Array.from(frameworkIds),
          reason: 'evidence_approved',
        });
      }
    } catch (err: unknown) {
      logger.warn(`[CompliancePostureHub] Failed to recalculate posture for evidence.approved: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // evidence.rejected → Analytics: incremental compliance posture recalculation
  // Rejected evidence may indicate control ineffectiveness, affecting compliance score
  sub('evidence.rejected', 'xhub-compliance-posture→evidence-rejected', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const { recalculateCompliancePostureIncremental } = await import('../../../../analytics/services/analytics/analytics.service');

      // Find the control(s) linked to this evidence
      const schema = tenantSchema(tenantId);
      const controlResult = await safeQuery(
        `SELECT DISTINCT c.control_id, c.frameworks, c.framework_ids
         FROM "${schema}".controls c
         INNER JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id
         WHERE et.evidence_id = $1`,
        [entityId]
      );

      const controlIds = controlResult.rows
        .map((r: ControlRow) => r.control_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      const frameworkIds = new Set<string>();
      controlResult.rows.forEach((r: ControlRow) => {
        const fws = r.frameworks || r.framework_ids || [];
        if (Array.isArray(fws)) {
          for (const fw of fws) {
            if (typeof fw === 'string' && fw) frameworkIds.add(fw);
          }
        }
      });

      if (controlIds.length > 0) {
        await recalculateCompliancePostureIncremental(tenantId, {
          controlIds,
          frameworkIds: Array.from(frameworkIds),
          reason: 'evidence_rejected',
        });
      }
    } catch (err: unknown) {
      logger.warn(`[CompliancePostureHub] Failed to recalculate posture for evidence.rejected: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // evidence.expired → Analytics: incremental compliance posture recalculation
  // Expired evidence indicates compliance gap, affecting compliance score
  sub('evidence.expired', 'xhub-compliance-posture→evidence-expired', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const { recalculateCompliancePostureIncremental } = await import('../../../../analytics/services/analytics/analytics.service');

      // Find the control(s) linked to this evidence
      const schema = tenantSchema(tenantId);
      const controlResult = await safeQuery(
        `SELECT DISTINCT c.control_id, c.frameworks, c.framework_ids
         FROM "${schema}".controls c
         INNER JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id
         WHERE et.evidence_id = $1`,
        [entityId]
      );

      const controlIds = controlResult.rows
        .map((r: ControlRow) => r.control_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      const frameworkIds = new Set<string>();
      controlResult.rows.forEach((r: ControlRow) => {
        const fws = r.frameworks || r.framework_ids || [];
        if (Array.isArray(fws)) {
          for (const fw of fws) {
            if (typeof fw === 'string' && fw) frameworkIds.add(fw);
          }
        }
      });

      if (controlIds.length > 0) {
        await recalculateCompliancePostureIncremental(tenantId, {
          controlIds,
          frameworkIds: Array.from(frameworkIds),
          reason: 'evidence_expired',
        });
      }
    } catch (err: unknown) {
      logger.warn(`[CompliancePostureHub] Failed to recalculate posture for evidence.expired: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
