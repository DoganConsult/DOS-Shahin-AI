import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { logger } from '../../../ports/logger.port.js';
import { toErrorMessage } from '@dos/module-sdk';
export async function getAiGovernanceDashboard(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const [systems, modelCards, policies, dpias, supplyChain, reviews, riskBreakdown, activity] = await Promise.all([
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'deployed')::int AS deployed,
           COUNT(*) FILTER (WHERE risk_level IN ('high', 'unacceptable'))::int AS high_risk,
           COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
         FROM "${schema}".ai_system_registry WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, deployed: 0, high_risk: 0, suspended: 0 }] })),
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated
         FROM "${schema}".ai_model_cards WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, active: 0, deprecated: 0 }] })),
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM "${schema}".ai_governance_policies WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
            safeQuery(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress', 'under_review'))::int AS pending,
           COUNT(*) FILTER (WHERE status = 'expired' OR (expires_at IS NOT NULL AND expires_at < NOW()))::int AS expired
         FROM "${schema}".ai_dpias WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, completed: 0, pending: 0, expired: 0 }] })),
            safeQuery(`SELECT COUNT(*)::int AS high_risk
         FROM "${schema}".ai_supply_chain
         WHERE risk_level = 'high' AND status = 'active' AND deleted_at IS NULL`).catch(() => ({ rows: [{ high_risk: 0 }] })),
            safeQuery(`SELECT COUNT(*)::int AS overdue
         FROM "${schema}".ai_system_registry
         WHERE status IN ('registered', 'deployed', 'approved')
           AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '90 days')
           AND deleted_at IS NULL`).catch(() => ({ rows: [{ overdue: 0 }] })),
            safeQuery(`SELECT risk_level, COUNT(*)::int AS count
         FROM "${schema}".ai_system_registry
         WHERE deleted_at IS NULL
         GROUP BY risk_level
         ORDER BY CASE risk_level WHEN 'unacceptable' THEN 0 WHEN 'high' THEN 1 WHEN 'limited' THEN 2 WHEN 'minimal' THEN 3 ELSE 4 END`).catch(() => ({ rows: [] })),
            getRecentAiGovActivity(schema),
        ]);
        const s = systems.rows[0] ?? {};
        const mc = modelCards.rows[0] ?? {};
        const p = policies.rows[0] ?? {};
        const d = dpias.rows[0] ?? {};
        return {
            totalSystems: s.total ?? 0,
            deployedSystems: s.deployed ?? 0,
            highRiskSystems: s.high_risk ?? 0,
            suspendedSystems: s.suspended ?? 0,
            totalModelCards: mc.total ?? 0,
            activeModelCards: mc.active ?? 0,
            deprecatedModelCards: mc.deprecated ?? 0,
            totalPolicies: p.total ?? 0,
            activePolicies: p.active ?? 0,
            totalDpias: d.total ?? 0,
            completedDpias: d.completed ?? 0,
            pendingDpias: d.pending ?? 0,
            expiredDpias: d.expired ?? 0,
            supplyChainHighRisk: supplyChain.rows[0]?.high_risk ?? 0,
            overdueReviews: reviews.rows[0]?.overdue ?? 0,
            systemsByRiskLevel: riskBreakdown.rows.map((r) => ({
                riskLevel: r.risk_level ?? 'unclassified',
                count: r.count ?? 0,
            })),
            recentActivity: activity,
            capturedAt: new Date().toISOString(),
        };
    }
    catch (err) {
        logger.error('[AiGovDashboard] getAiGovernanceDashboard failed', { tenantId, error: toErrorMessage(err) });
        return {
            totalSystems: 0, deployedSystems: 0, highRiskSystems: 0, suspendedSystems: 0,
            totalModelCards: 0, activeModelCards: 0, deprecatedModelCards: 0,
            totalPolicies: 0, activePolicies: 0, totalDpias: 0, completedDpias: 0,
            pendingDpias: 0, expiredDpias: 0, supplyChainHighRisk: 0, overdueReviews: 0,
            systemsByRiskLevel: [], recentActivity: [],
            capturedAt: new Date().toISOString(),
        };
    }
}
export async function getAiDpiaStatusSummary(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT ad.dpia_id, ad.system_id, asr.code AS system_code, asr.name_en AS system_name,
         asr.risk_level, ad.status, ad.risk_score,
         (SELECT COUNT(*)::int FROM "${schema}".ai_dpia_mitigations adm
          WHERE adm.dpia_id = ad.dpia_id AND adm.deleted_at IS NULL) AS mitigation_count,
         (SELECT COUNT(*)::int FROM "${schema}".ai_dpia_mitigations adm
          WHERE adm.dpia_id = ad.dpia_id AND adm.status = 'open' AND adm.deleted_at IS NULL) AS open_mitigations,
         ad.conducted_by, ad.completed_at, ad.expires_at
       FROM "${schema}".ai_dpias ad
       JOIN "${schema}".ai_system_registry asr ON asr.system_id = ad.system_id
       WHERE ad.deleted_at IS NULL
       ORDER BY CASE ad.status WHEN 'in_progress' THEN 0 WHEN 'under_review' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
                ad.created_at DESC
       LIMIT 30`).catch(() => ({ rows: [] }));
        return result.rows.map((r) => ({
            dpiaId: r.dpia_id,
            systemId: r.system_id,
            systemCode: r.system_code ?? '',
            systemName: r.system_name ?? '',
            riskLevel: r.risk_level ?? '',
            status: r.status,
            riskScore: r.risk_score != null ? parseFloat(r.risk_score) : null,
            mitigationCount: r.mitigation_count ?? 0,
            openMitigations: r.open_mitigations ?? 0,
            conductedBy: r.conducted_by ?? null,
            completedAt: r.completed_at?.toISOString?.() ?? r.completed_at ?? null,
            expiresAt: r.expires_at?.toISOString?.() ?? r.expires_at ?? null,
        }));
    }
    catch (err) {
        logger.warn('[AiGovDashboard] getAiDpiaStatusSummary failed', { tenantId, error: toErrorMessage(err) });
        return [];
    }
}
async function getRecentAiGovActivity(schema) {
    const result = await safeQuery(`SELECT entity_type, entity_id, action, user_id AS performed_by, created_at AS performed_at
     FROM "${schema}".audit_trail
     WHERE module = 'ai_governance' AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 10`).catch(() => ({ rows: [] }));
    return result.rows.map((r) => ({
        entityType: r.entity_type ?? '', entityId: r.entity_id ?? '',
        action: r.action ?? '', performedBy: r.performed_by ?? '',
        performedAt: r.performed_at?.toISOString?.() ?? r.performed_at ?? '',
    }));
}
//# sourceMappingURL=ai-governance-dashboard.service.js.map