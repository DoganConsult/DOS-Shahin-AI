/**
 * Auth adapter — re-export of @dos/auth canonical middleware so the service
 * shares the platform JWT verification, tenant binding, and permission gates.
 */
export {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  requireTenantId,
} from '@dos/dauth-shared';
