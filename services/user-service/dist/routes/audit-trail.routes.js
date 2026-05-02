"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditTrailRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const db_1 = require("@dos/db");
exports.auditTrailRouter = (0, express_1.Router)();
exports.auditTrailRouter.use(auth_adapter_1.authenticate);
exports.auditTrailRouter.use(auth_adapter_1.requireTenantId);
exports.auditTrailRouter.use((0, http_1.auditMiddleware)('audit_trail'));
function buildAuditWhere(tenantId, q) {
    const params = [tenantId];
    const conds = ['tenant_id = $1'];
    const push = (col, raw) => {
        const v = String(raw ?? '').trim();
        if (!v)
            return;
        params.push(v);
        conds.push(`${col} = $${params.length}`);
    };
    push('module', q.module);
    push('actor_id', q.actor_id);
    push('action', q.action);
    push('entity_type', q.entity_type);
    push('entity_id', q.entity_id);
    const from = String(q.from ?? '').trim();
    const to = String(q.to ?? '').trim();
    if (from) {
        params.push(from);
        conds.push(`created_at >= $${params.length}`);
    }
    if (to) {
        params.push(to);
        conds.push(`created_at <= $${params.length}`);
    }
    return { where: conds.join(' AND '), params };
}
exports.auditTrailRouter.get('/', (0, auth_adapter_1.requirePermission)('audit_trail.read'), (0, http_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { where, params } = buildAuditWhere(req.tenantId, req.query);
    const countRes = await (0, db_1.query)(`SELECT COUNT(*)::int AS count FROM dos.audit_trail WHERE ${where}`, params);
    const listParams = [...params, limit, offset];
    const result = await (0, db_1.query)(`SELECT entry_id, actor_id, action, entity_type, entity_id, module, payload, created_at
         FROM dos.audit_trail
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
    res.json({ entries: result.rows, total: countRes.rows[0]?.count ?? 0, limit, offset });
}));
// W5.F5.3 — CSV export of filtered audit rows. Hard cap at 50k rows.
exports.auditTrailRouter.get('/export', (0, auth_adapter_1.requirePermission)('audit_trail.read'), (0, http_1.asyncHandler)(async (req, res) => {
    const { where, params } = buildAuditWhere(req.tenantId, req.query);
    const result = await (0, db_1.query)(`SELECT entry_id, actor_id, action, entity_type, entity_id, module, payload, created_at
         FROM dos.audit_trail
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT 50000`, params);
    const escape = (v) => {
        if (v === null || v === undefined)
            return '';
        const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'entry_id,actor_id,action,entity_type,entity_id,module,payload,created_at\n';
    const body = result.rows
        .map((r) => [r.entry_id, r.actor_id, r.action, r.entity_type, r.entity_id, r.module, r.payload, r.created_at].map(escape).join(','))
        .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${Date.now()}.csv"`);
    res.send(header + body + '\n');
}));
//# sourceMappingURL=audit-trail.routes.js.map