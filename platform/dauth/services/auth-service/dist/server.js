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
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const node_fs_1 = require("node:fs");
const oidc_routes_1 = require("./routes/oidc.routes");
const access_routes_1 = require("./routes/access.routes");
const PORT = Number(process.env.PORT || 4001);
// L34 (Phase 4) — tenant-zone HTTPS listener (mTLS).
// Reads MTLS_HTTPS_LISTEN=1 + TENANT_MTLS_CA / TENANT_MTLS_CERT /
// TENANT_MTLS_KEY (or generic MTLS_CA / MTLS_CERT / MTLS_KEY).
// Returns null when disabled or any cert missing — Article 5: never
// half-start a broken TLS listener.
function _tenantHttpsListenOptions() {
    if (String(process.env.MTLS_HTTPS_LISTEN ?? '0').trim() !== '1')
        return null;
    const caPath = String(process.env.TENANT_MTLS_CA ?? process.env.MTLS_CA ?? '').trim();
    const certPath = String(process.env.TENANT_MTLS_CERT ?? process.env.MTLS_CERT ?? '').trim();
    const keyPath = String(process.env.TENANT_MTLS_KEY ?? process.env.MTLS_KEY ?? '').trim();
    if (!caPath || !certPath || !keyPath)
        return null;
    if (!(0, node_fs_1.existsSync)(caPath) || !(0, node_fs_1.existsSync)(certPath) || !(0, node_fs_1.existsSync)(keyPath))
        return null;
    try {
        return {
            ca: (0, node_fs_1.readFileSync)(caPath),
            cert: (0, node_fs_1.readFileSync)(certPath),
            key: (0, node_fs_1.readFileSync)(keyPath),
            requestCert: String(process.env.MTLS_REQUEST_CLIENT_CERT ?? '1').trim() === '1',
            rejectUnauthorized: String(process.env.MTLS_REJECT_UNAUTHORIZED ?? '1').trim() === '1',
        };
    }
    catch {
        return null;
    }
}
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
const _tlsOpts = _tenantHttpsListenOptions();
const _server = _tlsOpts ? node_https_1.default.createServer(_tlsOpts, app) : node_http_1.default.createServer(app);
_server.listen(PORT, '127.0.0.1', () => {
    console.info(`[auth-service] listening on ${_tlsOpts ? 'https' : 'http'}://127.0.0.1:${PORT}`);
    console.info(`[auth-service] issuer=${process.env.KEYCLOAK_ISSUER}`);
    if (_tlsOpts)
        console.info('[auth-service] tenant-zone mTLS active (requestCert=1, reject=1)');
});
//# sourceMappingURL=server.js.map