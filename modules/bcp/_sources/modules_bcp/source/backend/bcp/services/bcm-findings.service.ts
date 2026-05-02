import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';

export async function createFinding(tenantId: string, data: {
  title: string; description?: string; source_type?: string; source_id?: string;
  finding_type?: string; severity?: string; assigned_to?: string; assigned_team_id?: string;
  due_date?: string; remediation_plan?: string; root_cause?: string;
  linked_plan_id?: string; linked_risk_id?: string; linked_control_id?: string;
}): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".bcm_findings
     (title, description, source_type, source_id, finding_type, severity,
      assigned_to, assigned_team_id, due_date, remediation_plan, root_cause,
      linked_plan_id, linked_risk_id, linked_control_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.title, data.description || null, data.source_type || null, data.source_id || null,
      data.finding_type || 'gap', data.severity || 'medium',
      data.assigned_to || null, data.assigned_team_id || null,
      data.due_date || null, data.remediation_plan || null, data.root_cause || null,
      data.linked_plan_id || null, data.linked_risk_id || null, data.linked_control_id || null,
    ]
  );
  const row = getFirstRow(r) as GenericRow;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.finding_created', tenantId, sourceService: 'bcm-findings',
      entityType: 'bcm_finding', entityId: row.finding_id, severity: (data.severity === 'critical' ? 'critical' : data.severity === 'high' ? 'warning' : 'info') as 'info' | 'warning' | 'critical',
      payload: { title: data.title, finding_type: data.finding_type, source_type: data.source_type },
    } as any)), { tenantId, operation: 'eventBus:bcp.finding_created' });
  return row;
}

export async function getFindings(tenantId: string, filters?: {
  status?: string; severity?: string; source_type?: string; assigned_to?: string;
}): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".bcm_findings WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.severity) { params.push(filters.severity); sql += ` AND severity = $${params.length}`; }
  if (filters?.source_type) { params.push(filters.source_type); sql += ` AND source_type = $${params.length}`; }
  if (filters?.assigned_to) { params.push(filters.assigned_to); sql += ` AND assigned_to = $${params.length}`; }
  sql += ` ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function getFindingById(tenantId: string, findingId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow(await safeQuery(
    `SELECT * FROM "${schema}".bcm_findings WHERE finding_id = $1 AND deleted_at IS NULL`, [findingId]
  )) as GenericRow | undefined;
}

export async function updateFinding(tenantId: string, findingId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const allowed = [
    'title', 'description', 'finding_type', 'severity', 'status',
    'assigned_to', 'assigned_team_id', 'due_date',
    'remediation_plan', 'root_cause', 'corrective_action', 'preventive_action',
    'remediation_evidence', 'linked_plan_id', 'linked_risk_id', 'linked_control_id',
  ];
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(key === 'remediation_evidence' ? JSON.stringify(data[key]) : data[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getFindingById(tenantId, findingId);
  sets.push('updated_at = NOW()');
  params.push(findingId);
  const r = await safeQuery(
    `UPDATE "${schema}".bcm_findings SET ${sets.join(', ')} WHERE finding_id = $${params.length} AND deleted_at IS NULL RETURNING *`,
    params
  );
  const row = getFirstRow(r) as GenericRow | undefined;
  if (row && data.status === 'remediated') {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'bcp.finding_remediated', tenantId, sourceService: 'bcm-findings',
          entityType: 'bcm_finding', entityId: findingId, severity: 'info',
          payload: { title: row.title, source_type: row.source_type, source_id: row.source_id },
        } as any)), { tenantId, operation: 'eventBus:bcp.finding_remediated' });
  }
  return row;
}

export async function verifyFinding(tenantId: string, findingId: string, verifiedBy: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".bcm_findings SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW()
     WHERE finding_id = $2 AND deleted_at IS NULL RETURNING *`,
    [verifiedBy, findingId]
  );
  return getFirstRow(r) as GenericRow | undefined;
}

export async function closeFinding(tenantId: string, findingId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".bcm_findings SET status = 'closed', updated_at = NOW()
     WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`,
    [findingId]
  );
  return getFirstRow(r) as GenericRow | undefined;
}

export async function getFindingsSummary(tenantId: string): Promise<{
  total: number; open: number; inProgress: number; overdue: number; closed: number;
  bySeverity: Record<string, number>; bySource: Record<string, number>;
}> {
  const schema = tenantSchema(tenantId);
  const [totalRes, statusRes, sevRes, srcRes, overdueRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL`, []),
    safeQuery(`SELECT status, COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL GROUP BY status`, []),
    safeQuery(`SELECT severity, COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL AND status NOT IN ('closed','accepted','verified') GROUP BY severity`, []),
    safeQuery(`SELECT source_type, COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL GROUP BY source_type`, []),
    safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL AND status NOT IN ('closed','accepted','verified') AND due_date < CURRENT_DATE`, []),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of statusRes.rows) statusMap[row.status as string] = Number(row.cnt);
  const bySeverity: Record<string, number> = {};
  for (const row of sevRes.rows) bySeverity[row.severity as string] = Number(row.cnt);
  const bySource: Record<string, number> = {};
  for (const row of srcRes.rows) bySource[row.source_type as string] = Number(row.cnt);

  return {
    total: Number(totalRes.rows[0]?.cnt || 0),
    open: Number(statusMap['open'] || 0),
    inProgress: Number(statusMap['in_progress'] || 0),
    overdue: Number(overdueRes.rows[0]?.cnt || 0),
    closed: Number((statusMap['closed'] || 0) + (statusMap['accepted'] || 0) + (statusMap['verified'] || 0)),
    bySeverity, bySource,
  };
}

export async function autoCreateFindingsFromExercise(tenantId: string, exerciseId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const results = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".bcp_exercise_results WHERE exercise_id = $1 AND result_type IN ('gap','action_item')`, [exerciseId]
  ), { operation: 'fetch exercise results for findings' });

  const findings: GenericRow[] = [];
  for (const result of results.rows) {
    const finding = await createFinding(tenantId, {
      title: `[Exercise] ${result.title || result.observation || 'Finding from exercise'}`,
      description: (result.observation as string) || (result.description as string) || null,
      source_type: 'exercise',
      source_id: exerciseId,
      finding_type: result.result_type === 'gap' ? 'gap' : 'recommendation',
      severity: (result.severity as string) || 'medium',
    });
    findings.push(finding);
  }
  return findings;
}

export async function autoCreateFindingsFromActivation(tenantId: string, activationId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const activation = getFirstRow(await safeQuery(
    `SELECT * FROM "${schema}".bcp_activations WHERE activation_id = $1`, [activationId]
  )) as GenericRow | undefined;
  if (!activation?.lessons_learned) return [];

  const finding = await createFinding(tenantId, {
    title: `[Activation] Lessons learned from activation ${activationId.slice(0, 8)}`,
    description: activation.lessons_learned as string,
    source_type: 'activation',
    source_id: activationId,
    finding_type: 'observation',
    severity: 'medium',
    linked_plan_id: activation.plan_id as string,
  });
  return [finding];
}
