import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getTenantBlueprint, getBundleItems, logPolicyDecision } from '../../ports/blueprint.port';
import { publish as publishFoundationEvent } from '../../infrastructure/messaging/foundation.publishers';

interface AssignmentResult {
  bundles: string[];
  roles: string[];
  permissionsCount: number;
}

export async function refreshUserPermissions(tenantId: string, userId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".effective_user_permissions WHERE user_id = $1`, [userId]);
  await safeQuery(`DELETE FROM "${schema}".effective_user_modules WHERE user_id = $1`, [userId]);

  const permResult = await safeQuery(
    `INSERT INTO "${schema}".effective_user_permissions (user_id, permission_code)
     SELECT DISTINCT $1, p.code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE eura.user_id = $1 AND eura.is_active = TRUE
     ON CONFLICT DO NOTHING`,
    [userId],
  );

  await safeQuery(
    `INSERT INTO "${schema}".effective_user_modules (user_id, module_code)
     SELECT DISTINCT $1, fr.module_code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     WHERE eura.user_id = $1 AND eura.is_active = TRUE
     ON CONFLICT DO NOTHING`,
    [userId],
  );

  return permResult.rowCount ?? 0;
}

export async function assignUserFromPlatformRole(
  tenantId: string,
  userId: string,
  platformRole: string,
): Promise<AssignmentResult> {
  const blueprint = await getTenantBlueprint(tenantId);
  if (!blueprint) return { bundles: [], roles: [], permissionsCount: 0 };

  const schema = tenantSchema(tenantId);

  const mappingResult = await safeQuery(
    `SELECT bundle_code, access_profile_code
     FROM "${schema}".platform_role_tenant_role_map
     WHERE platform_role = $1 AND is_active = TRUE`,
    [platformRole],
  );

  if (mappingResult.rows.length === 0) return { bundles: [], roles: [], permissionsCount: 0 };

  const bundles: string[] = [];
  const roles: string[] = [];

  for (const mapping of mappingResult.rows) {
    bundles.push(mapping.bundle_code);

    await safeQuery(
      `INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, mapping.access_profile_code],
    );

    const bundleItems = await getBundleItems(tenantId, mapping.bundle_code);
    for (const item of bundleItems) {
      const frResult = await safeQuery(
        `SELECT module_code FROM "${schema}".functional_roles WHERE code = $1 AND is_active = TRUE LIMIT 1`,
        [item.functional_role_code],
      );
      const moduleCode = frResult.rows[0]?.module_code ?? null;

      const insertResult = await safeQuery(
        `INSERT INTO "${schema}".enterprise_user_role_assignments
           (user_id, functional_role_code, module_code, authority_level, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT DO NOTHING
         RETURNING user_id`,
        [userId, item.functional_role_code, moduleCode, item.authority_level],
      );
      roles.push(item.functional_role_code as string);

      // J-1: emit foundation.role.assigned (the dotted variant) for each
      // newly-assigned (user, role) pair so the OpenFGA tuple-sync
      // subscriber writes role:<tenant>/<role>#assignee@user:<id>.
      // The ON CONFLICT branch returns 0 rows; only emit on real inserts.
      if ((insertResult.rowCount ?? 0) > 0) {
        await publishFoundationEvent('foundation.role.assigned', {
          eventType: 'foundation.role.assigned',
          tenantId,
          entityId: item.functional_role_code as string,
          userId,
          payload: {
            tenantId,
            userId,
            roleCode: item.functional_role_code,
            moduleCode,
            authorityLevel: item.authority_level,
            platformRole,
          },
        } as any);
      }
    }
  }

  const permissionsCount = await refreshUserPermissions(tenantId, userId);

  await safeQuery(
    `INSERT INTO "${schema}".assignment_resolution_log
       (user_id, platform_role, bundles, roles, permissions_count, resolved_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, platformRole, JSON.stringify(bundles), JSON.stringify(roles), permissionsCount],
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'user_assignment',
    user_id: userId,
    platform_role: platformRole,
    bundles,
    roles,
    permissions_count: permissionsCount,
  });

  return { bundles, roles, permissionsCount };
}

export async function reassignUserOnRoleChange(
  tenantId: string,
  userId: string,
  oldRole: string,
  newRole: string,
): Promise<AssignmentResult> {
  await getTenantBlueprint(tenantId);
  const schema = tenantSchema(tenantId);

  // J-1: capture roles being deactivated so we can emit one
  // foundation.role.unassigned event per (user, role) for downstream
  // consumers (governance/audit/privacy/openfga).
  const previouslyActive = await safeQuery(
    `SELECT functional_role_code, module_code
       FROM "${schema}".enterprise_user_role_assignments
      WHERE user_id = $1 AND is_active = TRUE`,
    [userId],
  );
  await safeQuery(
    `UPDATE "${schema}".enterprise_user_role_assignments SET is_active = FALSE WHERE user_id = $1`,
    [userId],
  );
  for (const row of previouslyActive.rows ?? []) {
    await publishFoundationEvent('foundation.role.unassigned', {
      eventType: 'foundation.role.unassigned',
      tenantId,
      entityId: row.functional_role_code as string,
      userId,
      payload: {
        tenantId,
        userId,
        roleCode: row.functional_role_code,
        moduleCode: row.module_code,
        oldRole,
        newRole,
      },
    } as any).catch((): undefined => undefined);
  }
  await safeQuery(`DELETE FROM "${schema}".effective_user_permissions WHERE user_id = $1`, [userId]);
  await safeQuery(`DELETE FROM "${schema}".effective_user_modules WHERE user_id = $1`, [userId]);

  const result = await assignUserFromPlatformRole(tenantId, userId, newRole);

  await logPolicyDecision(tenantId, {
    decision_type: 'user_reassignment',
    user_id: userId,
    old_role: oldRole,
    new_role: newRole,
    bundles: result.bundles,
    roles: result.roles,
    permissions_count: result.permissionsCount,
  });

  return result;
}

export async function bulkAssignTenantUsers(tenantId: string): Promise<{ usersProcessed: number }> {
  await getTenantBlueprint(tenantId);
  const schema = tenantSchema(tenantId);

  const usersResult = await safeQuery(
    `SELECT user_id, role FROM "${schema}".users WHERE is_active = TRUE`,
  );

  for (const user of usersResult.rows) {
    await assignUserFromPlatformRole(tenantId, user.user_id, user.role);
  }

  await logPolicyDecision(tenantId, {
    decision_type: 'bulk_assignment',
    users_processed: usersResult.rows.length,
  });

  return { usersProcessed: usersResult.rows.length };
}
