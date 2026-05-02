import type { DbPool } from '../db.js';

export interface BootstrapRequest {
  tenantId: string;
  userId: string;
  productCode?: string | null;
  workspaceKey?: string;
}

export interface BootstrapModule {
  module_code: string;
  display_name: string;
  default_route: string;
  product_key: string;
  registry_status: string;
  enrollment_status: string;
}

export interface BootstrapNav {
  id: string;
  module_code: string;
  label: string;
  route: string;
  sort_order: number;
  parent_id: string | null;
  readiness: string | null;
}

export interface BootstrapPrefs {
  locale: string;
  timezone: string;
  direction: string;
  appearance: string;
  density: string;
  accent_color: string | null;
  default_module_code: string | null;
  preferences: Record<string, unknown>;
}

export interface BootstrapBranding {
  brand_name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  theme_tokens: Record<string, unknown>;
  css_overrides: Record<string, unknown>;
}

export interface BootstrapLocale {
  locale_code: string;
  native_name: string;
  english_name: string;
  direction: string;
  is_default: boolean;
}

export interface BootstrapWorkspace {
  workspace_key: string;
  active_module_code: string | null;
  active_route: string | null;
  open_apps: unknown;
  panels: Record<string, unknown>;
  layout_snapshot: Record<string, unknown>;
}

export interface BootstrapAnnouncement {
  announcement_key: string;
  severity: string;
  audience: string;
  title_key: string | null;
  body_key: string | null;
  cta_label_key: string | null;
  cta_url: string | null;
  is_dismissible: boolean;
}

export interface BootstrapMembership {
  /** Active membership role for (tenantId, userId), e.g. 'tenant_admin'. */
  roleCode: string | null;
  /**
   * True only when the user is the appointed legal representative /
   * billing principal. Self-registered admins are NOT owners.
   */
  isOwner: boolean;
  /**
   * Convenience: true when roleCode resolves to a tenant-administration
   * role (tenant_admin, tenant_owner, *_admin, owner-like). Lets the
   * shell render admin-gated UI (e.g. /tenant-settings) from the single
   * bootstrap roundtrip without re-querying /api/access/my-permissions.
   */
  isAdmin: boolean;
}

export interface BootstrapManifest {
  tenantId: string;
  userId: string;
  productCode: string | null;
  workspaceKey: string;
  preferences: BootstrapPrefs;
  locales: BootstrapLocale[];
  branding: BootstrapBranding | null;
  modules: BootstrapModule[];
  navigation: BootstrapNav[];
  workspace: BootstrapWorkspace | null;
  announcements: BootstrapAnnouncement[];
  /**
   * Active membership for (tenantId, userId). NULL when the user has no
   * active membership in the requested tenant (caller should treat as
   * unauthorized for tenant-scoped surfaces).
   */
  membership: BootstrapMembership | null;
  generatedAt: string;
}

const ADMIN_ROLE_HINTS = new Set([
  'tenant_admin',
  'tenant_owner',
  'platform_admin',
  'platform_super_admin',
  'superadmin',
  'owner',
]);

function deriveIsAdmin(roleCode: string | null, isOwner: boolean): boolean {
  if (isOwner) return true;
  if (!roleCode) return false;
  const n = roleCode.toLowerCase().trim();
  if (ADMIN_ROLE_HINTS.has(n)) return true;
  if (n.endsWith('_admin')) return true;
  if (n.includes('owner') && n.includes('tenant')) return true;
  return false;
}

const DEFAULT_PREFS: BootstrapPrefs = {
  locale: 'en',
  timezone: 'Asia/Riyadh',
  direction: 'ltr',
  appearance: 'system',
  density: 'comfortable',
  accent_color: null,
  default_module_code: null,
  preferences: {},
};

export class UiOsBootstrapManager {
  constructor(private readonly pool: DbPool) {}

