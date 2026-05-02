// ============================================
// Shahin-Ai — Governance Registers Service
// CRUD for governance registers (risk, control,
// policy, compliance, incident, asset, vendor,
// obligation, issue register types).
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listRegisters(
  tenantId: string,
  filters?: { register_type?: string; status?: string },
  scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_registers WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('governance.record.read_all');
  if (scopeUser && !hasFullScope) {
    sql += ` AND created_by = $${idx++}`; params.push(scopeUser.userId);
  }
  if (filters?.register_type) { sql += ` AND register_type = $${idx++}`; params.push(filters.register_type); }
  if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
  sql += ` ORDER BY register_type, created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getRegisterById(tenantId: string, registerId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createRegister(tenantId: string, data: {
  register_type: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  owner_id?: string;
  status?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const registerId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_registers
      (register_id, register_type, name_en, name_ar, description, owner_id, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      registerId, data.register_type, data.name_en, data.name_ar || null,
      data.description || null, data.owner_id || null, data.status || 'active',
      data.created_by || null,
    ]
  );
  return result.rows[0];
}

export async function updateRegister(tenantId: string, registerId: string, data: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function softDeleteRegister(tenantId: string, registerId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_registers SET deleted_at = NOW() WHERE register_id = $1 AND deleted_at IS NULL RETURNING register_id`,
    [registerId]
  );
  return result.rows.length > 0;
}
