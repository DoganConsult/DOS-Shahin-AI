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
import { oidcRouter } from './routes/oidc.routes';
import { accessRouter } from './routes/access.routes';

const PORT = Number(process.env.PORT || 4001);

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

app.listen(PORT, '127.0.0.1', () => {
  console.info(`[auth-service] listening on :${PORT}`);
  console.info(`[auth-service] issuer=${process.env.KEYCLOAK_ISSUER}`);
});
