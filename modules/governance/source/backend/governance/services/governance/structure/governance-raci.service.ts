import { safeQuery, tenantSchema, withTransaction } from '../../../ports/database.port';

export async function listTemplates(tenantId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_raci_templates WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  );
  return { templates: result.rows, count: result.rows.length };
}

export async function getCompiledMatrix(tenantId: string) {
  const schema = tenantSchema(tenantId);
  let result: { rows: Array<{ activity: string; role_or_user: string; raci_type: string; template_name: string; process_area: string }> };
  try {
    result = await safeQuery(
      `SELECT ra.activity, ra.role_or_user, ra.raci_type, rt.name_en AS template_name, rt.process_area
       FROM "${schema}".governance_raci_assignments ra
       JOIN "${schema}".governance_raci_templates rt ON rt.template_id = ra.template_id
       WHERE rt.status = 'active' AND rt.deleted_at IS NULL
       ORDER BY rt.process_area, ra.activity, ra.raci_type`,
    );
  } catch {
    return { matrix: [], roles: [], count: 0 };
  }
  const matrixMap = new Map<string, Record<string, string>>();
  for (const row of result.rows) {
    const key = `${row.process_area}::${row.activity}`;
    if (!matrixMap.has(key)) matrixMap.set(key, { activity: row.activity, process_area: row.process_area });
    const entry = matrixMap.get(key)!;
    entry[row.role_or_user] = row.raci_type;
  }
  const roles = [...new Set(result.rows.map((r) => r.role_or_user))];
  return { matrix: [...matrixMap.values()], roles, count: matrixMap.size };
}

