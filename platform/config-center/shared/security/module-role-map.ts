/**
 * Module role map — maps module codes to roles that can access them.
 * Canonical truth lives in DAuth; this is for UI display filtering.
 */
export const MODULE_ROLE_MAP: Record<string, string[]> = {};

export function isModuleVisibleToRole(moduleCode: string, role: string): boolean {
  const allowed = MODULE_ROLE_MAP[moduleCode];
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(role) || role === 'admin' || role === 'owner';
}
