// Phase WS-5 — Workspace-shell binding resolver.
//
//   GET /workspace-shell/:tenantId
//     → { tenantId, version, surfaces: [{ component_key, enabled, position,
//                                         perms_required, props }] }
//
// Reads dos.workspace_shell_binding (created by Phase WS-1 migration
// 20260504_0010_workspace_shell_registry.sql). The 10 default surfaces are:
//   workspace.{header, sidebar, mobile-nav, command-search, status-bar,
//              action-queue, agent-strip, inbox-center, context-panel,
//              quick-create}
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

const WORKSPACE_SHELL_KEYS = [
  'shell.app',
  'shell.desktop',
  'shell.mobile',
  'shell.desktop-sidebar',
  'workspace.header',
  'workspace.sidebar',
  'workspace.mobile-nav',
  'shell.mobile-drawer',
  'shell.workspace-nav',
  'shell.nav-section',
  'shell.nav-item',
  'workspace.command-search',
  'workspace.inbox-center',
  'workspace.quick-create',
  'workspace.context-panel',
  'shell.account-menu',
  'workspace.status-bar',
  'workspace.action-queue',
  'workspace.agent-strip',
  'shell.banner-strip',
  'shell.toast-outlet',
  'page.layout',
  'page.masthead',
  'page.header',
  'page.tabs',
  'page.widget-frame',
  'workspace.selectable-tile',
  'workspace.clickable-tile',
  'workspace.expandable-tile',
  'workspace.ai-tile',
] as const;

type WorkspaceShellKey = typeof WORKSPACE_SHELL_KEYS[number];
type WorkspaceRuntimeZone =
  | 'header'
  | 'sidebar'
  | 'mobile-drawer'
  | 'mobile-nav'
  | 'top-banners'
  | 'main'
  | 'right-rail'
  | 'bottom-status'
  | 'fab'
  | 'toast';

interface WorkspaceShellRow {
  component_key: string;
  enabled: boolean;
  position: number;
  perms_required: string[];
  props: Record<string, unknown> | null;
  version: number;
  zone?: WorkspaceRuntimeZone;
}

const WORKSPACE_RUNTIME_ZONES: readonly WorkspaceRuntimeZone[] = [
  'header',
  'sidebar',
  'mobile-drawer',
  'mobile-nav',
  'top-banners',
  'main',
  'right-rail',
  'bottom-status',
  'fab',
  'toast',
];

const DEFAULT_SURFACE_ZONES: Partial<Record<WorkspaceShellKey, WorkspaceRuntimeZone>> = {
  'workspace.header': 'header',
  'workspace.command-search': 'header',
  'shell.account-menu': 'header',
  'workspace.sidebar': 'sidebar',
  'shell.desktop-sidebar': 'sidebar',
  'shell.workspace-nav': 'sidebar',
  'shell.nav-section': 'sidebar',
  'shell.nav-item': 'sidebar',
  'shell.mobile-drawer': 'mobile-drawer',
  'workspace.mobile-nav': 'mobile-nav',
  'shell.banner-strip': 'top-banners',
  'page.layout': 'main',
  'page.masthead': 'main',
  'page.header': 'main',
  'page.tabs': 'main',
  'page.widget-frame': 'main',
  'workspace.context-panel': 'right-rail',
  'workspace.inbox-center': 'right-rail',
  'workspace.status-bar': 'bottom-status',
  'workspace.action-queue': 'bottom-status',
  'workspace.agent-strip': 'bottom-status',
  'workspace.quick-create': 'fab',
  'shell.toast-outlet': 'toast',
};

function zoneForSurface(row: WorkspaceShellRow): WorkspaceRuntimeZone | null {
  const props = row.props ?? {};
  const propZone = typeof props.zone === 'string' ? props.zone as WorkspaceRuntimeZone : null;
  if (propZone && WORKSPACE_RUNTIME_ZONES.includes(propZone)) return propZone;
  return DEFAULT_SURFACE_ZONES[row.component_key as WorkspaceShellKey] ?? null;
}

function normalizeSurface(row: WorkspaceShellRow): WorkspaceShellRow {
  const zone = zoneForSurface(row);
  return {
    ...row,
    props: row.props ?? {},
    ...(zone ? { zone } : {}),
  };
}

