"use strict";
// ============================================
// Asset Linkage Service
// Cross-entity link CRUD: vendor, evidence
// Reads existing: control_asset_links, risk_asset_links
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorLinks = getVendorLinks;
exports.createVendorLink = createVendorLink;
exports.deleteVendorLink = deleteVendorLink;
exports.getEvidenceLinks = getEvidenceLinks;
exports.createEvidenceLink = createEvidenceLink;
exports.deleteEvidenceLink = deleteEvidenceLink;
exports.getControlLinks = getControlLinks;
exports.createControlLink = createControlLink;
exports.getRiskLinks = getRiskLinks;
exports.createRiskLink = createRiskLink;
exports.getAllLinksForAsset = getAllLinksForAsset;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const resilience_1 = require("@dos/platform-core/resilience");
// ── Vendor Links ─────────────────────────────────────────────────
async function getVendorLinks(tenantId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT l.*, v.name AS vendor_name, v.status AS vendor_status
    FROM "${ts}".asset_vendor_links l
    LEFT JOIN "${ts}".vendors v ON v.vendor_id = l.vendor_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
    return rows;
}
async function createVendorLink(tenantId, userId, assetId, vendorId, linkType = 'supplier', notes = '', contractRef = '') {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".asset_vendor_links (asset_id, vendor_id, link_type, contract_ref, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (asset_id, vendor_id, link_type) DO UPDATE SET notes = EXCLUDED.notes, contract_ref = EXCLUDED.contract_ref
    RETURNING *
  `, [assetId, vendorId, linkType, contractRef, notes, userId]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'vendor_link_created', entityType: 'asset', entityId: assetId, data: { vendorId, linkType } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
async function deleteVendorLink(tenantId, linkId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`DELETE FROM "${ts}".asset_vendor_links WHERE link_id = $1`, [linkId]);
}
// ── Evidence Links ───────────────────────────────────────────────
async function getEvidenceLinks(tenantId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT l.*, et.title AS evidence_title, et.status AS evidence_status
    FROM "${ts}".asset_evidence_links l
    LEFT JOIN "${ts}".evidence_tasks et ON et.task_id = l.evidence_task_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
    return rows;
}
async function createEvidenceLink(tenantId, userId, assetId, evidenceTaskId, linkType = 'supports', notes = '') {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".asset_evidence_links (asset_id, evidence_task_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (asset_id, evidence_task_id) DO UPDATE SET link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `, [assetId, evidenceTaskId, linkType, notes, userId]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'evidence_link_created', entityType: 'asset', entityId: assetId, data: { evidenceTaskId, linkType } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
async function deleteEvidenceLink(tenantId, linkId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`DELETE FROM "${ts}".asset_evidence_links WHERE link_id = $1`, [linkId]);
}
// ── Control Links (read from existing table) ─────────────────────
async function getControlLinks(tenantId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT l.*, c.name AS control_name, c.status AS control_status
    FROM "${ts}".control_asset_links l
    LEFT JOIN "${ts}".controls c ON c.control_id = l.control_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
    return rows;
}
async function createControlLink(tenantId, userId, assetId, controlId, linkPurpose = 'protects', assetType = 'asset') {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".control_asset_links (control_id, asset_id, asset_type, link_purpose, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT DO NOTHING
    RETURNING *
  `, [controlId, assetId, assetType, linkPurpose]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'control_link_created', entityType: 'asset', entityId: assetId, data: { controlId } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0] || null;
}
// ── Risk Links (read from existing table) ────────────────────────
async function getRiskLinks(tenantId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT l.*, r.title AS risk_title, r.status AS risk_status, r.inherent_score
    FROM "${ts}".risk_asset_links l
    LEFT JOIN "${ts}".risks r ON r.risk_id = l.risk_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
    return rows;
}
async function createRiskLink(tenantId, userId, assetId, riskId, linkType = 'exposed_to', notes = '') {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".risk_asset_links (risk_id, asset_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (risk_id, asset_id) DO UPDATE SET link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `, [riskId, assetId, linkType, notes, userId]);
    (0, events_port_1.emitEvent)({ tenantId, userId, module: 'asset', event: 'risk_link_created', entityType: 'asset', entityId: assetId, data: { riskId } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
// ── All Links Summary ────────────────────────────────────────────
async function getAllLinksForAsset(tenantId, assetId) {
    const [vendors, evidence, controls, risks] = await Promise.all([
        getVendorLinks(tenantId, assetId),
        getEvidenceLinks(tenantId, assetId),
        getControlLinks(tenantId, assetId),
        getRiskLinks(tenantId, assetId),
    ]);
    return {
        vendors, evidence, controls, risks,
        summary: {
            vendorCount: vendors.length,
            evidenceCount: evidence.length,
            controlCount: controls.length,
            riskCount: risks.length,
            totalLinks: vendors.length + evidence.length + controls.length + risks.length,
        },
    };
}
//# sourceMappingURL=asset-linkage.service.js.map