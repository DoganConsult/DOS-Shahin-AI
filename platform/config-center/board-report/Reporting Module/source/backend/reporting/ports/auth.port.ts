export { authenticate, requirePermission } from '@dos/module-auth';

// Local wrapper for resolveJwtSigningSecret — the module auth.port had a
// bare `getJwtSecret` re-export against @dos/auth that was never wired.
import { resolveJwtSigningSecret as _resolveJwtSigningSecret } from '@dos/platform-core';
export function getJwtSecret(): string {
  return _resolveJwtSigningSecret('module:auth-port');
}
