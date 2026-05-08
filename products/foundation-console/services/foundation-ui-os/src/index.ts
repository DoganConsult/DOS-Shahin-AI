// foundation-ui-os — workspace runtime resolver. Reads fc_ui_os.* only.
// Doctrine: camelCase only on the wire. Zero legacy normalization. Zero fallback.
// Empty DB rows produce a valid-shaped runtime payload with empty arrays/objects.
import express, { type Request, type Response } from 'express';
import { loadFcConfig } from '@fc/config';
import { createLogger } from '@fc/logger';
import { createPool, pingDb, ensureSchemas, type FcPool } from '@fc/db';
import type {
  FcWorkspaceRuntime,
  FcWorkspaceSurface,
  FcNavGroup,
  FcNavItem,
  FcShellAction,
  FcI18nLabel,
  FcPageRuntime,
  FcPageDiagnostic,
} from '@fc/ui-contracts';

const cfg = loadFcConfig();
const log = createLogger({ service: 'foundation-ui-os' });
const pool = createPool(cfg);
const app = express();
app.disable('x-powered-by');

// ── Health / readiness ──────────────────────────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'foundation-ui-os' });
});
app.get('/readyz', async (_req, res) => {
  const ping = await pingDb(pool);
  if (!ping.ok) return res.status(503).json({ status: 'down', reason: 'db unreachable' });
  res.json({ status: 'ready', service: 'foundation-ui-os', db: ping.serverVersion });
});

// ── Helpers (resolver-internal only; nothing leaks raw to clients) ─
function buildLabel(i18nKey: string | null, fallback: string | null): FcI18nLabel {
  const out: FcI18nLabel = {};
  if (i18nKey)  (out as { i18nKey?: string }).i18nKey = i18nKey;
  if (fallback) (out as { fallback?: string }).fallback = fallback;
  return Object.freeze(out);
}

const ALLOWED_ACTION_KINDS = new Set<FcShellAction['kind']>([
  'navigate',
  'open_external',
  'toggle_language',
  'toggle_theme',
  'open_context_tab',
  'open_command',
  'close_overlay',
  'clear_error',
  'dispatch_event',
]);

function normalizeAction(raw: unknown): FcShellAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const kind = r['kind'];
  if (typeof kind !== 'string' || !ALLOWED_ACTION_KINDS.has(kind as FcShellAction['kind'])) {
    return null;
  }
  switch (kind) {
    case 'navigate':
      return typeof r['path'] === 'string' ? { kind, path: r['path'] } : null;
    case 'open_external':
      return typeof r['url'] === 'string' ? { kind, url: r['url'] } : null;
    case 'open_context_tab':
      return typeof r['tab'] === 'string' ? { kind, tab: r['tab'] } : null;
    case 'dispatch_event': {
      const eventName = r['eventName'];
      if (typeof eventName !== 'string') return null;
      const payload = r['payload'];
      const out: Extract<FcShellAction, { kind: 'dispatch_event' }> =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? { kind, eventName, payload: payload as Record<string, unknown> }
          : { kind, eventName };
      return out;
    }
    case 'toggle_language':
    case 'toggle_theme':
    case 'open_command':
    case 'close_overlay':
    case 'clear_error':
      return { kind };
  }
  return null;
}

// Strip snake_case + forbidden legacy keys from props before emitting.
// fc-doctrine-allow: this Set is the ENFORCER blocklist (not a usage of the legacy field).
const FORBIDDEN_PROP_KEYS = new Set<string>([
  'labelKey',         // fc-doctrine-allow
  'labelEn',          // fc-doctrine-allow
  'labelAr',          // fc-doctrine-allow
  'detailRoute',      // fc-doctrine-allow
  'evidenceUri',      // fc-doctrine-allow
  'chromeStrings',    // fc-doctrine-allow
  'accountMenu',
  'route',
]);
function sanitizeProps(raw: unknown): Record<string, unknown> {
  const clean = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clean);
    if (!v || typeof v !== 'object') return v;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k.includes('_')) continue;
      if (FORBIDDEN_PROP_KEYS.has(k)) continue;
      out[k] = clean(val);
    }
    return out;
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return clean(raw) as Record<string, unknown>;
}

