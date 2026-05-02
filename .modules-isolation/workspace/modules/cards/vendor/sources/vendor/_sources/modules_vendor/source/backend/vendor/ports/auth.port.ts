export { authenticate, requirePermission } from '@dos/module-auth';
export { externalAuthGuard } from '@dos/module-auth/middleware';

// Local wrapper for resolveJwtSigningSecret — the module auth.port had a
// bare `getJwtSecret` re-export against @dos/auth that was never wired.
import { resolveJwtSigningSecret as _resolveJwtSigningSecret } from '@dos/platform-core';
export function getJwtSecret(): string {
  return _resolveJwtSigningSecret('module:auth-port');
}
