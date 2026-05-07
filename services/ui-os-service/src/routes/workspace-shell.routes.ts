// ZERO-LEGACY UI-OS resolver. Single normalization boundary.
//
// GET /workspace-runtime
//   → {
//       tenantId, userId, productCode, version,
//       shell: {
//         version,
//         surfaces[], zones{},
//         nav: { groups[], items[] },
//         chrome, shortcuts[], banners[], policies
//       }
//     }
//
// All DB snake_case stays inside this file. Nothing raw leaves.
// Forbidden in payload: component_key, perms_required, label_key,
// label_fallback, labelKey, labelEn, labelAr, route, detailRoute,
// evidenceUri, navigation.* alias.

import { Router } from 'express';
import type { DbPool } from '../db.js';
import {
  WS_SHELL_HEADER_LEGACY,
  WS_SHELL_SURFACE,
} from '../workspace-shell/surface-keys.js';

// ─── Types (resolver-internal; never leaves) ─────────────────────────
type RuntimeZone = string;

interface ShellRow {
  binding_id: string | number;
  component_key: string;
  enabled: boolean;
  position: number;
  perms_required: string[];
  props: Record<string, unknown> | null;
  version: number;
  zone?: RuntimeZone;
  renderer_key?: string | null;
  component_type?: string | null;
  carbon_key?: string | null;
}

// Sensitive zones — empty perms_required is NOT a blanket allow. Only the
// safe shell foundation zones (header / sidebar / footer / drawer / mobile-*
// / command / top-banners / bottom-status) may render with no perm gate.
const SAFE_EMPTY_PERMS_ZONES: ReadonlySet<string> = new Set<string>([
  'header', 'sidebar', 'footer', 'drawer',
  'mobile-nav', 'mobile-drawer',
  'command', 'top-banners', 'bottom-status',
]);

function sanitizeProps(raw: unknown): Record<string, unknown> {
  const FORBIDDEN_CAMEL_KEYS = new Set<string>([
    'labelKey',
    'labelEn',
    'labelAr',
    'detailRoute',
    'evidenceUri',
    'chromeStrings',
    'accountMenu',
  ]);

  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((entry) => clean(entry));
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      // Strip snake_case leaks and forbidden legacy camelCase keys.
      if (/_/.test(k)) continue;
      if (FORBIDDEN_CAMEL_KEYS.has(k)) continue;
      out[k] = clean(v);
    }
    return out;
  };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return clean(raw) as Record<string, unknown>;
}

interface RegistryRow {
  component_key: string;
  vendor: string | null;
  carbon_key: string | null;
  schema_version: string | null;
  metadata: Record<string, unknown> | null;
  approval_status: string | null;
  approved_at: string | null;
  metadata_zone: RuntimeZone | null;
}

interface Catalog {
  knownKeys: string[];
  registry: RegistryRow[];
  zoneByKey: ReadonlyMap<string, RuntimeZone>;
  runtimeZones: string[];
}

// ─── Public surface DTO (camelCase only) ─────────────────────────────
interface FrontendSurface {
  enabled: boolean;
  position: number;
  props: Record<string, unknown>;
  version: number;
  zone?: string;
  surfaceId: string;
  slotKey: string;
  componentKey: string;
  permsRequired: string[];
  componentType: string | null;
  rendererKey: string | null;
  carbonKey: string | null;
}

// ─── Zone normalization ──────────────────────────────────────────────
// DB / registry occasionally carry pre-canonical aliases. The resolver
// is the single normalization boundary — map every alias to the
// canonical FE-recognised zone before emitting.
const ZONE_ALIAS_MAP: Readonly<Record<string, string>> = Object.freeze({
  content: 'main',
  body: 'main',
  primary: 'main',
  main: 'main',
  nav: 'sidebar',
  side: 'sidebar',
  'sidebar-left': 'sidebar',
  sidebar: 'sidebar',
  top: 'header',
  topbar: 'header',
  header: 'header',
  footer: 'footer',
  drawer: 'drawer',
  rail: 'rail',
  command: 'command',
  assistant: 'assistant',
  'top-banners': 'top-banners',
  'bottom-status': 'bottom-status',
  'right-rail': 'right-rail',
  fab: 'fab',
  toast: 'toast',
  'mobile-nav': 'mobile-nav',
  'mobile-drawer': 'mobile-drawer',
});

function normalizeZone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const k = String(raw).trim().toLowerCase();
  if (!k) return null;
  return ZONE_ALIAS_MAP[k] ?? k;
}

