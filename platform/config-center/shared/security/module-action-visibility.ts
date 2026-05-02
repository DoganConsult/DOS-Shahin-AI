/**
 * Module action visibility — maps module codes to visible actions per role.
 * Canonical truth lives in DAuth; this is for UI display filtering.
 */
export const MODULE_ACTION_VISIBILITY: Record<string, Record<string, string[]>> = {};

export function isActionVisibleToRole(moduleCode: string, action: string, role: string): boolean {
  const mod = MODULE_ACTION_VISIBILITY[moduleCode];
  if (!mod) return true;
  const allowedRoles = mod[action];
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role) || role === 'admin' || role === 'owner';
}
