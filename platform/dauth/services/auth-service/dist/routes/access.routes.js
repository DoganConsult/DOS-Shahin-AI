"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRouter = void 0;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const session_1 = require("../lib/session");
exports.accessRouter = (0, express_1.Router)();
exports.accessRouter.get('/my-permissions', async (req, res) => {
    const access = req.cookies?.[session_1.COOKIE_ACCESS];
    if (!access)
        return res.status(401).json({ error: 'NO_SESSION' });
    try {
        const claims = await (0, session_1.verifySession)(access);
        const sub = typeof claims.sub === 'string' ? claims.sub : '';
        const email = typeof claims.email === 'string' ? claims.email : '';
        const name = typeof claims.name === 'string' ? claims.name : claims.preferred_username || '';
        if (!session_1.TENANT_SERVICE_URL) {
            return res.status(500).json({ error: 'TENANT_SERVICE_NOT_CONFIGURED' });
        }
        const headers = {
            'x-user-sub': sub,
            'x-user-email': email,
            'x-user-name': name,
        };
        // Parallel fetch for speed
        const [meResp, permResp] = await Promise.all([
            axios_1.default.get(`${session_1.TENANT_SERVICE_URL}/me`, { headers, timeout: 5000, validateStatus: () => true }),
            axios_1.default.get(`${session_1.TENANT_SERVICE_URL}/permissions`, { headers, timeout: 5000, validateStatus: () => true }),
        ]);
        if (meResp.status !== 200 || permResp.status !== 200) {
            return res.status(meResp.status === 200 ? permResp.status : meResp.status).json({
                error: 'TENANT_SERVICE_ERROR',
                details: meResp.data?.message || permResp.data?.message
            });
        }
        const me = meResp.data;
        const perms = permResp.data;
        const snapshot = {
            version: new Date().toISOString(),
            generatedAt: new Date().toISOString(),
            actor: {
                userId: me.user.id,
                email: me.user.email,
                displayName: me.user.name,
                actorType: 'user'
            },
            tenant: {
                tenantId: me.tenant.id,
                status: me.tenant.status,
                plan: 'standard' // Default for now
            },
            permissions: perms.permissions || [],
            roles: perms.roles || [],
            modules: perms.modules || [],
            dashboards: [],
            landingPage: me.membership?.landingRoute || '/workspace-home',
            scopeBindings: [],
            decisionAuthorities: [],
            accessProfiles: [],
        };
        return res.json({ success: true, data: snapshot });
    }
    catch (err) {
        console.error('[access-routes] my-permissions failed', err.message);
        return res.status(401).json({ error: 'INVALID_SESSION' });
    }
});
//# sourceMappingURL=access.routes.js.map