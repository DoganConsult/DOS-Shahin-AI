/**
 * Regulator-Bulletins service — ingest stream for regulator change radar
 * (NCA, SAMA, CITC, ZATCA, MOH, CMA …) over `<tenant_schema>.regulator_bulletins`.
 *
 * Each bulletin is the canonical record of a published regulator notice that
 * may trigger a `regulatory_change`, an updated `instrument_structure` clause,
 * or a posture re-evaluation.
 */
import type { DbClient } from '../../db/runner';

export type BulletinSeverity = 'low' | 'medium' | 'high' | 'critical';
const SEVERITIES: ReadonlyArray<BulletinSeverity> = ['low', 'medium', 'high', 'critical'];

export type BulletinStatus = 'draft' | 'published' | 'superseded' | 'archived';
const STATUSES: ReadonlyArray<BulletinStatus> = ['draft', 'published', 'superseded', 'archived'];

export interface RegulatorBulletinRow {
  bulletinId: string;
  regulatorCode: string;
  bulletinCode: string;
  title: string;
  summary: string | null;
  severity: BulletinSeverity;
  status: BulletinStatus;
  publishedAt: string | null;
  effectiveDate: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListRegulatorBulletinsInput {
  tenantSchema: string;
  regulatorCode?: string;
  severity?: BulletinSeverity;
  status?: BulletinStatus;
  search?: string;
  publishedSince?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRegulatorBulletinInput {
  tenantSchema: string;
  actorId: string;
  regulatorCode: string;
  bulletinCode: string;
  title: string;
  summary?: string;
  severity?: BulletinSeverity;
  status?: BulletinStatus;
  publishedAt?: string;
  effectiveDate?: string;
  sourceUrl?: string;
}

export interface UpdateRegulatorBulletinStatusInput {
  tenantSchema: string;
  actorId: string;
  bulletinId: string;
  status: BulletinStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `bulletin_id, regulator_code, bulletin_code, title, summary,
              severity, status, published_at, effective_date, source_url,
              created_at, updated_at`;

const mapRow = (x: {
  bulletin_id: string; regulator_code: string; bulletin_code: string;
  title: string; summary: string | null; severity: string; status: string;
  published_at: string | null; effective_date: string | null;
  source_url: string | null; created_at: string; updated_at: string;
}): RegulatorBulletinRow => ({
  bulletinId: x.bulletin_id, regulatorCode: x.regulator_code,
  bulletinCode: x.bulletin_code, title: x.title, summary: x.summary,
  severity: x.severity as BulletinSeverity,
  status: x.status as BulletinStatus,
  publishedAt: x.published_at, effectiveDate: x.effective_date,
  sourceUrl: x.source_url,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listRegulatorBulletins(
  client: DbClient,
  input: ListRegulatorBulletinsInput,
): Promise<{ rows: RegulatorBulletinRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.regulatorCode) { params.push(input.regulatorCode); where += ` AND regulator_code = $${params.length}`; }
  if (input.severity) { params.push(input.severity); where += ` AND severity = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.publishedSince) { params.push(input.publishedSince); where += ` AND published_at >= $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND title ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".regulator_bulletins
     WHERE ${where} ORDER BY published_at DESC NULLS LAST, created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".regulator_bulletins WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getRegulatorBulletin(
  client: DbClient,
  input: { tenantSchema: string; bulletinId: string },
): Promise<RegulatorBulletinRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".regulator_bulletins
     WHERE bulletin_id = $1`,
    [input.bulletinId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createRegulatorBulletin(
  client: DbClient,
  input: CreateRegulatorBulletinInput,
): Promise<RegulatorBulletinRow> {
  assertSchema(input.tenantSchema);
  if (!input.regulatorCode || !input.bulletinCode || !input.title) {
    throw Object.assign(
      new Error('regulatorCode, bulletinCode, title required'), { code: 'bad_input' },
    );
  }
  if (input.severity && !SEVERITIES.includes(input.severity)) {
    throw Object.assign(new Error(`bad severity: ${input.severity}`), { code: 'bad_severity' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".regulator_bulletins
       (regulator_code, bulletin_code, title, summary, severity, status,
        published_at, effective_date, source_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [
      input.regulatorCode, input.bulletinCode, input.title,
      input.summary ?? null,
      input.severity ?? 'medium',
      input.status ?? 'draft',
      input.publishedAt ?? null,
      input.effectiveDate ?? null,
      input.sourceUrl ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateRegulatorBulletinStatus(
  client: DbClient,
  input: UpdateRegulatorBulletinStatusInput,
): Promise<RegulatorBulletinRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const stamp = input.status === 'published';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".regulator_bulletins
        SET status        = $2,
            published_at  = CASE WHEN $3::boolean AND published_at IS NULL THEN NOW() ELSE published_at END,
            updated_at    = NOW()
      WHERE bulletin_id = $1
      RETURNING ${COLS}`,
    [input.bulletinId, input.status, stamp],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteRegulatorBulletin(
  client: DbClient,
  input: { tenantSchema: string; bulletinId: string },
): Promise<RegulatorBulletinRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".regulator_bulletins
      WHERE bulletin_id = $1
      RETURNING ${COLS}`,
    [input.bulletinId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