export async function getAccountabilityGaps(tenantId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT ra.activity, rt.name_en AS template_name, rt.process_area,
            array_agg(DISTINCT ra.raci_type) AS assigned_types
     FROM "${schema}".governance_raci_assignments ra
     JOIN "${schema}".governance_raci_templates rt ON rt.template_id = ra.template_id
     WHERE rt.status = 'active' AND rt.deleted_at IS NULL
     GROUP BY ra.activity, rt.name_en, rt.process_area
     HAVING NOT ('A' = ANY(array_agg(DISTINCT ra.raci_type)))
     ORDER BY rt.process_area, ra.activity`,
  );
  const policyGaps = await safeQuery(
    `SELECT policy_id AS entity_id, 'policy' AS entity_type, title AS entity_name
     FROM "${schema}".policies
     WHERE (owner IS NULL OR owner = '') AND deleted_at IS NULL LIMIT 20`,
  );
  const committeeGaps = await safeQuery(
    `SELECT c.committee_id AS entity_id, 'committee' AS entity_type, c.name AS entity_name
     FROM "${schema}".committees c
     LEFT JOIN "${schema}".governance_committee_members m ON m.committee_id = c.committee_id AND m.is_chair = TRUE AND m.deleted_at IS NULL
     WHERE c.deleted_at IS NULL AND m.member_id IS NULL LIMIT 20`,
  );
  const allGaps = [...result.rows, ...policyGaps.rows, ...committeeGaps.rows];
  return {
    gaps: allGaps,
    raciGaps: result.rows,
    ownershipGaps: [...policyGaps.rows, ...committeeGaps.rows],
    totalGaps: allGaps.length,
  };
}

export async function getSodConflicts(tenantId: string) {
  const schema = tenantSchema(tenantId);
  const sameUserRA = await safeQuery(
    `SELECT r1.activity, r1.role_or_user, r1.raci_type AS type_1, r2.raci_type AS type_2,
            rt.name_en AS template_name
     FROM "${schema}".governance_raci_assignments r1
     JOIN "${schema}".governance_raci_assignments r2
       ON r1.template_id = r2.template_id AND r1.activity = r2.activity
       AND r1.role_or_user = r2.role_or_user
       AND r1.raci_type = 'R' AND r2.raci_type = 'A'
     JOIN "${schema}".governance_raci_templates rt ON rt.template_id = r1.template_id
     WHERE rt.status = 'active' AND rt.deleted_at IS NULL
     ORDER BY rt.name_en, r1.activity`,
  );
  const SOD_RULES = [
    { role1: 'auditor', role2: 'audit_manager', reason: 'Audit execution and audit management must be segregated' },
    { role1: 'risk_owner', role2: 'risk_manager', reason: 'Risk ownership and risk assessment should be segregated' },
    { role1: 'compliance_officer', role2: 'ceo', reason: 'Compliance oversight and executive approval should be segregated' },
  ];
  const delegationConflicts = await safeQuery(
    `SELECT d.delegator_user_id, d.delegate_user_id, d.authority_type,
            'Delegation creates dual-authority' AS conflict_reason
     FROM "${schema}".governance_delegations d
     WHERE d.status = 'active' AND d.deleted_at IS NULL
       AND d.delegator_user_id = d.delegate_user_id LIMIT 10`,
  );
  const allConflicts = [...sameUserRA.rows, ...delegationConflicts.rows];
  return {
    conflicts: allConflicts,
    raciConflicts: sameUserRA.rows,
    sodRules: SOD_RULES,
    delegationConflicts: delegationConflicts.rows,
    totalConflicts: allConflicts.length,
  };
}

export async function getTemplateById(tenantId: string, templateId: string) {
  const schema = tenantSchema(tenantId);
  const tmpl = await safeQuery(
    `SELECT * FROM "${schema}".governance_raci_templates WHERE template_id=$1 AND deleted_at IS NULL`,
    [templateId],
  );
  if (!tmpl.rows[0]) return null;
  const assignments = await safeQuery(
    `SELECT * FROM "${schema}".governance_raci_assignments WHERE template_id=$1 ORDER BY activity, raci_type`,
    [templateId],
  );
  return { ...tmpl.rows[0], assignments: assignments.rows };
}

export async function createTemplate(tenantId: string, data: { name_en: string; name_ar?: string; process_area?: string }, userId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_raci_templates (tenant_id, name_en, name_ar, process_area, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tenantId, data.name_en, data.name_ar, data.process_area, userId],
  );
  return result.rows[0];
}

export async function updateTemplate(tenantId: string, templateId: string, data: { name_en?: string; name_ar?: string; process_area?: string }) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_raci_templates SET name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar), process_area=COALESCE($4,process_area), updated_at=NOW() WHERE template_id=$1 AND deleted_at IS NULL RETURNING *`,
    [templateId, data.name_en, data.name_ar, data.process_area],
  );
  return result.rows[0] || null;
}

export async function setAssignments(tenantId: string, templateId: string, assignments: { activity: string; role_or_user: string; raci_type: string }[]) {
  const schema = tenantSchema(tenantId);
  await withTransaction(tenantId, async (client) => {
    await client.query(`DELETE FROM "${schema}".governance_raci_assignments WHERE template_id=$1`, [templateId]);
    for (const a of assignments) {
      await client.query(
        `INSERT INTO "${schema}".governance_raci_assignments (template_id, activity, role_or_user, raci_type) VALUES ($1,$2,$3,$4)`,
        [templateId, a.activity, a.role_or_user, a.raci_type],
      );
    }
  });
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_raci_assignments WHERE template_id=$1 ORDER BY activity, raci_type`,
    [templateId],
  );
  return { assignments: result.rows, count: result.rows.length };
}

export async function activateTemplate(tenantId: string, templateId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_raci_templates SET status='active', updated_at=NOW() WHERE template_id=$1 AND deleted_at IS NULL RETURNING *`,
    [templateId],
  );
  return result.rows[0] || null;
}

export async function archiveTemplate(tenantId: string, templateId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_raci_templates SET status='archived', updated_at=NOW() WHERE template_id=$1 AND deleted_at IS NULL RETURNING *`,
    [templateId],
  );
  return result.rows[0] || null;
}
