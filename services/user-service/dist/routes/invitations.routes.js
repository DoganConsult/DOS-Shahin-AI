"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitationsRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const db_1 = require("@dos/db");
const rate_limiter_1 = require("../middleware/rate-limiter");
const user_errors_1 = require("../domain/contracts/user-errors");
exports.invitationsRouter = (0, express_1.Router)();
exports.invitationsRouter.use(auth_adapter_1.authenticate);
exports.invitationsRouter.use(auth_adapter_1.requireTenantId);
exports.invitationsRouter.use((0, http_1.auditMiddleware)('invitation'));
exports.invitationsRouter.get('/', (0, auth_adapter_1.requirePermission)('invitation.read'), (0, http_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const status = String(req.query.status || '').trim();
    const params = [req.tenantId];
    let where = 'tenant_id = $1';
    if (status) {
        params.push(status);
        where += ` AND status = $${params.length}`;
    }
    params.push(limit, offset);
    const result = await (0, db_1.query)(`SELECT invitation_id, email, display_name, role, department_id, status,
              batch_id, invited_by, invited_at, accepted_at, expires_at
         FROM dos.invitations
        WHERE ${where}
        ORDER BY invited_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ invitations: result.rows, total: result.rows.length });
}));
exports.invitationsRouter.post('/', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requirePermission)('invitation.write'), (0, http_1.asyncHandler)(async (req, res) => {
    const { email, display_name, role, department_id } = req.body || {};
    if (!email)
        throw new user_errors_1.UserServiceError('VALIDATION_FAILED', 'email is required');
    const actor = req.user.userId;
    const result = await (0, db_1.query)(`INSERT INTO dos.invitations (tenant_id, email, display_name, role, department_id, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, email) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             role = EXCLUDED.role,
             department_id = EXCLUDED.department_id,
             invited_by = EXCLUDED.invited_by,
             status = 'pending',
             invited_at = NOW(),
             expires_at = NOW() + INTERVAL '14 days'
       RETURNING *`, [req.tenantId, email, display_name || null, role || null, department_id || null, actor]);
    (0, http_1.setAuditData)(res, { action: 'invitation.create', entityType: 'invitation', entityId: result.rows[0].invitation_id });
    res.status(201).json({ invitation: result.rows[0] });
}));
exports.invitationsRouter.post('/:id/resend', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requirePermission)('invitation.write'), (0, http_1.asyncHandler)(async (req, res) => {
    const result = await (0, db_1.query)(`UPDATE dos.invitations
          SET invited_at = NOW(),
              expires_at = NOW() + INTERVAL '14 days',
              status = 'pending'
        WHERE invitation_id = $1 AND tenant_id = $2
        RETURNING *`, [req.params.id, req.tenantId]);
    if (result.rows.length === 0)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', 'invitation not found');
    (0, http_1.setAuditData)(res, { action: 'invitation.resend', entityType: 'invitation', entityId: req.params.id });
    res.json({ invitation: result.rows[0] });
}));
exports.invitationsRouter.delete('/:id', rate_limiter_1.writeRateLimiter, (0, auth_adapter_1.requirePermission)('invitation.write'), (0, http_1.asyncHandler)(async (req, res) => {
    const result = await (0, db_1.query)(`DELETE FROM dos.invitations WHERE invitation_id = $1 AND tenant_id = $2 RETURNING invitation_id`, [req.params.id, req.tenantId]);
    if (result.rows.length === 0)
        throw new user_errors_1.UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', 'invitation not found');
    (0, http_1.setAuditData)(res, { action: 'invitation.delete', entityType: 'invitation', entityId: req.params.id });
    res.json({ success: true });
}));
//# sourceMappingURL=invitations.routes.js.map