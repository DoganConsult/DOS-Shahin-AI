import { safeQuery, tenantSchema } from '@dos/db';
import { randomUUID } from 'crypto';

function parseJsonb<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return val as T;
}

export async function getRiskAppetite(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, metadata, status, created_at, updated_at
     FROM "${schema}".risk_appetite_statements
     WHERE status != 'archived'
     ORDER BY created_at DESC`,
  ).catch(() => ({ rows: [] }));
  return result.rows.map((row: any) => ({
    id: row.id,
    ...parseJsonb<Record<string, unknown>>(row.metadata, {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertRiskAppetite(tenantId: string, appetite: any): Promise<any> {
  const schema = tenantSchema(tenantId);
  const items = Array.isArray(appetite) ? appetite : [appetite];
  const upserted: any[] = [];
  for (const item of items) {
    const id = item.id || randomUUID();
    const metadata = { ...item };
    delete metadata.id;
    delete metadata.status;
    await safeQuery(
      `INSERT INTO "${schema}".risk_appetite_statements (id, tenant_id, metadata, status, updated_at)
       VALUES ($1, $2, $3::jsonb, 'active', NOW())
       ON CONFLICT (id) DO UPDATE SET metadata = $3::jsonb, status = 'active', updated_at = NOW()`,
      [id, tenantId, JSON.stringify(metadata)],
    );
    upserted.push({ id, ...metadata });
  }
  return upserted;
}

export async function getAuthorityMatrix(tenantId: string): Promise<any> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config_value FROM "${schema}".governance_settings
     WHERE config_key = 'authority_matrix' AND is_active = TRUE
     LIMIT 1`,
  ).catch(() => ({ rows: [] }));
  return parseJsonb(result.rows[0]?.config_value, { rules: [] });
}

export async function upsertAuthorityMatrix(tenantId: string, matrix: any): Promise<any> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_settings (tenant_id, config_key, config_value, is_active, updated_at)
     VALUES ($1, 'authority_matrix', $2::jsonb, TRUE, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $2::jsonb, is_active = TRUE, updated_at = NOW()`,
    [tenantId, JSON.stringify(matrix)],
  ).catch(async () => {
    await safeQuery(
      `INSERT INTO "${schema}".governance_settings (tenant_id, config_key, config_value, is_active, updated_at)
       VALUES ($1, 'authority_matrix', $2::jsonb, TRUE, NOW())`,
      [tenantId, JSON.stringify(matrix)],
    );
  });
  return matrix;
}

export async function getEscalationThresholds(tenantId: string): Promise<any> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config_value FROM "${schema}".governance_settings
     WHERE config_key = 'escalation_thresholds' AND is_active = TRUE
     LIMIT 1`,
  ).catch(() => ({ rows: [] }));
  return parseJsonb(result.rows[0]?.config_value, { thresholds: [] });
}

export async function upsertEscalationThresholds(tenantId: string, thresholds: any): Promise<any> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_settings (tenant_id, config_key, config_value, is_active, updated_at)
     VALUES ($1, 'escalation_thresholds', $2::jsonb, TRUE, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $2::jsonb, is_active = TRUE, updated_at = NOW()`,
    [tenantId, JSON.stringify(thresholds)],
  ).catch(async () => {
    await safeQuery(
      `INSERT INTO "${schema}".governance_settings (tenant_id, config_key, config_value, is_active, updated_at)
       VALUES ($1, 'escalation_thresholds', $2::jsonb, TRUE, NOW())`,
      [tenantId, JSON.stringify(thresholds)],
    );
  });
  return thresholds;
}

export async function getConstitution(tenantId: string): Promise<any> {
  const [riskAppetite, authorityMatrix, escalationThresholds] = await Promise.all([
    getRiskAppetite(tenantId),
    getAuthorityMatrix(tenantId),
    getEscalationThresholds(tenantId),
  ]);
  return { riskAppetite, authorityMatrix, escalationThresholds };
}

export async function resolveApprover(tenantId: string, decisionType: string, criticality: string): Promise<any> {
  const matrix = await getAuthorityMatrix(tenantId);
  const rules: any[] = Array.isArray(matrix.rules) ? matrix.rules : [];
  const match = rules.find(
    r => r.decisionType === decisionType && (r.criticality === criticality || r.criticality === '*'),
  );
  if (!match) return null;
  return {
    approverId: match.approverId || null,
    approverRole: match.approverRole || null,
    decisionType,
    criticality,
    delegationAllowed: match.delegationAllowed ?? false,
  };
}

export async function checkRiskAgainstAppetite(tenantId: string, risk: any): Promise<boolean> {
  const appetite = await getRiskAppetite(tenantId);
  if (!appetite.length) return true;
  const category = risk.category || 'Operational';
  const score = Number(risk.residualScore ?? risk.score ?? 0);
  const matching = appetite.find((a: any) => a.category === category || a.category === '*');
  if (!matching) return true;
  const maxResidual = Number(matching.maxResidualScore ?? matching.maxScore ?? 100);
  return score <= maxResidual;
}

export async function validateConstitution(tenantId: string): Promise<any> {
  const constitution = await getConstitution(tenantId);
  const errors: string[] = [];
  if (!Array.isArray(constitution.riskAppetite) || constitution.riskAppetite.length === 0) {
    errors.push('Risk appetite statements not configured');
  }
  const matrix = constitution.authorityMatrix;
  if (!matrix.rules || !Array.isArray(matrix.rules) || matrix.rules.length === 0) {
    errors.push('Authority matrix not configured');
  }
  return { valid: errors.length === 0, errors };
}

export async function seedDefaultConstitution(tenantId: string): Promise<void> {
  const existing = await getRiskAppetite(tenantId);
  if (existing.length === 0) {
    await upsertRiskAppetite(tenantId, [
      { category: 'Operational', maxResidualScore: 25, acceptanceRequiresRole: 'compliance_officer', reviewCadenceDays: 90 },
      { category: 'Financial', maxResidualScore: 15, acceptanceRequiresRole: 'owner', reviewCadenceDays: 60 },
      { category: 'Compliance', maxResidualScore: 10, acceptanceRequiresRole: 'owner', reviewCadenceDays: 30 },
    ]);
  }
}
