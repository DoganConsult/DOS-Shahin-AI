// Phase F template-binding router.
//
//   GET /template-binding?route=/admin/dauth/users
//     → { route, archetype, template_export, props, version }
//     200 with `null`-template when no binding row exists (caller falls back
//     to component-map default archetype).
//
//   GET /template-binding/all
//     → [{ route, archetype, template_export, version }] — bulk fetch used
//        by the Shahin SPA bootstrap to warm a client-side cache.
//
// Resolver merges:
//   - dos.ui_route_template_binding (primary)
//   - dos.ui_route_kpi / column / tab / nba / setting_section / report_card /
//     workqueue_group / heatmap_axis (joined into props.*)
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

interface TemplateBinding {
  route: string;
  archetype: string;
  template_export: string;
  props: Record<string, unknown>;
  version: number;
}

async function loadProps(pool: DbPool, route: string): Promise<Record<string, unknown>> {
  const [kpis, cols, tabs, nbas, sections, reports, groups, axes] = await Promise.all([
    pool.query(`SELECT sort_order, label_en, label_ar, source_path, format, ai_insight, status, link
                  FROM dos.ui_route_kpi WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT sort_order, field_key, label_en, label_ar, type, sortable
                  FROM dos.ui_route_column WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT tab_id, sort_order, label_en, label_ar, permission
                  FROM dos.ui_route_tab WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
                  FROM dos.ui_route_nba WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT section_id, sort_order, label_en, label_ar, icon
                  FROM dos.ui_route_setting_section WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT report_id, sort_order, title_en, title_ar, description, status, tag, ai_generated, download_url
                  FROM dos.ui_route_report_card WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT group_id, sort_order, label_en, label_ar, urgency, filter_expr
                  FROM dos.ui_route_workqueue_group WHERE route=$1 ORDER BY sort_order`, [route]),
    pool.query(`SELECT axis, sort_order, label_en, label_ar, bucket_key
                  FROM dos.ui_route_heatmap_axis WHERE route=$1 ORDER BY axis, sort_order`, [route]),
  ]);
  return {
    kpis: kpis.rows,
    columns: cols.rows,
    tabs: tabs.rows,
    nextBestActions: nbas.rows,
    settingsSections: sections.rows,
    reportCards: reports.rows,
    workqueueGroups: groups.rows,
    heatmapAxes: axes.rows,
  };
}

export function createTemplateBindingRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/template-binding/all', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT route, archetype, template_export, version
           FROM dos.ui_route_template_binding
           ORDER BY route`,
      );
      res.json({ bindings: rows });
    } catch (e) {
      res.status(500).json({ error: 'template_binding_fetch_failed', detail: String(e) });
    }
  });

  router.get('/template-binding', async (req, res) => {
    const route = String(req.query.route ?? '');
    if (!route) return res.status(400).json({ error: 'route_required' });
    try {
      const { rows } = await pool.query(
        `SELECT route, archetype, template_export, props, version
           FROM dos.ui_route_template_binding WHERE route=$1`,
        [route],
      );
      if (rows.length === 0) {
        return res.json({
          route, archetype: null, template_export: null, props: {}, version: 0,
        } satisfies Partial<TemplateBinding>);
      }
      const row = rows[0] as TemplateBinding;
      const dynamicProps = await loadProps(pool, route);
      res.json({
        ...row,
        props: { ...(row.props ?? {}), ...dynamicProps },
      });
    } catch (e) {
      res.status(500).json({ error: 'template_binding_fetch_failed', detail: String(e) });
    }
  });

  return router;
}
