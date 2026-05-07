import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { getFirstRow } from '@dos/db';
import { logger } from '../ports/logger.port.js';
import { toErrorMessage } from '@dos/module-sdk';
export async function getAiGovernanceDiagnostics(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const [systems, modelCards, policies, dpias, reviews, supplyChain] = await Promise.all([
            getSystemHealth(schema),
            getModelCardHealth(schema),
            getPolicyHealth(schema),
            getDpiaHealth(schema),
            getOverdueReviewCount(schema),
            getSupplyChainRisks(schema),
        ]);
        return {
            tenantId,
            totalSystems: systems.total,
            highRiskSystems: systems.highRisk,
            registeredSystems: systems.registered,
            deployedSystems: systems.deployed,
            suspendedSystems: systems.suspended,
            totalModelCards: modelCards.total,
            activeModelCards: modelCards.active,
            totalPolicies: policies.total,
            activePolicies: policies.active,
            pendingDpias: dpias.pending,
            expiredDpias: dpias.expired,
            overdueReviews: reviews,
            supplyChainRisks: supplyChain,
            capturedAt: new Date().toISOString(),
        };
    }
    catch (err) {
        logger.error('[AiGovernanceDiagnostics] getAiGovernanceDiagnostics failed', {
            tenantId, error: toErrorMessage(err),
        });
        return {
            tenantId,
            totalSystems: 0, highRiskSystems: 0, registeredSystems: 0,
            deployedSystems: 0, suspendedSystems: 0,
            totalModelCards: 0, activeModelCards: 0,
            totalPolicies: 0, activePolicies: 0,
            pendingDpias: 0, expiredDpias: 0,
            overdueReviews: 0, supplyChainRisks: 0,
            capturedAt: new Date().toISOString(),
        };
    }
}
async function getSystemHealth(schema) {
    const result = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE risk_level IN ('high', 'unacceptable'))::int AS high_risk,
       COUNT(*) FILTER (WHERE status = 'registered')::int AS registered,
       COUNT(*) FILTER (WHERE status = 'deployed')::int AS deployed,
       COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
     FROM "${schema}".ai_system_registry
     WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, high_risk: 0, registered: 0, deployed: 0, suspended: 0 }] }));
    const row = getFirstRow(result) ?? {};
    return {
        total: row.total ?? 0,
        highRisk: row.high_risk ?? 0,
        registered: row.registered ?? 0,
        deployed: row.deployed ?? 0,
        suspended: row.suspended ?? 0,
    };
}
async function getModelCardHealth(schema) {
    const result = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active
     FROM "${schema}".ai_model_cards
     WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, active: 0 }] }));
    return getFirstRow(result) ?? { total: 0, active: 0 };
}
async function getPolicyHealth(schema) {
    const result = await safeQuery(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active
     FROM "${schema}".ai_governance_policies
     WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, active: 0 }] }));
    return getFirstRow(result) ?? { total: 0, active: 0 };
}
async function getDpiaHealth(schema) {
    const result = await safeQuery(`SELECT
       COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress', 'under_review'))::int AS pending,
       COUNT(*) FILTER (WHERE status = 'expired' OR (expires_at IS NOT NULL AND expires_at < NOW()))::int AS expired
     FROM "${schema}".ai_dpias
     WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ pending: 0, expired: 0 }] }));
    return getFirstRow(result) ?? { pending: 0, expired: 0 };
}
async function getOverdueReviewCount(schema) {
    const result = await safeQuery(`SELECT COUNT(*)::int AS overdue
     FROM "${schema}".ai_system_registry
     WHERE status IN ('registered', 'deployed', 'approved')
       AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '90 days')
       AND deleted_at IS NULL`).catch(() => ({ rows: [{ overdue: 0 }] }));
    return getFirstRow(result)?.overdue ?? 0;
}
async function getSupplyChainRisks(schema) {
    const result = await safeQuery(`SELECT COUNT(*)::int AS risks
     FROM "${schema}".ai_supply_chain
     WHERE risk_level = 'high' AND status = 'active'
       AND deleted_at IS NULL`).catch(() => ({ rows: [{ risks: 0 }] }));
    return getFirstRow(result)?.risks ?? 0;
}
export async function getRegistryIntegrityDiagnostics(tenantId, limit = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT
         asr.system_id,
         asr.code,
         asr.name_en,
         asr.risk_level,
         asr.status,
         CASE
           WHEN asr.owner_id IS NULL THEN 'no_owner'
           WHEN asr.last_reviewed_at IS NULL THEN 'never_reviewed'
           WHEN asr.last_reviewed_at < NOW() - INTERVAL '90 days' THEN 'review_overdue'
           ELSE 'ok'
         END AS issue_type,
         asr.last_reviewed_at,
         asr.created_at
       FROM "${schema}".ai_system_registry asr
       WHERE asr.deleted_at IS NULL
         AND (
           asr.owner_id IS NULL
           OR asr.last_reviewed_at IS NULL
           OR asr.last_reviewed_at < NOW() - INTERVAL '90 days'
         )
       ORDER BY
         CASE asr.risk_level WHEN 'unacceptable' THEN 0 WHEN 'high' THEN 1 WHEN 'limited' THEN 2 ELSE 3 END ASC,
         asr.created_at ASC
       LIMIT $1`, [limit]).catch(() => ({ rows: [] }));
        return result.rows.map((r) => ({
            systemId: r.system_id,
            code: r.code,
            nameEn: r.name_en,
            riskLevel: r.risk_level,
            status: r.status,
            issueType: r.issue_type,
            lastReviewedAt: r.last_reviewed_at?.toISOString?.() ?? r.last_reviewed_at,
            createdAt: r.created_at?.toISOString?.() ?? r.created_at,
        }));
    }
    catch (err) {
        logger.warn('[AiGovernanceDiagnostics] getRegistryIntegrityDiagnostics failed', {
            tenantId, error: toErrorMessage(err),
        });
        return [];
    }
}
export async function getMissingDocumentationDiagnostics(tenantId, limit = 30) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT
         asr.system_id,
         asr.code,
         asr.name_en,
         asr.risk_level,
         CASE
           WHEN mc.model_card_id IS NULL THEN 'missing_model_card'
           WHEN dp.dpia_id IS NULL AND asr.risk_level IN ('high', 'unacceptable') THEN 'missing_dpia'
           ELSE 'missing_documentation'
         END AS doc_issue
       FROM "${schema}".ai_system_registry asr
       LEFT JOIN "${schema}".ai_model_cards mc ON mc.system_id = asr.system_id AND mc.deleted_at IS NULL AND mc.status = 'active'
       LEFT JOIN "${schema}".ai_dpias dp ON dp.system_id = asr.system_id AND dp.deleted_at IS NULL AND dp.status = 'completed'
       WHERE asr.deleted_at IS NULL
         AND asr.status IN ('registered', 'deployed', 'approved')
         AND (mc.model_card_id IS NULL OR (dp.dpia_id IS NULL AND asr.risk_level IN ('high', 'unacceptable')))
       ORDER BY
         CASE asr.risk_level WHEN 'unacceptable' THEN 0 WHEN 'high' THEN 1 ELSE 2 END ASC
       LIMIT $1`, [limit]).catch(() => ({ rows: [] }));
        return result.rows.map((r) => ({
            systemId: r.system_id,
            code: r.code,
            nameEn: r.name_en,
            riskLevel: r.risk_level,
            docIssue: r.doc_issue,
        }));
    }
    catch (err) {
        logger.warn('[AiGovernanceDiagnostics] getMissingDocumentationDiagnostics failed', {
            tenantId, error: toErrorMessage(err),
        });
        return [];
    }
}
//# sourceMappingURL=ai-governance-diagnostics.service.js.map