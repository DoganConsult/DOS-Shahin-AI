export { authenticate, optionalAuthenticate, requirePermission, requireAnyPermission, requireAllPermissions, requireSuperAdmin, requireTenantId, } from '../ports/auth.port';
export declare function bindDauthShared(): Promise<boolean>;
