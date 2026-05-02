// Top-level auth port barrel. Pattern matches modules/onboarding/source/ports/auth.port.ts.
// Module services import via dynamic `await import('../../../ports/auth.port.js')`.
export { authenticate, requirePermission, requireTenantId } from '@dos/module-auth';
export { evaluateLifecycleTransition, isUserEmailVerified } from '@dos/module-auth';

// External-auth guard for regulator-portal style routes. Default rejects
// (Wave-1 stub); host can override by re-binding through @dos/module-auth
// once the external-inspector flow is certified.
import type { RequestHandler } from 'express';
export function externalAuthGuard(_allowedRoles: string[] = []): RequestHandler {
  return (_req, res, _next) => {
    res.status(403).json({
      error: 'external_auth_not_enabled',
      message: 'External auth guard is disabled in Wave-1. Regulator portal is not certified yet.',
    });
  };
}
