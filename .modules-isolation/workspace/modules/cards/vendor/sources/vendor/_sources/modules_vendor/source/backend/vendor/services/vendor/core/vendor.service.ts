// ============================================
// Shahin — Vendor Risk Service
// Vendor assessment, contract tracking, SLA
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { recordActivity, SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

export async function assessVendor(tenantId: string, data: {
  name: string;
  category?: string;
  riskTier?: string;
  assessmentScore?: number;
  contractExpiry?: string;
  slaConfig?: Record<string, unknown>;
  createdBy?: string;
  org_unit_id?: number | null;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".vendors
      (name, category, risk_tier, assessment_score, contract_expiry, sla_config, owner_user_id, created_by, org_unit_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8)
     RETURNING *`,
    [data.name, data.category || null, data.riskTier || 'medium',
     data.assessmentScore || null, data.contractExpiry || null,
     data.slaConfig ? JSON.stringify(data.slaConfig) : null,
     data.createdBy || null,
     data.org_unit_id ?? null]
  );
  // Record activity
  try { await recordActivity(tenantId, { userId: data.createdBy || SYSTEM_JOB_ACTOR, module: 'vendor', action: 'create', entityType: 'vendor', entityId: getFirstRow(result)?.vendor_id, summary: `Assessed vendor: ${data.name}`, changes: {} }); } catch { /* best-effort */ }

  // EventBus: vendor.onboarded
  try { await eventBus.publish(({ eventType: 'vendor.onboarded', tenantId, sourceService: 'vendor', entityType: 'vendor', entityId: getFirstRow(result)?.vendor_id, severity: 'info', payload: { name: data.name, riskTier: data.riskTier || 'medium', assessmentScore: data.assessmentScore } } as any)); } catch { /* best-effort */ }

  return getFirstRow(result);
}

export async function getVendors(tenantId: string, scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] }): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('vendor.record.read_all');
  if (scopeUser && !hasFullScope) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".vendors WHERE created_by = $1 ORDER BY created_at DESC`,
      [scopeUser.userId]
    );
    return result.rows;
  }
  const result = await safeQuery(`SELECT * FROM "${schema}".vendors ORDER BY created_at DESC`);
  return result.rows;
}

export async function getVendorById(tenantId: string, vendorId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`, [vendorId]
  );
  return getFirstRow(result) || null;
}

export async function updateVendor(tenantId: string, vendorId: string, update: {
  name?: string;
  category?: string;
  riskTier?: string;
  assessmentScore?: number;
  contractExpiry?: string;
  slaConfig?: Record<string, unknown>;
  status?: string;
}): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.vendor_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function monitorSLA(tenantId: string, vendorId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.vendor_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
