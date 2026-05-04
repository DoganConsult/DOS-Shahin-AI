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
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import http from 'node:http';
import https from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { oidcRouter } from './routes/oidc.routes';
import { accessRouter } from './routes/access.routes';

const PORT = Number(process.env.PORT || 4001);

// L34 (Phase 4) — tenant-zone HTTPS listener (mTLS).
// Reads MTLS_HTTPS_LISTEN=1 + TENANT_MTLS_CA / TENANT_MTLS_CERT /
// TENANT_MTLS_KEY (or generic MTLS_CA / MTLS_CERT / MTLS_KEY).
// Returns null when disabled or any cert missing — Article 5: never
// half-start a broken TLS listener.
function _tenantHttpsListenOptions(): https.ServerOptions | null {
  if (String(process.env.MTLS_HTTPS_LISTEN ?? '0').trim() !== '1') return null;
  const caPath   = String(process.env.TENANT_MTLS_CA   ?? process.env.MTLS_CA   ?? '').trim();
  const certPath = String(process.env.TENANT_MTLS_CERT ?? process.env.MTLS_CERT ?? '').trim();
  const keyPath  = String(process.env.TENANT_MTLS_KEY  ?? process.env.MTLS_KEY  ?? '').trim();
  if (!caPath || !certPath || !keyPath) return null;
  if (!existsSync(caPath) || !existsSync(certPath) || !existsSync(keyPath)) return null;
  try {
    return {
      ca: readFileSync(caPath),
      cert: readFileSync(certPath),
      key: readFileSync(keyPath),
      requestCert:        String(process.env.MTLS_REQUEST_CLIENT_CERT ?? '1').trim() === '1',
      rejectUnauthorized: String(process.env.MTLS_REJECT_UNAUTHORIZED ?? '1').trim() === '1',
    };
  } catch {
    return null;
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'auth-service' }));
app.get('/ready',  (_req, res) => res.json({ ok: true, service: 'auth-service' }));
// Pillar-prefixed probes — consumed by /api/dos/platform/health fan-out
// and the gateway /api/dauth/* proxy contract.
app.get('/api/dauth/health', (_req, res) => res.json({ ok: true, service: 'auth-service', pillar: 'dauth' }));
app.get('/api/dauth/ready',  (_req, res) => res.json({ ok: true, service: 'auth-service', pillar: 'dauth' }));

// OIDC browser-mediated flow.
//   GET /oidc/start    → 302 to KC authorize
//   GET /oidc/callback → exchange code, set cookies, 302 /workspace-home
app.use('/oidc', oidcRouter);

// Access snapshot and permissions.
// Expected by SPA at /api/access/my-permissions
app.use('/api/access', accessRouter);

// CSRF removed (Task 9). The OIDC browser flow is cookie + PKCE; no XSRF
// token is exchanged. SPA must not probe /api/auth/csrf.

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[auth-service] unhandled', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

const _tlsOpts = _tenantHttpsListenOptions();
const _server = _tlsOpts ? https.createServer(_tlsOpts, app) : http.createServer(app);
_server.listen(PORT, '127.0.0.1', () => {
  console.info(`[auth-service] listening on ${_tlsOpts ? 'https' : 'http'}://127.0.0.1:${PORT}`);
  console.info(`[auth-service] issuer=${process.env.KEYCLOAK_ISSUER}`);
  if (_tlsOpts) console.info('[auth-service] tenant-zone mTLS active (requestCert=1, reject=1)');
});
