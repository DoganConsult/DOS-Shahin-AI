"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const http_1 = require("@dos/platform-core/http");
const http_2 = require("@dos/platform-core/http");
const credential_recovery_service_1 = require("../identity/credential-recovery.service");
const resilience_1 = require("@dos/platform-core/resilience");
const router = (0, express_1.Router)();
const verifyBody = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
const resendBody = zod_1.z.object({
    email: zod_1.z.string().email().max(254),
});
router.post('/verify-email', (0, http_2.validate)({ body: verifyBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const success = await (0, credential_recovery_service_1.verifyEmail)(req.body.token);
    if (!success) {
        res.status(400).json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
        return;
    }
    res.json({ success: true, message: 'Email verified successfully' });
}));
router.post('/resend-verification', (0, http_2.validate)({ body: resendBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const { safeQuery } = await import('@dos/db');
    const userResult = await safeQuery('SELECT user_id, tenant_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]).catch(() => ({ rows: [] }));
    const user = userResult.rows[0];
    if (user) {
        await (0, credential_recovery_service_1.requestEmailVerification)(user.user_id, email, user.tenant_id || 'system').catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {
            tenantId: user.tenant_id || 'system',
            operation: 'dauth:resend-email-verification',
        }));
    }
    res.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
}));
exports.default = router;
//# sourceMappingURL=email-verification.routes.js.map