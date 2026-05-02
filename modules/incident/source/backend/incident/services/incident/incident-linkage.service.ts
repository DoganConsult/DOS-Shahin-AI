// ============================================
// Incident Linkage Service
// Cross-module relationship management for
// incidents: assets, vendors, evidence, policies
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

// ── Assets ───────────────────────────────────────────────────────────────────

/**
 * Links an asset to an incident. Ignores duplicates via ON CONFLICT DO NOTHING.
 */
export async function linkAsset(
  tenantId: string,
  incidentId: string,
  assetId: string,
  linkedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".incident_assets (incident_id, asset_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [incidentId, assetId, linkedBy || null],
  );

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.asset_linked',
      tenantId,
      severity: 'info',
      payload: { incidentId, assetId, linkedBy },
    } as any)));

  return getFirstRow(result);
}

/**
 * Removes the link between an incident and an asset.
 */
export async function unlinkAsset(
  tenantId: string,
  incidentId: string,
  assetId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `DELETE FROM "${schema}".incident_assets
     WHERE incident_id = $1 AND asset_id = $2`,
    [incidentId, assetId],
  );
}

/**
 * Returns all assets linked to a given incident.
 */
export async function getLinkedAssets(
  tenantId: string,
  incidentId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_assets
     WHERE incident_id = $1
     ORDER BY created_at DESC`,
    [incidentId],
  )).rows;
}

// ── Vendors ──────────────────────────────────────────────────────────────────

/**
 * Links a vendor to an incident with optional role context.
 */
export async function linkVendor(
  tenantId: string,
  incidentId: string,
  vendorId: string,
  vendorRole?: string,
  linkedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".incident_vendors (incident_id, vendor_id, vendor_role, linked_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [incidentId, vendorId, vendorRole || null, linkedBy || null],
  );

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'incident.vendor_linked',
      tenantId,
      severity: 'info',
      payload: { incidentId, vendorId, vendorRole, linkedBy },
    } as any)));

  return getFirstRow(result);
}

/**
 * Removes the link between an incident and a vendor.
 */
export async function unlinkVendor(
  tenantId: string,
  incidentId: string,
  vendorId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `DELETE FROM "${schema}".incident_vendors
     WHERE incident_id = $1 AND vendor_id = $2`,
    [incidentId, vendorId],
  );
}

/**
 * Returns all vendors linked to a given incident.
 */
export async function getLinkedVendors(
  tenantId: string,
  incidentId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_vendors
     WHERE incident_id = $1
     ORDER BY created_at DESC`,
    [incidentId],
  )).rows;
}

// ── Evidence ─────────────────────────────────────────────────────────────────

/**
 * Links an evidence item to an incident.
 */
export async function linkEvidence(
  tenantId: string,
  incidentId: string,
  evidenceId: string,
  linkedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".incident_evidence (incident_id, evidence_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [incidentId, evidenceId, linkedBy || null],
  );

  return getFirstRow(result);
}

/**
 * Removes the link between an incident and an evidence item.
 */
export async function unlinkEvidence(
  tenantId: string,
  incidentId: string,
  evidenceId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `DELETE FROM "${schema}".incident_evidence
     WHERE incident_id = $1 AND evidence_id = $2`,
    [incidentId, evidenceId],
  );
}

/**
 * Returns all evidence items linked to a given incident.
 */
export async function getLinkedEvidence(
  tenantId: string,
  incidentId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_evidence
     WHERE incident_id = $1
     ORDER BY created_at DESC`,
    [incidentId],
  )).rows;
}

// ── Policies ─────────────────────────────────────────────────────────────────

/**
 * Links a policy to an incident.
 */
export async function linkPolicy(
  tenantId: string,
  incidentId: string,
  policyId: string,
  linkedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".incident_policies (incident_id, policy_id, linked_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [incidentId, policyId, linkedBy || null],
  );

  return getFirstRow(result);
}

/**
 * Removes the link between an incident and a policy.
 */
export async function unlinkPolicy(
  tenantId: string,
  incidentId: string,
  policyId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `DELETE FROM "${schema}".incident_policies
     WHERE incident_id = $1 AND policy_id = $2`,
    [incidentId, policyId],
  );
}

/**
 * Returns all policies linked to a given incident.
 */
export async function getLinkedPolicies(
  tenantId: string,
  incidentId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  return (await safeQuery(
    `SELECT * FROM "${schema}".incident_policies
     WHERE incident_id = $1
     ORDER BY created_at DESC`,
    [incidentId],
  )).rows;
}
