// Phase WS-7 — Workspace-shell binding resolver (60-key taxonomy v3.0).
//
//   GET /workspace-shell/:tenantId
//     → { tenantId, version, surfaces[], zones{}, knownKeys[] }
//
// Reads dos.workspace_shell_binding. The 60 workspace-shell keys span 6 bands:
//   A (Frame 14), B (Navigation/Layout 10), C (Tables/Lists 7),
//   D (Search/Filters/Inputs 12), E (Actions/Feedback/Overlays 7),
//   F (Enterprise Polish 10).
//
// All keys are resolver-driven from DB — no hardcoded shell slots.
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

// Workspace shell key set + zone map are loaded LIVE from
// dos.dynamic_ui_component_registry on every request — no hardcoded
// 60-key array, no FRAME_ZONE_PREFIXES table. Zones are stored on
// `metadata.zone` (migration 20260505_2000) and overridable per-tenant
// via dos.workspace_shell_binding.props.zone.
type WorkspaceRuntimeZone = string;

interface WorkspaceShellRow {
  component_key: string;
  enabled: boolean;
  position: number;
  perms_required: string[];
  props: Record<string, unknown> | null;
  version: number;
  zone?: WorkspaceRuntimeZone;
}

interface WorkspaceShellRegistryRow {
  component_key: string;
  metadata_zone: WorkspaceRuntimeZone | null;
}

interface WorkspaceShellCatalog {
  knownKeys: string[];
  zoneByKey: ReadonlyMap<string, WorkspaceRuntimeZone>;
  runtimeZones: string[];
}

async function loadWorkspaceShellCatalog(pool: DbPool): Promise<WorkspaceShellCatalog> {
  const result = await pool.query<WorkspaceShellRegistryRow>(
    `SELECT component_key,
            NULLIF(metadata->>'zone', '') AS metadata_zone
       FROM dos.dynamic_ui_component_registry
      WHERE component_key LIKE 'workspace.%'
        AND approval_status = 'approved'
      ORDER BY component_key`,
  );
  const zoneByKey = new Map<string, WorkspaceRuntimeZone>();
  const knownKeys: string[] = [];
  const zoneSet = new Set<string>();
  for (const row of result.rows) {
    knownKeys.push(row.component_key);
    if (row.metadata_zone) {
      zoneByKey.set(row.component_key, row.metadata_zone);
      zoneSet.add(row.metadata_zone);
    }
  }
  return { knownKeys, zoneByKey, runtimeZones: [...zoneSet].sort() };
}

function resolveSurfaceZone(
  row: WorkspaceShellRow,
  catalog: WorkspaceShellCatalog,
): WorkspaceRuntimeZone | null {
  // 1. Tenant-level override via binding props always wins.
  const props = row.props ?? {};
  const propZone = typeof props.zone === 'string' ? (props.zone as WorkspaceRuntimeZone) : null;
  if (propZone) return propZone;
  // 2. Registry metadata.zone (loaded from DB).
  return catalog.zoneByKey.get(row.component_key) ?? null;
}

function normalizeSurface(
  row: WorkspaceShellRow,
  catalog: WorkspaceShellCatalog,
): WorkspaceShellRow {
  const zone = resolveSurfaceZone(row, catalog);
  return {
    ...row,
    props: row.props ?? {},
    ...(zone ? { zone } : {}),
  };
}

function groupSurfacesByZone(
  rows: WorkspaceShellRow[],
  catalog: WorkspaceShellCatalog,
): Record<string, WorkspaceShellRow[]> {
  // Seed with every distinct zone observed in the registry plus any
  // zone introduced by tenant-level binding overrides (props.zone).
  const grouped: Record<string, WorkspaceShellRow[]> = {};
  for (const zone of catalog.runtimeZones) grouped[zone] = [];
  for (const row of rows) {
    const zone = row.zone ?? resolveSurfaceZone(row, catalog);
    if (!zone) continue;
    if (!grouped[zone]) grouped[zone] = [];
    grouped[zone].push(row);
  }
  for (const zone of Object.keys(grouped)) {
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

async function loadWorkspaceSurfaces(
  pool: DbPool,
  tenantId: string,
  catalog: WorkspaceShellCatalog,
): Promise<WorkspaceShellRow[]> {
  const result = await pool.query<WorkspaceShellRow>(
    `SELECT component_key, enabled, position, perms_required, props, version
       FROM dos.workspace_shell_binding
      WHERE tenant_id = $1
      ORDER BY position`,
    [tenantId],
  );
  return result.rows.map((row) => normalizeSurface(row, catalog));
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
      const catalog = await loadWorkspaceShellCatalog(pool);
      const surfaces = await loadWorkspaceSurfaces(pool, tenantId, catalog);
      const aggregateVersion = surfaces.reduce(
        (acc, r) => acc + (r.version ?? 0),
        0,
      );
      res.json({
        tenantId,
        version: aggregateVersion,
        surfaces,
        zones: groupSurfacesByZone(surfaces, catalog),
        knownKeys: catalog.knownKeys,
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
      const catalog = await loadWorkspaceShellCatalog(pool);
      const surfaces = await loadWorkspaceSurfaces(pool, tenantId, catalog);
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
          zones: groupSurfacesByZone(surfaces, catalog),
          knownKeys: catalog.knownKeys,
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
          surfaces: surfaces.filter((s) => (s.zone ?? resolveSurfaceZone(s, catalog)) === 'main'),
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
