import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import type { BundleCreateDTO, BundleUpdateDTO } from '../types/widget.types';

export class WidgetBundleRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async findAll(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['b.deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`b.status = $${idx++}`); params.push(filters.status); }
    if (filters.targetAudience) { conditions.push(`b.target_audience = $${idx++}`); params.push(filters.targetAudience); }
    if (filters.search) {
      conditions.push(`(b.name_en ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(filters.pageSize || '25', 10) || 25));
    const offset = (page - 1) * pageSize;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".widgets_bundles b ${where}`, params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const result = await safeQuery(`
      SELECT b.bundle_id, b.name_en, b.name_ar, b.description_en, b.description_ar,
             b.widget_ids, b.layout, b.status, b.target_audience,
             b.created_by, b.updated_by, b.created_at, b.updated_at
      FROM "${this.schema}".widgets_bundles b
      ${where}
      ORDER BY b.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);

    return { rows: result.rows, total };
  }

  async findById(bundleId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".widgets_bundles
       WHERE bundle_id = $1 AND deleted_at IS NULL`,
      [bundleId],
    );
    return getFirstRow(result);
  }

  async create(data: BundleCreateDTO, userId: string): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(`
      INSERT INTO "${this.schema}".widgets_bundles
        (bundle_id, name_en, name_ar, description_en, description_ar,
         widget_ids, layout, status, target_audience, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$9)
      RETURNING *
    `, [
      id, data.nameEn, data.nameAr || '',
      data.descriptionEn || '', data.descriptionAr || '',
      JSON.stringify(data.widgetIds),
      JSON.stringify(data.layout || []),
      data.targetAudience || 'all',
      userId,
    ]);
    return getFirstRow(result);
  }

  async update(bundleId: string, data: BundleUpdateDTO, userId: string): Promise<GenericRow | null> {
    const sets: string[] = ['updated_by = $2', 'updated_at = now()'];
    const params: unknown[] = [bundleId, userId];
    let idx = 3;

    const fieldMap: Record<string, string> = {
      nameEn: 'name_en', nameAr: 'name_ar',
      descriptionEn: 'description_en', descriptionAr: 'description_ar',
      targetAudience: 'target_audience',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }

    if (data.widgetIds !== undefined) {
      sets.push(`widget_ids = $${idx++}`);
      params.push(JSON.stringify(data.widgetIds));
    }
    if (data.layout !== undefined) {
      sets.push(`layout = $${idx++}`);
      params.push(JSON.stringify(data.layout));
    }

    const result = await safeQuery(`
      UPDATE "${this.schema}".widgets_bundles
      SET ${sets.join(', ')}
      WHERE bundle_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, params);
    return getFirstRow(result);
  }

  async updateStatus(bundleId: string, status: string, userId: string): Promise<GenericRow | null> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".widgets_bundles
      SET status = $2, updated_by = $3, updated_at = now()
      WHERE bundle_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [bundleId, status, userId]);
    return getFirstRow(result);
  }

  async softDelete(bundleId: string, userId: string): Promise<boolean> {
    const result = await safeQuery(`
      UPDATE "${this.schema}".widgets_bundles
      SET deleted_at = now(), updated_by = $2
      WHERE bundle_id = $1 AND deleted_at IS NULL
    `, [bundleId, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}
