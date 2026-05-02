"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const http_1 = require("@dos/platform-core/http");
const http_2 = require("@dos/platform-core/http");
const invitation_control_service_1 = require("../identity/invitation-control.service");
const router = (0, express_1.Router)();
const acceptBody = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
const tokenQuery = zod_1.z.string().min(1).max(256);
router.get('/validate', (0, http_1.asyncHandler)(async (req, res) => {
    const parsed = tokenQuery.safeParse(req.query.token);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invitation token required', code: 'TOKEN_REQUIRED' });
        return;
    }
    const token = parsed.data;
    const invitation = await (0, invitation_control_service_1.validateInvitation)(token);
    if (!invitation) {
        res.status(400).json({ error: 'Invalid or expired invitation', code: 'INVALID_INVITATION' });
        return;
    }
    res.json({ valid: true, invitation });
}));
router.post('/accept', (0, http_2.validate)({ body: acceptBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const success = await (0, invitation_control_service_1.acceptInvitation)(req.body.token);
    if (!success) {
        res.status(400).json({ error: 'Failed to accept invitation', code: 'ACCEPT_FAILED' });
        return;
    }
    res.json({ success: true, message: 'Invitation accepted' });
}));
exports.default = router;
//# sourceMappingURL=invitation.routes.js.map