interface SurfaceRow {
  surface_id: string;
  slot_key: string;
  zone: string;
  position: number;
  enabled: boolean;
  version: number;
  component_key: string;
  component_type: string | null;
  renderer_key: string | null;
  carbon_key: string | null;
  perms_required: string[];
  props: unknown;
}
interface NavGroupRow {
  id: string;
  position: number;
  icon: string | null;
  label_i18n_key: string | null;
  label_fallback: string | null;
}
interface NavItemRow {
  id: string;
  group_id: string | null;
  position: number;
  icon: string | null;
  label_i18n_key: string | null;
  label_fallback: string | null;
  action: unknown;
  perms_required: string[];
}

async function loadRuntime(
  pool: FcPool,
  tenantId: string,
  productCode: string,
): Promise<{
  surfaces: FcWorkspaceSurface[];
  groups: FcNavGroup[];
  items: FcNavItem[];
  diagnostics: { droppedItemActions: number };
}> {
  const [bRes, gRes, iRes] = await Promise.all([
    pool.query<SurfaceRow>(
      `SELECT surface_id, slot_key, zone, position, enabled, version,
              component_key, component_type, renderer_key, carbon_key,
              perms_required, props
       FROM fc_ui_os.workspace_shell_binding
       WHERE tenant_id = $1 AND product_code = $2 AND enabled = true
       ORDER BY zone ASC, position ASC, surface_id ASC`,
      [tenantId, productCode],
    ),
    pool.query<NavGroupRow>(
      `SELECT id, position, icon, label_i18n_key, label_fallback
       FROM fc_ui_os.shell_nav_groups
       WHERE tenant_id = $1 AND product_code = $2
       ORDER BY position ASC, id ASC`,
      [tenantId, productCode],
    ),
    pool.query<NavItemRow>(
      `SELECT id, group_id, position, icon, label_i18n_key, label_fallback,
              action, perms_required
       FROM fc_ui_os.shell_nav_items
       WHERE tenant_id = $1 AND product_code = $2
       ORDER BY position ASC, id ASC`,
      [tenantId, productCode],
    ),
  ]);

  const surfaces: FcWorkspaceSurface[] = bRes.rows.map((r) =>
    Object.freeze({
      surfaceId: r.surface_id,
      slotKey: r.slot_key,
      zone: r.zone,
      position: r.position,
      enabled: r.enabled,
      version: r.version,
      componentKey: r.component_key,
      componentType: r.component_type,
      rendererKey: r.renderer_key,
      carbonKey: r.carbon_key,
      permsRequired: Object.freeze([...(r.perms_required ?? [])]),
      props: sanitizeProps(r.props),
    }),
  );

  const groups: FcNavGroup[] = gRes.rows.map((r) => {
    const base: FcNavGroup = {
      id: r.id,
      label: buildLabel(r.label_i18n_key, r.label_fallback),
      position: r.position,
    };
    return r.icon ? Object.freeze({ ...base, icon: r.icon }) : Object.freeze(base);
  });

  let droppedItemActions = 0;
  const items: FcNavItem[] = [];
  for (const r of iRes.rows) {
    const action = normalizeAction(r.action);
    if (!action) {
      droppedItemActions += 1;
      log.warn({ itemId: r.id }, 'nav item dropped: invalid action shape');
      continue;
    }
    const base: FcNavItem = {
      id: r.id,
      label: buildLabel(r.label_i18n_key, r.label_fallback),
      action,
      position: r.position,
      permsRequired: Object.freeze([...(r.perms_required ?? [])]),
    };
    const withGroup = r.group_id ? { ...base, groupId: r.group_id } : base;
    const withIcon = r.icon ? { ...withGroup, icon: r.icon } : withGroup;
    items.push(Object.freeze(withIcon));
  }

  return { surfaces, groups, items, diagnostics: { droppedItemActions } };
}

// F11: parse session perms passed by gateway. Empty string = zero perms.
function parseSessionPerms(req: Request): ReadonlySet<string> {
  const raw = (req.header('x-fc-perms') ?? '').trim();
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0));
}
// All required perms must be held by session. Empty perms_required = always allowed.
function hasAllPerms(required: readonly string[], held: ReadonlySet<string>): boolean {
  if (!required || required.length === 0) return true;
  for (const p of required) if (!held.has(p)) return false;
  return true;
}

