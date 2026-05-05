// Dynamic-UI contract router (W8) — spec §10 Hard Gates + §3.3 Resolver.
//
// Surfaces the canonical Dynamic-UI contract endpoints required by
// docs/DOS-AIO-Specs/dynamic-ui-enrollment-page-experience-widgets-spec.md:
//
//   GET /contract/:moduleCode             — §10 — full module contract
//                                           (routes + theme + kpis + actions +
//                                            data_resources + i18n + module meta)
//
//   GET /route-catalog                    — §10 — every active route across
//                                           all enrolled modules (platform-default rows)
//
//   GET /page-experience?route=...        — §3.3 — resolved PageExperienceContract
//                                           for the current user (route + permissions
//                                           + persona filter applied). Must be invoked
//                                           with `?route=/api-style/path/here`.
//
// Mounted from server.ts under both /api/ui-os and /api/dynamic-ui so the
// canonical spec path resolves through the gateway.

import { Router } from 'express';
import type { DbPool } from '../db.js';

const NON_WORKSPACE_PATHS = new Set([
  '/',
  '/about',
  '/contact',
  '/dauth',
  '/auth/forgot-password',
  '/auth/login',
  '/auth/mfa',
  '/auth/register',
  '/auth/reset-password',
  '/legal',
  '/platform',
  '/pricing',
  '/profile',
  '/security',
  '/settings',
  '/tenant-profile',
  '/tenant-settings',
  '/trust',
]);

function isWorkspaceRoute(row: {
  module_code: string | null;
  path_pattern: string | null;
  component_key?: string | null;
  permission_key?: string | null;
}): boolean {
  const moduleCode = String(row.module_code ?? '');
  const pathPattern = String(row.path_pattern ?? '');
  const componentKey = String(row.component_key ?? '');

  if (!pathPattern || NON_WORKSPACE_PATHS.has(pathPattern)) return false;
  if (pathPattern.startsWith('/admin/')) return false;
  // Marketing routes already excluded via NON_WORKSPACE_PATHS above.
  if (componentKey.startsWith('auth.')) return false;
  if (!row.permission_key) return false;
  return true;
}

