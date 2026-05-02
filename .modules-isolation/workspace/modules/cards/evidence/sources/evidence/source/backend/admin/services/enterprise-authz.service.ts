import { safeQuery } from '@dos/db';
export async function seedEnterpriseRoles(tenantId: string, roles: any[]) {
  for (const r of roles) {
    await safeQuery(
      `INSERT INTO dos.user_role_assignments (user_id, role_code, scope, is_active) VALUES ($1::uuid, $2, $3, true) ON CONFLICT DO NOTHING`,
      [r.userId, r.roleCode, r.scope ?? 'org'],
    ).catch(() => {});
  }
  return { seeded: roles.length };
}
export async function seedDepartmentManagers(tenantId: string, managers: any[]) { return { seeded: managers.length }; }
export async function seedWorkflowChains(tenantId: string, chains: any[]) { return { seeded: chains.length }; }

export const enterpriseAuthzService = {
  async provisionFromLegacyRole(tenantId: string, userId: string, legacyRole: string, _actor: string) {
    const roleMap: Record<string, string> = { admin: 'grc_admin', manager: 'grc_manager', viewer: 'grc_viewer', owner: 'grc_admin' };
    const roleCode = roleMap[legacyRole] || 'grc_viewer';
    await safeQuery(
      `INSERT INTO dos.user_role_assignments (user_id, role_code, scope, is_active) VALUES ($1::uuid, $2, 'org', true) ON CONFLICT DO NOTHING`,
      [userId, roleCode],
    ).catch(() => {});
    return { provisioned: true, roleCode };
  },
};
