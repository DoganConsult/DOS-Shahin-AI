import { logger } from '../ports/logger.port';
// ============================================
// Shahin — Training Cross-Module Hooks
// Central integration service wiring training
// into compliance, risk, audit, evidence,
// incident, and onboarding modules.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent, eventBus as _eventBus, type PlatformEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { syncCertificationAuthZState } from '../../../products/shahin-ai/cross-hub/training-gate';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

// ── Domain → Training Category Mapping ──────────────────────────────────────

const DOMAIN_TRAINING_CATEGORY: Record<string, string> = {
  compliance: 'compliance',
  risk: 'risk_management',
  audit: 'general_awareness',
  evidence: 'general_awareness',
  incident: 'incident_response',
  onboarding: 'onboarding',
  cybersecurity: 'cybersecurity',
  phishing: 'phishing',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function _getPayload(event: PlatformEvent): Record<string, unknown> {
  return isRecord(event.payload) ? event.payload : {};
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function _asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function _asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(asString)
    .filter((item): item is string => Boolean(item));
}

/**
 * Map entity type to RACI domain.
 */
/**
 * Get users from RACI matrix for a given domain.
 * Returns users with Responsible (R) or Accountable (A) roles.
 */
async function getUsersFromRaciMatrix(
  tenantId: string,
  domain: string,
  preferRole: 'responsible' | 'accountable' | 'both' = 'both'
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  try {
    // Get RACI matrix entry for this domain
    const raciRes = await safeQuery(
      `SELECT responsible, accountable FROM "${schema}".raci_matrix WHERE domain = $1 LIMIT 1`,
      [domain]
    );

    if (raciRes.rows.length === 0) {
      return []; // No RACI entry for this domain
    }

    const raci = getFirstRow(raciRes)!;
    const roles: string[] = [];

    if (preferRole === 'responsible' || preferRole === 'both') {
      if (raci.responsible) roles.push(raci.responsible);
    }
    if (preferRole === 'accountable' || preferRole === 'both') {
      if (raci.accountable) roles.push(raci.accountable);
    }

    if (roles.length === 0) {
      return [];
    }

    // Get users with these roles
    const usersRes = await safeQuery(
      `SELECT DISTINCT user_id FROM public.users
       WHERE tenant_id = $1 AND role = ANY($2::text[]) AND status = 'active'`,
      [tenantId, roles]
    );

    return usersRes.rows.map((r: GenericRow) => r.user_id);
  } catch {
    return [];
  }
}

/**
 * Resolve the best-matching training content for a given domain.
 * Prefers mandatory content, returns null if none found.
 */
async function resolveTrainingContentForDomain(
  tenantId: string, domain: string, specificCategory?: string
): Promise<{ contentId: string; title: string } | null> {
  const schema = tenantSchema(tenantId);
  const category = specificCategory || DOMAIN_TRAINING_CATEGORY[domain] || 'general_awareness';
  try {
    const r = await safeQuery(
      `SELECT content_id, title FROM "${schema}".training_content
       WHERE category = $1 AND is_active = TRUE AND deleted_at IS NULL
       ORDER BY is_mandatory DESC, created_at DESC LIMIT 1`,
      [category]
    );
    if (r.rows.length > 0) return { contentId: getFirstRow(r)?.content_id, title: getFirstRow(r)?.title };
    // Fallback to general_awareness if specific category not found
    if (category !== 'general_awareness') {
      const fallback = await safeQuery(
        `SELECT content_id, title FROM "${schema}".training_content
         WHERE category = 'general_awareness' AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY is_mandatory DESC, created_at DESC LIMIT 1`
      );
      if (fallback.rows.length > 0) return { contentId: getFirstRow(fallback)?.content_id, title: getFirstRow(fallback)?.title };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Auto-assign training content to a list of users.
 * Uses existing assignTraining() with ON CONFLICT DO NOTHING for dedup.
 */
async function autoAssignTrainingToUsers(
  tenantId: string,
  contentId: string,
  userIds: string[],
  opts: { campaignId?: string; assignedBy?: string; dueDate?: string; triggerSource: string }
): Promise<number> {
  let assigned = 0;
  for (const userId of userIds) {
    try {
      const { assignTraining } = await import('./training-advanced.service.js');
      const result = await assignTraining(tenantId, {
        content_id: contentId,
        user_id: userId,
        campaign_id: opts.campaignId,
        assigned_by: opts.assignedBy || SYSTEM_JOB_ACTOR,
        due_date: opts.dueDate,
      });
      if (result) assigned++;
    } catch {
      // Non-fatal per user — dedup via ON CONFLICT
    }
  }
  if (assigned > 0) {
    logger.info(`[TrainingHooks] Auto-assigned training to ${assigned}/${userIds.length} users (trigger: ${opts.triggerSource})`);
  }
  return assigned;
}

// ── Exported Dashboard Helpers ──────────────────────────────────────────────

/**
 * Training audit readiness data for the audit module.
 */
export async function getTrainingAuditReadiness(tenantId: string): Promise<{
  trainingCompliant: boolean;
  completionPct: number;
  mandatoryOutstanding: number;
  certExpiringSoon: number;
}> {
  try {
    const { getTrainingComplianceSnapshot, checkExpiringCertifications } = await import('./training-advanced.service.js');
    const snapshot = await getTrainingComplianceSnapshot(tenantId);
    const expiring = await checkExpiringCertifications(tenantId, 30);
    if (!snapshot) {
      return { trainingCompliant: false, completionPct: 0, mandatoryOutstanding: 0, certExpiringSoon: expiring.length };
    }
    return {
      trainingCompliant: snapshot.complianceStatus === 'compliant',
      completionPct: snapshot.completionPct,
      mandatoryOutstanding: snapshot.mandatoryOutstanding,
      certExpiringSoon: expiring.length,
    };
  } catch {
    return { trainingCompliant: false, completionPct: 0, mandatoryOutstanding: 0, certExpiringSoon: 0 };
  }
}

/**
 * Per-framework training coverage for compliance hub.
 */
export async function getTrainingCoverageByFramework(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const r = await safeQuery(`
      SELECT f.framework_code, f.framework_name_en AS name,
        COUNT(DISTINCT a.assignment_id) AS total_assignments,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed')) AS completed,
        CASE WHEN COUNT(DISTINCT a.assignment_id) > 0
          THEN ROUND(COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed'))::numeric
            / COUNT(DISTINCT a.assignment_id) * 100)
          ELSE 0 END AS completion_pct
      FROM "${schema}".frameworks f
      LEFT JOIN "${schema}".controls c ON c.framework_id = f.framework_id AND c.deleted_at IS NULL
      LEFT JOIN "${schema}".training_content tc ON tc.category = 'compliance' AND tc.is_active = TRUE AND tc.deleted_at IS NULL
      LEFT JOIN "${schema}".training_assignments a ON a.content_id = tc.content_id
      WHERE f.deleted_at IS NULL
      GROUP BY f.framework_code, f.framework_name_en
      ORDER BY f.framework_code
    `);
    return r.rows;
  } catch {
    return [];
  }
}

/**
 * Competency gaps as risk factor for risk overview.
 */
export async function getCompetencyGapsAsRiskFactor(tenantId: string): Promise<{
  overdueMandatory: number;
  expiringCerts: number;
  riskLevel: string;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const overdue = getFirstRow((await safeQuery(`
      SELECT COUNT(*)::int AS cnt FROM "${schema}".training_assignments a
      JOIN "${schema}".training_content c ON c.content_id = a.content_id
      WHERE c.is_mandatory = TRUE AND a.status = 'overdue'
    `)))?.cnt || 0;
    const expiring = getFirstRow((await safeQuery(`
      SELECT COUNT(*)::int AS cnt FROM "${schema}".training_certifications
      WHERE revoked = FALSE AND valid_until IS NOT NULL
        AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 * INTERVAL '1 day'
    `)))?.cnt || 0;
    const total = overdue + expiring;
    return {
      overdueMandatory: overdue,
      expiringCerts: expiring,
      riskLevel: total >= 20 ? 'critical' : total >= 10 ? 'high' : total >= 5 ? 'medium' : 'low',
    };
  } catch {
    return { overdueMandatory: 0, expiringCerts: 0, riskLevel: 'low' };
  }
}

// ── Event Subscription Registration ─────────────────────────────────────────

/**
 * Register all training cross-module event subscriptions.
 * Call this during application startup (from job-scheduler).
 */
export async function registerTrainingEventSubscriptions(): Promise<void> {
  try {

    const { eventBus } = await import('../../platform/services/event/event-bus.service.js');

    // ────────────────────────────────────────────────────────────────────────
    // INBOUND: Other modules → Training
    // ────────────────────────────────────────────────────────────────────────

    // 1. Compliance gap → assign compliance training to RACI responsible/accountable users
    eventBus.subscribe('compliance.gap_detected', 'training-hook-compliance-gap', async (event) => {
      if (!event.tenantId) return;
      const content = await resolveTrainingContentForDomain(event.tenantId, 'compliance');
      if (!content) return;
      
      // Try RACI matrix first
      const raciUsers = await getUsersFromRaciMatrix(event.tenantId, 'compliance', 'both');
      
      // Fallback to direct ownerId if RACI doesn't yield users
      let userIds = raciUsers;
      if (userIds.length === 0) {
        const directOwner = event.payload?.ownerId || event.payload?.userId;
        if (directOwner) userIds = [String(directOwner)];
      }
      
      if (userIds.length === 0) return;
      await autoAssignTrainingToUsers(event.tenantId, content.contentId, userIds, {
        triggerSource: 'compliance.gap_detected',
        dueDate: addDays(14),
      });
    });

    // 2. High risk score → assign risk training to RACI responsible/accountable users
    eventBus.subscribe('risk.score_changed', 'training-hook-risk-threshold', async (event) => {
      if (!event.tenantId) return;
      const score = event.payload?.residualScore ?? event.payload?.riskScore ?? event.payload?.score;
      if (!score || Number(score) < 15) return;
      const content = await resolveTrainingContentForDomain(event.tenantId, 'risk');
      if (!content) return;
      
      // Try RACI matrix first
      const raciUsers = await getUsersFromRaciMatrix(event.tenantId, 'risk', 'both');
      
      // Fallback to direct owner if RACI doesn't yield users
      let userIds = raciUsers;
      if (userIds.length === 0) {
        const schema = tenantSchema(event.tenantId);
        try {
          const riskOwner = await safeQuery(
            `SELECT owner FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL LIMIT 1`,
            [event.entityId]
          );
          const ownerId = getFirstRow(riskOwner)?.owner;
          if (ownerId) userIds = [ownerId];
        } catch { /* non-fatal */ }
      }
      
      if (userIds.length === 0) return;
      await autoAssignTrainingToUsers(event.tenantId, content.contentId, userIds, {
        triggerSource: 'risk.score_changed',
        dueDate: addDays(21),
      });
    });

    // 3. Audit finding with training-related root cause or critical/high severity
    eventBus.subscribe('audit.finding_created', 'training-hook-audit-finding', async (event) => {
      if (!event.tenantId) return;
      const schema = tenantSchema(event.tenantId);
      const findingId = event.payload?.finding_id || event.entityId;
      if (!findingId) return;
      try {
        // Check root causes
        const rootCauses = await (swallowDefault as any)(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT cause_type FROM "${schema}".finding_root_causes
           WHERE finding_id = $1 AND deleted_at IS NULL`,
          [findingId]
        ), { operation: 'query finding_root_causes' });
        const trainingRelated = rootCauses.rows.some((r: GenericRow) =>
          ['training_gap', 'competency', 'awareness', 'knowledge_gap', 'human_error'].includes(
            (r.cause_type || '').toLowerCase()
          )
        );
        // If no training root cause, only proceed for critical/high severity
        if (!trainingRelated) {
          const sev = event.payload?.severity;
          if (sev !== 'critical' && sev !== 'high') return;
        }
        const content = await resolveTrainingContentForDomain(event.tenantId, 'audit');
        if (!content) return;
        
        // Try RACI matrix first
        const raciUsers = await getUsersFromRaciMatrix(event.tenantId, 'audit', 'both');
        
        // Fallback to direct assigned_to if RACI doesn't yield users
        let userIds = raciUsers;
        if (userIds.length === 0) {
          const finding = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
            `SELECT assigned_to FROM "${schema}".audit_findings WHERE finding_id = $1 LIMIT 1`,
            [findingId]
          ), { operation: 'query audit_findings' });
          const userId = getFirstRow(finding)?.assigned_to;

          if (userId) userIds = [userId];
        }
        
        if (userIds.length === 0) return;
        await autoAssignTrainingToUsers(event.tenantId, content.contentId, userIds, {
          triggerSource: 'audit.finding_created',
          dueDate: addDays(14),
        });
      } catch { /* non-fatal */ }
    });

    // 4. Evidence rejected 2+ times → assign training to RACI responsible/accountable users
    eventBus.subscribe('evidence.rejected', 'training-hook-evidence-rejected', async (event) => {
      if (!event.tenantId) return;
      const schema = tenantSchema(event.tenantId);
      const evidenceId = event.entityId;
      if (!evidenceId) return;
      try {
        const rejections = await (swallowDefault as any)(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
          `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_reviews
           WHERE evidence_id = $1 AND outcome = 'rejected'`,
          [evidenceId]
        ), { operation: 'query evidence_reviews' });

        const rejectCount = getFirstRow(rejections)?.cnt || 0;
        if (rejectCount < 2) return;
        const content = await resolveTrainingContentForDomain(event.tenantId, 'evidence');
        if (!content) return;
        
        // Try RACI matrix first (evidence maps to compliance domain)
        const raciUsers = await getUsersFromRaciMatrix(event.tenantId, 'compliance', 'both');
        
        // Fallback to direct submitter if RACI doesn't yield users
        let userIds = raciUsers;
        if (userIds.length === 0) {
          const userId = event.payload?.submitterId || event.payload?.userId;
          if (userId) userIds = [String(userId)];
        }
        
        if (userIds.length === 0) return;
        await autoAssignTrainingToUsers(event.tenantId, content.contentId, userIds, {
          triggerSource: 'evidence.rejected',
          dueDate: addDays(7),
        });
      } catch { /* non-fatal */ }
    });

    // 5. Critical/high incident → assign incident response training
    eventBus.subscribe('incident.created', 'training-hook-incident-response', async (event) => {
      if (!event.tenantId) return;
      const sev = event.payload?.severity || event.severity;
      if (sev !== 'critical' && sev !== 'high') return;
      const content = await resolveTrainingContentForDomain(event.tenantId, 'incident');
      if (!content) return;
      const schema = tenantSchema(event.tenantId);
      try {
        const incident = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT assigned_to, department_id FROM "${schema}".incidents
           WHERE incident_id = $1 AND deleted_at IS NULL LIMIT 1`,
          [event.entityId]
        ), { operation: 'query incidents' });
        const userIds: string[] = [];

        if (getFirstRow(incident)?.assigned_to) userIds.push(getFirstRow(incident)?.assigned_to);
        // Include department members if available
        if (getFirstRow(incident)?.department_id) {
          const deptUsers = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
            `SELECT user_id FROM public.users
             WHERE tenant_id = $1 AND department_id = $2 AND status = 'active' LIMIT 10`,
            [event.tenantId, getFirstRow(incident)?.department_id]
          ), { operation: 'fallback query' });
          for (const u of deptUsers.rows) {

            if (!userIds.includes(u.user_id)) userIds.push(u.user_id);
          }
        }
        if (userIds.length === 0) return;
        await autoAssignTrainingToUsers(event.tenantId, content.contentId, userIds, {
          triggerSource: 'incident.created',
          dueDate: addDays(7),
        });
      } catch { /* non-fatal */ }
    });

    // 6. New user → assign sector-specific training path + mandatory training
    eventBus.subscribe('foundation.user.created', 'training-hook-onboarding', async (event) => {
      if (!event.tenantId) return;
      const userId = String(event.payload?.userId || event.entityId || '');
      if (!userId) return;
      const schema = tenantSchema(event.tenantId);
      try {
        // Try sector-based training path first
        let sectorAssigned = 0;
        try {
          // workspace_profile.sectors is JSONB array; extract first sector code
          const profile = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
            `SELECT sectors FROM "${schema}".workspace_profile WHERE tenant_id = $1 LIMIT 1`,
            [event.tenantId]
          ), { operation: 'query workspace_profile' });
          const sectors = getFirstRow(profile)?.sectors;
          const sectorCode = Array.isArray(sectors) ? String(sectors[0]) : (typeof sectors === 'string' ? sectors : null);
          if (sectorCode) {
            const { assignSectorTrainingToUser } = await import('./training-advanced.service.js');
            sectorAssigned = await assignSectorTrainingToUser(
              event.tenantId, userId, sectorCode, String(event.payload?.role || '')
            );
          }
        } catch { /* non-fatal */ }

        // Fallback: assign global mandatory content not already covered by sector path
        if (sectorAssigned === 0) {
          const mandatoryContent = await safeQuery(
            `SELECT content_id, title FROM "${schema}".training_content
             WHERE is_mandatory = TRUE AND is_active = TRUE AND deleted_at IS NULL`
          );
          for (const content of mandatoryContent.rows) {
            await autoAssignTrainingToUsers(event.tenantId, String(content.content_id), [userId], {
              triggerSource: 'foundation.user.created',
              dueDate: addDays(30),
            });
          }
        }
      } catch { /* non-fatal */ }
    });

    // 7. Risk appetite breach → assign training to risk managers
    eventBus.subscribe('risk.exceeded_appetite', 'training-hook-risk-appetite', async (event) => {
      if (!event.tenantId) return;
      const content = await resolveTrainingContentForDomain(event.tenantId, 'risk');
      if (!content) return;
      try {
        const managers = await safeQuery(
          `SELECT user_id FROM public.users
           WHERE tenant_id = $1 AND role = 'risk_manager' AND status = 'active' LIMIT 5`,
          [event.tenantId]
        );
        if (managers.rows.length === 0) return;
        await autoAssignTrainingToUsers(
          event.tenantId,
          content.contentId,
          managers.rows.map((r: GenericRow) => r.user_id),
          { triggerSource: 'risk.exceeded_appetite', dueDate: addDays(14) }
        );
      } catch { /* non-fatal */ }
    });

    // ────────────────────────────────────────────────────────────────────────
    // OUTBOUND: Training events → Other modules
    // ────────────────────────────────────────────────────────────────────────

    // 8. Training completed (passed) → auto-create evidence record
    eventBus.subscribe('training.assignment_completed', 'training-hook-evidence-create', async (event) => {
      if (!event.tenantId) return;
      if (!event.payload?.passed) return;
      const schema = tenantSchema(event.tenantId);
      try {
        await safeQuery(
          `INSERT INTO "${schema}".evidence_items
             (title, description, source_type, source_id, status, collected_by, collected_at)
           VALUES ($1, $2, 'training', $3, 'collected', $4, NOW())
           ON CONFLICT DO NOTHING`,
          [
            `Training completion: ${event.payload.contentTitle || event.entityId}`,
            `Auto-generated evidence from training assignment ${event.entityId}. Score: ${event.payload.score || 'N/A'}`,
            event.entityId || 'any',
            event.payload.userId || SYSTEM_JOB_ACTOR,
          ]
        );
        await eventBus.publish({
          eventType: 'evidence.collected', tenantId: event.tenantId,
          sourceService: 'training-hooks', entityType: 'evidence',
          entityId: event.entityId || '', severity: 'info',
          payload: { source: 'training_completion', assignmentId: event.entityId },
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      } catch { /* evidence table schema may differ — non-fatal */ }
    });

    // 9. Certification issued → reduce competency-related risk residual scores
    eventBus.subscribe('training.certification_issued', 'training-hook-risk-reduce', async (event) => {
      if (!event.tenantId) return;
      const schema = tenantSchema(event.tenantId);
      try {
        const compRisks = await safeQuery(
          `SELECT risk_id, residual_score FROM "${schema}".risks
           WHERE category = 'competency' AND status != 'closed' AND deleted_at IS NULL
           LIMIT 10`
        );
        for (const risk of compRisks.rows) {
          const prevScore = risk.residual_score || 10;
          const newScore = Math.max(1, Math.round(prevScore * 0.9));
          if (newScore === prevScore) continue;
          await safeQuery(
            `UPDATE "${schema}".risks SET residual_score = $1, updated_at = NOW() WHERE risk_id = $2`,
            [newScore, risk.risk_id]
          );
          await eventBus.publish({
            eventType: 'risk.score_changed', tenantId: event.tenantId,
            sourceService: 'training-hooks', entityType: 'risk',
            entityId: risk.risk_id, severity: 'info',
            payload: { reason: 'certification_issued', previousScore: prevScore, newScore, residualScore: newScore },
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }
      } catch { /* non-fatal */ }
    });

    // 10. Training overdue → governance action item
    eventBus.subscribe('training.assignment_overdue', 'training-hook-governance-overdue', async (event) => {
      if (!event.tenantId) return;
      const count = Number(event.payload?.count || 0);
      if (count === 0) return;
      const schema = tenantSchema(event.tenantId);
      try {
        const priority = count >= 10 ? 'high' : 'medium';
        const result = await safeQuery(
          `INSERT INTO "${schema}".governance_action_items
            (title_en, title_ar, description, priority, status, source_type, board_attention, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'open', 'training', $5, NOW(), NOW())
           RETURNING action_id`,
          [
            `Training overdue: ${count} assignment(s) past due`,
            `تدريب متأخر: ${count} مهمة متأخرة`,
            `${count} training assignments are overdue. Immediate action required.`,
            priority,
            count >= 10,
          ]
        );
        const actionId = getFirstRow(result)?.action_id;
        if (actionId) {

          await emitEvent({
            tenantId: event.tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
            entityType: 'governance_action', entityId: String(actionId),
            data: { source_type: 'training', priority, overdueCount: count },
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }
      } catch { /* non-fatal */ }
    });

    // 11. Certifications expiring → governance action item
    eventBus.subscribe('training.certification_expiring', 'training-hook-governance-cert', async (event) => {
      if (!event.tenantId) return;
      const count = event.payload?.count || 0;
      if (count === 0) return;
      const schema = tenantSchema(event.tenantId);
      try {
        const result = await safeQuery(
          `INSERT INTO "${schema}".governance_action_items
            (title_en, title_ar, description, priority, status, source_type, board_attention, created_at, updated_at)
           VALUES ($1, $2, $3, 'medium', 'open', 'training', FALSE, NOW(), NOW())
           RETURNING action_id`,
          [
            `Certifications expiring: ${count} within 30 days`,
            `شهادات تنتهي صلاحيتها: ${count} خلال 30 يومًا`,
            `${count} training certifications are expiring soon. Schedule recertification.`,
          ]
        );
        const actionId = getFirstRow(result)?.action_id;
        if (actionId) {

          await emitEvent({
            tenantId: event.tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
            entityType: 'governance_action', entityId: String(actionId),
            data: { source_type: 'training', priority: 'medium', expiringCount: count },
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }
      } catch { /* non-fatal */ }
    });

    // 12. Training completed → update compliance posture
    eventBus.subscribe('training.assignment_completed', 'training-hook-compliance-posture', async (event) => {
      if (!event.tenantId) return;
      try {
        const { getTrainingComplianceSnapshot } = await import('./training-advanced.service.js');
        const snapshot = await getTrainingComplianceSnapshot(event.tenantId);
        if (!snapshot) return;
        await eventBus.publish({
          eventType: 'compliance.posture_changed', tenantId: event.tenantId,
          sourceService: 'training-hooks', severity: 'info',
          entityId: event.entityId || '', entityType: 'training',
          payload: {
            source: 'training_completion',
            trainingComplianceStatus: snapshot.complianceStatus,
            completionPct: snapshot.completionPct,
          },
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      } catch { /* non-fatal */ }
    });

    // 13. Training completed → synchronize OpenFGA RBAC mathematically
    eventBus.subscribe('training.assignment_completed', 'training-hook-authz-sync', async (event) => {
      if (!event.tenantId || !event.payload?.userId || !event.payload?.contentId) return;
      // Only grant permissions if the training was successfully passed
      const isActive = event.payload?.passed === true;
      try {
        await syncCertificationAuthZState(
          event.tenantId, 
          event.payload.userId as string, 
          event.payload.contentId as string, 
          isActive
        );
      } catch { /* non-fatal authorization propagation error */ }
    });

    logger.info('[TrainingHooks] 13 cross-module event subscriptions registered');
  } catch (err: unknown) {
    logger.error(`[TrainingHooks] Failed to register event subscriptions: ${toErrorMessage(err)}`);
  }
}
