/**
 * Settings taxonomy -- codifies which routes belong to each settings surface.
 * Used by navigation filtering and access control validation.
 */

/** Platform-wide admin settings -- visible only to platform super admins. */
export const PLATFORM_SETTINGS_ROUTES = [
  '/admin/settings',
  '/admin/packs',
  '/admin/agrc-engine',
  '/admin/trial-extensions',
  '/admin/subscriptions',
  '/admin/sessions',
  '/admin/provisioning/orchestrator',
  '/admin/workspace-audit',
] as const;

/** Tenant/workspace settings -- visible only to tenant admins (adminOnly: true). */
export const TENANT_SETTINGS_ROUTES = [
  '/tenant-config',
  '/foundation/permissions',
  '/foundation/settings',
  '/billing',
  '/tier-management',
  '/platform-email-approvals',
  '/connector-hub',
] as const;

/** User profile / personal settings -- visible to all authenticated users. */
export const USER_SETTINGS_ROUTES = [
  '/profile',
  '/account-settings',
  '/security-settings',
  '/notification-preferences',
  '/notifications',
] as const;

/** All settings routes (union). */
export const ALL_SETTINGS_ROUTES = [
  ...PLATFORM_SETTINGS_ROUTES,
  ...TENANT_SETTINGS_ROUTES,
  ...USER_SETTINGS_ROUTES,
] as const;
