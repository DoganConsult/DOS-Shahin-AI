/**
 * Risk Taxonomy Service — per spec section 4.A
 *
 * Manages:
 *   - Risk categories (hierarchical with parent_category_id)
 *   - Rating scales (impact, likelihood, velocity)
 *   - Appetite bands (averse → hungry)
 *   - Classification logic
 *   - Common risk language
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Categories ─────────────────────────────────────────────────────────

export async function getCategories(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM ${ts}.risk_categories WHERE deleted_at IS NULL ORDER BY display_order, code`,
    [],
  );
  return rows;
}

export async function createCategory(tenantId: string, data: {
  code: string; name_en: string; name_ar?: string; description?: string;
  parent_category_id?: string; display_order?: number;
}) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO ${ts}.risk_categories (code, name_en, name_ar, description, parent_category_id, display_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.code, data.name_en, data.name_ar || '', data.description || '', data.parent_category_id || null, data.display_order || 0],
  );
  return rows[0];
}

export async function updateCategory(tenantId: string, categoryId: string, data: Partial<{
  name_en: string; name_ar: string; description: string;
  parent_category_id: string; display_order: number;
}>) {
  const ts = tenantSchema(tenantId);
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) { sets.push(`${key} = $${idx++}`); vals.push(val); }
  }
  if (!sets.length) return null;

  sets.push(`updated_at = NOW()`);
  vals.push(categoryId);

  const { rows } = await safeQuery(
    `UPDATE ${ts}.risk_categories SET ${sets.join(', ')} WHERE category_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    vals,
  );
  return rows[0] || null;
}

export async function deleteCategory(tenantId: string, categoryId: string) {
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risk_categories SET deleted_at = NOW() WHERE category_id = $1`, [categoryId]);
}

// ── Rating Scales ──────────────────────────────────────────────────────

export async function getImpactScales(tenantId: string, taxonomyId?: string) {
  const ts = tenantSchema(tenantId);
  const where = taxonomyId ? `WHERE taxonomy_id = $1` : '';
  const params = taxonomyId ? [taxonomyId] : [];
  const { rows } = await safeQuery(`SELECT * FROM ${ts}.risk_impact_scales ${where} ORDER BY level`, params);
  return rows;
}

export async function getLikelihoodScales(tenantId: string, taxonomyId?: string) {
  const ts = tenantSchema(tenantId);
  const where = taxonomyId ? `WHERE taxonomy_id = $1` : '';
  const params = taxonomyId ? [taxonomyId] : [];
  const { rows } = await safeQuery(`SELECT * FROM ${ts}.risk_likelihood_scales ${where} ORDER BY level`, params);
  return rows;
}

export async function getVelocityScales(tenantId: string, taxonomyId?: string) {
  const ts = tenantSchema(tenantId);
  const where = taxonomyId ? `WHERE taxonomy_id = $1` : '';
  const params = taxonomyId ? [taxonomyId] : [];
  const { rows } = await safeQuery(`SELECT * FROM ${ts}.risk_velocity_scales ${where} ORDER BY level`, params);
  return rows;
}

// ── Taxonomies ─────────────────────────────────────────────────────────

export async function getTaxonomies(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM ${ts}.risk_taxonomy WHERE deleted_at IS NULL ORDER BY is_default DESC, version DESC`,
    [],
  );
  return rows;
}

export async function getActiveTaxonomy(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM ${ts}.risk_taxonomy WHERE is_default = true AND deleted_at IS NULL LIMIT 1`,
    [],
  );
  return rows[0] || null;
}
