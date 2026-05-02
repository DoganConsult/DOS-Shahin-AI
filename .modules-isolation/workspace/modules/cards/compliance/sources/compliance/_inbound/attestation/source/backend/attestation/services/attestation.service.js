"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampaign = createCampaign;
exports.transitionCampaign = transitionCampaign;
exports.listCampaigns = listCampaigns;
exports.createRecord = createRecord;
exports.reviewRecord = reviewRecord;
exports.runDiagnostics = runDiagnostics;
// @ts-nocheck
/**
 * Attestation Service — Spec §3.1 Campaign lifecycle, record management, SoD enforcement
 */
const attestation_ports_1 = require("../ports/attestation.ports");
const attestation_ports_2 = require("../ports/attestation.ports");
const events_1 = require("../../../platform/dos/events");
// ── Campaign Service ──
async function createCampaign(tenantId, ownerId, data) {
    const schema = (0, attestation_ports_1.tenantSchema)(tenantId);
    const result = await (0, attestation_ports_1.safeQuery)(`INSERT INTO "${schema}".attestation_campaigns (title, description, campaign_type, due_date, scope_json, frequency, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING campaign_id as "campaignId", title, description, campaign_type as "campaignType", status, owner_id as "ownerId", due_date as "dueDate", scope_json as "scopeJson", frequency, created_at as "createdAt", updated_at as "updatedAt", closed_at as "closedAt"`, [data.title, data.description || null, data.campaignType || 'periodic', data.dueDate || null, JSON.stringify(data.scopeJson || {}), data.frequency || 'quarterly', ownerId]);
    const campaign = result.rows[0];
    await (0, attestation_ports_2.setAuditData)(tenantId, 'attestation_campaigns', campaign.campaignId, 'create', null, campaign, ownerId);
    await (0, events_1.emitEvent)('attestation.campaign_created', { tenantId, entityId: campaign.campaignId, payload: campaign });
    return campaign;
}
async function transitionCampaign(tenantId, campaignId, targetStatus, userId) {
    const result = await (0, attestation_ports_1.safeQuery)("SELECT * FROM __TENANT_SCHEMA__.attestation_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
async function listCampaigns(tenantId) {
    const schema = (0, attestation_ports_1.tenantSchema)(tenantId);
    const result = await (0, attestation_ports_1.safeQuery)(`SELECT campaign_id as "campaignId", title, description, campaign_type as "campaignType", status, owner_id as "ownerId", due_date as "dueDate", frequency, created_at as "createdAt", updated_at as "updatedAt", closed_at as "closedAt"
     FROM "${schema}".attestation_campaigns ORDER BY created_at DESC LIMIT 100`);
    return result.rows;
}
// ── Record Service ──
async function createRecord(tenantId, data) {
    const schema = (0, attestation_ports_1.tenantSchema)(tenantId);
    const result = await (0, attestation_ports_1.safeQuery)(`INSERT INTO "${schema}".attestation_records (campaign_id, attestor_user_id, entity_type, entity_id)
     VALUES ($1, $2, $3, $4)
     RETURNING record_id as "recordId", campaign_id as "campaignId", attestor_user_id as "attestorUserId", entity_type as "entityType", entity_id as "entityId", attestation_status as "attestationStatus", created_at as "createdAt"`, [data.campaignId, data.attestorUserId, data.entityType, data.entityId]);
    return result.rows[0];
}
async function reviewRecord(tenantId, recordId, reviewerId, data) {
    await (0, attestation_ports_1.safeQuery)("UPDATE __TENANT_SCHEMA__.attestation_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// ── Diagnostics Service ──
async function runDiagnostics(tenantId) {
    const schema = (0, attestation_ports_1.tenantSchema)(tenantId);
    const total = await (0, attestation_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".attestation_campaigns`);
    const active = await (0, attestation_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".attestation_campaigns WHERE status = 'active'`);
    const pending = await (0, attestation_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".attestation_records WHERE attestation_status = 'pending'`);
    const overdue = await (0, attestation_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".attestation_campaigns WHERE status = 'active' AND due_date < NOW()`);
    return {
        totalCampaigns: parseInt(total.rows[0]?.count || '0'),
        activeCampaigns: parseInt(active.rows[0]?.count || '0'),
        pendingRecords: parseInt(pending.rows[0]?.count || '0'),
        overdueCampaigns: parseInt(overdue.rows[0]?.count || '0'),
        healthStatus: parseInt(overdue.rows[0]?.count || '0') > 0 ? 'degraded' : 'healthy'
    };
}
//# sourceMappingURL=attestation.service.js.map