  async load(req: BootstrapRequest): Promise<BootstrapManifest> {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const productCode = req.productCode ?? null;
    const workspaceKey = req.workspaceKey ?? 'default';

    const [prefs, locales, branding, modules, navigation, workspace, announcements, membership] =
      await Promise.all([
        this.loadPreferences(tenantId, userId),
        this.loadLocales(),
        this.loadBranding(tenantId),
        this.loadModules(tenantId),
        this.loadNavigation(tenantId),
        this.loadWorkspace(tenantId, userId, workspaceKey),
        this.loadAnnouncements(tenantId, productCode),
        this.loadMembership(tenantId, userId),
      ]);

    return {
      tenantId,
      userId,
      productCode,
      workspaceKey,
      preferences: prefs,
      locales,
      branding,
      modules,
      navigation,
      workspace,
      announcements,
      membership,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Patch 1 — single-roundtrip membership.
   *
   * Reads the active row from `dos.tenant_memberships` for (user_id, tenant_id).
   * Returns null when no active membership exists; otherwise returns
   * `{ roleCode, isOwner, isAdmin }`. `isAdmin` is derived server-side so
   * the FE shell can gate admin surfaces (e.g. /tenant-settings) without a
   * second `/api/access/my-permissions` call.
   *
   * Self-registered users land here as `roleCode='tenant_admin'`,
   * `isOwner=false`, `isAdmin=true` (owner-only gates remain locked).
   */
  private async loadMembership(
    tenantId: string,
    userId: string,
  ): Promise<BootstrapMembership | null> {
    const { rows } = await this.pool.query<{
      role_code: string | null;
      is_tenant_owner: boolean | null;
    }>(
      `SELECT role_code, is_tenant_owner
         FROM dos.tenant_memberships
        WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'
        ORDER BY is_tenant_owner DESC, created_at ASC
        LIMIT 1`,
      [userId, tenantId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    const roleCode = r.role_code ?? null;
    const isOwner = r.is_tenant_owner === true;
    return { roleCode, isOwner, isAdmin: deriveIsAdmin(roleCode, isOwner) };
  }

  private async loadPreferences(tenantId: string, userId: string): Promise<BootstrapPrefs> {
    const { rows } = await this.pool.query<BootstrapPrefs>(
      `SELECT locale, timezone, direction, appearance, density, accent_color,
              default_module_code, preferences
         FROM dos.ui_user_preferences
        WHERE tenant_id = $1 AND user_id = $2
        LIMIT 1`,
      [tenantId, userId],
    );
    if (rows.length === 0) return DEFAULT_PREFS;
    const r = rows[0];
    return {
      locale: r.locale ?? DEFAULT_PREFS.locale,
      timezone: r.timezone ?? DEFAULT_PREFS.timezone,
      direction: r.direction ?? DEFAULT_PREFS.direction,
      appearance: r.appearance ?? DEFAULT_PREFS.appearance,
      density: r.density ?? DEFAULT_PREFS.density,
      accent_color: r.accent_color ?? null,
      default_module_code: r.default_module_code ?? null,
      preferences: (r.preferences as Record<string, unknown>) ?? {},
    };
  }

  private async loadLocales(): Promise<BootstrapLocale[]> {
    const { rows } = await this.pool.query<BootstrapLocale>(
      `SELECT locale_code, native_name, english_name, direction, is_default
         FROM dos.ui_locales
        WHERE is_active = TRUE
        ORDER BY is_default DESC, locale_code`,
    );
    return rows;
  }

  private async loadBranding(tenantId: string): Promise<BootstrapBranding | null> {
    const { rows } = await this.pool.query<BootstrapBranding>(
      `SELECT brand_name, logo_url, logo_dark_url, favicon_url,
              primary_color, secondary_color, accent_color,
              theme_tokens, css_overrides
         FROM dos.ui_tenant_branding
        WHERE tenant_id = $1 AND is_active = TRUE
        LIMIT 1`,
      [tenantId],
    );
    return rows[0] ?? null;
  }

  private async loadModules(tenantId: string): Promise<BootstrapModule[]> {
    const { rows } = await this.pool.query<BootstrapModule>(
      `SELECT m.module_code,
              m.display_name,
              m.default_route,
              m.product_key,
              m.registry_status,
              COALESCE(s.enrollment_status, m.default_tenant_enrollment_status) AS enrollment_status
         FROM dos.dynamic_ui_modules m
         LEFT JOIN dos.dynamic_ui_module_status s
           ON s.module_code = m.module_code AND s.tenant_id = $1
        WHERE m.registry_status = 'active'
          AND COALESCE(s.enrollment_status, m.default_tenant_enrollment_status) = 'enabled'
        ORDER BY m.module_code`,
      [tenantId],
    );
    return rows;
  }

  private async loadNavigation(tenantId: string): Promise<BootstrapNav[]> {
    const { rows } = await this.pool.query<BootstrapNav>(
      `SELECT id::text AS id, module_code, label, route, sort_order,
              parent_id::text AS parent_id, readiness
         FROM dos.dynamic_ui_navigation
        WHERE tenant_id IS NULL OR tenant_id = $1
        ORDER BY sort_order, module_code, label`,
      [tenantId],
    );
    return rows;
  }

  private async loadWorkspace(
    tenantId: string,
    userId: string,
    workspaceKey: string,
  ): Promise<BootstrapWorkspace | null> {
    const { rows } = await this.pool.query<BootstrapWorkspace>(
      `SELECT workspace_key, active_module_code, active_route,
              open_apps, panels, layout_snapshot
         FROM dos.ui_workspace_states
        WHERE tenant_id = $1 AND user_id = $2 AND workspace_key = $3
        LIMIT 1`,
      [tenantId, userId, workspaceKey],
    );
    return rows[0] ?? null;
  }

  async loadMinimal(req: BootstrapRequest): Promise<{
    tenantId: string; userId: string; productCode: string | null;
    workspaceKey: string;
    preferences: BootstrapPrefs; locales: BootstrapLocale[];
    branding: BootstrapBranding | null; generatedAt: string;
  }> {
    const [prefs, locales, branding] = await Promise.all([
      this.loadPreferences(req.tenantId, req.userId),
      this.loadLocales(),
      this.loadBranding(req.tenantId),
    ]);
    return {
      tenantId: req.tenantId, userId: req.userId,
      productCode: req.productCode ?? null,
      workspaceKey: req.workspaceKey ?? 'default',
      preferences: prefs, locales, branding,
      generatedAt: new Date().toISOString(),
    };
  }

  async loadModuleScope(tenantId: string, userId: string, moduleCode: string): Promise<{
    module: BootstrapModule | null;
    navigation: BootstrapNav[];
    routes: Array<{ route_key: string; route: string; module_code: string; required_permission: string | null }>;
    widgets: Array<{ widget_key: string; module_code: string; component_token: string }>;
    actions: Array<{ action_key: string; module_code: string; label: string | null; required_permission: string | null }>;
    generatedAt: string;
  }> {
    const [mod, nav, routes, widgets, actions] = await Promise.all([
      this.pool.query<BootstrapModule>(
        `SELECT m.module_code, m.display_name, m.default_route, m.product_key,
                m.registry_status,
                COALESCE(s.enrollment_status, m.default_tenant_enrollment_status) AS enrollment_status
           FROM dos.dynamic_ui_modules m
           LEFT JOIN dos.dynamic_ui_module_status s
             ON s.module_code = m.module_code AND s.tenant_id = $1
          WHERE m.module_code = $2 LIMIT 1`,
        [tenantId, moduleCode],
      ),
      this.pool.query<BootstrapNav>(
        `SELECT id::text AS id, module_code, label, route, sort_order,
                parent_id::text AS parent_id, readiness
           FROM dos.dynamic_ui_navigation
          WHERE module_code = $2 AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY sort_order, label`,
        [tenantId, moduleCode],
      ),
      this.pool.query<{ route_key: string; route: string; module_code: string; required_permission: string | null }>(
        `SELECT route_key, route, module_code, required_permission
           FROM dos.dynamic_ui_routes
          WHERE module_code = $1
          ORDER BY route_key`,
        [moduleCode],
      ).catch(() => ({ rows: [] })),
      this.pool.query<{ widget_key: string; module_code: string; component_token: string }>(
        `SELECT widget_key, module_code, component_token
           FROM dos.dynamic_ui_widgets
          WHERE module_code = $1
          ORDER BY widget_key`,
        [moduleCode],
      ).catch(() => ({ rows: [] })),
      this.pool.query<{ action_key: string; module_code: string; label: string | null; required_permission: string | null }>(
        `SELECT action_key, module_code, label, required_permission
           FROM dos.dynamic_ui_actions
          WHERE module_code = $1
          ORDER BY action_key`,
        [moduleCode],
      ).catch(() => ({ rows: [] })),
    ]);
    void userId;
    return {
      module: mod.rows[0] ?? null,
      navigation: nav.rows,
      routes: routes.rows,
      widgets: widgets.rows,
      actions: actions.rows,
      generatedAt: new Date().toISOString(),
    };
  }

  async loadRouteScope(tenantId: string, userId: string, routeKey: string): Promise<{
    route: { route_key: string; route: string; module_code: string; required_permission: string | null } | null;
    widgets: Array<{ widget_key: string; module_code: string; component_token: string }>;
    actions: Array<{ action_key: string; module_code: string; label: string | null; required_permission: string | null }>;
    grid_state: Record<string, unknown> | null;
    generatedAt: string;
  }> {
    const r = await this.pool.query<{ route_key: string; route: string; module_code: string; required_permission: string | null }>(
      `SELECT route_key, route, module_code, required_permission
         FROM dos.dynamic_ui_routes WHERE route_key = $1 LIMIT 1`,
      [routeKey],
    ).catch(() => ({ rows: [] }));
    const route = r.rows[0] ?? null;
    const moduleCode = route?.module_code ?? null;
    const [widgets, actions, grid] = await Promise.all([
      moduleCode ? this.pool.query<{ widget_key: string; module_code: string; component_token: string }>(
        `SELECT widget_key, module_code, component_token
           FROM dos.dynamic_ui_widgets WHERE module_code = $1 ORDER BY widget_key`,
        [moduleCode],
      ).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] as Array<{ widget_key: string; module_code: string; component_token: string }> }),
      moduleCode ? this.pool.query<{ action_key: string; module_code: string; label: string | null; required_permission: string | null }>(
        `SELECT action_key, module_code, label, required_permission
           FROM dos.dynamic_ui_actions WHERE module_code = $1 ORDER BY action_key`,
        [moduleCode],
      ).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] as Array<{ action_key: string; module_code: string; label: string | null; required_permission: string | null }> }),
      this.pool.query<{ column_state: Record<string, unknown>; sort_state: unknown; filter_state: Record<string, unknown> }>(
        `SELECT column_state, sort_state, filter_state
           FROM dos.ui_data_grid_states
          WHERE tenant_id = $1 AND user_id = $2 AND route_key = $3
          LIMIT 1`,
        [tenantId, userId, routeKey],
      ),
    ]);
    return {
      route,
      widgets: widgets.rows,
      actions: actions.rows,
      grid_state: grid.rows[0] ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  private async loadAnnouncements(
    tenantId: string,
    productCode: string | null,
  ): Promise<BootstrapAnnouncement[]> {
    const { rows } = await this.pool.query<BootstrapAnnouncement>(
      `SELECT announcement_key, severity, audience, title_key, body_key,
              cta_label_key, cta_url, is_dismissible
         FROM dos.ui_announcements
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND (product_code IS NULL OR product_code = $2)
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at   IS NULL OR ends_at   >= NOW())
        ORDER BY severity, announcement_key`,
      [tenantId, productCode],
    );
    return rows;
  }
}