// ── /workspace-runtime ──────────────────────────────────────────────
app.get('/workspace-runtime', async (req: Request, res: Response) => {
  const tenantId    = (req.header('x-fc-tenant-id')    ?? '').trim();
  const userId      = (req.header('x-fc-user-id')      ?? '').trim();
  const productCode = (req.header('x-fc-product-code') ?? 'foundation-console').trim();
  const sessionPerms = parseSessionPerms(req);

  const t0 = Date.now();
  try {
    const { surfaces: rawSurfaces, groups: rawGroups, items: rawItems, diagnostics } =
      await loadRuntime(pool, tenantId, productCode);

    // F11: permission filtering. Empty perms_required = always allowed.
    const surfaces = rawSurfaces.filter((s) => hasAllPerms(s.permsRequired, sessionPerms));
    const items    = rawItems.filter((i)    => hasAllPerms(i.permsRequired, sessionPerms));
    const usedGroupIds = new Set<string>();
    for (const it of items) if (it.groupId) usedGroupIds.add(it.groupId);
    const groups   = rawGroups.filter((g) => usedGroupIds.has(g.id));
    const droppedSurfaces = rawSurfaces.length - surfaces.length;
    const droppedItems    = rawItems.length    - items.length;
    const droppedGroups   = rawGroups.length   - groups.length;

    const zones: Record<string, string[]> = {};
    for (const s of surfaces) {
      const list = zones[s.zone] ?? (zones[s.zone] = []);
      list.push(s.surfaceId);
    }

    const version = surfaces.reduce((m, s) => (s.version > m ? s.version : m), 0);

    const payload: FcWorkspaceRuntime = Object.freeze({
      tenantId,
      userId,
      productCode,
      version,
      shell: Object.freeze({
        version,
        surfaces: Object.freeze(surfaces),
        zones: Object.freeze(
          Object.fromEntries(Object.entries(zones).map(([k, v]) => [k, Object.freeze(v)])),
        ),
        nav: Object.freeze({
          groups: Object.freeze(groups),
          items: Object.freeze(items),
        }),
        chrome: Object.freeze({}),
        shortcuts: Object.freeze([]),
        banners: Object.freeze([]),
        policies: Object.freeze({}),
      }),
    });

    res.set('x-fc-resolver-ms', String(Date.now() - t0));
    res.set('x-fc-resolver-dropped-actions', String(diagnostics.droppedItemActions));
    res.set('x-fc-resolver-dropped-surfaces-perm', String(droppedSurfaces));
    res.set('x-fc-resolver-dropped-items-perm',    String(droppedItems));
    res.set('x-fc-resolver-dropped-groups-empty',  String(droppedGroups));
    res.json(payload);
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'workspace-runtime failed');
    res.status(500).json({ error: 'workspace_runtime_failed' });
  }
});

// ── /page-runtime ───────────────────────────────────────────────────
interface PageRow {
  id: string;
  path: string;
  title_i18n_key: string | null;
  title_fallback: string | null;
  perms_required: string[];
  enabled: boolean;
  version: number;
}
interface PageSurfaceRow {
  surface_id: string;
  slot_key: string;
  position: number;
  enabled: boolean;
  version: number;
  component_key: string;
  component_type: string | null;
  renderer_key: string | null;
  carbon_key: string | null;
  perms_required: string[];
  props: unknown;
}

function isValidPath(p: string): boolean {
  return typeof p === 'string' && p.length > 0 && p.length <= 1024 && p.startsWith('/');
}

