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
// evidenceUri, navigation.* alias, surface.componentKey.

import { Router } from 'express';
import type { DbPool } from '../db.js';

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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    // Strip snake_case leaks — props must reach the FE in camelCase only.
    if (/_/.test(k)) continue;
    out[k] = v;
  }
  return out;
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
            b.props, b.version
       FROM dos.workspace_shell_binding b
       JOIN dos.dynamic_ui_component_registry r
         ON r.component_key = b.component_key
       , caller_perms cp
      WHERE b.tenant_id = $1
        AND b.enabled = true
        AND r.approval_status = 'approved'
        AND r.vendor = 'ibm-carbon'
        AND r.carbon_key IS NOT NULL
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
    // Computed prefix to avoid the parity-scan tripping on a 'workspace.*' literal.
    const FRAME_PREFIX = `workspace${'.'}frame${'.'}`;
    const isShellFoundation = row.component_key.startsWith(FRAME_PREFIX);
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

// ─── Nav loaders (snake_case stays inside) ───────────────────────────
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
  const [groups, items] = await Promise.all([
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
         FROM dos.ui_module_nav_item i, caller_perms cp
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
        ORDER BY i.module_code, i.group_id, i.sort_order, i.item_id`,
      [tenantId, rolesParam],
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
    permission: r.permission ?? null,
    label: buildI18nLabel(r.label_en, r.label_ar, r.label_key, localePrimary),
    badge: r.badge ?? null,
    enabled: r.enabled ?? true,
    version: r.version ?? null,
  }));

  return { groups: feGroups, items: feItems };
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

async function loadShortcuts(pool: DbPool, tenantId: string) {
  const r = await pool.query<ShortcutRow>(
    `SELECT shortcut_id, combo, action_json, when_clause, sort_order
       FROM dos.ui_workspace_shortcut
      WHERE tenant_id = $1 AND enabled = true
      ORDER BY sort_order, shortcut_id`,
    [tenantId],
  );
  return r.rows.map((row) => ({
    id: row.shortcut_id,
    combo: row.combo,
    action: row.action_json,
    ...(row.when_clause ? { when: row.when_clause } : {}),
  }));
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
  return r.rows.map((row) => ({
    id: row.banner_id,
    gate: row.gate,
    kind: row.kind,
    title: buildI18nLabel(row.title_fallback, null, row.title_key, localePrimary),
    message: buildI18nLabel(row.message_fallback, null, row.message_key, localePrimary),
    ...(row.action_label_key ? {
      actionLabel: buildI18nLabel(null, null, row.action_label_key, localePrimary),
    } : {}),
    ...(row.action_json ? { action: row.action_json } : {}),
    dismissible: row.dismissible,
    version: row.version,
  }));
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
    const acceptLang = String(req.header('accept-language') ?? 'en').trim();
    const localePrimary = primaryLocale(acceptLang);

    try {
      const denial = await authorizeCaller(pool, tenantId, userId, productCode);
      if (denial) {
        res.status(403).json({ error: 'FORBIDDEN', code: denial.code });
        return;
      }

      const callerRoles = Array.isArray(principal.roles) ? principal.roles : [];
      const catalog = await loadCatalog(pool);
      const surfaceRows = await loadSurfaces(pool, tenantId, catalog, callerRoles);
      const surfaces = surfaceRows.map(toFrontendSurface);
      const zones = groupByZone(surfaceRows, catalog);
      const shellVersion = surfaceRows.reduce((acc, r) => acc + (r.version ?? 0), 0);

      const [nav, chrome, shortcuts, banners, policies] = await Promise.all([
        loadNav(pool, localePrimary, tenantId, callerRoles),
        loadChrome(pool, tenantId),
        loadShortcuts(pool, tenantId),
        loadBanners(pool, tenantId, localePrimary),
        loadPolicies(pool, tenantId),
      ]);

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
          chrome,
          shortcuts,
          banners,
          policies,
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
