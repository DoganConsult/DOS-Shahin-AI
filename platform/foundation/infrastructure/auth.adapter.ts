/**
 * Foundation auth adapter.
 *
 * Re-exports the auth port middleware so existing route files keep their
 * import path stable. The real `@dos/dauth-shared` impl is bound by the
 * host service at boot via `bindDauthShared()` (dynamic import — keeps
 * the module standalone-typeable when the workspace package isn't linked).
 */
import { bindAuthPort } from '../ports/auth.port';

export {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSuperAdmin,
  requireTenantId,
} from '../ports/auth.port';

export async function bindDauthShared(): Promise<boolean> {
  try {
    const mod: any = await import('@dos/dauth-shared' as any).catch((): any => null);
    if (!mod) return false;
    bindAuthPort({
      authenticate: mod.authenticate,
      optionalAuthenticate: mod.optionalAuthenticate,
      requirePermission: mod.requirePermission,
      requireAnyPermission: mod.requireAnyPermission,
      requireAllPermissions: mod.requireAllPermissions,
      requireSuperAdmin: mod.requireSuperAdmin,
      requireTenantId: mod.requireTenantId,
    });
    return true;
  } catch {
    return false;
  }
}
