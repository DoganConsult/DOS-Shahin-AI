import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export class WidgetRuntimeRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async getPublishedWidgets(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT widget_id, widget_key, name_en, name_ar, category, size, icon,
             data_sources, required_permissions, scope_rule, config
      FROM "${this.schema}".widgets_registry
      WHERE status = 'published' AND deleted_at IS NULL
      ORDER BY category, name_en
    `);
    return result.rows;
  }

  async getPublishedBundles(): Promise<GenericRow[]> {
    const result = await safeQuery(`
      SELECT bundle_id, name_en, name_ar, widget_ids, layout,
             target_audience
      FROM "${this.schema}".widgets_bundles
      WHERE status = 'published' AND deleted_at IS NULL
      ORDER BY name_en
    `);
    return result.rows;
  }

  async logWidgetRender(widgetKey: string, userId: string, durationMs: number, success: boolean): Promise<void> {
    await safeQuery(`
      INSERT INTO "${this.schema}".widgets_render_log
        (widget_key, user_id, duration_ms, success, rendered_at)
      VALUES ($1, $2, $3, $4, now())
    `, [widgetKey, userId, durationMs, success]).catch(catchHandler(EC.EVENT_BUS));
  }

  async getRenderStats(widgetKey?: string): Promise<GenericRow[]> {
    const condition = widgetKey
      ? `WHERE widget_key = $1 AND rendered_at > now() - interval '24 hours'`
      : `WHERE rendered_at > now() - interval '24 hours'`;
    const params = widgetKey ? [widgetKey] : [];

    const result = await safeQuery(`
      SELECT widget_key,
             COUNT(*)::int AS render_count,
             AVG(duration_ms)::int AS avg_duration_ms,
             COUNT(*) FILTER (WHERE NOT success)::int AS error_count
      FROM "${this.schema}".widgets_render_log
      ${condition}
      GROUP BY widget_key
      ORDER BY render_count DESC
    `, params);
    return result.rows;
  }

  async resolveTenantSchema(tenantId: string): Promise<string> {
    const result = await safeQuery(
      `SELECT schema_name FROM public.tenants WHERE tenant_id = $1::text LIMIT 1`,
      [tenantId],
    );
    const schema = getFirstRow(result)?.schema_name;
    if (!schema) throw new Error('Tenant schema not found');
    return schema;
  }
}