function groupSurfacesByZone(rows: WorkspaceShellRow[]): Record<WorkspaceRuntimeZone, WorkspaceShellRow[]> {
  const grouped = Object.fromEntries(WORKSPACE_RUNTIME_ZONES.map((zone) => [zone, []])) as Record<WorkspaceRuntimeZone, WorkspaceShellRow[]>;
  for (const row of rows) {
    const zone = row.zone ?? zoneForSurface(row);
    if (!zone) continue;
    grouped[zone].push(row);
  }
  for (const zone of WORKSPACE_RUNTIME_ZONES) {
    grouped[zone].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return grouped;
}

interface ModuleOrderRow {
  module_code: string;
  sort_order: number | null;
  enabled: boolean | null;
}

interface PageOrderRow {
  module_code: string;
  item_id: string;
  group_id: string | null;
  sort_order: number | null;
  route: string | null;
  permission: string | null;
  enabled: boolean | null;
}

function buildModuleOrder(groups: ModuleOrderRow[], items: PageOrderRow[]) {
  const modules = new Map<string, { moduleCode: string; sortOrder: number; enabled: boolean }>();
  const register = (moduleCode: string, sortOrder: number, enabled: boolean) => {
    const existing = modules.get(moduleCode);
    if (!existing || sortOrder < existing.sortOrder) modules.set(moduleCode, { moduleCode, sortOrder, enabled });
  };
  for (const group of groups) {
    if (!group.module_code) continue;
    register(group.module_code, Number(group.sort_order) || 0, group.enabled !== false);
  }
  for (const item of items) {
    if (!item.module_code) continue;
    register(item.module_code, Number(item.sort_order) || 0, item.enabled !== false);
  }
  return Array.from(modules.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.moduleCode.localeCompare(b.moduleCode));
}

function buildPageOrder(items: PageOrderRow[]) {
  return items
    .filter((item) => item.module_code && item.item_id)
    .map((item) => ({
      moduleCode: item.module_code,
      itemId: item.item_id,
      groupId: item.group_id,
      sortOrder: Number(item.sort_order) || 0,
      route: item.route,
      permission: item.permission,
      enabled: item.enabled !== false,
    }))
    .sort((a, b) => a.moduleCode.localeCompare(b.moduleCode) || a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));
}

async function loadWorkspaceSurfaces(pool: DbPool, tenantId: string): Promise<WorkspaceShellRow[]> {
  const result = await pool.query<WorkspaceShellRow>(
    `SELECT component_key, enabled, position, perms_required, props, version
       FROM dos.workspace_shell_binding
      WHERE tenant_id = $1
      ORDER BY position`,
    [tenantId],
  );
  return result.rows.map(normalizeSurface);
}