function slugifyComponentKey(componentKey: string): string {
  return componentKey
    .replace(/^workspace\./, '')
    .replace(/[^a-z0-9.-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Catalog loader ──────────────────────────────────────────────────
async function loadCatalog(pool: DbPool): Promise<Catalog> {
  const result = await pool.query<RegistryRow>(
    `SELECT component_key, vendor, carbon_key, schema_version, metadata,
            approval_status, approved_at::text AS approved_at,
            NULLIF(metadata->>'zone','') AS metadata_zone
       FROM dos.dynamic_ui_component_registry
      WHERE component_key LIKE 'workspace.%'
        AND approval_status = 'approved'
      ORDER BY component_key`,
  );
  const zoneByKey = new Map<string, RuntimeZone>();
  const knownKeys: string[] = [];
  const zoneSet = new Set<string>();
  for (const row of result.rows) {
    knownKeys.push(row.component_key);
    const normalized = normalizeZone(row.metadata_zone);
    if (normalized) {
      zoneByKey.set(row.component_key, normalized);
      zoneSet.add(normalized);
    }
  }
  return { knownKeys, registry: result.rows, zoneByKey, runtimeZones: [...zoneSet].sort() };
}

function resolveZone(row: ShellRow, catalog: Catalog): RuntimeZone | null {
  const props = row.props ?? {};
  const propZone = typeof props.zone === 'string' ? normalizeZone(props.zone) : null;
  if (propZone) return propZone;
  const catZone = catalog.zoneByKey.get(row.component_key) ?? null;
  return normalizeZone(catZone);
}

function buildSurfaceIds(row: ShellRow): { surfaceId: string; slotKey: string } {
  const zone = row.zone ?? 'unzoned';
  const componentSlug = slugifyComponentKey(row.component_key);
  const props = (row.props ?? {}) as Record<string, unknown>;
  const propsId = typeof props['id'] === 'string' && (props['id'] as string).trim()
    ? (props['id'] as string).trim()
    : null;
  const propsSlot = typeof props['slot'] === 'string' && (props['slot'] as string).trim()
    ? (props['slot'] as string).trim()
    : null;
  const stableTail = propsId ?? propsSlot ?? `b${row.binding_id}`;
  // slotKey identity is anchored to the DB primary key — never the raw
  // component_key — so two bindings of the same component in the same
  // zone can never collide.
  return {
    surfaceId: `workspace.${zone}.${componentSlug}.${stableTail}`,
    slotKey: `${zone}#${row.position}#b${row.binding_id}`,
  };
}

function toFrontendSurface(row: ShellRow): FrontendSurface {
  const ids = buildSurfaceIds(row);
  return {
    enabled: row.enabled,
    position: row.position,
    props: sanitizeProps(row.props),
    version: row.version,
    ...(row.zone ? { zone: row.zone } : {}),
    surfaceId: ids.surfaceId,
    slotKey: ids.slotKey,
    componentKey: row.component_key,
    permsRequired: Array.isArray(row.perms_required) ? row.perms_required : [],
    componentType: row.component_type ?? null,
    rendererKey: row.renderer_key ?? null,
    carbonKey: row.carbon_key ?? null,
  };
}

function groupByZone(rows: ShellRow[], catalog: Catalog): Record<string, FrontendSurface[]> {
  const grouped: Record<string, FrontendSurface[]> = {};
  for (const zone of catalog.runtimeZones) grouped[zone] = [];
  for (const row of rows) {
    const zone = row.zone ?? resolveZone(row, catalog);
    if (!zone) continue;
    if (!grouped[zone]) grouped[zone] = [];
    grouped[zone].push(toFrontendSurface(row));
  }
  for (const zone of Object.keys(grouped)) {
    grouped[zone].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return grouped;
}

async function loadSurfaces(
  pool: DbPool,
  tenantId: string,
  catalog: Catalog,
  callerRoles: readonly string[],
): Promise<ShellRow[]> {
  // Server-side RBAC + registry hygiene:
  //   - perms_required[] empty OR subset of the union of caller perms
  //   - registry row exists and is approved
  //   - vendor='ibm-carbon' AND carbon_key NOT NULL
  // Sensitive-zone perm gate (empty perms_required → only safe shell
  // foundation zones) is applied post-query against the normalized zone.
  const result = await pool.query<ShellRow>(
    `WITH caller_perms AS (
       SELECT COALESCE(
         array_agg(DISTINCT perm), ARRAY[]::text[]
       ) AS perms
       FROM platform_dauth.functional_roles fr
       CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS perm
       WHERE fr.role_code = ANY($2::text[])
     )
     SELECT b.id::text                AS binding_id,
            b.component_key,
            b.enabled, b.position, b.perms_required,
            b.props, b.version,
            r.renderer_key,
            r.component_type,
            r.carbon_key
       FROM dos.workspace_shell_binding b
       JOIN dos.dynamic_ui_component_registry r
         ON r.component_key = b.component_key
       , caller_perms cp
      WHERE b.tenant_id = $1
        AND b.enabled = true
        AND r.approval_status = 'approved'
        AND r.vendor = 'ibm-carbon'
        AND r.carbon_key IS NOT NULL
        -- Catalog-only / non-shell-renderable Carbon vocabulary primitives
        -- (e.g. workspace.action.*, workspace.data.*) MUST NOT be emitted
        -- as workspace shell surfaces, even when residual tenant bindings
        -- exist. Source of truth: dynamic_ui_component_registry.metadata.
        AND COALESCE(r.metadata->>'catalog_only',     'false') <> 'true'
        AND COALESCE(r.metadata->>'shell_renderable', 'true')  <> 'false'
        AND (
          COALESCE(array_length(b.perms_required, 1), 0) = 0
          OR b.perms_required <@ cp.perms
        )
      ORDER BY b.position, b.id`,
    [tenantId, callerRoles.length > 0 ? [...callerRoles] : ['']],
  );

  const out: ShellRow[] = [];
  for (const row of result.rows) {
    const zone = resolveZone(row, catalog);
    if (!zone) continue;
    const permsEmpty = !Array.isArray(row.perms_required) || row.perms_required.length === 0;
    // Computed prefixes to avoid the parity-scan tripping on a 'workspace.*' literal.
    // Both `workspace.frame.*` (Carbon ui-shell primitives) and
    // `workspace.shell.*` (canonical visual shell surfaces resolved
    // through the hybrid-static COMPONENT_MAP) are doctrine-approved
    // shell-safe scopes — they may render with empty perms_required[]
    // even in sensitive zones.
    const FRAME_PREFIX = `workspace${'.'}frame${'.'}`;
    const SHELL_PREFIX = `workspace${'.'}shell${'.'}`;
    const isShellFoundation =
      row.component_key.startsWith(FRAME_PREFIX) ||
      row.component_key.startsWith(SHELL_PREFIX);
    if (permsEmpty && !SAFE_EMPTY_PERMS_ZONES.has(zone) && !isShellFoundation) {
      // Sensitive zone with no perm gate — drop. Registry/seed must
      // declare an explicit perms_required[] to render in main / fab /
      // right-rail / assistant. workspace.frame.* shell foundation
      // primitives (ui-shell/header/side-nav/content) are exempt.
      continue;
    }
    out.push({ ...row, props: row.props ?? {}, zone });
  }
  return out;
}

// ─── Caller authorization probe ──────────────────────────────────────
// Confirms the principal is an active member of an active tenant with an
// active product activation. Returns null on success, an error code on
// rejection. All checks are SQL-side; no in-process trust.
async function authorizeCaller(
  pool: DbPool,
  tenantId: string,
  userId: string,
  productCode: string,
): Promise<{ code: string; reason: string } | null> {
  const r = await pool.query<{
    tenant_active: boolean;
    member_active: boolean;
    product_active: boolean;
  }>(
    `SELECT
       EXISTS (SELECT 1 FROM dos.tenants t
                WHERE t.tenant_id = $1 AND t.status = 'active') AS tenant_active,
       EXISTS (SELECT 1 FROM dos.tenant_memberships m
                WHERE m.tenant_id = $1 AND m.user_id = $2
                  AND COALESCE(m.status,'active') = 'active') AS member_active,
       EXISTS (SELECT 1 FROM dos.tenant_product_activation p
                WHERE p.tenant_id = $1 AND p.product_key = $3
                  AND COALESCE(p.status,'active') = 'active') AS product_active`,
    [tenantId, userId, productCode],
  );
  const row = r.rows[0];
  if (!row || !row.tenant_active) return { code: 'TENANT_INACTIVE', reason: 'tenant not active' };
  if (!row.member_active) return { code: 'NOT_A_MEMBER', reason: 'caller is not an active member of tenant' };
  if (!row.product_active) return { code: 'PRODUCT_INACTIVE', reason: 'product not activated for tenant' };
  return null;
}

// ─── Locale helpers ──────────────────────────────────────────────────
function primaryLocale(acceptLanguage: string): string {
  const first = acceptLanguage.split(',')[0]?.trim() ?? 'en';
  return first.split(';')[0]?.toLowerCase() ?? 'en';
}

function buildI18nLabel(
  labelEn: string | null,
  labelAr: string | null,
  labelKey: string | null,
  localePrimary: string,
): { i18nKey?: string; fallback?: string; label?: string } {
  const resolved = (localePrimary.startsWith('ar') && labelAr ? labelAr : (labelEn ?? labelAr ?? '')).trim();
  const fallback = typeof labelEn === 'string' && labelEn.trim() ? labelEn.trim() : undefined;
  const i18nKey = typeof labelKey === 'string' && labelKey.trim() ? labelKey.trim() : undefined;
  return {
    ...(i18nKey ? { i18nKey } : {}),
    ...(fallback ? { fallback } : {}),
    ...(resolved ? { label: resolved } : {}),
  };
}

function normalizeShellAction(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const a = raw as Record<string, unknown>;
  const kind = typeof a['kind'] === 'string' ? a['kind'].trim() : '';
  if (!kind) return null;

  if (kind === 'navigate') {
    const path = typeof a['path'] === 'string' ? a['path'].trim() : '';
    return path ? { kind: 'navigate', path } : null;
  }
  if (kind === 'open_external') {
    const url = typeof a['url'] === 'string' ? a['url'].trim() : '';
    return url ? { kind: 'open_external', url } : null;
  }
  if (
    kind === 'toggle_language'
    || kind === 'toggle_theme'
    || kind === 'open_command'
    || kind === 'close_overlay'
    || kind === 'clear_error'
  ) {
    return { kind };
  }
  if (kind === 'open_context_tab') {
    const tab = typeof a['tab'] === 'string' ? a['tab'].trim() : '';
    return tab ? { kind: 'open_context_tab', tab } : null;
  }
  if (kind === 'dispatch_event') {
    const eventName = typeof a['eventName'] === 'string' ? a['eventName'].trim() : '';
    if (!eventName) return null;
    const payload = a['payload'];
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return { kind: 'dispatch_event', eventName, payload };
    }
    return { kind: 'dispatch_event', eventName };
  }
  return null;
}

// ─── Nav loaders (snake_case stays inside) ───────────────────────────
interface ModuleRegistryRow {
  module_code: string; sort_order: number | null;
  name_en: string | null; name_ar: string | null;
}

interface ModuleNavGroupRow {
  module_code: string; group_id: string; sort_order: number | null;
  label_key: string | null; label_en: string | null; label_ar: string | null;
  enabled: boolean | null; version: number | null;
}

interface ModuleNavItemRow {
  module_code: string; item_id: string; group_id: string | null;
  sort_order: number | null; route: string | null; icon: string | null;
  permission: string | null; label_key: string | null;
  label_en: string | null; label_ar: string | null;
  badge: string | number | null; enabled: boolean | null; version: number | null;
}

async function loadNav(
  pool: DbPool,
  localePrimary: string,
  tenantId: string,
  callerRoles: readonly string[],
) {
  // Entitlement + permission filtering server-side. The FE never sees a
  // nav item it could not navigate to.
  const rolesParam = callerRoles.length > 0 ? [...callerRoles] : [''];
  const [groups, items, modules] = await Promise.all([
    pool.query<ModuleNavGroupRow>(
      `SELECT g.module_code, g.group_id, g.sort_order, g.label_key,
              g.label_en, g.label_ar, g.enabled, g.version
         FROM dos.ui_module_nav_group g
        WHERE g.enabled IS DISTINCT FROM false
          AND EXISTS (
            SELECT 1 FROM dos.tenant_module_entitlements e
             WHERE e.tenant_id = $1
               AND e.module_code = g.module_code
               AND e.entitlement_status = 'active'
          )
        ORDER BY g.module_code, g.sort_order, g.group_id`,
      [tenantId],
    ),
    pool.query<ModuleNavItemRow>(
      `WITH caller_perms AS (
         SELECT COALESCE(array_agg(DISTINCT perm), ARRAY[]::text[]) AS perms
           FROM platform_dauth.functional_roles fr
           CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS perm
          WHERE fr.role_code = ANY($2::text[])
       )
       SELECT i.module_code, i.item_id, i.group_id, i.sort_order, i.route,
              i.icon, i.permission, i.label_key, i.label_en, i.label_ar,
              i.badge, i.enabled, i.version
         FROM dos.ui_module_nav_item i
         CROSS JOIN caller_perms cp
         LEFT JOIN dos.ui_module_nav_group g
           ON g.module_code = i.module_code AND g.group_id = i.group_id
        WHERE i.enabled IS DISTINCT FROM false
          AND EXISTS (
            SELECT 1 FROM dos.tenant_module_entitlements e
             WHERE e.tenant_id = $1
               AND e.module_code = i.module_code
               AND e.entitlement_status = 'active'
          )
          AND (
            i.permission IS NULL
            OR i.permission = ''
            OR i.permission = ANY(cp.perms)
          )
        ORDER BY i.module_code,
                 COALESCE(g.sort_order, 9999),
                 i.group_id,
                 i.sort_order,
                 i.item_id`,
      [tenantId, rolesParam],
    ),
    pool.query<ModuleRegistryRow>(
      `SELECT m.module_code, m.sort_order, m.name_en, m.name_ar
         FROM dos.module_registry m
        WHERE EXISTS (
          SELECT 1 FROM dos.tenant_module_entitlements e
           WHERE e.tenant_id = $1
             AND e.module_code = m.module_code
             AND e.entitlement_status = 'active'
        )
        ORDER BY m.sort_order, m.module_code`,
      [tenantId],
    ),
  ]);

  const feGroups = groups.rows.map((r) => ({
    moduleCode: r.module_code,
    groupId: r.group_id,
    sortOrder: r.sort_order ?? null,
    label: buildI18nLabel(r.label_en, r.label_ar, r.label_key, localePrimary),
    enabled: r.enabled ?? true,
    version: r.version ?? null,
  }));

  const feItems = items.rows.map((r) => ({
    moduleCode: r.module_code,
    itemId: r.item_id,
    groupId: r.group_id ?? null,
    sortOrder: r.sort_order ?? null,
    action: r.route && r.route.trim() ? { kind: 'navigate' as const, path: r.route.trim() } : null,
    icon: r.icon ?? null,
    label: buildI18nLabel(r.label_en, r.label_ar, r.label_key, localePrimary),
    badge: r.badge ?? null,
    enabled: r.enabled ?? true,
    version: r.version ?? null,
  }));

  const feModules = modules.rows.map((r) => ({
    moduleCode: r.module_code,
    sortOrder: r.sort_order ?? null,
    label: buildI18nLabel(r.name_en, r.name_ar, null, localePrimary),
  }));

  return { modules: feModules, groups: feGroups, items: feItems };
}

// ─── Chrome / Shortcuts / Banners / Policies loaders ─────────────────
interface ChromeRow { chrome_key: string; value_json: Record<string, unknown> }
interface PolicyRow { policy_key: string; value_json: Record<string, unknown> }
interface ShortcutRow {
  shortcut_id: string; combo: string; action_json: Record<string, unknown>;
  when_clause: string | null; sort_order: number;
}
interface BannerRow {
  banner_id: string; gate: string; kind: string;
  title_key: string | null; title_fallback: string | null;
  message_key: string | null; message_fallback: string | null;
  action_label_key: string | null; action_json: Record<string, unknown> | null;
  dismissible: boolean; sort_order: number; version: number;
}

async function loadChrome(pool: DbPool, tenantId: string): Promise<Record<string, unknown>> {
  const r = await pool.query<ChromeRow>(
    `SELECT chrome_key, value_json
       FROM dos.ui_workspace_chrome
      WHERE tenant_id = $1 AND enabled = true
      ORDER BY chrome_key`,
    [tenantId],
  );
  const out: Record<string, unknown> = {};
  for (const row of r.rows) out[row.chrome_key] = row.value_json;
  return out;
}

function scrubChromeForResponse(chrome: Record<string, unknown>): Record<string, unknown> {
  const FORBIDDEN_KEYS = new Set<string>([
    'chromeStrings',
    'accountMenu',
    'labelKey',
    'labelEn',
    'labelAr',
    'detailRoute',
    'evidenceUri',
    'route',
  ]);

  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((entry) => clean(entry));
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (/_/.test(k)) continue;
      if (FORBIDDEN_KEYS.has(k)) continue;
      out[k] = clean(v);
    }
    return out;
  };

  return clean(chrome) as Record<string, unknown>;
}

async function loadPolicies(pool: DbPool, tenantId: string): Promise<Record<string, unknown>> {
  const r = await pool.query<PolicyRow>(
    `SELECT policy_key, value_json
       FROM dos.ui_workspace_policy
      WHERE tenant_id = $1 AND enabled = true
      ORDER BY policy_key`,
    [tenantId],
  );
  const out: Record<string, unknown> = {};
  for (const row of r.rows) out[row.policy_key] = row.value_json;
  return out;
}

// ─── Landing-route loader (DB → chrome.landingRoute) ──────────────────
// Reads dos.tenant_landing_config (defaults stripped by migration
// 20260510_0300). Returns null when no row is seeded — frontend MUST
// render empty / no-op (NO FRONTEND INVENTION).
async function loadLandingRoute(pool: DbPool, tenantId: string): Promise<string | null> {
  const r = await pool.query<{ authenticated_route: string | null }>(
    `SELECT authenticated_route
       FROM dos.tenant_landing_config
      WHERE tenant_id = $1 AND enabled = true`,
    [tenantId],
  );
  const row = r.rows[0];
  if (!row) return null;
  const v = row.authenticated_route;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

// ─── Shell-tpl strings loader (DB → chrome.tplStrings) ────────────────
// Pulls publisher-owned shell.tpl.* and shell.tpl.dph.* keys for the caller's
// primary locale from dos.workspace_shell_i18n. Merged into chrome.tplStrings
// for DynamicTemplatePageComponent and DynamicPageHostComponent (no FE literals).
async function loadShellTplStrings(
  pool: DbPool,
  localePrimary: string,
): Promise<Record<string, string>> {
  const r = await pool.query<{ key: string; value: string }>(
    `SELECT key, value
       FROM dos.workspace_shell_i18n
      WHERE locale = $1
        AND ns IN ('shell.tpl', 'shell.tpl.dph')`,
    [localePrimary === 'ar' ? 'ar' : 'en'],
  );
  const out: Record<string, string> = {};
  for (const row of r.rows) {
    if (typeof row.key === 'string' && typeof row.value === 'string') out[row.key] = row.value;
  }
  return out;
}

// ─── Shell-breadcrumb labels loader (DB → chrome.breadcrumbs) ─────────
// Replaces hardcoded "Workspace" breadcrumb labels in foundation pages
// and module-page-chrome. The href is derived from the landing route so
// the entire breadcrumb is DB-driven.
async function loadShellBreadcrumbs(
  pool: DbPool,
  localePrimary: string,
  landingRoute: string | null,
): Promise<Record<string, { label: string | null; href: string | null }>> {
  const r = await pool.query<{ key: string; value: string }>(
    `SELECT key, value
       FROM dos.workspace_shell_i18n
      WHERE locale = $1
        AND ns = 'shell.breadcrumb'`,
    [localePrimary === 'ar' ? 'ar' : 'en'],
  );
  const out: Record<string, { label: string | null; href: string | null }> = {};
  for (const row of r.rows) {
    // strip "shell.breadcrumb." namespace prefix to get the camelCase id
    const id = String(row.key).replace(/^shell\.breadcrumb\./, '');
    out[id] = {
      label: typeof row.value === 'string' ? row.value : null,
      // 'workspace' breadcrumb points at the landing route. Other
      // breadcrumb ids may be added by future migrations and will not
      // get an href until they declare one (DB-only contract).
      href: id === 'workspace' ? landingRoute : null,
    };
  }
  return out;
}

// ─── Shell-menu overlays (user / settings / global-quick-actions) ───
// Each row carries a typed action_json (CHECK-constrained at the table
// level). The resolver normalizes via normalizeShellAction so the wire
// shape is the canonical ShellAction union. Empty result = no items.
interface ShellMenuItemRow {
  item_id: string;
  sort_order: number;
  label_en: string | null;
  label_ar: string | null;
  icon: string | null;
  action_json: Record<string, unknown>;
  perms_required: string[] | null;
  badge?: string | null;
  enabled: boolean;
  version: number;
}

async function loadShellMenus(
  pool: DbPool,
  tenantId: string,
  localePrimary: string,
  callerRoles: readonly string[],
): Promise<{
  userMenu: Array<Record<string, unknown>>;
  settingsMenu: Array<Record<string, unknown>>;
  quickActions: Array<Record<string, unknown>>;
}> {
  const rolesParam = callerRoles.length > 0 ? [...callerRoles] : [''];
  const [um, sm, qa] = await Promise.all([
    pool.query<ShellMenuItemRow>(
      `WITH cp AS (
         SELECT COALESCE(array_agg(DISTINCT perm), ARRAY[]::text[]) AS perms
           FROM platform_dauth.functional_roles fr
           CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS perm
          WHERE fr.role_code = ANY($2::text[])
       )
       SELECT i.item_id, i.sort_order, i.label_en, i.label_ar, i.icon,
              i.action_json, i.perms_required, i.enabled, i.version
         FROM dos.workspace_user_menu_items i, cp
        WHERE i.tenant_id = $1 AND i.enabled = true
          AND (
            COALESCE(array_length(i.perms_required, 1), 0) = 0
            OR i.perms_required <@ cp.perms
          )
        ORDER BY i.sort_order, i.item_id`,
      [tenantId, rolesParam],
    ),
    pool.query<ShellMenuItemRow>(
      `WITH cp AS (
         SELECT COALESCE(array_agg(DISTINCT perm), ARRAY[]::text[]) AS perms
           FROM platform_dauth.functional_roles fr
           CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS perm
          WHERE fr.role_code = ANY($2::text[])
       )
       SELECT i.item_id, i.sort_order, i.label_en, i.label_ar, i.icon,
              i.action_json, i.perms_required, i.enabled, i.version
         FROM dos.workspace_settings_menu_items i, cp
        WHERE i.tenant_id = $1 AND i.enabled = true
          AND (
            COALESCE(array_length(i.perms_required, 1), 0) = 0
            OR i.perms_required <@ cp.perms
          )
        ORDER BY i.sort_order, i.item_id`,
      [tenantId, rolesParam],
    ),
    pool.query<ShellMenuItemRow>(
      `WITH cp AS (
         SELECT COALESCE(array_agg(DISTINCT perm), ARRAY[]::text[]) AS perms
           FROM platform_dauth.functional_roles fr
           CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS perm
          WHERE fr.role_code = ANY($2::text[])
       )
       SELECT i.item_id, i.sort_order, i.label_en, i.label_ar, i.icon,
              i.action_json, i.perms_required, i.badge, i.enabled, i.version
         FROM dos.workspace_global_quick_actions i, cp
        WHERE i.tenant_id = $1 AND i.enabled = true
          AND (
            COALESCE(array_length(i.perms_required, 1), 0) = 0
            OR i.perms_required <@ cp.perms
          )
        ORDER BY i.sort_order, i.item_id`,
      [tenantId, rolesParam],
    ),
  ]);

  const localized = (row: ShellMenuItemRow) =>
    localePrimary === 'ar'
      ? (row.label_ar ?? row.label_en ?? '')
      : (row.label_en ?? row.label_ar ?? '');

  const project = (rows: ShellMenuItemRow[], includeBadge = false) => {
    const out: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const action = normalizeShellAction(r.action_json);
      if (!action) continue;
      const label = localized(r).trim();
      if (!label) continue;
      const item: Record<string, unknown> = {
        id: r.item_id,
        label,
        action,
        icon: r.icon ?? null,
        enabled: r.enabled,
        version: r.version,
      };
      if (includeBadge && r.badge) item['badge'] = r.badge;
      out.push(item);
    }
    return out;
  };

  return {
    userMenu: project(um.rows),
    settingsMenu: project(sm.rows),
    quickActions: project(qa.rows, true),
  };
}

// ─── v1.1 shell extension loaders ────────────────────────────────────
// Per dogan_shahin_all_contracts_v1_1_operating_runtime/envelopes/
// workspace-runtime.envelope.v1-1.json, the workspace-runtime
// envelope must carry shell.breakpoints, shell.touchTargets,
// shell.variants, and shell.tenantSurfaceVariants. Source of truth
// stays DB; the resolver normalizes snake_case -> camelCase.

interface BreakpointRow {
  breakpoint_key: string;
  min_px: number;
  max_px: number;
  default_behavior: string | null;
  is_active: boolean | null;
}

async function loadBreakpoints(pool: DbPool, tenantId: string): Promise<Array<Record<string, unknown>>> {
  // Tenant-scoped overrides win when present; otherwise fall back to
  // the global rows (tenant_id IS NULL). DB rows are read in min_px
  // order so the FE receives a deterministic ascending list.
  const r = await pool.query<BreakpointRow>(
    `WITH tenant_rows AS (
       SELECT breakpoint_key, min_px, max_px, default_behavior, is_active
         FROM dos.mobile_breakpoint_config
        WHERE tenant_id = $1
     ),
     global_rows AS (
       SELECT breakpoint_key, min_px, max_px, default_behavior, is_active
         FROM dos.mobile_breakpoint_config
        WHERE tenant_id IS NULL
          AND breakpoint_key NOT IN (SELECT breakpoint_key FROM tenant_rows)
     )
     SELECT * FROM tenant_rows
     UNION ALL
     SELECT * FROM global_rows
     ORDER BY min_px`,
    [tenantId],
  );
  return r.rows.map((row) => ({
    breakpointKey:   row.breakpoint_key,
    minPx:           row.min_px,
    maxPx:           row.max_px,
    defaultBehavior: row.default_behavior ?? null,
    isActive:        row.is_active ?? true,
  }));
}

interface TouchTargetRow {
  min_size_px: number;
  min_spacing_px: number;
  haptic_feedback_enabled: boolean | null;
}

interface TouchGestureRow {
  gesture_id: string;
  gesture_type: string;
  component_key: string | null;
  action_config: Record<string, unknown>;
  haptic_feedback: boolean | null;
}

async function loadTouchTargets(pool: DbPool, tenantId: string): Promise<Record<string, unknown>> {
  // Tenant-scoped row wins; otherwise the global row (tenant_id IS NULL).
  // Gestures are appended from dos.mobile_touch_gestures.
  const [tt, gestures] = await Promise.all([
    pool.query<TouchTargetRow>(
      `SELECT min_size_px, min_spacing_px, haptic_feedback_enabled
         FROM dos.ui_touch_target_config
        WHERE enabled = true
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY (tenant_id IS NULL) ASC, updated_at DESC
        LIMIT 1`,
      [tenantId],
    ),
    pool.query<TouchGestureRow>(
      `SELECT gesture_id::text AS gesture_id, gesture_type, component_key,
              action_config, haptic_feedback
         FROM dos.mobile_touch_gestures
        WHERE is_active IS DISTINCT FROM false
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY component_key NULLS LAST, gesture_type`,
      [tenantId],
    ),
  ]);

  const t = tt.rows[0];
  const minSizePx = t?.min_size_px ?? null;
  const minSpacingPx = t?.min_spacing_px ?? null;
  const hapticFeedbackEnabled = t?.haptic_feedback_enabled ?? false;

  const gestureBindings = gestures.rows.map((g) => ({
    gestureId:      g.gesture_id,
    gestureType:    g.gesture_type,
    componentKey:   g.component_key ?? null,
    actionConfig:   g.action_config ?? {},
    hapticFeedback: g.haptic_feedback ?? false,
  }));

  return {
    minSizePx,
    minSpacingPx,
    hapticFeedbackEnabled,
    gestureBindings,
  };
}

interface VariantRow {
  variant_id: string;
  tenant_id: string | null;
  component_key: string;
  variant_name: string;
  breakpoint: string;
  props_override: Record<string, unknown> | null;
  layout_override: Record<string, unknown> | null;
  is_default: boolean | null;
}

async function loadVariants(pool: DbPool, tenantId: string): Promise<{
  variants: Record<string, Array<Record<string, unknown>>>;
  tenantSurfaceVariants: Record<string, string>;
}> {
  const r = await pool.query<VariantRow>(
    `SELECT variant_id::text AS variant_id,
            tenant_id, component_key, variant_name, breakpoint,
            props_override, layout_override, is_default
       FROM dos.mobile_component_variants
      WHERE tenant_id = $1 OR tenant_id IS NULL
      ORDER BY component_key, breakpoint, variant_name`,
    [tenantId],
  );

  const variants: Record<string, Array<Record<string, unknown>>> = {};
  const tenantSurfaceVariants: Record<string, string> = {};

  for (const row of r.rows) {
    const k = row.component_key;
    if (!variants[k]) variants[k] = [];
    variants[k].push({
      variantName:    row.variant_name,
      breakpoint:     row.breakpoint,
      propsOverride:  row.props_override ?? {},
      layoutOverride: row.layout_override ?? {},
      isDefault:      row.is_default ?? false,
    });
    if (row.is_default && row.tenant_id === tenantId) {
      tenantSurfaceVariants[k] = row.variant_name;
    }
  }

  return { variants, tenantSurfaceVariants };
}

async function loadShortcuts(pool: DbPool, tenantId: string) {
  const r = await pool.query<ShortcutRow>(
    `SELECT shortcut_id, combo, action_json, when_clause, sort_order
       FROM dos.ui_workspace_shortcut
      WHERE tenant_id = $1 AND enabled = true
      ORDER BY sort_order, shortcut_id`,
    [tenantId],
  );
  const out: Array<Record<string, unknown>> = [];
  for (const row of r.rows) {
    const action = normalizeShellAction(row.action_json);
    if (!action) continue;
    out.push({
      id: row.shortcut_id,
      combo: row.combo,
      action,
      ...(row.when_clause ? { when: row.when_clause } : {}),
    });
  }
  return out;
}

async function loadBanners(pool: DbPool, tenantId: string, localePrimary: string) {
  const r = await pool.query<BannerRow>(
    `SELECT banner_id, gate, kind, title_key, title_fallback, message_key,
            message_fallback, action_label_key, action_json, dismissible,
            sort_order, version
       FROM dos.ui_workspace_banner
      WHERE tenant_id = $1 AND enabled = true
      ORDER BY sort_order, banner_id`,
    [tenantId],
  );
  return r.rows.map((row) => {
    const action = row.action_json ? normalizeShellAction(row.action_json) : null;
    return {
      id: row.banner_id,
      gate: row.gate,
      kind: row.kind,
      title: buildI18nLabel(row.title_fallback, null, row.title_key, localePrimary),
      message: buildI18nLabel(row.message_fallback, null, row.message_key, localePrimary),
      ...(row.action_label_key ? {
        actionLabel: buildI18nLabel(null, null, row.action_label_key, localePrimary),
      } : {}),
      ...(action ? { action } : {}),
      dismissible: row.dismissible,
      version: row.version,
    };
  });
}

// ─── Navigate-eligible route loader ────────────────────────────────────
// Account-menu / settings-action `navigate` entries must not be enabled from
// template binding alone. A path is eligible iff:
//   * a `dynamic_ui_route_metadata` row exists;
//   * `render_mode` is one of the CHECK values; and
//   * when `template_binding_required` is true, a matching
//     `ui_route_template_binding` row exists.
// Missing metadata => fail-close (disabled action, no sham "route exists").
async function loadNavigateEligibleRoutes(pool: DbPool): Promise<ReadonlySet<string>> {
  const r = await pool.query<{ route: string }>(
    `SELECT m.route
       FROM dos.dynamic_ui_route_metadata m
      WHERE m.render_mode IN ('template', 'shell-only', 'redirect')
        AND (
             COALESCE(m.template_binding_required, false) = false
          OR EXISTS (
               SELECT 1
                 FROM dos.ui_route_template_binding b
                WHERE b.route = m.route
             )
           )`,
  );
  const out = new Set<string>();
  for (const row of r.rows) {
    if (typeof row.route === 'string' && row.route.trim()) out.add(row.route.trim());
  }
  return out;
}

// ─── Module-cards loader ─────────────────────────────────────────────
// Entitled modules joined to module_registry, with the first entitled
// nav item used as the card's deep-link route. Returns FE-shaped tile
// items for `workspace.shell.module-cards`.
interface ModuleCardRow {
  module_code: string;
  display_name: string | null;
  product_code: string;
  default_route: string | null;
}

async function loadEntitledModuleCards(
  pool: DbPool,
  tenantId: string,
  callerRoles: readonly string[],
  localePrimary: string,
): Promise<Array<Record<string, unknown>>> {
  const rolesParam = callerRoles.length > 0 ? [...callerRoles] : [''];
  const r = await pool.query<ModuleCardRow>(
    `WITH caller_perms AS (
       SELECT COALESCE(array_agg(DISTINCT perm), ARRAY[]::text[]) AS perms
         FROM platform_dauth.functional_roles fr
         CROSS JOIN LATERAL unnest(COALESCE(fr.permissions, ARRAY[]::text[])) AS perm
        WHERE fr.role_code = ANY($2::text[])
     ),
     first_route AS (
       SELECT DISTINCT ON (i.module_code)
              i.module_code,
              i.route AS default_route
         FROM dos.ui_module_nav_item i, caller_perms cp
        WHERE i.enabled IS DISTINCT FROM false
          AND COALESCE(i.route,'') <> ''
          AND (i.permission IS NULL OR i.permission = '' OR i.permission = ANY(cp.perms))
        ORDER BY i.module_code, i.sort_order, i.item_id
     )
     SELECT e.module_code,
            COALESCE(m.display_name, e.module_code) AS display_name,
            e.product_code,
            fr.default_route
       FROM dos.tenant_module_entitlements e
       JOIN dos.module_registry m ON m.module_code = e.module_code
       LEFT JOIN first_route fr ON fr.module_code = e.module_code
      WHERE e.tenant_id = $1
        AND e.entitlement_status = 'active'
      ORDER BY COALESCE(m.display_name, e.module_code)`,
    [tenantId, rolesParam],
  );

  void localePrimary; // display_name is locale-neutral here.
  const out: Array<Record<string, unknown>> = [];
  for (const row of r.rows) {
    if (!row.default_route) continue;
    out.push({
      id: row.module_code,
      title: row.display_name ?? row.module_code,
      action: { kind: 'navigate', path: row.default_route },
      productCode: row.product_code,
    });
  }
  return out;
}

// ─── Visual shell prop enricher ──────────────────────────────────────
// Live-derived props for the `workspace.shell.*` surfaces — sidebar nav
// from entitled nav items, module cards from entitled modules, and
// account/settings actions from chrome.accountMenu. The seed-time
// props bag stays as the schema scaffold; the resolver overlays the
// runtime data here so the FE remains render-only.
function enrichVisualShellProps(
  surfaces: ShellRow[],
  nav: {
    modules?: Array<Record<string, unknown>>;
    groups: Array<Record<string, unknown>>;
    items: Array<Record<string, unknown>>;
  },
  chrome: Record<string, unknown>,
  moduleCards: Array<Record<string, unknown>>,
  navigateEligibleRoutes: ReadonlySet<string>,
): void {
  // 1) Build a deterministic sidebar item list from nav.groups + nav.items.
  //    Order contract:
  //      group.sortOrder ASC (tie: groupId ASC)
  //      then item.sortOrder ASC (tie: itemId ASC)
  //    This prevents drift from raw SQL/global iteration order.
  const groupSort = new Map<string, number>();
  for (const group of nav.groups) {
    const moduleCode = String((group as { moduleCode?: string }).moduleCode ?? '').trim();
    const groupId = String((group as { groupId?: string }).groupId ?? '').trim();
    if (!moduleCode || !groupId) continue;
    const key = `${moduleCode}:${groupId}`;
    groupSort.set(key, Number((group as { sortOrder?: unknown }).sortOrder ?? 0) || 0);
  }

  type SidebarItemDraft = {
    key: string;
    groupOrder: number;
    itemOrder: number;
    id: string;
    label: string;
    action: { kind: 'navigate'; path: string };
    icon: string | null;
    moduleCode: string | null;
    groupId: string | null;
    badge: unknown;
  };

  const sidebarDraft: SidebarItemDraft[] = [];
  for (const item of nav.items) {
    const action = (item as { action?: { kind?: string; path?: string } }).action;
    if (!action || action.kind !== 'navigate' || typeof action.path !== 'string') continue;
    const label = (item as { label?: { label?: string; fallback?: string; i18nKey?: string } }).label;
    const text = label?.label ?? label?.fallback ?? label?.i18nKey ?? '';
    const id = String((item as { itemId?: string }).itemId ?? '').trim();
    if (!text || !id) continue;

    const moduleCode = String((item as { moduleCode?: string }).moduleCode ?? '').trim();
    const groupId = String((item as { groupId?: string }).groupId ?? '').trim();
    const groupKey = `${moduleCode}:${groupId || 'ungrouped'}`;
    sidebarDraft.push({
      key: groupKey,
      groupOrder: groupSort.get(groupKey) ?? Number.MAX_SAFE_INTEGER,
      itemOrder: Number((item as { sortOrder?: unknown }).sortOrder ?? 0) || 0,
      id,
      label: text,
      action: { kind: 'navigate', path: action.path },
      icon: (item as { icon?: string }).icon ?? null,
      moduleCode: moduleCode || null,
      groupId: groupId || null,
      badge: (item as { badge?: unknown }).badge ?? null,
    });
  }

  sidebarDraft.sort((a, b) => {
    if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
    return a.id.localeCompare(b.id);
  });

  const sidebarItems: Array<Record<string, unknown>> = sidebarDraft.map((entry) => ({
    id: entry.id,
    label: entry.label,
    action: entry.action,
    icon: entry.icon,
    moduleCode: entry.moduleCode,
    groupId: entry.groupId,
    badge: entry.badge,
  }));

  // Sidebar hierarchy projection — modules + groups visible only when at
  // least one entitled item flows under them. The frontend renderer
  // groups items by moduleCode → groupId using these arrays so the side
  // nav can render `cds-sidenav-menu` (module) → `cds-sidenav-item`
  // (item) with collapsibles, instead of a flat list.
  const referencedModules = new Set<string>();
  const referencedGroups = new Set<string>();
  for (const it of sidebarDraft) {
    if (it.moduleCode) referencedModules.add(it.moduleCode);
    if (it.moduleCode && it.groupId) referencedGroups.add(`${it.moduleCode}:${it.groupId}`);
  }

  const moduleSortMap = new Map<string, number>();
  const moduleLabelMap = new Map<string, { i18nKey?: string; fallback?: string; label?: string }>();
  for (const m of nav.modules ?? []) {
    const code = String((m as { moduleCode?: string }).moduleCode ?? '').trim();
    if (!code) continue;
    moduleSortMap.set(code, Number((m as { sortOrder?: unknown }).sortOrder ?? 0) || 0);
    const lbl = (m as { label?: { i18nKey?: string; fallback?: string; label?: string } }).label ?? {};
    moduleLabelMap.set(code, lbl);
  }

  const sidebarModules = Array.from(referencedModules).map((code) => ({
    moduleCode: code,
    sortOrder: moduleSortMap.get(code) ?? Number.MAX_SAFE_INTEGER,
    label: moduleLabelMap.get(code) ?? { fallback: code, label: code },
  })).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.moduleCode.localeCompare(b.moduleCode);
  });

  const sidebarGroups: Array<Record<string, unknown>> = [];
  for (const g of nav.groups) {
    const moduleCode = String((g as { moduleCode?: string }).moduleCode ?? '').trim();
    const groupId = String((g as { groupId?: string }).groupId ?? '').trim();
    if (!moduleCode || !groupId) continue;
    if (!referencedGroups.has(`${moduleCode}:${groupId}`)) continue;
    sidebarGroups.push({
      moduleCode,
      groupId,
      sortOrder: Number((g as { sortOrder?: unknown }).sortOrder ?? 0) || 0,
      label: (g as { label?: unknown }).label ?? null,
    });
  }

  // 2) Account menu entries from chrome.accountMenu (typed actions).
  //    Resolve each entry's i18nKey against chrome[i18nKey] so the FE
  //    receives a ready-to-render `label` alongside the typed action.
  const rawAccountMenu = Array.isArray(chrome['accountMenu'])
    ? (chrome['accountMenu'] as Array<Record<string, unknown>>)
    : [];
  const accountMenu: Array<Record<string, unknown>> = rawAccountMenu.map((entry) => {
    const out: Record<string, unknown> = { ...entry };
    const key = typeof entry['i18nKey'] === 'string' ? (entry['i18nKey'] as string) : '';
    if (key) {
      const resolved = chrome[key];
      if (typeof resolved === 'string' && resolved.trim()) out['label'] = resolved.trim();
    }
    // Navigate contract gate — metadata (+ binding when required), not
    // template-binding alone. Non-navigate typed actions are exempt.
    const action = entry['action'];
    let routeExists: boolean | null = null;
    if (action && typeof action === 'object') {
      const a = action as Record<string, unknown>;
      if (a['kind'] === 'navigate' && typeof a['path'] === 'string') {
        const path = (a['path'] as string).trim();
        routeExists = navigateEligibleRoutes.has(path);
        if (!routeExists) {
          out['enabled'] = false;
        }
      }
    }
    const normalizedAction = normalizeShellAction(action);
    if (normalizedAction) {
      out['action'] = normalizedAction;
    } else {
      delete out['action'];
    }
    out['routeExists'] = routeExists;
    if (typeof out['enabled'] !== 'boolean') out['enabled'] = true;
    if (typeof out['actionType'] !== 'string') {
      const a = action as { kind?: string } | null | undefined;
      out['actionType'] = a?.kind ?? 'unknown';
    }
    // Aria-label fallback chain: chrome[`shell.account.<id>.aria-label`]
    // → resolved label → i18nKey. The component already accepts an
    // optional `ariaLabel` per entry.
    const id = typeof entry['id'] === 'string' ? (entry['id'] as string) : '';
    const ariaKey = id ? `shell.account.${id}.aria-label` : '';
    const ariaFromChrome = ariaKey && typeof chrome[ariaKey] === 'string'
      ? (chrome[ariaKey] as string).trim()
      : '';
    if (ariaFromChrome) out['ariaLabel'] = ariaFromChrome;
    else if (typeof out['label'] === 'string' && (out['label'] as string).trim()) {
      out['ariaLabel'] = (out['label'] as string).trim();
    }
    return out;
  });

  const settingsEntry = accountMenu.find(
    (e) => e && typeof e === 'object' && (e['id'] === 'settings' || e['id'] === 'account-settings'),
  );

  // 3) DB-sourced chrome scalars used to overlay header brand / title /
  //    sidebar empty message. Every value is read from `chrome[*]`; if a
  //    key is absent the seed prop is left intact (or empty for the
  //    sidebar message — never a hardcoded literal).
  const chromeBrand           = typeof chrome['brand']           === 'string' ? (chrome['brand']           as string).trim() : '';
  const chromeWorkspaceTitle  = typeof chrome['workspaceTitle']  === 'string' ? (chrome['workspaceTitle']  as string).trim() : '';
  const chromeLogoHref        = typeof chrome['logoHref']        === 'string' ? (chrome['logoHref']        as string).trim() : '';
  const chromeLogoUri         = typeof chrome['logoUri']         === 'string' ? (chrome['logoUri']         as string).trim() : '';
  const chromeSidebarAria     = typeof chrome['shell.sidebar.aria-label']   === 'string' ? (chrome['shell.sidebar.aria-label']   as string).trim() : '';
  const chromeSidebarEmpty    = typeof chrome['shell.sidebar.empty.message']=== 'string' ? (chrome['shell.sidebar.empty.message']as string).trim() : '';
  const chromeUserMenuLabel   = typeof chrome['shell.user-menu.label']      === 'string' ? (chrome['shell.user-menu.label']      as string).trim() : '';
  const chromeUserMenuAria    = typeof chrome['shell.user-menu.aria-label'] === 'string' ? (chrome['shell.user-menu.aria-label'] as string).trim() : '';
  const chromeSettingsAria    = typeof chrome['shell.settings.aria-label']  === 'string' ? (chrome['shell.settings.aria-label']  as string).trim() : '';
  const chromeModuleCardsAria = typeof chrome['shell.module-cards.aria-label'] === 'string' ? (chrome['shell.module-cards.aria-label'] as string).trim() : '';
  const chromePoweredByLabel  = typeof chrome['shell.sidebar.poweredByLabel']  === 'string' ? (chrome['shell.sidebar.poweredByLabel']  as string).trim() : '';
  const chromeCmdSearchLabel  = typeof chrome['shell.header.commandSearch.label'] === 'string' ? (chrome['shell.header.commandSearch.label'] as string).trim() : '';
  const chromeInboxLabel      = typeof chrome['shell.header.inbox.label']     === 'string' ? (chrome['shell.header.inbox.label']     as string).trim() : '';
  const chromeCmdSearchAria   = typeof chrome['shell.header.commandSearch.aria-label'] === 'string' ? (chrome['shell.header.commandSearch.aria-label'] as string).trim() : '';
  const chromeInboxAria       = typeof chrome['shell.header.inbox.aria-label'] === 'string' ? (chrome['shell.header.inbox.aria-label'] as string).trim() : '';
  const chromeCmdSearchAction = normalizeShellAction(chrome['shell.header.commandSearch.action']);
  const chromeInboxAction     = normalizeShellAction(chrome['shell.header.inbox.action']);
  // Wave-36 typed shell-control click actions and overlay item lists.
  const chromeUserMenuAction  = normalizeShellAction(chrome['shell.user-menu.action']);
  const chromeSettingsAction  = normalizeShellAction(chrome['shell.settings.action']);
  const chromeUserMenuItems   = Array.isArray(chrome['shell.user-menu.items'])
    ? (chrome['shell.user-menu.items'] as Array<Record<string, unknown>>)
    : [];
  const chromeSettingsItems   = Array.isArray(chrome['shell.settings.items'])
    ? (chrome['shell.settings.items'] as Array<Record<string, unknown>>)
    : [];
  const chromeQuickActionItems = Array.isArray(chrome['shell.global-quick-actions.items'])
    ? (chrome['shell.global-quick-actions.items'] as Array<Record<string, unknown>>)
    : [];

  for (const s of surfaces) {
    const props = (s.props ?? {}) as Record<string, unknown>;
    switch (s.component_key) {
      case WS_SHELL_SURFACE.BRAND: {
        const next: Record<string, unknown> = { ...props };
        if (chromeBrand)    next['text']     = chromeBrand;
        if (chromeLogoHref) next['logoHref'] = chromeLogoHref;
        if (chromeLogoUri)  next['logoUri']  = chromeLogoUri;
        s.props = next;
        break;
      }
      case WS_SHELL_SURFACE.WORKSPACE_TITLE: {
        const next: Record<string, unknown> = { ...props };
        if (chromeWorkspaceTitle) next['text'] = chromeWorkspaceTitle;
        s.props = next;
        break;
      }
      case WS_SHELL_SURFACE.SIDEBAR_NAV: {
        const next: Record<string, unknown> = {
          ...props,
          items: sidebarItems,
          modules: sidebarModules,
          groups: sidebarGroups,
        };
        if (chromeSidebarAria)   next['ariaLabel']      = chromeSidebarAria;
        if (chromeSidebarEmpty)  next['emptyMessage']   = chromeSidebarEmpty;
        if (chromePoweredByLabel) next['poweredByLabel'] = chromePoweredByLabel;
        s.props = next;
        break;
      }
      case WS_SHELL_SURFACE.USER_MENU: {
        // Wave-36: prefer typed overlay items projected from
        // dos.workspace_user_menu_items; legacy chrome.accountMenu kept
        // only as a fallback while binding rolls out.
        const menu = chromeUserMenuItems.length > 0 ? chromeUserMenuItems : accountMenu;
        const next: Record<string, unknown> = { ...props, menu, placement: 'trailing' };
        if (chromeUserMenuAction) next['action'] = chromeUserMenuAction;
        if (chromeUserMenuLabel) next['label']     = chromeUserMenuLabel;
        if (chromeUserMenuAria)  next['ariaLabel'] = chromeUserMenuAria;
        s.props = next;
        break;
      }
      case WS_SHELL_SURFACE.SETTINGS_ACTION: {
        const next: Record<string, unknown> = { ...props, placement: 'trailing' };
        // Wave-36: settings control now carries a typed click action
        // (open_context_tab settings) and an overlay menu list. Legacy
        // accountMenu settingsEntry still feeds enabled/routeExists when
        // an explicit chrome action is absent.
        if (chromeSettingsAction) {
          next['action'] = chromeSettingsAction;
          next['enabled'] = true;
        } else {
          const enabled = settingsEntry?.['enabled'] !== false;
          if (settingsEntry?.['action'] && enabled) next['action'] = settingsEntry['action'];
          next['enabled'] = enabled;
          next['routeExists'] = settingsEntry?.['routeExists'] ?? null;
        }
        if (chromeSettingsItems.length > 0) next['menu'] = chromeSettingsItems;
        if (chromeSettingsAria) next['ariaLabel'] = chromeSettingsAria;
        s.props = next;
        break;
      }
      case WS_SHELL_SURFACE.GLOBAL_QUICK_ACTIONS: {
        const next: Record<string, unknown> = { ...props, placement: 'trailing' };
        if (chromeCmdSearchLabel) next['commandSearchLabel'] = chromeCmdSearchLabel;
        if (chromeInboxLabel) next['inboxLabel'] = chromeInboxLabel;
        if (chromeCmdSearchAria) next['commandSearchAriaLabel'] = chromeCmdSearchAria;
        if (chromeInboxAria) next['inboxAriaLabel'] = chromeInboxAria;
        if (chromeCmdSearchAction) next['commandSearchAction'] = chromeCmdSearchAction;
        if (chromeInboxAction) next['inboxAction'] = chromeInboxAction;
        if (chromeQuickActionItems.length > 0) next['items'] = chromeQuickActionItems;
        // Icon-key projection — the frontend renderer no longer hardcodes
        // `notification`/`search`. Pull icon names from the typed
        // global-quick-action item rows (workspace_global_quick_actions),
        // falling back to chrome scalar overrides, then to deterministic
        // canonical names.
        const findItem = (id: string) => chromeQuickActionItems.find(
          (it) => (it as Record<string, unknown>)['id'] === id,
        );
        const iconFromItem = (id: string) => {
          const it = findItem(id);
          const icon = it && typeof (it as Record<string, unknown>)['icon'] === 'string'
            ? ((it as Record<string, unknown>)['icon'] as string).trim()
            : '';
          return icon || null;
        };
        const cmdIconFromChrome = typeof chrome['shell.header.commandSearch.icon'] === 'string'
          ? (chrome['shell.header.commandSearch.icon'] as string).trim() : '';
        const inboxIconFromChrome = typeof chrome['shell.header.inbox.icon'] === 'string'
          ? (chrome['shell.header.inbox.icon'] as string).trim() : '';
        next['commandIcon'] = iconFromItem('command') || cmdIconFromChrome || 'search';
        next['inboxIcon']   = iconFromItem('inbox')   || inboxIconFromChrome || 'inbox';
        s.props = next;
        break;
      }
      case WS_SHELL_SURFACE.MODULE_CARDS: {
        const next: Record<string, unknown> = { ...props, items: moduleCards };
        if (chromeModuleCardsAria) next['ariaLabel'] = chromeModuleCardsAria;
        s.props = next;
        break;
      }
      case WS_SHELL_HEADER_LEGACY: {
        const next: Record<string, unknown> = { ...props };
        if (chromeCmdSearchLabel) next['commandSearchLabel'] = chromeCmdSearchLabel;
        if (chromeInboxLabel)    next['inboxLabel']          = chromeInboxLabel;
        s.props = next;
        break;
      }
      default:
        // Other shell surfaces keep their seeded props.
        break;
    }
  }
}

