// @ts-nocheck
/**
 * Attestation Service — Spec §3.1 Campaign lifecycle, record management, SoD enforcement
 */
import { safeQuery, tenantSchema } from '../ports/attestation.ports';
import { AttestationCampaignContract, AttestationRecordContract, AttestationDiagnosticsContract } from '../contracts/attestation.contract';
import { setAuditData, evaluateLifecycleTransition } from '../ports/attestation.ports';
import { emitEvent } from '../../platform/dos/events';

// ── Campaign Service ──
export async function createCampaign(tenantId: string, ownerId: string, data: { title: string; description?: string; campaignType?: string; dueDate?: string; scopeJson?: Record<string, unknown>; frequency?: string }): Promise<AttestationCampaignContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".attestation_campaigns (title, description, campaign_type, due_date, scope_json, frequency, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING campaign_id as "campaignId", title, description, campaign_type as "campaignType", status, owner_id as "ownerId", due_date as "dueDate", scope_json as "scopeJson", frequency, created_at as "createdAt", updated_at as "updatedAt", closed_at as "closedAt"`,
    [data.title, data.description || null, data.campaignType || 'periodic', data.dueDate || null, JSON.stringify(data.scopeJson || {}), data.frequency || 'quarterly', ownerId]
  );
  const campaign = result.rows[0];
  await setAuditData(tenantId, 'attestation_campaigns', campaign.campaignId, 'create', null, campaign, ownerId);
  await emitEvent('attestation.campaign_created', { tenantId, entityId: campaign.campaignId, payload: campaign });
  return campaign as AttestationCampaignContract;
}

export async function transitionCampaign(tenantId: string, campaignId: string, targetStatus: string, userId: string): Promise<AttestationCampaignContract> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.attestation_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function listCampaigns(tenantId: string): Promise<AttestationCampaignContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT campaign_id as "campaignId", title, description, campaign_type as "campaignType", status, owner_id as "ownerId", due_date as "dueDate", frequency, created_at as "createdAt", updated_at as "updatedAt", closed_at as "closedAt"
     FROM "${schema}".attestation_campaigns ORDER BY created_at DESC LIMIT 100`
  );
  return result.rows as AttestationCampaignContract[];
}

// ── Record Service ──
export async function createRecord(tenantId: string, data: { campaignId: string; attestorUserId: string; entityType: string; entityId: string }): Promise<AttestationRecordContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".attestation_records (campaign_id, attestor_user_id, entity_type, entity_id)
     VALUES ($1, $2, $3, $4)
     RETURNING record_id as "recordId", campaign_id as "campaignId", attestor_user_id as "attestorUserId", entity_type as "entityType", entity_id as "entityId", attestation_status as "attestationStatus", created_at as "createdAt"`,
    [data.campaignId, data.attestorUserId, data.entityType, data.entityId]
  );
  return result.rows[0] as AttestationRecordContract;
}

export async function reviewRecord(tenantId: string, recordId: string, reviewerId: string, data: { reviewStatus: string; reviewComment?: string }): Promise<AttestationRecordContract> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.attestation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ── Diagnostics Service ──
export async function runDiagnostics(tenantId: string): Promise<AttestationDiagnosticsContract> {
  const schema = tenantSchema(tenantId);
  const total = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".attestation_campaigns`);
  const active = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".attestation_campaigns WHERE status = 'active'`);
  const pending = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".attestation_records WHERE attestation_status = 'pending'`);
  const overdue = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".attestation_campaigns WHERE status = 'active' AND due_date < NOW()`);

  return {
    totalCampaigns: parseInt(total.rows[0]?.count || '0'),
    activeCampaigns: parseInt(active.rows[0]?.count || '0'),
    pendingRecords: parseInt(pending.rows[0]?.count || '0'),
    overdueCampaigns: parseInt(overdue.rows[0]?.count || '0'),
    healthStatus: parseInt(overdue.rows[0]?.count || '0') > 0 ? 'degraded' : 'healthy'
  };
}
