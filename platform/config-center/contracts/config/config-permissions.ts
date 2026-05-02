// Config OS — permission codes.
//
// Every config read/write goes through one of these permissions. Without
// the matching permission the API returns 403; with it, the read/write is
// audited via dos.config_audit_log.

export const CONFIG_PERMISSIONS = {
  PLATFORM_READ:    'platform.config.read',
  PLATFORM_WRITE:   'platform.config.write',
  PRODUCT_READ:     'product.config.read',
  PRODUCT_WRITE:    'product.config.write',
  MODULE_READ:      'module.config.read',
  MODULE_WRITE:     'module.config.write',
  TENANT_READ:      'tenant.config.read',
  TENANT_WRITE:     'tenant.config.write',
  USER_READ:        'user.config.read',
  USER_WRITE:       'user.config.write',
  SECRET_READ:      'secret.config.read',   // metadata only — never value
  SECRET_WRITE:     'secret.config.write',
  AUDIT_READ:       'config.audit.read',
} as const;

export type ConfigPermission = (typeof CONFIG_PERMISSIONS)[keyof typeof CONFIG_PERMISSIONS];

/**
 * Default permission rules:
 * - User can read/write own user preferences.
 * - Tenant admin can write tenant config.
 * - Product admin can write product config.
 * - Platform admin can write platform/environment config.
 * - No frontend can read secret values (only metadata via SECRET_READ).
 */
export const CONFIG_DEFAULT_RULES = {
  selfWriteScopes: ['user'] as const,                 // Users always write their own user scope.
  tenantAdminScopes: ['tenant', 'user'] as const,     // Tenant admin writes tenant+user.
  productAdminScopes: ['product', 'module'] as const, // Product admin writes product+module.
  platformAdminScopes: ['platform', 'environment', 'secret'] as const, // Platform admin writes everything.
} as const;
