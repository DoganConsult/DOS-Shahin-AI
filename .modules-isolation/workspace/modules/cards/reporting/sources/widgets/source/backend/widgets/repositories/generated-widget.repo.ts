
import { safeQuery, tenantSchema } from '../ports/database.port';

const schema = tenantSchema('default');

export class GeneratedWidgetRepo {
  
  async extractedQuery_1(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended

         FROM "${schema}".widgets_registry
         WHERE deleted_at IS NULL`,
      );
  }

  async extractedQuery_2(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(

        `SELECT COUNT(*)::int AS total FROM "${schema}".widgets_bundles WHERE deleted_at IS NULL`,
      );
  }

  async extractedQuery_3(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(

        `SELECT DISTINCT category FROM "${schema}".widgets_registry WHERE deleted_at IS NULL AND category IS NOT NULL`,
      );
  }

  async extractedQuery_4(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT
           r.widget_key,
           COUNT(*)::int AS total_renders,
           CASE WHEN COUNT(*) > 0
             THEN ROUND((COUNT(*) FILTER (WHERE NOT r.success)::numeric / COUNT(*)) * 100, 1)
             ELSE 0
           END AS error_rate

         FROM "${schema}".widgets_render_log r
         WHERE r.rendered_at > NOW() - INTERVAL '7 days'
         GROUP BY r.widget_key
         ORDER BY total_renders DESC
         LIMIT 10`,
      );
  }

  async extractedQuery_5(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT w.widget_key

         FROM "${schema}".widgets_registry w
         WHERE w.deleted_at IS NULL
           AND w.status = 'published'
           AND NOT EXISTS (

             SELECT 1 FROM "${schema}".widgets_render_log r
             WHERE r.widget_key = w.widget_key
               AND r.rendered_at > NOW() - INTERVAL '7 days'
           )`,
      );
  }

  async extractedQuery_6(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE NOT success)::int AS failed,
           COALESCE(AVG(duration_ms), 0)::int AS avg_ms,
           COALESCE(MAX(duration_ms), 0)::int AS max_ms

         FROM "${schema}".widgets_render_log
         WHERE rendered_at > NOW() - INTERVAL '24 hours'`,
      );
  }

  async extractedQuery_7(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/ai/widget-ai.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT
           widget_key,
           COUNT(*)::int AS renders,
           COUNT(*) FILTER (WHERE NOT success)::int AS failures,
           COALESCE(AVG(duration_ms), 0)::int AS avg_ms

         FROM "${schema}".widgets_render_log
         WHERE rendered_at > NOW() - INTERVAL '24 hours'
         GROUP BY widget_key
         ORDER BY renders DESC`,
      );
  }

  async extractedQuery_8(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/dashboard/widget-dashboard.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT
           w.widget_id,
           w.widget_key,
           w.name_en,
           w.category,
           w.status,
           COALESCE(r.total_renders, 0)::int AS total_renders,
           COALESCE(r.avg_duration_ms, 0)::int AS avg_duration_ms,
           CASE WHEN COALESCE(r.total_renders, 0) > 0
             THEN ROUND((COALESCE(r.failed_renders, 0)::numeric / r.total_renders) * 100, 2)
             ELSE 0
           END AS error_rate,
           r.last_rendered_at

         FROM "${schema}".widgets_registry w
         LEFT JOIN (
           SELECT
             widget_key,
             COUNT(*)::int AS total_renders,
             COUNT(*) FILTER (WHERE NOT success)::int AS failed_renders,
             AVG(duration_ms)::int AS avg_duration_ms,
             MAX(rendered_at) AS last_rendered_at

           FROM "${schema}".widgets_render_log
           GROUP BY widget_key
         ) r ON r.widget_key = w.widget_key
         WHERE w.deleted_at IS NULL
         ORDER BY COALESCE(r.total_renders, 0) DESC`,
      );
  }

  async extractedQuery_9(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/dashboard/widget-dashboard.service.ts
    const fn = (safeQuery as any);
    return await fn(
        `SELECT
           COUNT(DISTINCT w.widget_id)::int AS total_widgets,
           COUNT(DISTINCT w.widget_id) FILTER (
             WHERE r.last_rendered IS NOT NULL
               AND r.last_rendered > NOW() - INTERVAL '24 hours'
           )::int AS fresh_widgets,
           COUNT(DISTINCT w.widget_id) FILTER (
             WHERE r.last_rendered IS NOT NULL
               AND r.last_rendered <= NOW() - INTERVAL '24 hours'
           )::int AS stale_widgets,
           COUNT(DISTINCT w.widget_id) FILTER (
             WHERE r.last_rendered IS NULL
           )::int AS never_rendered,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (NOW() - r.last_rendered)) / 60)
             FILTER (WHERE r.last_rendered IS NOT NULL),
             0
           )::int AS avg_data_age_minutes

         FROM "${schema}".widgets_registry w
         LEFT JOIN (
           SELECT widget_key, MAX(rendered_at) AS last_rendered

           FROM "${schema}".widgets_render_log
           GROUP BY widget_key
         ) r ON r.widget_key = w.widget_key
         WHERE w.deleted_at IS NULL
           AND w.status = 'published'`,
      );
  }

  async extractedQuery_10(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-workflow.service.ts
    const fn = (safeQuery as any);
    return await fn(

    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,

    [tenantId, userId, 'widgets', 'widget', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );
  }

  async extractedQuery_11(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-workflow.service.ts
    const fn = (safeQuery as any);
    return await fn(

      `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,

      [tenantId, `Widget Approval Required: ${toStatus}`, `Widget ${entityId} requires approval for transition to ${toStatus}`, 'widget', entityId],
    );
  }

  async extractedQuery_12(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-workflow.service.ts
    const fn = (safeQuery as any);
    return await fn(

    `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'widgets' AND action = 'transition' ORDER BY created_at ASC`,

    [tenantId, entityId],
  );
  }

  async extractedQuery_13(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-workflow.service.ts
    const fn = (safeQuery as any);

    return await fn(`SELECT status FROM "${schema}".widgets_registry WHERE id = $1`, [entityId]);
  }

  async extractedQuery_14(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-lifecycle.service.ts
    const fn = (safeQuery as any);
    return await fn(

    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'widgets','transition',$3,$4,$5,$6)`,

    [tenantId, userId, lifecycleType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })],
  );
  }

  async extractedQuery_15(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-lifecycle.service.ts
    const fn = (safeQuery as any);
    return await fn(

      `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'widgets' AND action = 'transition' ORDER BY created_at ASC`,

      [entityId],
    );
  }

  async extractedQuery_16(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-lifecycle.service.ts
    const fn = (safeQuery as any);
    return await fn(

      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".widgets_registry WHERE status = 'stale' ORDER BY updated_at ASC LIMIT 100`,
    );
  }

  async extractedQuery_17(_args: any[]) {
    // Extracted from backend/src/modules/widgets/services/widgets-lifecycle.service.ts
    const fn = (safeQuery as any);
    return await fn(

      `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".widgets_registry WHERE status = 'disabled' ORDER BY updated_at ASC LIMIT 100`,
    );
  }

  async extractedQuery_18(_args: any[]) {
    // Extracted from backend/src/modules/widgets/insight-widgets.service.ts
    const fn = (safeQuery as any);

    return await fn(sql);
  }

}
export const generatedWidgetRepo = new GeneratedWidgetRepo();
