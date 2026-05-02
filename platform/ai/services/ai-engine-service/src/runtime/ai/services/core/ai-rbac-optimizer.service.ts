import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface RbacUsageAnalysis {
  totalRoles: number;
  activeRoles: number;
  unusedRoles: string[];
  overProvisionedUsers: Array<{ userId: string; totalPermissions: number; usedPermissions: number; utilizationPct: number }>;
  sodConflicts: number;
  recommendations: string[];
}

export async function analyzeRbacUsage(tenantId: string): Promise<RbacUsageAnalysis> {
  const schema = tenantSchema(tenantId);

  const rolesResult = await safeQuery(
    `SELECT fr.code, fr.is_active, COUNT(DISTINCT ura.user_id) AS user_count
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".user_role_assignments ura ON ura.functional_role_id = fr.id AND ura.is_active = TRUE
     GROUP BY fr.id, fr.code, fr.is_active`,
  ).catch(() => ({ rows: [] }));

  const totalRoles = rolesResult.rows.length;
  const activeRoles = rolesResult.rows.filter(( r: Record<string, unknown>) => r.is_active).length;
  const unusedRoles = rolesResult.rows
    .filter(( r: Record<string, unknown>) => r.is_active && parseInt((r as any).user_count, 10) === 0)
    .map(( r: Record<string, unknown>) => r.code);

  const usageResult = await safeQuery(
    `SELECT ura.user_id, COUNT(DISTINCT rp.permission_id) AS total_perms,
            COUNT(DISTINCT CASE WHEN adl.id IS NOT NULL THEN rp.permission_id END) AS used_perms
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = ura.functional_role_id
     LEFT JOIN "${schema}".authz_decision_log adl ON adl.user_id = ura.user_id
       AND adl.permission_code = (SELECT code FROM "${schema}".permissions WHERE id = rp.permission_id)
       AND adl.decision = 'allow' AND adl.created_at > NOW() - INTERVAL '90 days'
     WHERE ura.is_active = TRUE
     GROUP BY ura.user_id HAVING COUNT(DISTINCT rp.permission_id) > 0`,
  ).catch(() => ({ rows: [] }));

  const overProvisionedUsers = usageResult.rows
    .filter(( r: Record<string, unknown>) => {
      const total = parseInt((r as any).total_perms, 10);
      const used = parseInt((r as any).used_perms, 10);
      return total > 0 && (used / total) < 0.5;
    })
    .map(( r: Record<string, unknown>) => ({
      userId: r.user_id,
      totalPermissions: parseInt((r as any).total_perms, 10),
      usedPermissions: parseInt((r as any).used_perms, 10),
      utilizationPct: Math.round((parseInt((r as any).used_perms, 10) / parseInt((r as any).total_perms, 10)) * 100),
    }));

  const sodResult = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".sod_rules WHERE is_active = TRUE`,
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const sodConflicts = parseInt(sodResult.rows[0]?.cnt || '0', 10);

  const recommendations: string[] = [];
  if (unusedRoles.length > 0) recommendations.push(`${unusedRoles.length} roles have zero assignments — consider deactivating`);
  if (overProvisionedUsers.length > 0) recommendations.push(`${overProvisionedUsers.length} users use <50% of granted permissions — review for least-privilege`);
  if (sodConflicts === 0) recommendations.push('No SoD rules defined — consider adding separation of duties policies');

  return { totalRoles, activeRoles, unusedRoles, overProvisionedUsers, sodConflicts, recommendations };
}
