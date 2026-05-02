// ============================================
// Asset Linkage Service
// Cross-entity link CRUD: vendor, evidence
// Reads existing: control_asset_links, risk_asset_links
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Vendor Links ─────────────────────────────────────────────────

export async function getVendorLinks(tenantId: string, assetId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT l.*, v.name AS vendor_name, v.status AS vendor_status
    FROM "${ts}".asset_vendor_links l
    LEFT JOIN "${ts}".vendors v ON v.vendor_id = l.vendor_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
  return rows;
}

export async function createVendorLink(tenantId: string, userId: string, assetId: string, vendorId: string, linkType = 'supplier', notes = '', contractRef = '') {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".asset_vendor_links (asset_id, vendor_id, link_type, contract_ref, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (asset_id, vendor_id, link_type) DO UPDATE SET notes = EXCLUDED.notes, contract_ref = EXCLUDED.contract_ref
    RETURNING *
  `, [assetId, vendorId, linkType, contractRef, notes, userId]);
  emitEvent(({ tenantId, userId, module: 'asset', event: 'vendor_link_created', entityType: 'asset', entityId: assetId, data: { vendorId, linkType } } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0];
}

export async function deleteVendorLink(tenantId: string, linkId: string) {
  const ts = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${ts}".asset_vendor_links WHERE link_id = $1`, [linkId]);
}

// ── Evidence Links ───────────────────────────────────────────────

export async function getEvidenceLinks(tenantId: string, assetId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT l.*, et.title AS evidence_title, et.status AS evidence_status
    FROM "${ts}".asset_evidence_links l
    LEFT JOIN "${ts}".evidence_tasks et ON et.task_id = l.evidence_task_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
  return rows;
}

export async function createEvidenceLink(tenantId: string, userId: string, assetId: string, evidenceTaskId: string, linkType = 'supports', notes = '') {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".asset_evidence_links (asset_id, evidence_task_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (asset_id, evidence_task_id) DO UPDATE SET link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `, [assetId, evidenceTaskId, linkType, notes, userId]);
  emitEvent(({ tenantId, userId, module: 'asset', event: 'evidence_link_created', entityType: 'asset', entityId: assetId, data: { evidenceTaskId, linkType } } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0];
}

export async function deleteEvidenceLink(tenantId: string, linkId: string) {
  const ts = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${ts}".asset_evidence_links WHERE link_id = $1`, [linkId]);
}

// ── Control Links (read from existing table) ─────────────────────

export async function getControlLinks(tenantId: string, assetId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT l.*, c.name AS control_name, c.status AS control_status
    FROM "${ts}".control_asset_links l
    LEFT JOIN "${ts}".controls c ON c.control_id = l.control_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
  return rows;
}

export async function createControlLink(tenantId: string, userId: string, assetId: string, controlId: string, linkPurpose = 'protects', assetType = 'asset') {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".control_asset_links (control_id, asset_id, asset_type, link_purpose, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT DO NOTHING
    RETURNING *
  `, [controlId, assetId, assetType, linkPurpose]);
  emitEvent(({ tenantId, userId, module: 'asset', event: 'control_link_created', entityType: 'asset', entityId: assetId, data: { controlId } } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0] || null;
}

// ── Risk Links (read from existing table) ────────────────────────

export async function getRiskLinks(tenantId: string, assetId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT l.*, r.title AS risk_title, r.status AS risk_status, r.inherent_score
    FROM "${ts}".risk_asset_links l
    LEFT JOIN "${ts}".risks r ON r.risk_id = l.risk_id
    WHERE l.asset_id = $1 ORDER BY l.created_at DESC
  `, [assetId]);
  return rows;
}

export async function createRiskLink(tenantId: string, userId: string, assetId: string, riskId: string, linkType = 'exposed_to', notes = '') {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".risk_asset_links (risk_id, asset_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (risk_id, asset_id) DO UPDATE SET link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `, [riskId, assetId, linkType, notes, userId]);
  emitEvent(({ tenantId, userId, module: 'asset', event: 'risk_link_created', entityType: 'asset', entityId: assetId, data: { riskId } } as any)).catch(catchHandler(EC.EVENT_BUS));
  return rows[0];
}

// ── All Links Summary ────────────────────────────────────────────

export async function getAllLinksForAsset(tenantId: string, assetId: string) {
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
