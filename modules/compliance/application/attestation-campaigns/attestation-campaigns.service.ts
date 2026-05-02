/**
 * Attestation-Campaigns service — CRUD + status transition over
 * `<tenant_schema>.attestation_campaigns`.
 */
import type { DbClient } from '../../db/runner';

export type CampaignEntityType = 'framework' | 'control';
const ENTITY_TYPES: ReadonlyArray<CampaignEntityType> = ['framework', 'control'];

export type CampaignStatus =
  | 'draft' | 'active' | 'in_progress' | 'submitted'
  | 'reviewed' | 'approved' | 'rejected' | 'expired';
const STATUSES: ReadonlyArray<CampaignStatus> = [
  'draft', 'active', 'in_progress', 'submitted',
  'reviewed', 'approved', 'rejected', 'expired',
];

export interface AttestationCampaignRow {
  campaignId: string;
  name: string;
  policyId: string | null;
  entityType: CampaignEntityType;
  entityId: string | null;
  status: CampaignStatus;
  dueDate: string | null;
  createdBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListCampaignsInput {
  tenantSchema: string;
  policyId?: string;
  status?: CampaignStatus;
  entityType?: CampaignEntityType;
  limit?: number;
  offset?: number;
}

export interface CreateCampaignInput {
  tenantSchema: string;
  actorId: string;
  name: string;
  policyId?: string | null;
  entityType?: CampaignEntityType;
  entityId?: string | null;
  dueDate?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateCampaignStatusInput {
  tenantSchema: string;
  actorId: string;
  campaignId: string;
  status: CampaignStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `campaign_id, name, policy_id, entity_type, entity_id, status,
              due_date, created_by, metadata, created_at, updated_at`;

const mapRow = (x: {
  campaign_id: string; name: string; policy_id: string | null;
  entity_type: string; entity_id: string | null; status: string;
  due_date: string | null; created_by: string | null;
  metadata: Record<string, unknown> | string;
  created_at: string; updated_at: string;
}): AttestationCampaignRow => ({
  campaignId: x.campaign_id, name: x.name, policyId: x.policy_id,
  entityType: x.entity_type as CampaignEntityType, entityId: x.entity_id,
  status: x.status as CampaignStatus,
  dueDate: x.due_date, createdBy: x.created_by,
  metadata: typeof x.metadata === 'string' ? JSON.parse(x.metadata) : (x.metadata ?? {}),
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listCampaigns(
  client: DbClient,
  input: ListCampaignsInput,
): Promise<{ rows: AttestationCampaignRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.policyId) { params.push(input.policyId); where += ` AND policy_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".attestation_campaigns
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".attestation_campaigns WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getCampaign(
  client: DbClient,
  input: { tenantSchema: string; campaignId: string },
): Promise<AttestationCampaignRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".attestation_campaigns
     WHERE campaign_id = $1`,
    [input.campaignId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createCampaign(
  client: DbClient,
  input: CreateCampaignInput,
): Promise<AttestationCampaignRow> {
  assertSchema(input.tenantSchema);
  if (!input.name) {
    throw Object.assign(new Error('name required'), { code: 'bad_input' });
  }
  if (input.entityType && !ENTITY_TYPES.includes(input.entityType)) {
    throw Object.assign(new Error(`bad entity_type: ${input.entityType}`), { code: 'bad_entity_type' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".attestation_campaigns
       (name, policy_id, entity_type, entity_id, due_date, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.name,
      input.policyId ?? null,
      input.entityType ?? 'framework',
      input.entityId ?? null,
      input.dueDate ?? null,
      input.actorId,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateCampaignStatus(
  client: DbClient,
  input: UpdateCampaignStatusInput,
): Promise<AttestationCampaignRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".attestation_campaigns
        SET status = $2, updated_at = NOW()
      WHERE campaign_id = $1
      RETURNING ${COLS}`,
    [input.campaignId, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteCampaign(
  client: DbClient,
  input: { tenantSchema: string; campaignId: string },
): Promise<AttestationCampaignRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".attestation_campaigns
      WHERE campaign_id = $1
      RETURNING ${COLS}`,
    [input.campaignId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
