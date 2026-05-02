// ============================================
// Risk Linkage Service — spec section 5
// Enterprise-grade cross-module relationship
// management: Risk ↔ Controls, Policies, Evidence,
// Compliance, Incidents, Vendors, Assets
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';

// ── Generic link helper ──────────────────────────────────────────────

type LinkTable = 'risk_policy_links' | 'risk_evidence_links' | 'risk_compliance_links'
  | 'risk_vendor_links' | 'risk_asset_links' | 'incident_risk_links';

interface LinkInput {
  riskId: string;
  targetId: string;
  linkType?: string;
  notes?: string;
}

async function getLinks(tenantId: string, table: LinkTable, riskId: string, joinTable?: string, joinAlias?: string) {
  const ts = tenantSchema(tenantId);
  let joinClause = '';
  let selectExtra = '';

  if (joinTable && joinAlias) {
    const targetIdCol = table === 'incident_risk_links' ? 'incident_id' : table.replace('risk_', '').replace('_links', '_id');
    joinClause = `LEFT JOIN ${ts}.${joinTable} ${joinAlias} ON ${joinAlias}.${targetIdCol} = l.${targetIdCol}`;
    selectExtra = `, ${joinAlias}.title AS target_title, ${joinAlias}.status AS target_status`;
  }

  const riskCol = table === 'incident_risk_links' ? 'risk_id' : 'risk_id';
  const { rows } = await safeQuery(`
    SELECT l.*${selectExtra}
    FROM ${ts}.${table} l ${joinClause}
    WHERE l.${riskCol} = $1
    ORDER BY l.created_at DESC
  `, [riskId]);
  return rows;
}

async function createLink(
  tenantId: string, userId: string, table: LinkTable,
  riskIdCol: string, targetIdCol: string, input: LinkInput, defaultLinkType: string,
) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO ${ts}.${table} (${riskIdCol}, ${targetIdCol}, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (${riskIdCol}, ${targetIdCol}) DO UPDATE SET
      link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `, [input.riskId, input.targetId, input.linkType || defaultLinkType, input.notes || '', userId]);

  emitEvent(({
      tenantId, userId, module: 'risks',
      event: `${table}_created`,
      entityType: 'risk_link', entityId: input.riskId,
      data: { targetId: input.targetId, linkType: input.linkType || defaultLinkType },
    } as any));

  return rows[0];
}

async function deleteLink(tenantId: string, table: LinkTable, linkId: string) {
  const ts = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM ${ts}.${table} WHERE link_id = $1`, [linkId]);
}

// ── Policy Links ─────────────────────────────────────────────────────

export async function getPolicyLinks(tenantId: string, riskId: string) {
  return getLinks(tenantId, 'risk_policy_links', riskId, 'policies', 'p');
}

export async function createPolicyLink(tenantId: string, userId: string, input: LinkInput) {
  return createLink(tenantId, userId, 'risk_policy_links', 'risk_id', 'policy_id', input, 'governs');
}

export async function deletePolicyLink(tenantId: string, linkId: string) {
  return deleteLink(tenantId, 'risk_policy_links', linkId);
}

// ── Evidence Links ───────────────────────────────────────────────────

export async function getEvidenceLinks(tenantId: string, riskId: string) {
  return getLinks(tenantId, 'risk_evidence_links', riskId, 'evidence_tasks', 'e');
}

export async function createEvidenceLink(tenantId: string, userId: string, input: LinkInput) {
  return createLink(tenantId, userId, 'risk_evidence_links', 'risk_id', 'evidence_id', input, 'validates');
}

export async function deleteEvidenceLink(tenantId: string, linkId: string) {
  return deleteLink(tenantId, 'risk_evidence_links', linkId);
}

// ── Compliance Links ─────────────────────────────────────────────────

export async function getComplianceLinks(tenantId: string, riskId: string) {
  return getLinks(tenantId, 'risk_compliance_links', riskId, 'compliance_obligations', 'co');
}

export async function createComplianceLink(tenantId: string, userId: string, input: LinkInput) {
  return createLink(tenantId, userId, 'risk_compliance_links', 'risk_id', 'obligation_id', input, 'addresses');
}

export async function deleteComplianceLink(tenantId: string, linkId: string) {
  return deleteLink(tenantId, 'risk_compliance_links', linkId);
}

// ── Vendor Links ─────────────────────────────────────────────────────

export async function getVendorLinks(tenantId: string, riskId: string) {
  return getLinks(tenantId, 'risk_vendor_links', riskId, 'vendors', 'v');
}

export async function createVendorLink(tenantId: string, userId: string, input: LinkInput) {
  return createLink(tenantId, userId, 'risk_vendor_links', 'risk_id', 'vendor_id', input, 'exposes');
}

export async function deleteVendorLink(tenantId: string, linkId: string) {
  return deleteLink(tenantId, 'risk_vendor_links', linkId);
}

// ── Asset Links ──────────────────────────────────────────────────────

export async function getAssetLinks(tenantId: string, riskId: string) {
  return getLinks(tenantId, 'risk_asset_links', riskId, 'assets', 'a');
}

export async function createAssetLink(tenantId: string, userId: string, input: LinkInput) {
  return createLink(tenantId, userId, 'risk_asset_links', 'risk_id', 'asset_id', input, 'threatens');
}

export async function deleteAssetLink(tenantId: string, linkId: string) {
  return deleteLink(tenantId, 'risk_asset_links', linkId);
}

// ── Incident Links ───────────────────────────────────────────────────

export async function getIncidentLinks(tenantId: string, riskId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT irl.*, i.title AS incident_title, i.severity AS incident_severity,
           i.status AS incident_status, i.reported_at
    FROM ${ts}.incident_risk_links irl
    LEFT JOIN ${ts}.incidents i ON i.incident_id = irl.incident_id
    WHERE irl.risk_id = $1
    ORDER BY irl.created_at DESC
  `, [riskId]);
  return rows;
}

export async function createIncidentLink(tenantId: string, userId: string, input: LinkInput & { impact_on_risk?: string }) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO ${ts}.incident_risk_links (risk_id, incident_id, link_type, impact_on_risk, linked_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (incident_id, risk_id) DO UPDATE SET
      link_type = EXCLUDED.link_type, impact_on_risk = EXCLUDED.impact_on_risk, updated_at = NOW()
    RETURNING *
  `, [input.riskId, input.targetId, input.linkType || 'realized', input.impact_on_risk || null, userId]);

  emitEvent(({
      tenantId, userId, module: 'risks',
      event: 'incident_linked', entityType: 'risk_link', entityId: input.riskId,
      data: { incidentId: input.targetId },
    } as any));

  return rows[0];
}

// ── Aggregated Linkage Summary (for risk detail page) ────────────────

export async function getRiskLinkageSummary(tenantId: string, riskId: string) {
  const ts = tenantSchema(tenantId);

  const [controls, policies, evidence, compliance, incidents, vendors, assets] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.control_risk_mappings WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.risk_policy_links WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.risk_evidence_links WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.risk_compliance_links WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.incident_risk_links WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.risk_vendor_links WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
    safeQuery(`SELECT COUNT(*)::int AS count FROM ${ts}.risk_asset_links WHERE risk_id = $1`, [riskId]).then(r => r.rows[0]?.count || 0).catch(() => 0),
  ]);

  return { controls, policies, evidence, compliance, incidents, vendors, assets, total: controls + policies + evidence + compliance + incidents + vendors + assets };
}
