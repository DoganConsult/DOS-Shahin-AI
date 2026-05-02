// ============================================
// Shahin-Ai — Governance Mandates Service
// CRUD for regulatory/legal mandates and their
// source documents. Multi-tenant via tenantSchema.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

// === List Mandates ===

export async function listMandates(
  tenantId: string,
  filters?: { status?: string; priority?: string; jurisdiction?: string }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_mandates WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
  if (filters?.priority) { sql += ` AND priority = $${idx++}`; params.push(filters.priority); }
  if (filters?.jurisdiction) { sql += ` AND jurisdiction = $${idx++}`; params.push(filters.jurisdiction); }
  sql += ` ORDER BY effective_date DESC NULLS LAST, created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

// === Get by ID ===

export async function getMandateById(tenantId: string, mandateId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// === Create ===

export async function createMandate(tenantId: string, data: {
  title_en: string;
  title_ar?: string;
  description?: string;
  source_type?: string;
  source_reference?: string;
  issuing_authority?: string;
  effective_date?: string;
  expiry_date?: string;
  status?: string;
  priority?: string;
  jurisdiction?: string;
  owner_id?: string;
  review_date?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const mandateId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_mandates
      (mandate_id, title_en, title_ar, description, source_type, source_reference,
       issuing_authority, effective_date, expiry_date, status, priority, jurisdiction,
       owner_id, review_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      mandateId, data.title_en, data.title_ar || null, data.description || null,
      data.source_type || null, data.source_reference || null,
      data.issuing_authority || null, data.effective_date || null, data.expiry_date || null,
      data.status || 'draft', data.priority || 'medium', data.jurisdiction || null,
      data.owner_id || null, data.review_date || null, data.created_by || null,
    ]
  );
  return result.rows[0];
}

// === Update ===

export async function updateMandate(tenantId: string, mandateId: string, data: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// === Soft Delete ===

export async function softDeleteMandate(tenantId: string, mandateId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_mandates SET deleted_at = NOW() WHERE mandate_id = $1 AND deleted_at IS NULL RETURNING mandate_id`,
    [mandateId]
  );
  return result.rows.length > 0;
}

// === Mandate Sources ===

export async function getMandateSources(tenantId: string, mandateId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_mandate_sources WHERE mandate_id = $1 AND deleted_at IS NULL ORDER BY published_at DESC NULLS LAST`,
    [mandateId]
  );
  return result.rows;
}

export async function addMandateSource(tenantId: string, mandateId: string, data: {
  source_type: string;
  source_name: string;
  source_url?: string;
  document_ref?: string;
  published_at?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_mandate_sources
      (mandate_id, source_type, source_name, source_url, document_ref, published_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [mandateId, data.source_type, data.source_name, data.source_url || null, data.document_ref || null, data.published_at || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function removeMandateSource(tenantId: string, sourceId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_mandate_sources SET deleted_at = NOW() WHERE source_id = $1 AND deleted_at IS NULL RETURNING source_id`,
    [sourceId]
  );
  return result.rows.length > 0;
}