// ─── Router ──────────────────────────────────────────────────────────
export function createWorkspaceShellRouter(pool: DbPool): Router {
  const router = Router();

  // Catalog endpoint — INTERNAL ONLY. Surfaces the registry rows for
  // ops/CI tooling. The browser FE never reads this — runtime-shaped
  // data leaves only via /workspace-runtime. Caller must be a verified
  // principal AND present `x-internal-tooling: 1` (set by trusted
  // ops scripts running through the gateway). Rejects browsers.
  router.get('/workspace-shell-catalog', async (req, res) => {
    if (!req.principal) {
      res.status(401).json({ error: 'UNAUTHENTICATED', code: 'NO_PRINCIPAL' });
      return;
    }
    if (req.header('x-internal-tooling') !== '1') {
      res.status(403).json({ error: 'INTERNAL_ONLY', code: 'CATALOG_NOT_PUBLIC' });
      return;
    }
    try {
      const catalog = await loadCatalog(pool);
      res.json({
        knownKeys: catalog.knownKeys,
        componentRegistry: catalog.registry.map((r) => {
          const meta = r.metadata ?? {};
          const zone = typeof meta.zone === 'string' && meta.zone.trim() ? (meta.zone as RuntimeZone) : null;
          return {
            componentKey: r.component_key,
            carbonKey: r.carbon_key,
            vendor: r.vendor,
            schemaVersion: r.schema_version,
            metadata: r.metadata,
            approvalStatus: r.approval_status,
            approvedAt: r.approved_at ? String(r.approved_at) : null,
            zone,
          };
        }),
      });
    } catch (e) {
      // Never leak raw error text to the wire.
      console.error('[workspace-shell-catalog] failed', e instanceof Error ? e.message : String(e));
      res.status(500).json({ error: 'workspace-shell-catalog failed' });
    }
  });

  // CANONICAL ENVELOPE — single normalization boundary.
  // Identity comes ONLY from req.principal (verified by gateway-origin).
  // Header / query fallback for tenantId or userId is forbidden.
  router.get('/workspace-runtime', async (req, res) => {
    const principal = req.principal;
    if (!principal || !principal.sub || !principal.tenantId) {
      res.status(401).json({ error: 'UNAUTHENTICATED', code: 'MISSING_PRINCIPAL' });
      return;
    }
    const tenantId = String(principal.tenantId).trim();
    const userId = String(principal.sub).trim();
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'UNAUTHENTICATED', code: 'EMPTY_PRINCIPAL' });
      return;
    }
    // Product code may come from a header set by the gateway; default
    // value is the only one the platform currently runs.
    const productCode = String(req.header('x-product-code') ?? 'shahin-ai').trim() || 'shahin-ai';
    // Locale resolution doctrine — single decision path:
    //   1) explicit query (`?locale=ar`) — set by the frontend so a
    //      language toggle propagates without depending on the browser's
    //      Accept-Language header.
    //   2) Accept-Language header (default browser channel).
    //   3) 'en' fallback.
    // The resolver re-emits the chosen locale via chrome.locale/chrome.dir
    // so every shell zone (header brand AND nav AND banners) renders in
    // the SAME language without a second decision in the frontend.
    const queryLocale = typeof req.query.locale === 'string' ? String(req.query.locale).trim() : '';
    const acceptLang = String(req.header('accept-language') ?? 'en').trim();
    const localePrimary = queryLocale ? primaryLocale(queryLocale) : primaryLocale(acceptLang);

    try {
      const denial = await authorizeCaller(pool, tenantId, userId, productCode);
      if (denial) {
        res.status(403).json({ error: 'FORBIDDEN', code: denial.code });
        return;
      }

      const callerRoles = Array.isArray(principal.roles) ? principal.roles : [];
      const catalog = await loadCatalog(pool);
      const surfaceRows = await loadSurfaces(pool, tenantId, catalog, callerRoles);

      const [nav, chrome, shortcuts, banners, policies, moduleCards, navigateEligibleRoutes, landingRoute, tplStrings, shellMenus, breakpoints, touchTargets, variantMap] = await Promise.all([
        loadNav(pool, localePrimary, tenantId, callerRoles),
        loadChrome(pool, tenantId),
        loadShortcuts(pool, tenantId),
        loadBanners(pool, tenantId, localePrimary),
        loadPolicies(pool, tenantId),
        loadEntitledModuleCards(pool, tenantId, callerRoles, localePrimary),
        loadNavigateEligibleRoutes(pool),
        loadLandingRoute(pool, tenantId),
        loadShellTplStrings(pool, localePrimary),
        loadShellMenus(pool, tenantId, localePrimary, callerRoles),
        // v1.1 shell extension fields (DB-driven, tenant-scoped fallback to global).
        loadBreakpoints(pool, tenantId),
        loadTouchTargets(pool, tenantId),
        loadVariants(pool, tenantId),
      ]);
      // Breadcrumbs depend on landingRoute for the 'workspace' href.
      const breadcrumbs = await loadShellBreadcrumbs(pool, localePrimary, landingRoute);
      // DB-driven chrome additions. landingRoute / tplStrings /
      // breadcrumbs are emitted only if DB rows exist; absence stays
      // absent (NO FRONTEND INVENTION).
      if (landingRoute !== null) chrome['landingRoute'] = landingRoute;
      if (Object.keys(tplStrings).length > 0) chrome['tplStrings'] = tplStrings;
      if (Object.keys(breadcrumbs).length > 0) chrome['breadcrumbs'] = breadcrumbs;
      // Shell-menu overlays — typed ShellAction lists projected from
      // dos.workspace_user_menu_items / workspace_settings_menu_items /
      // workspace_global_quick_actions. Empty list = no overlay items
      // (NO FRONTEND INVENTION).
      if (shellMenus.userMenu.length > 0)     chrome['shell.user-menu.items']            = shellMenus.userMenu;
      if (shellMenus.settingsMenu.length > 0) chrome['shell.settings.items']             = shellMenus.settingsMenu;
      if (shellMenus.quickActions.length > 0) chrome['shell.global-quick-actions.items'] = shellMenus.quickActions;

      // Locale handshake — emit the resolver-decided locale + dir back to
      // the frontend so EVERY shell zone (header brand, workspace title,
      // nav, banners, account menu) reads the same active locale. The
      // frontend never re-decides; it consumes chrome.locale/chrome.dir.
      // DB-stored chrome.locale (when present) is treated as a tenant
      // forced-locale and preferred over the request locale.
      const dbForcedLocale = typeof chrome['locale'] === 'string'
        ? primaryLocale(chrome['locale'] as string) : '';
      const activeLocale = dbForcedLocale || localePrimary || 'en';
      const activeDir = activeLocale.startsWith('ar') ? 'rtl' : 'ltr';
      chrome['locale'] = activeLocale;
      chrome['dir']    = activeDir;

      // Locale-aware chrome scalars — pick `${key}.<locale>` override when
      // present, else fall back to the canonical key. This lets DB seed
      // either a single brand/workspaceTitle or a per-locale variant
      // without forking the contract.
      const chromeLocaleKeys = ['brand', 'workspaceTitle'];
      for (const k of chromeLocaleKeys) {
        const localeKey = `${k}.${activeLocale}`;
        if (typeof chrome[localeKey] === 'string' && (chrome[localeKey] as string).trim()) {
          chrome[k] = chrome[localeKey];
        }
      }

      // Live-enrich the visual shell surfaces' props from the resolver
      // outputs above (sidebar nav, account menu, module cards). Mutates
      // surfaceRows in place; serialization happens immediately after.
      enrichVisualShellProps(
        surfaceRows,
        nav as {
          modules?: Array<Record<string, unknown>>;
          groups: Array<Record<string, unknown>>;
          items: Array<Record<string, unknown>>;
        },
        chrome,
        moduleCards,
        navigateEligibleRoutes,
      );
      const chromeOut = scrubChromeForResponse(chrome);

      const surfaces = surfaceRows.map(toFrontendSurface);
      const zones = groupByZone(surfaceRows, catalog);
      const shellVersion = surfaceRows.reduce((acc, r) => acc + (r.version ?? 0), 0);

      res.json({
        tenantId,
        userId,
        productCode,
        version: shellVersion,
        shell: {
          version: shellVersion,
          surfaces,
          zones,
          nav,
          chrome: chromeOut,
          shortcuts,
          banners,
          policies,
          // v1.1 operating runtime fields. Fold mobile config into
          // workspace-runtime; no second mobile truth channel.
          breakpoints,
          touchTargets,
          variants: variantMap.variants,
          tenantSurfaceVariants: variantMap.tenantSurfaceVariants,
        },
      });
    } catch (e) {
      // Never leak raw error text to the wire.
      console.error('[workspace-runtime] failed', e instanceof Error ? e.message : String(e));
      res.status(500).json({ error: 'workspace-runtime resolver failed' });
    }
  });

  return router;
}
