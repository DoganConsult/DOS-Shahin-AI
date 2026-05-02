import { CANONICAL_ROLES } from './canonical-roles';
import { CANONICAL_PERMISSIONS } from './canonical-permissions';
import { ROLE_PERMISSION_MAP } from './role-permission-map';
export { CANONICAL_ROLES };
export { CANONICAL_PERMISSIONS };
export { ROLE_PERMISSION_MAP };
export type { RoleDef } from './canonical-roles';
export type { PermDef } from './canonical-permissions';
export interface SeedResult {
    rolesSeeded: number;
    permissionsSeeded: number;
    mappingsSeeded: number;
}
/**
 * Seeds the canonical RBAC data (roles, permissions, role->permission
 * mappings, and access profiles) into a tenant schema.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicates on re-run.
 */
export declare function seedDynamicRbacData(tenantId: string): Promise<SeedResult>;
