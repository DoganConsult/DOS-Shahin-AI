// ============================================
// Compliance Attestation Service
// Manages attestation campaigns for compliance
// entities (controls, obligations, gaps, frameworks).
// Uses polymorphic entity_type/entity_id columns
// added in migration 339.
// ============================================

import { query, safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function createComplianceAttestationCampaign(tenantId: string, params: {
  entityType: 'control' | 'obligation' | 'gap' | 'framework';
  entityId: string;
  name: string;
  dueDate: string;
  userIds: string[];
  reminderIntervalDays?: number;
}): Promise<{ campaignId: string }> {
  const schema = tenantSchema(tenantId);
  const campaignId = uuid();

  await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(
      `INSERT INTO "${schema}".attestation_campaigns
       (campaign_id, policy_id, entity_type, entity_id, name, status, due_date, reminder_interval_days)
       VALUES ($1, NULL, $2, $3, $4, 'draft', $5, $6)`,
      [campaignId, params.entityType, params.entityId, params.name, params.dueDate, params.reminderIntervalDays ?? 7],
      client,
    );

    for (const userId of params.userIds) {
      await safeQueryWithClient(
        `INSERT INTO "${schema}".attestation_records (record_id, campaign_id, user_id, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT DO NOTHING`,
        [uuid(), campaignId, userId],
        client,
      );
    }
  });

  eventBus.publish(({
      eventType: 'compliance.attestation_campaign_started',
      tenantId,
      sourceService: 'ComplianceAttestationService',
      severity: 'info',
      payload: { campaignId, entityType: params.entityType, entityId: params.entityId, userCount: params.userIds.length },
    } as any));

  return { campaignId };
}

export async function activateCampaign(tenantId: string, campaignId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await query(
    `UPDATE "${schema}".attestation_campaigns SET status = 'active' WHERE campaign_id = $1 AND status = 'draft'`,
    [campaignId],
  );
}

export async function submitComplianceAttestation(tenantId: string, params: {
  campaignId: string;
  userId: string;
  action: 'attest' | 'decline';
  declinedReason?: string;
}): Promise<void> {
  const schema = tenantSchema(tenantId);

  await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(
      `UPDATE "${schema}".attestation_records SET
        status = $3,
        attested_at = CASE WHEN $3 = 'attested' THEN NOW() ELSE NULL END,
        declined_reason = $4
       WHERE campaign_id = $1 AND user_id = $2`,
      [params.campaignId, params.userId, params.action === 'attest' ? 'attested' : 'declined', params.declinedReason ?? null],
      client,
    );

    const remaining = await safeQueryWithClient(
      `SELECT COUNT(*)::int AS pending FROM "${schema}".attestation_records
       WHERE campaign_id = $1 AND status = 'pending'`,
      [params.campaignId],
      client,
    );
    if ((getFirstRow(remaining)?.pending ?? 1) === 0) {
      await safeQueryWithClient(
        `UPDATE "${schema}".attestation_campaigns SET status = 'submitted' WHERE campaign_id = $1 AND status IN ('active','in_progress')`,
        [params.campaignId],
        client,
      );
    }
  });

  eventBus.publish(({
      eventType: 'compliance.attestation_recorded',
      tenantId,
      sourceService: 'ComplianceAttestationService',
      severity: 'info',
      payload: { userId: params.userId, campaignId: params.campaignId, action: params.action },
    } as any));
}

export async function reviewAttestationSubmission(tenantId: string, campaignId: string, reviewerId: string, decision: 'approve' | 'reject'): Promise<void> {
  const schema = tenantSchema(tenantId);
  const newStatus = decision === 'approve' ? 'completed' : 'active';
  await query(
    `UPDATE "${schema}".attestation_campaigns SET status = $2 WHERE campaign_id = $1 AND status IN ('submitted','reviewed')`,
    [campaignId, newStatus],
  );

  eventBus.publish(({
      eventType: 'compliance.attestation_recorded',
      tenantId,
      sourceService: 'ComplianceAttestationService',
      severity: 'info',
      payload: { campaignId, reviewerId, decision },
    } as any));
}

export async function getComplianceAttestationStatus(tenantId: string, campaignId: string): Promise<{
  campaign: any;
  total: number;
  attested: number;
  declined: number;
  pending: number;
  completionRate: number;
  records: unknown[];
}> {
  const schema = tenantSchema(tenantId);

  const campaignRes = await safeQuery(
    `SELECT * FROM "${schema}".attestation_campaigns WHERE campaign_id = $1`,
    [campaignId],
  );

  const res = await safeQuery(
    `SELECT status, COUNT(*)::int as cnt FROM "${schema}".attestation_records
     WHERE campaign_id = $1 GROUP BY status`,
    [campaignId],
  );

  const counts: Record<string, number> = {};
  for (const r of res.rows) counts[r.status] = r.cnt;
  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  const recordsRes = await safeQuery(
    `SELECT ar.record_id, ar.user_id, ar.status, ar.attested_at, ar.declined_reason,
            u.first_name, u.last_name, u.email
     FROM "${schema}".attestation_records ar
     LEFT JOIN public.users u ON u.user_id = ar.user_id::text
     WHERE ar.campaign_id = $1 ORDER BY ar.status, u.last_name`,
    [campaignId],
  );

  return {
    campaign: getFirstRow(campaignRes) || null,
    total,
    attested: counts['attested'] || 0,
    declined: counts['declined'] || 0,
    pending: counts['pending'] || 0,
    completionRate: total > 0 ? Math.round(((counts['attested'] || 0) / total) * 100) : 0,
    records: recordsRes.rows,
  };
}

export async function listComplianceAttestations(tenantId: string, filters?: {
  entityType?: string;
  status?: string;
}): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`ac.entity_type IS NOT NULL`, `ac.entity_type != 'policy'`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.entityType) {
    conditions.push(`ac.entity_type = $${idx++}`);
    params.push(filters.entityType);
  }
  if (filters?.status) {
    conditions.push(`ac.status = $${idx++}`);
    params.push(filters.status);
  }

  const res = await safeQuery(
    `SELECT ac.*,
            COUNT(ar.record_id)::int as total_users,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int as attested_count,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'declined')::int as declined_count,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'pending')::int as pending_count
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY ac.campaign_id ORDER BY ac.created_at DESC`,
    params,
  );
  return res.rows;
}

export async function sendComplianceAttestationReminders(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT ar.user_id, ar.campaign_id, ac.name, ac.due_date, ac.reminder_interval_days, ac.entity_type, ac.entity_id
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     WHERE ar.status = 'pending' AND ac.status IN ('active','in_progress')
       AND ac.entity_type IS NOT NULL AND ac.entity_type != 'policy'
       AND (ar.last_reminded_at IS NULL OR
            ar.last_reminded_at < NOW() - (ac.reminder_interval_days || ' days')::INTERVAL)`,
    [],
  );

  for (const r of res.rows) {
    await query(
      `UPDATE "${schema}".attestation_records SET last_reminded_at = NOW()
       WHERE campaign_id = $1 AND user_id = $2`,
      [r.campaign_id, r.user_id],
    );
    eventBus.publish(({
          eventType: 'compliance.attestation_recorded',
          tenantId,
          sourceService: 'ComplianceAttestationService',
          severity: 'info',
          payload: { userId: r.user_id, campaignId: r.campaign_id, dueDate: r.due_date, entityType: r.entity_type },
        } as any));
  }
  return res.rows.length;
}