export function createWorkspaceShellRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/workspace-shell/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId ?? '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    try {
      const surfaces = await loadWorkspaceSurfaces(pool, tenantId);
      const aggregateVersion = surfaces.reduce(
        (acc, r) => acc + (r.version ?? 0),
        0,
      );
      res.json({
        tenantId,
        version: aggregateVersion,
        surfaces,
        zones: groupSurfacesByZone(surfaces),
        knownKeys: WORKSPACE_SHELL_KEYS,
      });
    } catch (e) {
      res.status(500).json({
        error: 'workspace-shell resolver failed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  router.get('/workspace-runtime', async (req, res) => {
    const tenantId = String(
      req.principal?.tenantId
        ?? req.header('x-tenant-id')
        ?? req.header('x-dos-tenant-id')
        ?? req.query.tenantId
        ?? '',
    ).trim();
    const userId = String(
      req.principal?.sub
        ?? req.header('x-user-sub')
        ?? req.header('x-user-id')
        ?? req.header('x-dos-user-id')
        ?? req.query.userId
        ?? '',
    ).trim();
    const productCode = String(req.header('x-product-code') ?? req.query.productCode ?? 'shahin-ai').trim() || 'shahin-ai';
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    try {
      const surfaces = await loadWorkspaceSurfaces(pool, tenantId);
      const shellVersion = surfaces.reduce((acc, r) => acc + (r.version ?? 0), 0);
      const [
        navGroups,
        navItems,
        routeBindings,
        productOverrides,
        tenantOverrides,
        userOverrides,
        registry,
        services,
        endpoints,
        probes,
        rolePermissions,
      ] = await Promise.all([
        pool.query(`SELECT module_code, group_id, sort_order, label_key, label_en, label_ar, enabled, version FROM dos.ui_module_nav_group WHERE enabled IS DISTINCT FROM false ORDER BY module_code, sort_order, group_id`),
        pool.query(`SELECT module_code, item_id, group_id, sort_order, route, icon, permission, label_key, label_en, label_ar, badge, enabled, version FROM dos.ui_module_nav_item WHERE enabled IS DISTINCT FROM false ORDER BY module_code, group_id, sort_order, item_id`),
        pool.query(`SELECT route, archetype, template_export, props, version, title_en, title_ar, subtitle_en, subtitle_ar, eyebrow_en, eyebrow_ar, ai_headline_en, ai_headline_ar, status_tags, primary_action FROM dos.ui_route_template_binding ORDER BY route`),
        pool.query(`SELECT product_code, patch, version, updated_at FROM dos.ui_override_product WHERE product_code = $1`, [productCode]),
        pool.query(`SELECT tenant_id, route, patch, version, updated_at FROM dos.ui_override_tenant WHERE tenant_id = $1 ORDER BY route`, [tenantId]),
        pool.query(`SELECT user_id, route, patch, version, updated_at FROM dos.ui_override_user WHERE user_id = $1 ORDER BY route`, [userId]),
        pool.query(`SELECT component_key, vendor, carbon_key, schema_version, metadata, approval_status, approved_at FROM dos.dynamic_ui_component_registry WHERE approval_status = 'approved' ORDER BY component_key`),
        pool.query(`SELECT service_code, display_name, module_code, port, gateway_prefix, registry_status, health_path, manifest_path, admin_route, updated_at FROM dos.ui_service_registry ORDER BY service_code`),
        pool.query(`SELECT service_code, http_method, path_pattern, permission_code, is_public FROM dos.service_endpoints ORDER BY service_code, path_pattern, http_method`),
        pool.query(`SELECT service_code, probe_code, probe_kind, probe_url, expected_status, timeout_ms FROM dos.service_health_probes ORDER BY service_code, probe_code`),
        pool.query(
          `SELECT DISTINCT ura.role_code, p.permission_code
             FROM dos.user_role_assignments ura
             JOIN platform_dauth.functional_roles fr ON fr.role_code = ura.role_code
             LEFT JOIN platform_dauth.role_permissions rp ON rp.role_id = fr.role_id
             LEFT JOIN platform_dauth.permissions p ON p.permission_id = rp.permission_id
            WHERE ura.is_active = true
              AND ura.revoked_at IS NULL
              AND ($2 <> '' AND ura.user_id = $2)
              AND (ura.tenant_id = $1 OR ura.scope = 'platform')
              AND p.permission_code IS NOT NULL
            ORDER BY ura.role_code, p.permission_code`,
          [tenantId, userId],
        ),
      ]);
      const moduleOrder = buildModuleOrder(navGroups.rows as ModuleOrderRow[], navItems.rows as PageOrderRow[]);
      const pageOrder = buildPageOrder(navItems.rows as PageOrderRow[]);
      const catalogVersion = {
        shell: shellVersion,
        nav: [...navGroups.rows, ...navItems.rows].reduce((acc, r) => acc + (Number(r.version) || 0), 0),
        routes: routeBindings.rows.reduce((acc, r) => acc + (Number(r.version) || 0), 0),
        registryCount: registry.rowCount,
      };
      res.json({
        tenantId,
        userId: userId || null,
        productCode,
        version: shellVersion + catalogVersion.nav + catalogVersion.routes,
        catalogVersion,
        shell: {
          version: shellVersion,
          surfaces,
          zones: groupSurfacesByZone(surfaces),
          knownKeys: WORKSPACE_SHELL_KEYS,
        },
        navigation: {
          groups: navGroups.rows,
          items: navItems.rows,
          productWorkspace: {
            moduleOrder,
            pageOrder,
          },
        },
        routes: {
          bindings: routeBindings.rows,
        },
        product: {
          overlays: productOverrides.rows,
        },
        tenant: {
          overlays: tenantOverrides.rows,
        },
        user: {
          overlays: userId ? userOverrides.rows : [],
        },
        i18n: {
          locales: ['en', 'ar'],
        },
        rolePermissions: rolePermissions.rows,
        serviceHealth: {
          services: services.rows,
          endpoints: endpoints.rows,
          probes: probes.rows,
        },
        pageInfrastructure: {
          surfaces: surfaces.filter((s) => (s.zone ?? zoneForSurface(s)) === 'main'),
        },
      });
    } catch (e) {
      res.status(500).json({
        error: 'workspace-runtime resolver failed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}
