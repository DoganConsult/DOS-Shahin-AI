/**
 * CSA-Campaigns service — control self-assessment campaigns over
 * `<tenant_schema>.csa_campaigns`.
 */
import type { DbClient } from '../../db/runner';

export type CsaCampaignStatus = 'draft' | 'active' | 'closed' | 'archived';
const STATUSES: ReadonlyArray<CsaCampaignStatus> = ['draft', 'active', 'closed', 'archived'];

export interface CsaCampaignRow {
  campaignId: string;
  title: string;
  description: string | null;
  controlIds: string[];
  respondentIds: string[];
  deadline: string | null;
  status: CsaCampaignStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCsaCampaignsInput {
  tenantSchema: string;
  status?: CsaCampaignStatus;
  limit?: number;
  offset?: number;
}

export interface CreateCsaCampaignInput {
  tenantSchema: string;
  actorId: string;
  title: string;
  description?: string | null;
  controlIds?: string[];
  respondentIds?: string[];
  deadline?: string | null;
}

export interface UpdateCsaCampaignStatusInput {
  tenantSchema: string;
  actorId: string;
  campaignId: string;
  status: CsaCampaignStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `campaign_id, title, description, control_ids, respondent_ids,
              deadline, status, created_by, created_at, updated_at`;

const j = <T>(v: unknown, fb: T): T =>
  typeof v === 'string' ? JSON.parse(v) as T : ((v as T) ?? fb);

const mapRow = (x: {
  campaign_id: string; title: string; description: string | null;
  control_ids: unknown; respondent_ids: unknown;
  deadline: string | null; status: string; created_by: string | null;
  created_at: string; updated_at: string;
}): CsaCampaignRow => ({
  campaignId: x.campaign_id, title: x.title, description: x.description,
  controlIds: j<string[]>(x.control_ids, []),
  respondentIds: j<string[]>(x.respondent_ids, []),
  deadline: x.deadline, status: x.status as CsaCampaignStatus,
  createdBy: x.created_by, createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listCsaCampaigns(
  client: DbClient,
  input: ListCsaCampaignsInput,
): Promise<{ rows: CsaCampaignRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".csa_campaigns
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".csa_campaigns WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getCsaCampaign(
  client: DbClient,
  input: { tenantSchema: string; campaignId: string },
): Promise<CsaCampaignRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".csa_campaigns
     WHERE campaign_id = $1`,
    [input.campaignId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createCsaCampaign(
  client: DbClient,
  input: CreateCsaCampaignInput,
): Promise<CsaCampaignRow> {
  assertSchema(input.tenantSchema);
  if (!input.title) {
    throw Object.assign(new Error('title required'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".csa_campaigns
       (title, description, control_ids, respondent_ids, deadline, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.title,
      input.description ?? null,
      JSON.stringify(input.controlIds ?? []),
      JSON.stringify(input.respondentIds ?? []),
      input.deadline ?? null,
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateCsaCampaignStatus(
  client: DbClient,
  input: UpdateCsaCampaignStatusInput,
): Promise<CsaCampaignRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".csa_campaigns
        SET status = $2, updated_at = NOW()
      WHERE campaign_id = $1
      RETURNING ${COLS}`,
    [input.campaignId, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteCsaCampaign(
  client: DbClient,
  input: { tenantSchema: string; campaignId: string },
): Promise<CsaCampaignRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".csa_campaigns
      WHERE campaign_id = $1
      RETURNING ${COLS}`,
    [input.campaignId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
