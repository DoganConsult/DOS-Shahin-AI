"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuthDecision = logAuthDecision;
exports.queryDecisionLog = queryDecisionLog;
exports.getDecisionsByCorrelation = getDecisionsByCorrelation;
exports.getDecisionSummary = getDecisionSummary;
exports.getRecentDenials = getRecentDenials;
/**
 * DAuth Audit — decision logging to authz_decision_log.
 * §Q.1: Every sensitive decision logs actor, tenant, permission, scope, outcome, reason.
 */
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
async function logAuthDecision(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const enriched = {
        ...(data.context || {}),
        reasonCode: data.reasonCode,
        reasonCodes: data.reasonCode ? [data.reasonCode] : undefined,
        policyVersion: data.policyVersion,
        modelVersion: data.modelVersion,
        engineResults: data.engineResults,
        obligations: data.obligations,
    };
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".authz_decision_log
     (user_id, permission_code, module_code, decision, reason, matched_role,
      matched_scope_type, authority_level, correlation_id, record_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
        data.userId, data.permissionCode, data.moduleCode || null,
        data.decision, data.reason, data.matchedRole || null,
        data.scopeType || null, data.authorityLevel || null,
        data.correlationId || null,
        JSON.stringify(enriched),
    ]);
}
/**
 * Query the decision log with flexible filters and pagination.
 * Supports filtering by userId, permissionCode, decision, moduleCode,
 * correlationId, and date range.
 */
async function queryDecisionLog(tenantId, filters) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    observability_1.logger.info('dauth.audit: querying decision log', { tenantId, filters });
    const conditions = [];
    const params = [];
    let paramIdx = 1;
    if (filters.userId) {
        conditions.push(`user_id = $${paramIdx++}`);
        params.push(filters.userId);
    }
    if (filters.permissionCode) {
        conditions.push(`permission_code = $${paramIdx++}`);
        params.push(filters.permissionCode);
    }
    if (filters.decision) {
        conditions.push(`decision = $${paramIdx++}`);
        params.push(filters.decision);
    }
    if (filters.moduleCode) {
        conditions.push(`module_code = $${paramIdx++}`);
        params.push(filters.moduleCode);
    }
    if (filters.correlationId) {
        conditions.push(`correlation_id = $${paramIdx++}`);
        params.push(filters.correlationId);
    }
    if (filters.reasonCodes && filters.reasonCodes.length > 0) {
        // Two independent placeholder sets: one for scalar match, one for array overlap
        const scalarPlaceholders = filters.reasonCodes.map(() => `$${paramIdx++}`).join(', ');
        params.push(...filters.reasonCodes);
        const arrayParamIdx = paramIdx++;
        params.push(filters.reasonCodes);
        conditions.push(`(record_context->>'reasonCode' IN (${scalarPlaceholders}) OR record_context->'reasonCodes' ?| $${arrayParamIdx}::text[])`);
    }
    if (filters.policyVersion) {
        conditions.push(`record_context->>'policyVersion' = $${paramIdx++}`);
        params.push(filters.policyVersion);
    }
    if (filters.dateFrom) {
        conditions.push(`created_at >= $${paramIdx++}`);
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push(`created_at <= $${paramIdx++}`);
        params.push(filters.dateTo);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    // Get total count
    const countResult = await (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".authz_decision_log ${where}`, params);
    // Get paginated entries
    const dataResult = await (0, db_1.safeQuery)(`SELECT id, user_id, permission_code, module_code, decision, reason,
            matched_role, matched_scope_type, authority_level, correlation_id,
            record_context, created_at
     FROM "${schema}".authz_decision_log ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`, [...params, limit, offset]);
    const entries = dataResult.rows.map((r) => {
        const ctx = (r.record_context ?? {});
        return {
            logId: r.id,
            userId: r.user_id,
            permissionCode: r.permission_code,
            moduleCode: r.module_code,
            decision: r.decision,
            reason: r.reason,
            matchedRole: r.matched_role,
            scopeType: r.matched_scope_type,
            authorityLevel: r.authority_level,
            correlationId: r.correlation_id,
            context: ctx,
            createdAt: r.created_at,
            reasonCode: typeof ctx.reasonCode === 'string' ? ctx.reasonCode : undefined,
            policyVersion: typeof ctx.policyVersion === 'string' ? ctx.policyVersion : undefined,
            modelVersion: typeof ctx.modelVersion === 'string' ? ctx.modelVersion : undefined,
            engineResults: ctx.engineResults ?? undefined,
            obligations: ctx.obligations ?? undefined,
        };
    });
    return { entries, total: countResult.rows[0]?.total ?? 0 };
}
/**
 * Get all decisions sharing a correlation ID (same request/operation chain).
 */
async function getDecisionsByCorrelation(tenantId, correlationId) {
    const result = await queryDecisionLog(tenantId, { correlationId, limit: 1000 });
    return result.entries;
}
/**
 * Aggregate decision statistics over a date range:
 * total count, allow/deny split, and top denied permissions.
 */
async function getDecisionSummary(tenantId, dateFrom, dateTo) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    observability_1.logger.info('dauth.audit: generating decision summary', { tenantId, dateFrom, dateTo });
    // Overall counts
    const counts = await (0, db_1.safeQuery)(`SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE decision = 'allow')::int AS allow_count,
       COUNT(*) FILTER (WHERE decision = 'deny')::int AS deny_count
     FROM "${schema}".authz_decision_log
     WHERE created_at >= $1 AND created_at <= $2`, [dateFrom, dateTo]);
    // Top denied permissions
    const topDenied = await (0, db_1.safeQuery)(`SELECT permission_code, COUNT(*)::int AS cnt
     FROM "${schema}".authz_decision_log
     WHERE decision = 'deny' AND created_at >= $1 AND created_at <= $2
     GROUP BY permission_code
     ORDER BY cnt DESC
     LIMIT 10`, [dateFrom, dateTo]);
    const row = counts.rows[0] ?? { total: 0, allow_count: 0, deny_count: 0 };
    return {
        totalDecisions: row.total,
        allowCount: row.allow_count,
        denyCount: row.deny_count,
        topDeniedPermissions: topDenied.rows.map((r) => ({
            permissionCode: r.permission_code,
            count: r.cnt,
        })),
    };
}
/**
 * Get the most recent denied decisions for monitoring and alerting.
 * Defaults to last 20 denials if limit is not specified.
 */
async function getRecentDenials(tenantId, limit = 20) {
    const result = await queryDecisionLog(tenantId, { decision: 'deny', limit });
    return result.entries;
}
//# sourceMappingURL=decision-log.service.js.map