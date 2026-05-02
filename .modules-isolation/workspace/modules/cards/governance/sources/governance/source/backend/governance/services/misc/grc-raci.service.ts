import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export async function assignRaci(tenantId: string, data: {
  entityType: string;
  entityId: string;
  teamId?: string;
  deptId?: string;
  userId?: string;
  raciRole: string;
  assignmentSource?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".grc_raci_assignments
      (entity_type, entity_id, team_id, dept_id, user_id, raci_role,
       assignment_source, effective_from, effective_to, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT ON CONSTRAINT uq_grc_raci_no_duplicate DO UPDATE SET
       updated_at = NOW(), notes = EXCLUDED.notes
     RETURNING *`,
    [data.entityType, data.entityId, data.teamId || null, data.deptId || null,
     data.userId || null, data.raciRole, data.assignmentSource || 'manual',
     data.effectiveFrom || null, data.effectiveTo || null, data.notes || null]
  );
  return getFirstRow(result);
}

export async function getRaciForEntity(tenantId: string, entityType: string, entityId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT gra.*,
            t.team_code, t.name_en AS team_name,
            d.name_en AS dept_name
     FROM "${schema}".grc_raci_assignments gra
     LEFT JOIN "${schema}".teams t ON t.team_id = gra.team_id
     LEFT JOIN "${schema}".departments d ON d.dept_id = gra.dept_id
     WHERE gra.entity_type = $1 AND gra.entity_id = $2
       AND gra.is_active = TRUE AND gra.deleted_at IS NULL
     ORDER BY CASE gra.raci_role
       WHEN 'accountable' THEN 1 WHEN 'responsible' THEN 2
       WHEN 'consulted' THEN 3 WHEN 'informed' THEN 4 END`,
    [entityType, entityId]
  );
  return result.rows;
}

export async function removeRaci(tenantId: string, assignmentId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".grc_raci_assignments SET deleted_at = NOW(), is_active = FALSE
     WHERE assignment_id = $1`, [assignmentId]
  );
}

export async function getRaciGaps(tenantId: string, entityType?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".grc_raci_gaps WHERE 1=1`;
  const params: unknown[] = [];
  if (entityType) { sql += ` AND entity_type = $1`; params.push(entityType); }
  sql += ` AND (has_responsible = FALSE OR has_accountable = FALSE OR has_user_owner = FALSE OR has_team_owner = FALSE)`;
  sql += ` ORDER BY entity_type, entity_id`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getOwnershipMatrix(tenantId: string, entityType?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".grc_ownership_matrix WHERE 1=1`;
  const params: unknown[] = [];
  if (entityType) { sql += ` AND entity_type = $1`; params.push(entityType); }
  sql += ` ORDER BY entity_type, entity_id`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function assignEntityOwner(tenantId: string, data: {
  entityType: 'control' | 'risk' | 'evidence';
  entityId: string;
  userId: string;
  ownershipType?: string;
  isPrimary?: boolean;
  assignedBy?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const table = data.entityType === 'control' ? 'control_owners'
    : data.entityType === 'risk' ? 'risk_owners' : 'evidence_owners';
  const idCol = data.entityType === 'control' ? 'control_id'
    : data.entityType === 'risk' ? 'risk_id' : 'evidence_id';

  const ownershipType = data.ownershipType || (data.entityType === 'evidence' ? 'collector' : 'primary');
  const result = await safeQuery(
    `INSERT INTO "${schema}".${table}
      (${idCol}, user_id, ownership_type, is_primary, assigned_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ON CONSTRAINT uq_${data.entityType === 'control' ? 'control' : data.entityType}_owner_active
     DO UPDATE SET updated_at = NOW(), is_primary = EXCLUDED.is_primary
     RETURNING *`,
    [data.entityId, data.userId, ownershipType, data.isPrimary ?? false, data.assignedBy || null]
  );
  return getFirstRow(result);
}

export async function assignEntityTeam(tenantId: string, data: {
  entityType: 'control' | 'risk' | 'evidence';
  entityId: string;
  teamId: string;
  isSecondary?: boolean;
  deptId?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const table = data.entityType === 'control' ? 'controls'
    : data.entityType === 'risk' ? 'risks' : 'evidence';
  const idCol = data.entityType === 'control' ? 'control_id'
    : data.entityType === 'risk' ? 'risk_id' : 'evidence_id';

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.isSecondary) {
    sets.push(`secondary_owner_team_id = $${idx++}`);
  } else {
    sets.push(`owner_team_id = $${idx++}`);
  }
  params.push(data.teamId);

  if (data.deptId) {
    sets.push(`owner_dept_id = $${idx++}`);
    params.push(data.deptId);
  }

  params.push(data.entityId);

  const result = await safeQuery(
    `UPDATE "${schema}".${table} SET ${sets.join(', ')}, updated_at = NOW()
     WHERE ${idCol} = $${idx} RETURNING *`,
    params
  );
  return getFirstRow(result);
}

export async function getEvidenceActions(tenantId: string, evidenceId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT ea.*, t.name_en AS team_name
     FROM "${schema}".evidence_actions ea
     LEFT JOIN "${schema}".teams t ON t.team_code = ea.assigned_team
     WHERE ea.evidence_id = $1 AND ea.deleted_at IS NULL
     ORDER BY CASE ea.priority
       WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       ea.due_date ASC NULLS LAST`,
    [evidenceId]
  );
  return result.rows;
}

export async function createEvidenceAction(tenantId: string, data: {
  evidenceId: string;
  actionType: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedTeam?: string;
  dueDate?: string;
  priority?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_actions
      (evidence_id, action_type, title, description, assigned_to, assigned_team, due_date, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.evidenceId, data.actionType, data.title, data.description || null,
     data.assignedTo || null, data.assignedTeam || null, data.dueDate || null,
     data.priority || 'medium']
  );
  return getFirstRow(result);
}

export async function updateEvidenceAction(tenantId: string, actionId: string, data: {
  status?: string;
  completedBy?: string;
  outcomeNotes?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [actionId];
  let idx = 2;
  if (data.status) {
    sets.push(`status = $${idx++}`);
    params.push(data.status);
    if (data.status === 'completed') sets.push(`completed_at = NOW()`);
  }
  if (data.completedBy) { sets.push(`completed_by = $${idx++}`); params.push(data.completedBy); }
  if (data.outcomeNotes) { sets.push(`outcome_notes = $${idx++}`); params.push(data.outcomeNotes); }

  const result = await safeQuery(
    `UPDATE "${schema}".evidence_actions SET ${sets.join(', ')}
     WHERE action_id = $1 AND deleted_at IS NULL RETURNING *`,
    params
  );
  return getFirstRow(result);
}

export async function getRaciDashboard(tenantId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);

  const coverageResult = await safeQuery(
    `SELECT
       entity_type,
       COUNT(DISTINCT entity_id) AS total_entities,
       COUNT(DISTINCT CASE WHEN has_responsible THEN entity_id END) AS with_responsible,
       COUNT(DISTINCT CASE WHEN has_accountable THEN entity_id END) AS with_accountable,
       COUNT(DISTINCT CASE WHEN has_user_owner THEN entity_id END) AS with_user_owner,
       COUNT(DISTINCT CASE WHEN has_team_owner THEN entity_id END) AS with_team_owner
     FROM (
       SELECT
         gra.entity_type,
         gra.entity_id,
         BOOL_OR(gra.raci_role = 'responsible') AS has_responsible,
         BOOL_OR(gra.raci_role = 'accountable') AS has_accountable,
         BOOL_OR(gra.user_id IS NOT NULL) AS has_user_owner,
         BOOL_OR(gra.team_id IS NOT NULL) AS has_team_owner
       FROM "${schema}".grc_raci_assignments gra
       WHERE gra.is_active = TRUE AND gra.deleted_at IS NULL
       GROUP BY gra.entity_type, gra.entity_id
     ) sub
     GROUP BY entity_type
     ORDER BY entity_type`
  );

  const gapResult = await safeQuery(
    `SELECT entity_type, COUNT(*) AS gap_count
     FROM "${schema}".grc_raci_gaps
     WHERE has_responsible = FALSE OR has_accountable = FALSE
     GROUP BY entity_type`
  );

  const teamResult = await safeQuery(
    `SELECT
       t.team_code, t.name_en AS team_name,
       COUNT(DISTINCT gra.assignment_id) AS total_assignments,
       COUNT(DISTINCT CASE WHEN gra.raci_role = 'responsible' THEN gra.assignment_id END) AS responsible_count,
       COUNT(DISTINCT CASE WHEN gra.raci_role = 'accountable' THEN gra.assignment_id END) AS accountable_count
     FROM "${schema}".grc_raci_assignments gra
     JOIN "${schema}".teams t ON t.team_id = gra.team_id
     WHERE gra.is_active = TRUE AND gra.deleted_at IS NULL
     GROUP BY t.team_code, t.name_en
     ORDER BY total_assignments DESC
     LIMIT 20`
  );

  const expiringResult = await safeQuery(
    `SELECT COUNT(*) AS expiring_count
     FROM "${schema}".grc_raci_assignments
     WHERE is_active = TRUE AND deleted_at IS NULL
       AND effective_to IS NOT NULL
       AND effective_to BETWEEN NOW() AND NOW() + INTERVAL '30 days'`
  );

  const autoAssignedResult = await safeQuery(
    `SELECT COUNT(*) AS auto_assigned_count
     FROM "${schema}".grc_raci_assignments
     WHERE assignment_source = 'auto_provision' AND deleted_at IS NULL`
  );

  const coverage = coverageResult.rows.map((r: GenericRow) => ({
    entityType: r.entity_type,
    totalEntities: parseInt(r.total_entities) || 0,
    withResponsible: parseInt(r.with_responsible) || 0,
    withAccountable: parseInt(r.with_accountable) || 0,
    withUserOwner: parseInt(r.with_user_owner) || 0,
    withTeamOwner: parseInt(r.with_team_owner) || 0,
    coveragePct: r.total_entities > 0
      ? Math.round(((parseInt(r.with_responsible) + parseInt(r.with_accountable)) / (parseInt(r.total_entities) * 2)) * 100)
      : 0,
  }));

  const totalEntities = coverage.reduce((s: number, c: GenericRow) => s + Number(c.totalEntities || 0), 0);
  const totalCovered = coverage.reduce((s: number, c: GenericRow) => s + Number(c.withResponsible || 0) + Number(c.withAccountable || 0), 0);
  const healthScore = totalEntities > 0 ? Math.round((totalCovered / (totalEntities * 2)) * 100) : 0;

  return {
    healthScore,
    coverage,
    gaps: gapResult.rows.map((r: GenericRow) => ({ entityType: r.entity_type, gapCount: parseInt(r.gap_count) || 0 })),
    teamDistribution: teamResult.rows,
    expiringAssignments: parseInt(getFirstRow(expiringResult)?.expiring_count) || 0,
    autoAssignedTotal: parseInt(getFirstRow(autoAssignedResult)?.auto_assigned_count) || 0,
  };
}

export async function getTeamDistribution(tenantId: string, entityType: 'control' | 'risk' | 'evidence'): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const table = entityType === 'control' ? 'control_team_distribution'
    : entityType === 'risk' ? 'risk_team_distribution' : 'evidence_team_distribution';
  // secrets-scan-allow: schema tenantSchema()-validated; filter fragments pre-built with $N
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${table} ORDER BY team_code, raci_role`
  );
  return result.rows;
}

export async function getEvidenceSectorMapping(tenantId: string, sectorCode?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".evidence_sector_mapping WHERE 1=1`;
  const params: unknown[] = [];
  if (sectorCode) { sql += ` AND sector_code = $1`; params.push(sectorCode); }
  sql += ` ORDER BY sector_priority DESC, evidence_type_code`;
  const result = await safeQuery(sql, params);
  return result.rows;
}
