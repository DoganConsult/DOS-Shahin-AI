// ============================================
// Shahin — Workflow Category Taxonomy Service
// Hierarchical workflow categorization with CRUD
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

export interface WorkflowCategory {
  category_id: string;
  name_en: string;
  name_ar: string | null;
  parent_category_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  children?: WorkflowCategory[];
}

export async function getCategories(tenantId: string): Promise<WorkflowCategory[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT category_id, name_en, name_ar, parent_category_id, icon, color, sort_order
     FROM "${schema}".workflow_categories
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name_en`
  );
  return buildTree(result.rows);
}

export async function getCategoriesFlat(tenantId: string): Promise<WorkflowCategory[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT category_id, name_en, name_ar, parent_category_id, icon, color, sort_order
     FROM "${schema}".workflow_categories
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name_en`
  );
  return result.rows;
}

export async function createCategory(tenantId: string, data: {
  name_en: string;
  name_ar?: string;
  parent_category_id?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}): Promise<WorkflowCategory> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_categories
      (tenant_id, name_en, name_ar, parent_category_id, icon, color, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      tenantId,
      data.name_en,
      data.name_ar || null,
      data.parent_category_id || null,
      data.icon || null,
      data.color || null,
      data.sort_order ?? 0,
    ]
  );
  return getFirstRow(result);
}

export async function updateCategory(tenantId: string, categoryId: string, data: {
  name_en?: string;
  name_ar?: string;
  parent_category_id?: string | null;
  icon?: string;
  color?: string;
  sort_order?: number;
}): Promise<WorkflowCategory | null> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [categoryId];
  let idx = 2;

  if (data.name_en !== undefined) { sets.push(`name_en = $${idx++}`); params.push(data.name_en); }
  if (data.name_ar !== undefined) { sets.push(`name_ar = $${idx++}`); params.push(data.name_ar); }
  if (data.parent_category_id !== undefined) { sets.push(`parent_category_id = $${idx++}`); params.push(data.parent_category_id); }
  if (data.icon !== undefined) { sets.push(`icon = $${idx++}`); params.push(data.icon); }
  if (data.color !== undefined) { sets.push(`color = $${idx++}`); params.push(data.color); }
  if (data.sort_order !== undefined) { sets.push(`sort_order = $${idx++}`); params.push(data.sort_order); }

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_categories SET ${sets.join(", ")} WHERE category_id = $1 AND deleted_at IS NULL RETURNING *`,
    params
  );
  return getFirstRow(result) || null;
}

export async function deleteCategory(tenantId: string, categoryId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_categories SET deleted_at = NOW() WHERE category_id = $1 AND deleted_at IS NULL RETURNING category_id`,
    [categoryId]
  );
  return result.rows.length > 0;
}

function buildTree(rows: WorkflowCategory[]): WorkflowCategory[] {
  const map = new Map<string, WorkflowCategory>();
  const roots: WorkflowCategory[] = [];

  for (const row of rows) {
    map.set(row.category_id, { ...row, children: [] });
  }

  for (const row of rows) {
    const node = map.get(row.category_id)!;
    if (row.parent_category_id && map.has(row.parent_category_id)) {
      map.get(row.parent_category_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
