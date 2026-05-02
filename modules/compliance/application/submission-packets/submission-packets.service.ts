/**
 * Submission-Packets service — regulator submission bundles over
 * `<tenant_schema>.submission_packets`. Each packet aggregates evidence,
 * attestations, and posture for a regulator filing window.
 */
import type { DbClient } from '../../db/runner';

export type PacketStatus =
  | 'draft' | 'under_review' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
const STATUSES: ReadonlyArray<PacketStatus> = [
  'draft', 'under_review', 'submitted', 'accepted', 'rejected', 'withdrawn',
];

export interface SubmissionPacketRow {
  packetId: string;
  regulatorCode: string;
  frameworkCode: string;
  title: string;
  summary: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: PacketStatus;
  submittedAt: string | null;
  submittedBy: string | null;
  acceptedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListSubmissionPacketsInput {
  tenantSchema: string;
  regulatorCode?: string;
  frameworkCode?: string;
  status?: PacketStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSubmissionPacketInput {
  tenantSchema: string;
  actorId: string;
  regulatorCode: string;
  frameworkCode: string;
  title: string;
  summary?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: PacketStatus;
}

export interface UpdateSubmissionPacketStatusInput {
  tenantSchema: string;
  actorId: string;
  packetId: string;
  status: PacketStatus;
  rejectionReason?: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `packet_id, regulator_code, framework_code, title, summary,
              period_start, period_end, status, submitted_at, submitted_by,
              accepted_at, rejection_reason, created_at, updated_at`;

const mapRow = (x: {
  packet_id: string; regulator_code: string; framework_code: string;
  title: string; summary: string | null;
  period_start: string | null; period_end: string | null;
  status: string; submitted_at: string | null; submitted_by: string | null;
  accepted_at: string | null; rejection_reason: string | null;
  created_at: string; updated_at: string;
}): SubmissionPacketRow => ({
  packetId: x.packet_id, regulatorCode: x.regulator_code,
  frameworkCode: x.framework_code, title: x.title, summary: x.summary,
  periodStart: x.period_start, periodEnd: x.period_end,
  status: x.status as PacketStatus,
  submittedAt: x.submitted_at, submittedBy: x.submitted_by,
  acceptedAt: x.accepted_at, rejectionReason: x.rejection_reason,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listSubmissionPackets(
  client: DbClient,
  input: ListSubmissionPacketsInput,
): Promise<{ rows: SubmissionPacketRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.regulatorCode) { params.push(input.regulatorCode); where += ` AND regulator_code = $${params.length}`; }
  if (input.frameworkCode) { params.push(input.frameworkCode); where += ` AND framework_code = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND title ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".submission_packets
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".submission_packets WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getSubmissionPacket(
  client: DbClient,
  input: { tenantSchema: string; packetId: string },
): Promise<SubmissionPacketRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".submission_packets
     WHERE packet_id = $1`,
    [input.packetId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createSubmissionPacket(
  client: DbClient,
  input: CreateSubmissionPacketInput,
): Promise<SubmissionPacketRow> {
  assertSchema(input.tenantSchema);
  if (!input.regulatorCode || !input.frameworkCode || !input.title) {
    throw Object.assign(
      new Error('regulatorCode, frameworkCode, title required'), { code: 'bad_input' },
    );
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".submission_packets
       (regulator_code, framework_code, title, summary,
        period_start, period_end, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.regulatorCode, input.frameworkCode, input.title,
      input.summary ?? null,
      input.periodStart ?? null, input.periodEnd ?? null,
      input.status ?? 'draft',
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateSubmissionPacketStatus(
  client: DbClient,
  input: UpdateSubmissionPacketStatusInput,
): Promise<SubmissionPacketRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const stampSubmitted = input.status === 'submitted';
  const stampAccepted = input.status === 'accepted';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".submission_packets
        SET status            = $2,
            submitted_at      = CASE WHEN $4::boolean AND submitted_at IS NULL THEN NOW() ELSE submitted_at END,
            submitted_by      = CASE WHEN $4::boolean AND submitted_by IS NULL THEN $5 ELSE submitted_by END,
            accepted_at       = CASE WHEN $6::boolean AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
            rejection_reason  = CASE WHEN $2 = 'rejected' THEN $3 ELSE rejection_reason END,
            updated_at        = NOW()
      WHERE packet_id = $1
      RETURNING ${COLS}`,
    [
      input.packetId, input.status,
      input.rejectionReason ?? null,
      stampSubmitted, input.actorId,
      stampAccepted,
    ],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteSubmissionPacket(
  client: DbClient,
  input: { tenantSchema: string; packetId: string },
): Promise<SubmissionPacketRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".submission_packets
      WHERE packet_id = $1
      RETURNING ${COLS}`,
    [input.packetId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
