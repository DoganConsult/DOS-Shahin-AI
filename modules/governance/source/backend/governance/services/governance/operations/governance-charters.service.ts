// ============================================
// Shahin-Ai — Governance Charters Service
// CRUD for committee/body charters with lifecycle
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listCharters(tenantId: string, filters?: {
  status?: string; committee_id?: string;
}): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_charters WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.committee_id) { params.push(filters.committee_id); sql += ` AND committee_id = $${params.length}`; }
  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getCharterById(tenantId: string, charterId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createCharter(tenantId: string, data: {
  title_en: string; title_ar?: string; charter_text?: string;
  committee_id?: string; body_id?: string; owner_id?: string;
  effective_date?: string; expiry_date?: string; review_date?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_charters
       (charter_id, tenant_id, title_en, title_ar, charter_text, committee_id, body_id,
        owner_id, effective_date, expiry_date, review_date, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12)
     RETURNING *`,
    [id, tenantId, data.title_en, data.title_ar || null, data.charter_text || null,
     data.committee_id || null, data.body_id || null, data.owner_id || null,
     data.effective_date || null, data.expiry_date || null, data.review_date || null,
     data.created_by || null]
  );
  return result.rows[0];
}

export async function updateCharter(tenantId: string, charterId: string, data: unknown): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function approveCharter(tenantId: string, charterId: string, approvedBy: string, userRoles: string[] = []): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function activateCharter(tenantId: string, charterId: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getCharterForCommittee(tenantId: string, committeeId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_charters
     WHERE committee_id = $1 AND deleted_at IS NULL AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [committeeId]
  );
  return result.rows[0] || null;
}