app.get('/page-runtime', async (req: Request, res: Response) => {
  const tenantId    = (req.header('x-fc-tenant-id')    ?? '').trim();
  const userId      = (req.header('x-fc-user-id')      ?? '').trim();
  const productCode = (req.header('x-fc-product-code') ?? 'foundation-console').trim();
  const sessionPerms = parseSessionPerms(req);
  const rawPath     = typeof req.query['path'] === 'string' ? req.query['path'] : '';
  const path        = rawPath.trim();

  const t0 = Date.now();
  const diagnostics: FcPageDiagnostic[] = [];

  if (!isValidPath(path)) {
    const payload: FcPageRuntime = Object.freeze({
      tenantId,
      userId,
      productCode,
      path,
      pageId: null,
      version: 0,
      title: Object.freeze({}) as FcI18nLabel,
      permsRequired: Object.freeze([]),
      surfaces: Object.freeze([]),
      diagnostics: Object.freeze([{ kind: 'invalid_path', path } as const]),
    });
    res.set('x-fc-resolver-ms', String(Date.now() - t0));
    res.json(payload);
    return;
  }

  try {
    const pRes = await pool.query<PageRow>(
      `SELECT id, path, title_i18n_key, title_fallback, perms_required, enabled, version
         FROM fc_ui_os.pages
        WHERE tenant_id = $1 AND product_code = $2 AND path = $3
        LIMIT 1`,
      [tenantId, productCode, path],
    );

    if ((pRes.rowCount ?? 0) === 0) {
      const payload: FcPageRuntime = Object.freeze({
        tenantId,
        userId,
        productCode,
        path,
        pageId: null,
        version: 0,
        title: Object.freeze({}) as FcI18nLabel,
        permsRequired: Object.freeze([]),
        surfaces: Object.freeze([]),
        diagnostics: Object.freeze([{ kind: 'page_not_found', path } as const]),
      });
      res.set('x-fc-resolver-ms', String(Date.now() - t0));
      res.json(payload);
      return;
    }

    const page = pRes.rows[0]!;

    // F11: page-level permission guard. Insufficient perms => controlled disabled diagnostic, not data.
    if (!hasAllPerms(page.perms_required ?? [], sessionPerms)) {
      const payload: FcPageRuntime = Object.freeze({
        tenantId,
        userId,
        productCode,
        path,
        pageId: page.id,
        version: page.version,
        title: buildLabel(page.title_i18n_key, page.title_fallback),
        permsRequired: Object.freeze([...(page.perms_required ?? [])]),
        surfaces: Object.freeze([]),
        diagnostics: Object.freeze([{ kind: 'page_disabled', path, pageId: page.id } as const]),
      });
      res.set('x-fc-resolver-ms', String(Date.now() - t0));
      res.set('x-fc-resolver-perm-denied', '1');
      res.json(payload);
      return;
    }

    if (!page.enabled) {
      const payload: FcPageRuntime = Object.freeze({
        tenantId,
        userId,
        productCode,
        path,
        pageId: page.id,
        version: page.version,
        title: buildLabel(page.title_i18n_key, page.title_fallback),
        permsRequired: Object.freeze([...(page.perms_required ?? [])]),
        surfaces: Object.freeze([]),
        diagnostics: Object.freeze([{ kind: 'page_disabled', path, pageId: page.id } as const]),
      });
      res.set('x-fc-resolver-ms', String(Date.now() - t0));
      res.json(payload);
      return;
    }

    const sRes = await pool.query<PageSurfaceRow>(
      `SELECT surface_id, slot_key, position, enabled, version,
              component_key, component_type, renderer_key, carbon_key,
              perms_required, props
         FROM fc_ui_os.page_surfaces
        WHERE tenant_id = $1 AND product_code = $2 AND page_id = $3 AND enabled = true
        ORDER BY position ASC, surface_id ASC`,
      [tenantId, productCode, page.id],
    );

    const rawSurfaces: FcWorkspaceSurface[] = sRes.rows.map((r) =>
      Object.freeze({
        surfaceId: r.surface_id,
        slotKey: r.slot_key,
        zone: 'page.main',
        position: r.position,
        enabled: r.enabled,
        version: r.version,
        componentKey: r.component_key,
        componentType: r.component_type,
        rendererKey: r.renderer_key,
        carbonKey: r.carbon_key,
        permsRequired: Object.freeze([...(r.perms_required ?? [])]),
        props: sanitizeProps(r.props),
      }),
    );
    // F11: per-surface permission filter.
    const surfaces = rawSurfaces.filter((s) => hasAllPerms(s.permsRequired, sessionPerms));
    const droppedSurfacesPerm = rawSurfaces.length - surfaces.length;

    if (surfaces.length === 0) {
      diagnostics.push({ kind: 'page_empty', path, pageId: page.id });
    }

    const payload: FcPageRuntime = Object.freeze({
      tenantId,
      userId,
      productCode,
      path,
      pageId: page.id,
      version: page.version,
      title: buildLabel(page.title_i18n_key, page.title_fallback),
      permsRequired: Object.freeze([...(page.perms_required ?? [])]),
      surfaces: Object.freeze(surfaces),
      diagnostics: Object.freeze(diagnostics),
    });

    res.set('x-fc-resolver-ms', String(Date.now() - t0));
    res.set('x-fc-resolver-dropped-surfaces-perm', String(droppedSurfacesPerm));
    res.json(payload);
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'page-runtime failed');
    res.status(500).json({ error: 'page_runtime_failed' });
  }
});

(async () => {
  await ensureSchemas(pool, ['fc_ui_os']);
  app.listen(cfg.uiOs.port, () => {
    log.info({ port: cfg.uiOs.port }, 'foundation-ui-os listening');
  });
})().catch((e) => {
  log.error({ err: e instanceof Error ? e.message : String(e) }, 'boot failed');
  process.exit(1);
});
