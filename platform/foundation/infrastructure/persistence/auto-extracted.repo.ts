// @ts-nocheck
// Auto-extracted Foundation repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../../ports/database.port';

export class FoundationAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".business_units
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE bu_id = $1 OR id = $1
     RETURNING bu_id`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS count FROM "${schema}".departments WHERE bu_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".business_units
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         org_id = COALESCE($5, org_id),
         status = COALESCE($6, status),
         updated_at = NOW()
     WHERE bu_id = $1 OR id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".business_units (name_en, name_ar, code, org_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".business_units WHERE bu_id = $1 OR id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".business_units
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS count FROM "${schema}".business_units WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".departments
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE dept_id = $1 OR id = $1
     RETURNING dept_id`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".departments
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         bu_id = COALESCE($5, bu_id),
         head_user_id = COALESCE($6, head_user_id),
         status = COALESCE($7, status),
         updated_at = NOW()
     WHERE dept_id = $1 OR id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".departments (name_en, name_ar, code, bu_id, head_user_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".departments WHERE dept_id = $1 OR id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".departments
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS count FROM "${schema}".departments WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total_records,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS recent
     FROM "${schema}".audit_trail
     WHERE module = $1`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".foundation_org_change WHERE status = 'suspended' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".foundation_org_change WHERE status = 'pending' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".foundation_org_change WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'foundation' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'foundation','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT schema_name FROM public.tenants WHERE id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".teams t
         SET ancestor_path =
               COALESCE(
                 (SELECT json_agg(d.id ORDER BY d.level)
                  FROM "${schema}".departments d
                  WHERE d.id = ANY(ARRAY[t.department_id])),
                 '[]'::json
               ),
             updated_at = NOW()
         WHERE t.deleted_at IS NULL
         RETURNING t.id`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name   = 'teams'
         AND column_name  = 'ancestor_path'`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".departments d
       SET parent_id = NULL, updated_at = NOW()
       WHERE d.parent_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".business_units bu WHERE bu.id = d.parent_id AND bu.deleted_at IS NULL
         )
       RETURNING d.id`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total
       FROM "${schema}".business_units
       WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".foundation_org_change WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'foundation' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".foundation_org_change SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workspace_profile SET ${sets}, updated_at = NOW() RETURNING *`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workspace_profile LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".organizations
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE org_id = $1 OR id = $1
     RETURNING org_id`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS count FROM "${schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".organizations
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         status = COALESCE($5, status),
         metadata = COALESCE($6, metadata),
         updated_at = NOW()
     WHERE org_id = $1 OR id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".organizations (name_en, name_ar, code, status, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".organizations WHERE org_id = $1 OR id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL ORDER BY name_en ASC`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".organizations
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS count FROM "${schema}".organizations WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT role FROM "${schema}".users WHERE id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT code, module_code FROM "${schema}".permissions WHERE is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT p.code AS permission_code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE eura.user_id = $1 AND eura.is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT bundle_code FROM "${schema}".platform_role_tenant_role_map WHERE platform_role = $1 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT functional_role_code, module_code, authority_level
     FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY functional_role_code`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT access_profile_code FROM "${schema}".user_access_profiles WHERE user_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT role FROM "${schema}".users WHERE id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".positions SET deleted_at = NOW(), updated_by = $2 WHERE position_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".positions SET ${sets.join(', ')} WHERE position_id = $${idx} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".positions
       (dept_id, title_en, title_ar, grade, reports_to_position_id, status, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT user_id, role FROM "${schema}".users WHERE is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".effective_user_modules WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".effective_user_permissions WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".enterprise_user_role_assignments SET is_active = FALSE WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".assignment_resolution_log
       (user_id, platform_role, bundles, roles, permissions_count, resolved_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".enterprise_user_role_assignments
           (user_id, functional_role_code, module_code, authority_level, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT module_code FROM "${schema}".functional_roles WHERE code = $1 AND is_active = TRUE LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT bundle_code, access_profile_code
     FROM "${schema}".platform_role_tenant_role_map
     WHERE platform_role = $1 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".effective_user_modules (user_id, module_code)
     SELECT DISTINCT $1, fr.module_code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     WHERE eura.user_id = $1 AND eura.is_active = TRUE
     ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".effective_user_permissions (user_id, permission_code)
     SELECT DISTINCT $1, p.code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE eura.user_id = $1 AND eura.is_active = TRUE
     ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".effective_user_modules WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".effective_user_permissions WHERE user_id = $1`;
    return safeQuery(query, args);
  }

}
