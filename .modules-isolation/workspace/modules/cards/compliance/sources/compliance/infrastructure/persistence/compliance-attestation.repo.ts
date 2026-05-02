// ============================================
// Compliance Module — Attestation Repository
// Data access for `attestation_campaigns` and
// `attestation_records` aggregates used by
// compliance attestation workflows.
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface CreateCampaignInput {
  entity_type: 'control' | 'obligation' | 'gap' | 'framework';
  entity_id: string;
  name: string;
  due_date: string;
  reminder_interval_days?: number;
}

export interface ListCampaignsFilter {
  status?: string;
  entity_type?: string;
  page?: number;
  pageSize?: number;
}

// ── Repository ───────────────────────────────────────

export class ComplianceAttestationRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // --- Campaign reads ---

  async findCampaignById(campaignId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".attestation_campaigns WHERE campaign_id = $1`,
      [campaignId],
    );
    return getFirstRow(result);
  }

  async findCampaigns(filters: ListCampaignsFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(filters.entity_type); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".attestation_campaigns ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".attestation_campaigns ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  // --- Campaign create ---

  async createCampaign(data: CreateCampaignInput): Promise<GenericRow | null> {
    const campaignId = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".attestation_campaigns
        (campaign_id, policy_id, entity_type, entity_id, name, status, due_date, reminder_interval_days)
       VALUES ($1, NULL, $2, $3, $4, 'draft', $5, $6)
       RETURNING *`,
      [
        campaignId, data.entity_type, data.entity_id,
        data.name, data.due_date, data.reminder_interval_days ?? 7,
      ],
    );
    return getFirstRow(result);
  }

  // --- Campaign status transitions ---

  async activateCampaign(campaignId: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".attestation_campaigns
       SET status = 'active' WHERE campaign_id = $1 AND status = 'draft'
       RETURNING campaign_id`,
      [campaignId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async updateCampaignStatus(campaignId: string, status: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".attestation_campaigns
       SET status = $2, updated_at = NOW()
       WHERE campaign_id = $1
       RETURNING *`,
      [campaignId, status],
    );
    return getFirstRow(result);
  }

  // --- Records reads ---

  async findRecordsByCampaign(campaignId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".attestation_records WHERE campaign_id = $1 ORDER BY created_at`,
      [campaignId],
    );
    return result.rows;
  }

  async getRecordStats(campaignId: string): Promise<{ total: number; attested: number; declined: number; pending: number }> {
    const result = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'attested')::int AS attested,
         COUNT(*) FILTER (WHERE status = 'declined')::int AS declined,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
       FROM "${this.schema}".attestation_records
       WHERE campaign_id = $1`,
      [campaignId],
    );
    const row = getFirstRow(result)!;
    return {
      total: row?.total ?? 0,
      attested: row?.attested ?? 0,
      declined: row?.declined ?? 0,
      pending: row?.pending ?? 0,
    };
  }

  // --- Record create ---

  async createRecord(campaignId: string, userId: string): Promise<GenericRow | null> {
    const recordId = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".attestation_records
        (record_id, campaign_id, user_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [recordId, campaignId, userId],
    );
    return getFirstRow(result);
  }

  // --- Record update (attest / decline) ---

  async submitAttestation(campaignId: string, userId: string, action: 'attest' | 'decline', declinedReason?: string): Promise<boolean> {
    const status = action === 'attest' ? 'attested' : 'declined';
    const result = await safeQuery(
      `UPDATE "${this.schema}".attestation_records SET
        status = $3,
        attested_at = CASE WHEN $3 = 'attested' THEN NOW() ELSE NULL END,
        declined_reason = $4
       WHERE campaign_id = $1 AND user_id = $2
       RETURNING record_id`,
      [campaignId, userId, status, declinedReason ?? null],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  // --- Count pending for auto-advancement check ---

  async countPendingRecords(campaignId: string): Promise<number> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS pending FROM "${this.schema}".attestation_records
       WHERE campaign_id = $1 AND status = 'pending'`,
      [campaignId],
    );
    return getFirstRow(result)?.pending ?? 0;
  }
}
