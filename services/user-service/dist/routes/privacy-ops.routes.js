"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyOpsRouter = void 0;
const express_1 = require("express");
const node_crypto_1 = require("node:crypto");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const db_1 = require("@dos/db");
// W5.F5.1 — Foundation-owned RoPA surface, mounted in user-service when no
// dedicated privacy-service is configured. Backed by public.privacy_processing_activities.
exports.privacyOpsRouter = (0, express_1.Router)();
exports.privacyOpsRouter.use(auth_adapter_1.authenticate);
exports.privacyOpsRouter.use(auth_adapter_1.requireTenantId);
exports.privacyOpsRouter.use((0, http_1.auditMiddleware)('privacy_ops'));
exports.privacyOpsRouter.get('/ropa', (0, auth_adapter_1.requireAnyPermission)('admin', 'privacy_admin', 'compliance_admin', 'privacy_read', 'member'), (0, http_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const r = await (0, db_1.query)(`SELECT activity_id, tenant_id, name AS name_en, name_ar, purpose AS description,
              lawful_basis AS legal_basis, data_categories, retention_period, controller, processor,
              cross_border, status, created_at, updated_at
         FROM public.privacy_processing_activities
        WHERE tenant_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`, [req.tenantId, limit, offset]);
    const c = await (0, db_1.query)(`SELECT COUNT(*)::int AS count FROM public.privacy_processing_activities WHERE tenant_id = $1 AND deleted_at IS NULL`, [req.tenantId]);
    res.json({ activities: r.rows, total: c.rows[0]?.count ?? 0, limit, offset });
}));
exports.privacyOpsRouter.post('/ropa', (0, auth_adapter_1.requireAnyPermission)('admin', 'privacy_admin', 'compliance_admin'), (0, http_1.asyncHandler)(async (req, res) => {
    const b = req.body ?? {};
    const name = String(b.name_en ?? b.name ?? '').trim();
    if (!name) {
        res.status(400).json({ success: false, error: 'name_en (or name) required' });
        return;
    }
    const id = (0, node_crypto_1.randomUUID)();
    const cats = Array.isArray(b.data_categories) ? b.data_categories : (b.data_categories ? [String(b.data_categories)] : []);
    const r = await (0, db_1.query)(`INSERT INTO public.privacy_processing_activities
         (activity_id, tenant_id, name, name_ar, purpose, lawful_basis, data_categories,
          retention_period, controller, processor, cross_border, description, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10, COALESCE($11,false), $12, COALESCE($13,'active'), $14, NOW(), NOW())
       RETURNING *`, [id, req.tenantId, name, b.name_ar ?? null, b.description ?? b.purpose ?? null,
        b.legal_basis ?? b.lawful_basis ?? null, cats,
        b.retention_period ?? null, b.controller ?? null, b.processor ?? null,
        b.cross_border ?? false, b.description ?? null, b.status ?? null, req.user?.userId ?? null]);
    res.status(201).json({ success: true, data: r.rows[0] });
}));
exports.privacyOpsRouter.put('/ropa/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'privacy_admin', 'compliance_admin'), (0, http_1.asyncHandler)(async (req, res) => {
    const b = req.body ?? {};
    const cats = Array.isArray(b.data_categories) ? b.data_categories : null;
    const r = await (0, db_1.query)(`UPDATE public.privacy_processing_activities
          SET name = COALESCE($3, name),
              name_ar = COALESCE($4, name_ar),
              purpose = COALESCE($5, purpose),
              lawful_basis = COALESCE($6, lawful_basis),
              data_categories = COALESCE($7::text[], data_categories),
              retention_period = COALESCE($8, retention_period),
              controller = COALESCE($9, controller),
              processor = COALESCE($10, processor),
              cross_border = COALESCE($11, cross_border),
              description = COALESCE($12, description),
              status = COALESCE($13, status),
              updated_at = NOW()
        WHERE activity_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING *`, [req.params.id, req.tenantId, b.name_en ?? b.name ?? null, b.name_ar ?? null,
        b.description ?? b.purpose ?? null, b.legal_basis ?? b.lawful_basis ?? null, cats,
        b.retention_period ?? null, b.controller ?? null, b.processor ?? null,
        b.cross_border ?? null, b.description ?? null, b.status ?? null]);
    if (r.rows.length === 0) {
        res.status(404).json({ success: false, error: 'RoPA entry not found' });
        return;
    }
    res.json({ success: true, data: r.rows[0] });
}));
exports.privacyOpsRouter.delete('/ropa/:id', (0, auth_adapter_1.requireAnyPermission)('admin', 'privacy_admin', 'compliance_admin'), (0, http_1.asyncHandler)(async (req, res) => {
    const r = await (0, db_1.query)(`UPDATE public.privacy_processing_activities
          SET deleted_at = NOW(), updated_at = NOW()
        WHERE activity_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING activity_id`, [req.params.id, req.tenantId]);
    if (r.rows.length === 0) {
        res.status(404).json({ success: false, error: 'RoPA entry not found' });
        return;
    }
    res.json({ success: true, message: 'RoPA entry deleted' });
}));
//# sourceMappingURL=privacy-ops.routes.js.map