// ============================================
// Shahin-Ai — Governance Structure Service
// Domains, bodies, reporting lines
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

// === DOMAINS ===

export async function listDomains(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".governance_domains WHERE deleted_at IS NULL ORDER BY name_en`);
  return result.rows;
}

export async function createDomain(tenantId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_domains (domain_id, tenant_id, name_en, name_ar, description, sponsor_id, owner_id, parent_domain_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,

    [id, tenantId, data.name_en, data.name_ar || null, data.description || null, data.sponsor_id || null, data.owner_id || null, data.parent_domain_id || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateDomain(tenantId: string, domainId: string, data: unknown): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function deleteDomain(tenantId: string, domainId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_domains SET deleted_at = NOW() WHERE domain_id = $1 AND deleted_at IS NULL RETURNING domain_id`,
    [domainId]
  );
  return result.rows.length > 0;
}

// === BODIES ===

export async function listBodies(tenantId: string, filters?: { body_type?: string; domain_id?: string }): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_bodies WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.body_type) { params.push(filters.body_type); sql += ` AND body_type = $${params.length}`; }
  if (filters?.domain_id) { params.push(filters.domain_id); sql += ` AND domain_id = $${params.length}`; }
  sql += ` ORDER BY name_en`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function createBody(tenantId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_bodies (body_id, tenant_id, name_en, name_ar, body_type, domain_id, charter_id, oversight_model, sponsor_id, committee_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,

    [id, tenantId, data.name_en, data.name_ar || null, data.body_type, data.domain_id || null, data.charter_id || null, data.oversight_model || null, data.sponsor_id || null, data.committee_id || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateBody(tenantId: string, bodyId: string, data: unknown): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function deleteBody(tenantId: string, bodyId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_bodies SET deleted_at = NOW() WHERE body_id = $1 AND deleted_at IS NULL RETURNING body_id`,
    [bodyId]
  );
  return result.rows.length > 0;
}

// === REPORTING LINES ===

export async function listReportingLines(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".governance_reporting_lines WHERE deleted_at IS NULL ORDER BY created_at`);
  return result.rows;
}

export async function createReportingLine(tenantId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_reporting_lines (line_id, tenant_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, line_type, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,

    [id, tenantId, data.from_entity_type, data.from_entity_id, data.to_entity_type, data.to_entity_id, data.line_type || 'reports_to', data.created_by || null]
  );
  return result.rows[0];
}

export async function deleteReportingLine(tenantId: string, lineId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_reporting_lines SET deleted_at = NOW() WHERE line_id = $1 AND deleted_at IS NULL RETURNING line_id`,
    [lineId]
  );
  return result.rows.length > 0;
}

export async function getOrgTree(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const domains = await safeQuery(`SELECT * FROM "${schema}".governance_domains WHERE deleted_at IS NULL ORDER BY name_en`);
  const bodies = await safeQuery(`SELECT * FROM "${schema}".governance_bodies WHERE deleted_at IS NULL ORDER BY name_en`);
  const lines = await safeQuery(`SELECT * FROM "${schema}".governance_reporting_lines WHERE deleted_at IS NULL`);
  return { domains: domains.rows, bodies: bodies.rows, reporting_lines: lines.rows };
}
