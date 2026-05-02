"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * DOS Platform — DAuth auth-service (clean shell).
 *
 * Same-domain /login Keycloak topology:
 *   Issuer:   https://shahin-ai.com/login/realms/dogan
 *   Callback: https://shahin-ai.com/api/auth/oidc/callback
 *   Landing:  /workspace-home
 *
 * No onboarding wizard. Register submit → Keycloak account created →
 * callback sets cookies → redirect to /workspace-home.
 */
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const oidc_routes_1 = require("./routes/oidc.routes");
const access_routes_1 = require("./routes/access.routes");
const PORT = Number(process.env.PORT || 4001);
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express_1.default.json({ limit: '256kb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)(process.env.LOG_FORMAT || 'combined'));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'auth-service' }));
app.get('/ready', (_req, res) => res.json({ ok: true, service: 'auth-service' }));
// Pillar-prefixed probes — consumed by /api/dos/platform/health fan-out
// and the gateway /api/dauth/* proxy contract.
app.get('/api/dauth/health', (_req, res) => res.json({ ok: true, service: 'auth-service', pillar: 'dauth' }));
app.get('/api/dauth/ready', (_req, res) => res.json({ ok: true, service: 'auth-service', pillar: 'dauth' }));
// OIDC browser-mediated flow.
//   GET /oidc/start    → 302 to KC authorize
//   GET /oidc/callback → exchange code, set cookies, 302 /workspace-home
app.use('/oidc', oidc_routes_1.oidcRouter);
// Access snapshot and permissions.
// Expected by SPA at /api/access/my-permissions
app.use('/api/access', access_routes_1.accessRouter);
// CSRF removed (Task 9). The OIDC browser flow is cookie + PKCE; no XSRF
// token is exchanged. SPA must not probe /api/auth/csrf.
app.use((err, _req, res, _next) => {
    console.error('[auth-service] unhandled', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
});
app.listen(PORT, '127.0.0.1', () => {
    console.info(`[auth-service] listening on :${PORT}`);
    console.info(`[auth-service] issuer=${process.env.KEYCLOAK_ISSUER}`);
});
//# sourceMappingURL=server.js.map