// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
const ENVIRONMENT_ORDER = {
    development: 0,
    staging: 1,
    production: 2,
};
const summaryCache = new Map();
const SUMMARY_CACHE_TTL_MS = 60_000;
export async function createBreakGlass(tenantId, input) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
export async function revokeBreakGlass(tenantId, breakGlassId, revokedBy) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
export async function listBreakGlassEntries(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const where = [];
    const params = [];
    let idx = 1;
    if (filters?.status) {
        where.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    if (filters?.registry_type) {
        where.push(`registry_type = $${idx++}`);
        params.push(filters.registry_type);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = filters?.offset || 0;
    const effectiveCte = `WITH bg AS (
    SELECT *,
      CASE WHEN status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW() THEN 'expired' ELSE status END AS effective_status
    FROM "${schema}".ai_governance_break_glass
  )`;
    const effectiveWhere = whereClause.replace(/status/g, 'effective_status');
    const countResult = await safeQuery(`${effectiveCte} SELECT COUNT(*)::int AS total FROM bg ${effectiveWhere}`, params);
    const dataResult = await safeQuery(`${effectiveCte} SELECT *, effective_status AS status FROM bg ${effectiveWhere}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
    return { items: dataResult.rows, total: countResult.rows[0]?.total ?? 0 };
}
export async function recordPromotion(tenantId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function listPromotions(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const where = [];
    const params = [];
    let idx = 1;
    if (filters?.registry_type) {
        where.push(`registry_type = $${idx++}`);
        params.push(filters.registry_type);
    }
    if (filters?.asset_id) {
        where.push(`asset_id = $${idx++}`);
        params.push(filters.asset_id);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = filters?.offset || 0;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".ai_governance_promotions ${whereClause}`, params);
    const dataResult = await safeQuery(`SELECT * FROM "${schema}".ai_governance_promotions ${whereClause}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
    return { items: dataResult.rows, total: countResult.rows[0]?.total ?? 0 };
}
export async function expireBreakGlassEntries(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_governance_break_glass
     SET status = 'expired'
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()
     RETURNING break_glass_id, asset_id, registry_type`, []);
    if (result.rows.length > 0) {
        invalidateSummaryCache(tenantId);
    }
    for (const row of result.rows) {
        try {
            await recordAudit({
                tenantId,
                userId: SYSTEM_JOB_ACTOR,
                module: 'ai-governance-ops',
                action: 'break_glass_expired',
                entityType: row.registry_type,
                entityId: row.asset_id,
                afterState: { break_glass_id: row.break_glass_id, expired_by: 'auto' },
            });
        }
        catch { }
    }
    return result.rows.length;
}
export function invalidateSummaryCache(tenantId) {
    if (tenantId) {
        summaryCache.delete(tenantId);
    }
    else {
        summaryCache.clear();
    }
}
export async function getGovernanceEventSummary(tenantId) {
    const cached = summaryCache.get(tenantId);
    if (cached && Date.now() - cached.ts < SUMMARY_CACHE_TTL_MS) {
        return cached.data;
    }
    const schema = tenantSchema(tenantId);
    const thirtyDaysAgo = "NOW() - INTERVAL '30 days'";
    const queries = await Promise.all([
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_model_registry WHERE approval_status = 'pending_approval'`, [])
            .then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_prompt_registry WHERE approval_status = 'pending_approval'`, [])
            .then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_agent_registry WHERE approval_status = 'pending_approval'`, [])
            .then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'update'
       AND after_state->>'approval_status' = 'approved'
       AND timestamp >= ${thirtyDaysAgo}`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'update'
       AND after_state->>'approval_status' = 'rejected'
       AND timestamp >= ${thirtyDaysAgo}`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'sod_check'
       AND before_state->>'conflict' = 'true'
       AND timestamp >= ${thirtyDaysAgo}`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_governance_break_glass WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_governance_break_glass`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module LIKE 'ai-%' AND action = 'update'
       AND after_state->>'rollback_from_version_id' IS NOT NULL
       AND timestamp >= ${thirtyDaysAgo}`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
        safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail
       WHERE module = 'ai-governance-ops' AND action = 'break_glass'
       AND timestamp >= ${thirtyDaysAgo}`, []).then(r => r.rows[0]?.cnt ?? 0).catch(() => 0),
    ]);
    const summary = {
        pending_approvals: queries[0] + queries[1] + queries[2],
        recent_approvals: queries[3],
        recent_rejections: queries[4],
        sod_conflicts: queries[5],
        break_glass_active: queries[6],
        break_glass_total: queries[7],
        rollback_events: queries[8],
        enforcement_blocks: queries[9],
    };
    summaryCache.set(tenantId, { data: summary, ts: Date.now() });
    return summary;
}
export async function listGovernanceAuditEvents(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const where = [`module LIKE 'ai-%' OR module = 'ai-governance-ops'`];
    const params = [];
    let _idx = 1;
    if (filters?.event_type === 'approvals') {
        where.push(`(action = 'update' AND (after_state->>'approval_status' = 'approved' OR after_state->>'approval_status' = 'rejected'))`);
    }
    else if (filters?.event_type === 'sod_conflicts') {
        where.push(`action = 'sod_check'`);
    }
    else if (filters?.event_type === 'break_glass') {
        where.push(`action IN ('break_glass', 'break_glass_revoke')`);
    }
    else if (filters?.event_type === 'rollbacks') {
        where.push(`(action = 'update' AND after_state->>'rollback_from_version_id' IS NOT NULL)`);
    }
    else if (filters?.event_type === 'promotions') {
        where.push(`action = 'promotion'`);
    }
    const whereClause = `WHERE ${where.join(' AND ')}`;
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = filters?.offset || 0;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail ${whereClause}`, params);
    const dataResult = await safeQuery(`SELECT entry_id, timestamp, user_id, module, action, entity_type, entity_id,
            before_state, after_state
     FROM "${schema}".audit_trail ${whereClause}
     ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`, params);
    return { items: dataResult.rows, total: countResult.rows[0]?.total ?? 0 };
}
//# sourceMappingURL=ai-governance-ops.service.js.map