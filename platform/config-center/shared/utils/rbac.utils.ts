/**
 * RBAC utility — checks permission against a role's permission list.
 * This is a frontend convenience; canonical truth lives in DAuth.
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  if (!required) return true;
  return userPermissions.some(p => p === required || p === '*');
}
