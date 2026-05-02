// ============================================
// F05: Policy Attestation Service
// Employee acknowledgment tracking, campaign
// management, automated reminders.
// Bridges gap vs IBM/ServiceNow policy
// compliance requirements.
// ============================================

import { emptyResult, query, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { v4 as uuid } from 'uuid';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { safeQuery } from "@dos/db";

export async function createAttestationCampaign(tenantId: string, params: {
  policyId: string;
  name: string;
  dueDate: string;
  userIds: string[];
  reminderIntervalDays?: number;
}): Promise<{ campaignId: string }> {
  const schema = tenantSchema(tenantId);
  const campaignId = uuid();

  await query(
    `INSERT INTO "${schema}".attestation_campaigns
     (campaign_id, policy_id, name, status, due_date, reminder_interval_days)
     VALUES ($1, $2, $3, 'active', $4, $5)`,
    [campaignId, params.policyId, params.name, params.dueDate, params.reminderIntervalDays ?? 7],
  );

  for (const userId of params.userIds) {
    await query(
      `INSERT INTO "${schema}".attestation_records (record_id, campaign_id, user_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT DO NOTHING`,
      [uuid(), campaignId, userId],
    );
    eventBus.publish(({
          eventType: 'policy.attestation_requested',
          tenantId,
          sourceService: 'PolicyAttestationService',
          severity: 'info',
          payload: { userId, campaignId, policyId: params.policyId, dueDate: params.dueDate },
        } as any));
  }

  return { campaignId };
}

export async function submitAttestation(tenantId: string, params: {
  campaignId: string;
  userId: string;
  action: 'attest' | 'decline';
  declinedReason?: string;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await query(
    `UPDATE "${schema}".attestation_records SET
      status = $3,
      attested_at = CASE WHEN $3 = 'attested' THEN NOW() ELSE NULL END,
      declined_reason = $4
     WHERE campaign_id = $1 AND user_id = $2`,
    [params.campaignId, params.userId, params.action === 'attest' ? 'attested' : 'declined', params.declinedReason ?? null],
  );

  eventBus.publish(({
      eventType: params.action === 'attest' ? 'policy.attested' : 'policy.attestation_declined',
      tenantId,
      sourceService: 'PolicyAttestationService',
      severity: 'info',
      payload: { userId: params.userId, campaignId: params.campaignId },
    } as any));
}

export async function getAttestationStatus(tenantId: string, campaignId: string): Promise<{
  total: number;
  attested: number;
  declined: number;
  pending: number;
  completionRate: number;
  records: unknown[];
}> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `SELECT status, COUNT(*)::int as cnt FROM "${schema}".attestation_records
     WHERE campaign_id = $1 GROUP BY status`,
    [campaignId],
  );

  const counts: Record<string, number> = {};
  for (const r of res.rows) counts[r.status] = r.cnt;
  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  const recordsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT ar.record_id, ar.user_id, ar.status, ar.attested_at, ar.declined_reason,
            u.first_name, u.last_name, u.email
     FROM "${schema}".attestation_records ar
     LEFT JOIN public.users u ON u.user_id = ar.user_id::text
     WHERE ar.campaign_id = $1 ORDER BY ar.status, u.last_name`,
    [campaignId],
  ), { tenantId: tenantId, operation: 'query attestation_records' });

  return {
    total,
    attested: counts['attested'] || 0,
    declined: counts['declined'] || 0,
    pending: counts['pending'] || 0,
    completionRate: total > 0 ? Math.round(((counts['attested'] || 0) / total) * 100) : 0,
    records: recordsRes.rows,
  };
}

export async function sendAttestationReminders(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `SELECT ar.user_id, ar.campaign_id, ac.name, ac.due_date, ac.reminder_interval_days
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     WHERE ar.status = 'pending' AND ac.status = 'active'
       AND (ar.last_reminded_at IS NULL OR
            ar.last_reminded_at < NOW() - (COALESCE(ac.reminder_interval_days, 7) * INTERVAL '1 day'))`,
    [],
  );

  for (const r of res.rows) {
    await query(
      `UPDATE "${schema}".attestation_records SET last_reminded_at = NOW()
       WHERE campaign_id = $1 AND user_id = $2`,
      [r.campaign_id, r.user_id],
    );
    eventBus.publish(({
          eventType: 'policy.attestation_reminder',
          tenantId,
          sourceService: 'PolicyAttestationService',
          severity: 'info',
          payload: { userId: r.user_id, campaignId: r.campaign_id, dueDate: r.due_date },
        } as any));
  }
  return res.rows.length;
}

export async function listAttestationCampaigns(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `SELECT ac.*,
            COUNT(ar.record_id)::int as total_users,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int as attested_count
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     GROUP BY ac.campaign_id ORDER BY ac.created_at DESC`,
    [],
  );
  return res.rows;
}
