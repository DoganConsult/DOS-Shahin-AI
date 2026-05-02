import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';

export interface ComplianceObligation {
  id: string;
  tenantId: string;
  frameworkCode: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'pending' | 'met' | 'overdue' | 'waived';
  ownerId: string | null;
  metAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObligationInput {
  frameworkCode: string;
  title: string;
  description?: string;
  dueDate?: string;
  ownerId?: string;
}

export async function createObligation(
  tenantId: string,
  input: CreateObligationInput,
): Promise<ComplianceObligation> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".compliance_obligations
       (framework_code, title, description, due_date, status, owner_id)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     RETURNING *`,
    [input.frameworkCode, input.title, input.description ?? null, input.dueDate ?? null, input.ownerId ?? null],
  );
  logger.info({ tenantId, obligationId: result.rows[0]?.id }, '[ComplianceObligation] created');
  return mapRow(result.rows[0]);
}

export async function listObligations(
  tenantId: string,
  options: { frameworkCode?: string; status?: string; limit?: number; offset?: number } = {},
): Promise<ComplianceObligation[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (options.frameworkCode) {
    params.push(options.frameworkCode);
    conditions.push(`framework_code = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  params.push(limit, offset);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".compliance_obligations
     WHERE ${where}
     ORDER BY due_date ASC NULLS LAST, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapRow);
}

export async function markObligationMet(
  tenantId: string,
  obligationId: string,
  actorId?: string,
): Promise<ComplianceObligation | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".compliance_obligations
     SET status = 'met', met_at = NOW(), updated_at = NOW(),
         updated_by = $2
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [obligationId, actorId ?? null],
  );
  if (result.rows.length === 0) return null;
  logger.info({ tenantId, obligationId, actorId }, '[ComplianceObligation] marked met');
  return mapRow(result.rows[0]);
}

export async function getOverdueObligations(tenantId: string): Promise<ComplianceObligation[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".compliance_obligations
     SET status = 'overdue', updated_at = NOW()
     WHERE status = 'pending'
       AND due_date < NOW()
       AND deleted_at IS NULL
     RETURNING *`,
  );

  const updated = result.rows;

  const selectResult = await safeQuery(
    `SELECT * FROM "${schema}".compliance_obligations
     WHERE status = 'overdue' AND deleted_at IS NULL
     ORDER BY due_date ASC`,
  );

  const seen = new Set(updated.map((r: Record<string, unknown>) => r['id'] as string));
  const all = [
    ...updated,
    ...selectResult.rows.filter((r: Record<string, unknown>) => !seen.has(r['id'] as string)),
  ];

  return all.map(mapRow);
}

function mapRow(row: Record<string, unknown>): ComplianceObligation {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    frameworkCode: row['framework_code'] as string,
    title: row['title'] as string,
    description: (row['description'] as string) ?? null,
    dueDate: row['due_date'] ? String(row['due_date']) : null,
    status: row['status'] as ComplianceObligation['status'],
    ownerId: (row['owner_id'] as string) ?? null,
    metAt: row['met_at'] ? String(row['met_at']) : null,
    createdAt: String(row['created_at']),
    updatedAt: String(row['updated_at']),
  };
}
