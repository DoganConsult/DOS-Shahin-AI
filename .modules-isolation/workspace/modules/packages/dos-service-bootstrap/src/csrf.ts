// CSRF protection for cookie-session flows (DAuth). Only the gateway and
// auth-service expose mutating endpoints with cookie auth — other services
// authenticate via JWT bearer and don't need CSRF.
//
// Usage in gateway/server.ts (after cookieParser, before mutating routes):
//
//   import { createCsrfMiddleware } from '@dos/service-bootstrap/csrf';
//   const { doubleCsrfProtection, generateCsrfToken } = createCsrfMiddleware();
//   app.use(doubleCsrfProtection);
//   app.get('/api/auth/csrf', (req, res) => res.json({ token: generateCsrfToken(req, res) }));
//
// Configure via env:
//   CSRF_SECRET            — required in production. Falls back to a derived
//                            key from JWT_SECRET if unset (with a warning).

import { doubleCsrf, type DoubleCsrfConfigOptions } from 'csrf-csrf';
import type { Request } from 'express';
import * as crypto from 'crypto';

export interface CsrfFactoryOptions extends Partial<DoubleCsrfConfigOptions> {
  /** Override secret. Defaults to env CSRF_SECRET, then derived from JWT_SECRET. */
  secret?: string;
  /** Routes (regex/array) exempt from CSRF — typically /health, /metrics. */
  ignoredRoutes?: (string | RegExp)[];
}

function resolveSecret(override?: string): string {
  if (override) return override;
  const env = process.env.CSRF_SECRET;
  if (env) return env;
  const jwtSec = process.env.JWT_SECRET;
  if (jwtSec) return crypto.createHash('sha256').update(`csrf:${jwtSec}`).digest('hex');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET (or JWT_SECRET) must be set in production');
  }
  return 'dev-only-csrf-secret-do-not-use-in-prod';
}

export function createCsrfMiddleware(opts: CsrfFactoryOptions = {}) {
  const secret = resolveSecret(opts.secret);
  const ignoredRoutes = opts.ignoredRoutes ?? [
    /^\/health/, /^\/ready$/, /^\/metrics$/, /^\/diagnostics$/, /^\/sla$/,
  ];

  return doubleCsrf({
    getSecret: () => secret,
    getSessionIdentifier: (req: Request) => {
      // Bind tokens to the user's session cookie / JWT subject so a token
      // valid for one user can't be replayed by another.
      const session = req.cookies?.['dauth_session'] || req.cookies?.['session'];
      const sub = (req as any).user?.userId || (req as any).user?.sub;
      return session || sub || req.ip || 'anonymous';
    },
    cookieName: '__Host-dos-csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req: Request) =>
      (req.headers['x-csrf-token'] as string) ?? (req.body?._csrf as string),
    skipCsrfProtection: (req: Request) =>
      ignoredRoutes.some((r) => (typeof r === 'string' ? req.path === r : r.test(req.path))),
    ...opts,
  });
}
