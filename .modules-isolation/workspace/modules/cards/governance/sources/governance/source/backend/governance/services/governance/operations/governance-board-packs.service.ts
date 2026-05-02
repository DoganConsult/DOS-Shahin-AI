// ============================================
// Shahin-Ai — Board Packs Service
// Board pack assembly with auto-generation
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listBoardPacks(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT p.*, (SELECT COUNT(*)::int FROM "${schema}".board_pack_items i WHERE i.pack_id = p.pack_id) AS item_count
     FROM "${schema}".board_packs p WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC`
  );
  return result.rows;
}

export async function getBoardPackById(tenantId: string, packId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createBoardPack(tenantId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".board_packs (pack_id, tenant_id, title_en, title_ar, pack_type, period_start, period_end, narrative, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,

    [id, tenantId, data.title_en, data.title_ar || null, data.pack_type || 'quarterly',

     data.period_start || null, data.period_end || null, data.narrative || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateBoardPack(tenantId: string, packId: string, data: unknown): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function addBoardPackItem(tenantId: string, packId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".board_pack_items (item_id, pack_id, item_type, title_en, title_ar, content, sort_order, source_entity_type, source_entity_id, auto_generated)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,

    [id, packId, data.item_type, data.title_en || null, data.title_ar || null,

     data.content ? JSON.stringify(data.content) : null, data.sort_order || 0,

     data.source_entity_type || null, data.source_entity_id || null, data.auto_generated || false]
  );
  return result.rows[0];
}

export async function removeBoardPackItem(tenantId: string, itemId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".board_pack_items WHERE item_id = $1 RETURNING item_id`,
    [itemId]
  );
  return result.rows.length > 0;
}

export async function assembleBoardPack(tenantId: string, packId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Mark as assembling
  await safeQuery(
    `UPDATE "${schema}".board_packs SET status = 'assembling', updated_at = NOW() WHERE pack_id = $1`,
    [packId]
  );

  let sortOrder = 0;

  // 1. Health score
  try {
    const health = await safeQuery(
      `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [tenantId]
    );
    if (health.rows[0]) {
      await addBoardPackItem(tenantId, packId, {
        item_type: "health_score", title_en: "Governance Health Score",
        content: { overall_score: health.rows[0].overall_score, overall_grade: health.rows[0].overall_grade, dimensions: health.rows[0].dimension_scores },
        sort_order: sortOrder++, auto_generated: true,
      });
    }
  } catch { /* non-fatal */ }

  // 2. Top risks
  try {
    const risks = await safeQuery(
      `SELECT risk_id, title, risk_score, status FROM "${schema}".risks WHERE deleted_at IS NULL ORDER BY risk_score DESC NULLS LAST LIMIT 5`
    );
    if (risks.rows.length > 0) {
      await addBoardPackItem(tenantId, packId, {
        item_type: "risk_summary", title_en: "Top 5 Risks",
        content: { risks: risks.rows }, sort_order: sortOrder++, auto_generated: true,
      });
    }
  } catch { /* non-fatal */ }

  // 3. Open exceptions
  try {
    const exceptions = await safeQuery(
      `SELECT exception_id, title, risk_level, status, expiry_date FROM "${schema}".exceptions WHERE deleted_at IS NULL AND status NOT IN ('expired','closed','rejected') AND risk_level IN ('high','critical') ORDER BY created_at DESC LIMIT 10`
    );
    if (exceptions.rows.length > 0) {
      await addBoardPackItem(tenantId, packId, {
        item_type: "exception_summary", title_en: "Open High-Risk Exceptions",
        content: { exceptions: exceptions.rows }, sort_order: sortOrder++, auto_generated: true,
      });
    }
  } catch { /* non-fatal */ }

  // 4. Enforcement violations
  try {
    const violations = await safeQuery(
      `SELECT rule_code, entity_type, severity, message FROM "${schema}".governance_enforcement_log WHERE tenant_id = $1 AND resolved_at IS NULL AND severity = 'violation' ORDER BY created_at DESC LIMIT 10`,
      [tenantId]
    );
    if (violations.rows.length > 0) {
      await addBoardPackItem(tenantId, packId, {
        item_type: "enforcement_summary", title_en: "Unresolved Governance Violations",
        content: { violations: violations.rows }, sort_order: sortOrder++, auto_generated: true,
      });
    }
  } catch { /* non-fatal */ }

  // 5. Overdue actions
  try {
    const actions = await safeQuery(
      `SELECT action_item_id, title, due_date, status FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed','closed','cancelled','verified') ORDER BY due_date LIMIT 10`
    );
    if (actions.rows.length > 0) {
      await addBoardPackItem(tenantId, packId, {
        item_type: "action_summary", title_en: "Overdue Governance Actions",
        content: { actions: actions.rows }, sort_order: sortOrder++, auto_generated: true,
      });
    }
  } catch { /* non-fatal */ }

  // Mark as review
  await safeQuery(
    `UPDATE "${schema}".board_packs SET status = 'review', updated_at = NOW() WHERE pack_id = $1`,
    [packId]
  );

  return getBoardPackById(tenantId, packId);
}

export async function approveBoardPack(tenantId: string, packId: string, approvedBy: string, userRoles: string[] = []): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function publishBoardPack(tenantId: string, packId: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
