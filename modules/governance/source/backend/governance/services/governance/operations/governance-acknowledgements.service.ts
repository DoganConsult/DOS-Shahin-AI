// ============================================
// Shahin-Ai — Governance Acknowledgements Service
// Policy acknowledgement campaigns: create,
// track completion, record self-service acks.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listAcknowledgements(
  tenantId: string,
  filters?: { policy_id?: string; user_id?: string; campaign_id?: string }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_policy_acknowledgements WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.policy_id) { sql += ` AND policy_id = $${idx++}`; params.push(filters.policy_id); }
  if (filters?.user_id) { sql += ` AND user_id = $${idx++}`; params.push(filters.user_id); }
  if (filters?.campaign_id) { sql += ` AND campaign_id = $${idx++}`; params.push(filters.campaign_id); }
  sql += ` ORDER BY acknowledged_at DESC NULLS LAST, created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function listCampaigns(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      a.campaign_id,
      a.policy_id,
      p.title AS policy_title,
      COUNT(*)::int AS total_recipients,
      COUNT(a.acknowledged_at)::int AS acknowledged_count,
      MIN(a.due_date) AS due_date,
      ROUND(COUNT(a.acknowledged_at)::decimal / GREATEST(COUNT(*), 1) * 100, 1) AS completion_pct
    FROM "${schema}".governance_policy_acknowledgements a
    LEFT JOIN "${schema}".policies p ON p.policy_id = a.policy_id
    WHERE a.campaign_id IS NOT NULL
    GROUP BY a.campaign_id, a.policy_id, p.title
    ORDER BY due_date ASC NULLS LAST
  `);
  return result.rows;
}

export async function createCampaign(tenantId: string, data: {
  policy_id: string;
  user_ids: string[];
  due_date?: string;
  version_acknowledged?: number;
  created_by?: string;
}): Promise<{ campaign_id: string; entries_created: number }> {
  const schema = tenantSchema(tenantId);
  const campaignId = uuid();
  let count = 0;
  for (const userId of data.user_ids) {
    await safeQuery(
      `INSERT INTO "${schema}".governance_policy_acknowledgements
        (policy_id, user_id, campaign_id, due_date, version_acknowledged, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [data.policy_id, userId, campaignId, data.due_date || null, data.version_acknowledged || null, data.created_by || null]
    );
    count++;
  }
  return { campaign_id: campaignId, entries_created: count };
}

export async function recordAcknowledgement(tenantId: string, ackId: string, userId: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getAckStats(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      p.policy_id,
      p.title AS policy_title,
      COUNT(a.ack_id)::int AS total,
      COUNT(a.acknowledged_at)::int AS acknowledged,
      ROUND(COUNT(a.acknowledged_at)::decimal / GREATEST(COUNT(a.ack_id), 1) * 100, 1) AS completion_pct,
      COUNT(*) FILTER (WHERE a.due_date < CURRENT_DATE AND a.acknowledged_at IS NULL)::int AS overdue
    FROM "${schema}".governance_policy_acknowledgements a
    JOIN "${schema}".policies p ON p.policy_id = a.policy_id
    GROUP BY p.policy_id, p.title
    ORDER BY completion_pct ASC
  `);
  return result.rows;
}