export function createDynamicUiContractRouter(pool: DbPool): Router {
  const router = Router();

  // L1 nav source — the AccessStore's DynamicUiNavSource probes this. It
  // returns `{ items: DosNavItem[] }`; the FE merges it with the manifest
  // + hardcoded sources via the 6-layer resolver. We project tenant-active
  // routes (with a permission_key + title_key) from `dos.dynamic_ui_routes`,
  // falling back to `[]` so the call is never the source of a 500.
  router.get('/workspace/nav', async (req, res) => {
    try {
      const principal = (req as { principal?: { tenantId?: string } }).principal;
      const tenantId = principal?.tenantId
        ?? (req.headers['x-dos-tenant-id'] as string | undefined)
        ?? null;
      // Phase F-F10 — UNION the legacy `dos.dynamic_ui_routes` projection
      // with the new `dos.ui_module_nav_item` source (seeded from
      // `platform/ui-system/module_ui_os_contract-pack/*.json` via
      // `scripts/seed-module-contract-pack.mjs`). Items present in both
      // sources are deduplicated by route — the legacy row wins because
      // it carries readiness/tenant scoping that the new tables don't yet
      // model. The merge order means: legacy rows render with their
      // existing labels/permissions; brand-new items from the contract
      // pack appear automatically without touching this endpoint.
      const [legacyR, newR] = await Promise.all([
        pool.query(
          `SELECT r.module_code, r.path_pattern, r.component_key,
                  r.permission_key, r.title_key,
                  r.sort_order, n.label_en, n.label_ar, n.parent_code, n.icon
             FROM dos.dynamic_ui_routes r
             LEFT JOIN dos.navigation_registry n
               ON n.module_code = r.module_code AND n.route = r.path_pattern
            WHERE (r.tenant_id IS NULL OR r.tenant_id = $1)
              AND COALESCE(r.readiness, 'active') = 'active'
              AND (r.title_key IS NOT NULL OR n.label_en IS NOT NULL)
            ORDER BY r.module_code, r.sort_order, r.path_pattern`,
          [tenantId],
        ),
        pool.query(
          `SELECT i.module_code,
                  i.route          AS path_pattern,
                  NULL             AS component_key,
                  i.permission     AS permission_key,
                  i.label_key      AS title_key,
                  i.sort_order,
                  i.label_en, i.label_ar,
                  i.group_id       AS parent_code,
                  i.icon
             FROM dos.ui_module_nav_item i
            WHERE i.enabled = true
            ORDER BY i.module_code, i.sort_order, i.item_id`,
        ),
      ]);
      // Merge: keep legacy first, then add only routes not already present.
      type NavRow = {
        module_code: string | null;
        path_pattern: string | null;
        component_key?: string | null;
        permission_key?: string | null;
        title_key?: string | null;
        sort_order?: number | null;
        label_en?: string | null;
        label_ar?: string | null;
        parent_code?: string | null;
        icon?: string | null;
      };
      const seen = new Set<string>();
      const rows: NavRow[] = [];
      const allRows = [...(legacyR.rows as NavRow[]), ...(newR.rows as NavRow[])];
      for (const r of allRows) {
        const key = `${r.module_code}|${r.path_pattern}`;
        if (seen.has(key)) continue;
        seen.add(key); rows.push(r);
      }
      const items = rows.filter(isWorkspaceRoute).map((r) => ({
        id:       `${r.module_code}.${r.path_pattern}`,
        label:    r.label_en || r.title_key,
        labelAr:  r.label_ar ?? null,
        labelKey: r.title_key ?? null,
        route:    r.path_pattern,
        group:    r.module_code,
        parent:   r.parent_code ?? null,
        icon:     r.icon ?? null,
        permission: r.permission_key ?? null,
        enabled:  true,
      }));
      res.json({ items });
    } catch (e) {
      // Tolerant: never fail the workspace shell on a nav-source error —
      // the FE is designed to skip this layer when the response is empty.
      res.status(200).json({ items: [], warning: (e as Error).message });
    }
  });

  router.get('/route-catalog', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id::text, module_code, path_pattern, component_key,
                permission_key, sort_order, readiness, page_type, layout,
                kpi_scope, title_key, subtitle_key, data_resource_key,
                default_view, audit_enabled, realtime_enabled, nba_enabled
           FROM dos.dynamic_ui_routes
          WHERE tenant_id IS NULL
            AND COALESCE(readiness, 'active') = 'active'
          ORDER BY module_code, sort_order, path_pattern`,
      );
      res.json({ routes: rows, count: rows.length });
    } catch (e) {
      res.status(500).json({ error: 'route_catalog_failed', message: (e as Error).message });
    }
  });

  router.get('/contract/:moduleCode', async (req, res) => {
    const moduleCode = String(req.params.moduleCode || '').trim();
    if (!moduleCode) {
      res.status(400).json({ error: 'invalid_module_code' });
      return;
    }
    try {
      const [moduleRow, routes, theme, kpis, actions, resources, i18n,
             widgets, pageHeaders, gridColumns, paletteActions, searchScopes, aiTips] = await Promise.all([
        pool.query(
          `SELECT module_code, platform_key, product_key, display_name,
                  default_route, registry_status, canonical_source
             FROM dos.dynamic_ui_modules
            WHERE module_code = $1`,
          [moduleCode],
        ),
        pool.query(
          `SELECT id::text, path_pattern, component_key, permission_key,
                  sort_order, readiness, page_type, layout, kpi_scope,
                  user_intent, data_scope_mode, evidence_required,
                  title_key, subtitle_key, data_resource_key,
                  default_view, audit_enabled, realtime_enabled, nba_enabled,
                  signature_widget
             FROM dos.dynamic_ui_routes
            WHERE tenant_id IS NULL AND module_code = $1
            ORDER BY sort_order, path_pattern`,
          [moduleCode],
        ),
        pool.query(
          `SELECT token_key, token_value, scope, route
             FROM dos.dynamic_ui_theme_tokens
            WHERE tenant_id IS NULL AND module_code = $1 AND is_active = TRUE
            ORDER BY scope, token_key`,
          [moduleCode],
        ),
        pool.query(
          `SELECT route, kpi_key, label_key, unit, data_resource,
                  permission, scope, format, trend_enabled, sort_order
             FROM dos.dynamic_ui_kpis
            WHERE tenant_id IS NULL AND module_code = $1 AND is_active = TRUE
            ORDER BY scope, sort_order, kpi_key`,
          [moduleCode],
        ),
        pool.query(
          `SELECT route, action_id, position, label_key, icon,
                  permission, risk_level, requires_approval,
                  evidence_required, handler_key, sort_order
             FROM dos.dynamic_ui_actions
            WHERE tenant_id IS NULL AND module_code = $1 AND is_active = TRUE
            ORDER BY route, position, sort_order, action_id`,
          [moduleCode],
        ),
        pool.query(
          `SELECT resource_key, resource_type, url_or_query, permission,
                  cache_ttl_sec, realtime_topic, pagination, shape_ref
             FROM dos.dynamic_ui_data_resources
            WHERE tenant_id IS NULL AND module_code = $1 AND is_active = TRUE
            ORDER BY resource_key`,
          [moduleCode],
        ),
        pool.query(
          `SELECT key_path, en, ar
             FROM dos.dynamic_ui_i18n_keys
            WHERE module_code = $1
            ORDER BY key_path`,
          [moduleCode],
        ),
        pool.query(
          `SELECT route, widget_key, zone, permission, sort_order,
                  is_signature, config
             FROM dos.dynamic_ui_widgets
            WHERE module_code = $1 AND tenant_id IS NULL AND is_active = TRUE
            ORDER BY route, sort_order, widget_key`,
          [moduleCode],
        ),
        pool.query(
          `SELECT route, variant, eyebrow_key, title_key, subtitle_key,
                  badge_key, cta_action_id, show_breadcrumb
             FROM dos.dynamic_ui_page_headers
            WHERE module_code = $1 AND tenant_id = '' AND is_active = TRUE
            ORDER BY route`,
          [moduleCode],
        ),
        pool.query(
          `SELECT route, column_key, label_i18n_key, data_path, data_type,
                  formatter_key, width_px, align, sortable, filterable,
                  hidden_default, sort_order
             FROM dos.dynamic_ui_grid_columns
            WHERE module_code = $1 AND tenant_id = '' AND is_active = TRUE
            ORDER BY route, sort_order, column_key`,
          [moduleCode],
        ),
        pool.query(
          `SELECT action_code, label_i18n_key, shortcut, route, intent_code, sort_order
             FROM dos.dynamic_ui_command_palette_actions
            WHERE module_code = $1 AND registry_status = 'active'
            ORDER BY sort_order, action_code`,
          [moduleCode],
        ),
        pool.query(
          `SELECT scope_code, label_i18n_key, resource_key, result_route, sort_order
             FROM dos.dynamic_ui_search_scopes
            WHERE module_code = $1 AND registry_status = 'active'
            ORDER BY sort_order, scope_code`,
          [moduleCode],
        ),
        pool.query(
          `SELECT route, tip_code, severity, title_key, body_key,
                  cta_label_key, cta_route, cta_action_id, audience_role,
                  source, sort_order
             FROM dos.dynamic_ui_ai_tips
            WHERE module_code = $1 AND tenant_id = '' AND is_active = TRUE
            ORDER BY route, sort_order, tip_code`,
          [moduleCode],
        ),
      ]);

      if (moduleRow.rows.length === 0) {
        res.status(404).json({ error: 'module_not_enrolled', moduleCode });
        return;
      }

      // Hard-gate self-check: every route MUST have page_type, layout,
      // kpi_scope, title_key. Refuse to ship a contract that would fail
      // the §10 drift test.
      const driftRows = routes.rows.filter(
        r => !r.page_type || !r.layout || !r.kpi_scope || !r.title_key,
      );
      if (driftRows.length > 0) {
        res.status(409).json({
          error: 'contract_drift',
          moduleCode,
          missing: driftRows.map(r => ({
            path: r.path_pattern,
            missing: [
              r.page_type ? null : 'page_type',
              r.layout ? null : 'layout',
              r.kpi_scope ? null : 'kpi_scope',
              r.title_key ? null : 'title_key',
            ].filter(Boolean),
          })),
        });
        return;
      }

      res.json({
        module: moduleRow.rows[0],
        routes: routes.rows,
        theme: theme.rows,
        kpis: kpis.rows,
        actions: actions.rows,
        dataResources: resources.rows,
        i18n: i18n.rows,
        widgets: widgets.rows,
        pageHeaders: pageHeaders.rows,
        gridColumns: gridColumns.rows,
        commandPaletteActions: paletteActions.rows,
        searchScopes: searchScopes.rows,
        aiTips: aiTips.rows,
      });
    } catch (e) {
      res.status(500).json({ error: 'contract_query_failed', message: (e as Error).message });
    }
  });

  // §3.3 — Resolver endpoint. Returns the resolved PageExperienceContract
  // for a single route filtered by the current user's permissions/persona.
  // Permissions arrive via the gateway-origin verifier (req.principal); the
  // resolver only PROJECTS — it does not authorise. RLS at the row level is
  // the authority (§30.2 Backend RLS as authority).
  router.get('/page-experience', async (req, res) => {
    const route = String(req.query.route || '').trim();
    if (!route) {
      res.status(400).json({ error: 'route_query_required' });
      return;
    }
    const permissions = ((req.principal as { permissions?: unknown })?.permissions ?? []) as string[];
    const userPerms = new Set(Array.isArray(permissions) ? permissions : []);
    try {
      const [routeRows, actions, kpis] = await Promise.all([
        pool.query(
          `SELECT id::text, module_code, path_pattern, component_key,
                  permission_key, page_type, layout, kpi_scope, user_intent,
                  data_scope_mode, evidence_required, title_key, subtitle_key,
                  data_resource_key, default_view, audit_enabled, realtime_enabled,
                  nba_enabled, empty_state_key, error_state_key, help_key
             FROM dos.dynamic_ui_routes
            WHERE tenant_id IS NULL AND path_pattern = $1
            LIMIT 1`,
          [route],
        ),
        pool.query(
          `SELECT route, action_id, position, label_key, icon,
                  permission, risk_level, requires_approval,
                  evidence_required, handler_key, sort_order
             FROM dos.dynamic_ui_actions
            WHERE tenant_id IS NULL AND route = $1 AND is_active = TRUE
            ORDER BY position, sort_order, action_id`,
          [route],
        ),
        pool.query(
          `SELECT route, kpi_key, label_key, unit, data_resource,
                  permission, scope, format, trend_enabled, sort_order
             FROM dos.dynamic_ui_kpis
            WHERE tenant_id IS NULL AND route = $1 AND is_active = TRUE
            ORDER BY sort_order, kpi_key`,
          [route],
        ),
      ]);

      if (routeRows.rows.length === 0) {
        res.status(404).json({ error: 'route_not_enrolled', route });
        return;
      }
      const r = routeRows.rows[0];

      // §3.4 hard law — the permission filter happens server-side; clients
      // render only what we return.
      const allowAll = !r.permission_key || userPerms.has(r.permission_key);
      const visibleActions: typeof actions.rows = [];
      const hiddenActions: typeof actions.rows = [];
      for (const a of actions.rows) {
        if (!a.permission || userPerms.has(a.permission)) visibleActions.push(a);
        else hiddenActions.push(a);
      }
      const visibleKpis: typeof kpis.rows = [];
      for (const k of kpis.rows) {
        if (!k.permission || userPerms.has(k.permission)) visibleKpis.push(k);
      }

      res.json({
        route: r.path_pattern,
        moduleCode: r.module_code,
        componentKey: r.component_key,
        titleKey: r.title_key,
        subtitleKey: r.subtitle_key,
        pageType: r.page_type,
        layout: r.layout,
        kpiScope: r.kpi_scope,
        userIntent: r.user_intent,
        dataScope: { mode: r.data_scope_mode || 'tenant' },
        permission: r.permission_key,
        readonly: !allowAll,
        emptyStateKey: r.empty_state_key,
        errorStateKey: r.error_state_key,
        helpKey: r.help_key,
        evidenceRequired: !!r.evidence_required,
        auditEnabled: !!r.audit_enabled,
        realtimeEnabled: !!r.realtime_enabled,
        nbaEnabled: !!r.nba_enabled,
        defaultView: r.default_view,
        visibleActions,
        hiddenActions,
        kpis: visibleKpis,
      });
    } catch (e) {
      res.status(500).json({ error: 'page_experience_failed', message: (e as Error).message });
    }
  });

  return router;
}
