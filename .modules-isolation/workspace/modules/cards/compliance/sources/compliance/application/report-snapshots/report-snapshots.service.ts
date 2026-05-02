/**
 * Report-Snapshots service — tenant-scoped immutable report snapshots
 * over `<tenant_schema>.compliance_report_snapshots`.
 *
 * Snapshots are immutable artifacts: create captures the result; only delete is allowed
 * (e.g., to purge expired ones).
 */
import type { DbClient } from '../../db/runner';

export interface ReportSnapshotRow {
  id: string;
  tenantId: string;
  reportType: string;
  title: string;
  parameters: Record<string, unknown>;
  resultData: Record<string, unknown>;
  generatedBy: string;
  generatedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListReportSnapshotsInput {
  tenantSchema: string;
  tenantId: string;
  reportType?: string;
  generatedBy?: string;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateReportSnapshotInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  reportType: string;
  title: string;
  parameters?: Record<string, unknown>;
  resultData?: Record<string, unknown>;
  expiresAt?: string | null;
}

export interface DeleteReportSnapshotInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, report_type, title, parameters, result_data,
              generated_by, generated_at, expires_at, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; report_type: string; title: string;
  parameters: Record<string, unknown>; result_data: Record<string, unknown>;
  generated_by: string; generated_at: string; expires_at: string | null;
  created_at: string; updated_at: string;
}): ReportSnapshotRow => ({
  id: x.id, tenantId: x.tenant_id, reportType: x.report_type, title: x.title,
  parameters: x.parameters ?? {}, resultData: x.result_data ?? {},
  generatedBy: x.generated_by, generatedAt: x.generated_at, expiresAt: x.expires_at,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listReportSnapshots(
  client: DbClient,
  input: ListReportSnapshotsInput,
): Promise<{ rows: ReportSnapshotRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.reportType) { params.push(input.reportType); where += ` AND report_type = $${params.length}`; }
  if (input.generatedBy) { params.push(input.generatedBy); where += ` AND generated_by = $${params.length}`; }
  if (!input.includeExpired) {
    where += ` AND (expires_at IS NULL OR expires_at > NOW())`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_report_snapshots
     WHERE ${where} ORDER BY generated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_report_snapshots WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getReportSnapshot(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ReportSnapshotRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_report_snapshots
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createReportSnapshot(
  client: DbClient,
  input: CreateReportSnapshotInput,
): Promise<ReportSnapshotRow> {
  assertSchema(input.tenantSchema);
  if (!input.reportType || !input.title) {
    throw Object.assign(
      new Error('reportType, title required'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_report_snapshots
       (tenant_id, report_type, title, parameters, result_data, generated_by, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.reportType, input.title,
      JSON.stringify(input.parameters ?? {}),
      JSON.stringify(input.resultData ?? {}),
      input.actorId, input.expiresAt ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteReportSnapshot(
  client: DbClient,
  input: DeleteReportSnapshotInput,
): Promise<ReportSnapshotRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".compliance_report_snapshots
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
