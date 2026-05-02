"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_1 = require("@dos/platform-core/http");
const session_middleware_1 = require("../middleware/session.middleware");
const auth_orchestrator_service_1 = require("../identity/auth-orchestrator.service");
const access_snapshot_service_1 = require("../access/access-snapshot.service");
const mfa_service_1 = require("../mfa/mfa.service");
const db_1 = require("@dos/db");
const router = (0, express_1.Router)();
router.get('/', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    const userResult = await (0, db_1.safeQuery)(`SELECT user_id, email, name, role, status, tenant_id, onboarding_complete,
            member_onboarded, is_super_admin, avatar_url, locale, timezone,
            created_at, last_login_at
     FROM users WHERE user_id = $1`, [userId]);
    const user = userResult.rows[0];
    if (!user) {
        res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        return;
    }
    const allRoles = await (0, auth_orchestrator_service_1.resolveUserRoles)(userId, tenantId || user.tenant_id, user.role);
    let orgName = '';
    try {
        const tenantResult = await (0, db_1.safeQuery)('SELECT org_name FROM tenants WHERE tenant_id = $1', [user.tenant_id]);
        orgName = tenantResult.rows[0]?.org_name || '';
    }
    catch (_e) { /* non-critical */ }
    let mfaEnabled = false;
    try {
        const mfa = await (0, mfa_service_1.getMfaStatus)(userId);
        mfaEnabled = mfa.enabled;
    }
    catch (_e) { /* non-critical */ }
    res.json({
        userId: user.user_id,
        email: user.email,
        name: user.name || '',
        role: allRoles[0] || user.role,
        roles: allRoles,
        tenantId: user.tenant_id,
        orgName,
        status: user.status,
        onboardingComplete: user.onboarding_complete ?? false,
        memberOnboarded: user.member_onboarded ?? false,
        isSuperAdmin: user.is_super_admin === true,
        avatarUrl: user.avatar_url || null,
        locale: user.locale || 'en',
        timezone: user.timezone || 'UTC',
        mfaEnabled,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
    });
}));
router.get('/access-snapshot', session_middleware_1.authenticate, (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const snapshot = await (0, access_snapshot_service_1.getAccessSnapshot)(tenantId, userId);
    res.json({ data: snapshot });
}));
exports.default = router;
//# sourceMappingURL=me.routes.js.map