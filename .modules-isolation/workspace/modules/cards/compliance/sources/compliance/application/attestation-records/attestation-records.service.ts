/**
 * Attestation-Records service — per-user campaign attestations over
 * `<tenant_schema>.attestation_records`.
 */
import type { DbClient } from '../../db/runner';

export type RecordStatus = 'pending' | 'attested' | 'declined' | 'expired';
const STATUSES: ReadonlyArray<RecordStatus> = ['pending', 'attested', 'declined', 'expired'];

export interface AttestationRecordRow {
  recordId: string;
  campaignId: string;
  userId: string;
  status: RecordStatus;
  attestedAt: string | null;
  declinedReason: string | null;
  lastRemindedAt: string | null;
  createdAt: string;
}

export interface ListRecordsInput {
  tenantSchema: string;
  campaignId?: string;
  userId?: string;
  status?: RecordStatus;
  limit?: number;
  offset?: number;
}

export interface CreateRecordInput {
  tenantSchema: string;
  actorId: string;
  campaignId: string;
  userId: string;
}

export interface AttestRecordInput {
  tenantSchema: string;
  actorId: string;
  recordId: string;
  status: RecordStatus;
  declinedReason?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `record_id, campaign_id, user_id, status, attested_at,
              declined_reason, last_reminded_at, created_at`;

const mapRow = (x: {
  record_id: string; campaign_id: string; user_id: string; status: string;
  attested_at: string | null; declined_reason: string | null;
  last_reminded_at: string | null; created_at: string;
}): AttestationRecordRow => ({
  recordId: x.record_id, campaignId: x.campaign_id, userId: x.user_id,
  status: x.status as RecordStatus, attestedAt: x.attested_at,
  declinedReason: x.declined_reason, lastRemindedAt: x.last_reminded_at,
  createdAt: x.created_at,
});

export async function listRecords(
  client: DbClient,
  input: ListRecordsInput,
): Promise<{ rows: AttestationRecordRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.campaignId) { params.push(input.campaignId); where += ` AND campaign_id = $${params.length}`; }
  if (input.userId) { params.push(input.userId); where += ` AND user_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".attestation_records
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".attestation_records WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getRecord(
  client: DbClient,
  input: { tenantSchema: string; recordId: string },
): Promise<AttestationRecordRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".attestation_records
     WHERE record_id = $1`,
    [input.recordId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createRecord(
  client: DbClient,
  input: CreateRecordInput,
): Promise<AttestationRecordRow> {
  assertSchema(input.tenantSchema);
  if (!input.campaignId || !input.userId) {
    throw Object.assign(new Error('campaignId, userId required'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".attestation_records
       (campaign_id, user_id)
     VALUES ($1, $2)
     RETURNING ${COLS}`,
    [input.campaignId, input.userId],
  );
  return mapRow(r.rows[0] as never);
}

export async function attestRecord(
  client: DbClient,
  input: AttestRecordInput,
): Promise<AttestationRecordRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const stampAttested = input.status === 'attested';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".attestation_records
        SET status = $2,
            attested_at = CASE WHEN $4::boolean THEN NOW() ELSE attested_at END,
            declined_reason = COALESCE($3, declined_reason)
      WHERE record_id = $1
      RETURNING ${COLS}`,
    [input.recordId, input.status, input.declinedReason ?? null, stampAttested],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function remindRecord(
  client: DbClient,
  input: { tenantSchema: string; actorId: string; recordId: string },
): Promise<AttestationRecordRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".attestation_records
        SET last_reminded_at = NOW()
      WHERE record_id = $1
      RETURNING ${COLS}`,
    [input.recordId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteRecord(
  client: DbClient,
  input: { tenantSchema: string; recordId: string },
): Promise<AttestationRecordRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".attestation_records
      WHERE record_id = $1
      RETURNING ${COLS}`,
    [input.recordId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
