/**
 * Auth adapter — thin re-export from @dos/dauth-shared canonical middleware.
 * Identical pattern used by asset-service, evidence-service, etc.
 */
export {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  requireTenantId,
  requireDauth,
} from '@dos/dauth-shared';
