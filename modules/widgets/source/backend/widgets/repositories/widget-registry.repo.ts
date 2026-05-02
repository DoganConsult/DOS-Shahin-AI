import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import type { WidgetCreateDTO, WidgetUpdateDTO } from '../types/widget.types';

export class WidgetRegistryRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findAll(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['w.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`w.status = $${idx++}`); params.push(filters.status); }
    if (filters.category) { conditions.push(`w.category = $${idx++}`); params.push(filters.category); }
    if (filters.widgetKey) { conditions.push(`w.widget_key ILIKE $${idx++}`); params.push(`%${filters.widgetKey}%`); }
    if (filters.search) {
      conditions.push(`(w.name_en ILIKE $${idx} OR w.widget_key ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(filters.pageSize || '25', 10) || 25));
    const offset = (page - 1) * pageSize;
    const sortBy = filters.sortBy || 'created_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".widgets_registry w ${where}`, params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const result = await safeQuery(`
      SELECT w.widget_id, w.widget_key, w.name_en, w.name_ar,
             w.description_en, w.description_ar, w.category, w.size,
             w.icon, w.status, w.version, w.data_sources, w.required_permissions,
             w.scope_rule, w.config, w.created_by, w.updated_by,
             w.created_at, w.updated_at
      FROM "${this.schema}".widgets_registry w
      ${where}
      ORDER BY w.${sortBy} ${sortDir}
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);

    return { rows: result.rows, total };
  }

  async findById(widgetId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".widgets_registry
       WHERE widget_id = $1 AND deleted_at IS NULL`,
      [widgetId],
    );
    return getFirstRow(result);
  }

  async findByKey(widgetKey: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".widgets_registry
       WHERE widget_key = $1 AND deleted_at IS NULL`,
      [widgetKey],
    );
    return getFirstRow(result);
  }

  async create(data: WidgetCreateDTO, userId: string): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(`
      INSERT INTO "${this.schema}".widgets_registry
        (widget_id, widget_key, name_en, name_ar, description_en, description_ar,
         category, size, icon, status, version, data_sources, required_permissions,
         scope_rule, config, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft','1.0.0',$10,$11,$12,$13,$14,$14)
      RETURNING *
    `, [
      id, data.widgetKey, data.nameEn, data.nameAr || '',
      data.descriptionEn || '', data.descriptionAr || '',
      data.category, data.size || 'medium', data.icon || 'pi-chart-bar',
      JSON.stringify(data.dataSources || []),
      JSON.stringify(data.requiredPermissions || []),
      data.scopeRule || 'org',
      JSON.stringify(data.config || {}),
      userId,
    ]);
    return getFirstRow(result);
  }

  async update(widgetId: string, data: WidgetUpdateDTO, userId: string): Promise<GenericRow | null> {
    const sets: string[] = ['updated_by = $2', 'updated_at = now()'];
    const params: unknown[] = [widgetId, userId];
    let idx = 3;

    const fieldMap: Record<string, string> = {
      nameEn: 'name_en', nameAr: 'name_ar',
      descriptionEn: 'description_en', descriptionAr: 'description_ar',
      category: 'category', size: 'size', icon: 'icon', scopeRule: 'scope_rule',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }

    if (data.dataSources !== undefined) {
      sets.push(`data_sources = $${idx++}`);
      params.push(JSON.stringify(data.dataSources));
    }
    if (data.requiredPermissions !== undefined) {
      sets.push(`required_permissions = $${idx++}`);
      params.push(JSON.stringify(data.requiredPermissions));
    }
    if (data.config !== undefined) {
      sets.push(`config = $${idx++}`);
      params.push(JSON.stringify(data.config));
    }

    const result = await safeQuery(`
      UPDATE "${this.schema}".widgets_registry
      SET ${sets.join(', ')}
      WHERE widget_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, params);
    return getFirstRow(result);
  }

  async updateStatus(widgetId: string, status: string, userId: string): Promise<GenericRow | null> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".widgets_registry
      SET status = $2, updated_by = $3, updated_at = now()
      WHERE widget_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [widgetId, status, userId]);
    return getFirstRow(result);
  }

  async softDelete(widgetId: string, userId: string): Promise<boolean> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".widgets_registry
      SET deleted_at = now(), updated_by = $2
      WHERE widget_id = $1 AND deleted_at IS NULL
    `, [widgetId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const result = await safeQuery(`
      SELECT status, COUNT(*)::int AS cnt
      FROM "${this.schema}".widgets_registry
      WHERE deleted_at IS NULL
      GROUP BY status
    `);
    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.status] = row.cnt;
    }
    return counts;
  }
}
