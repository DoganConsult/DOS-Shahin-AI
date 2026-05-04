# Workspace Resolver DB-Driven Rewrite Plan

## Executive Summary

The current `WorkspaceResolverService` (1563 lines) hardcodes ~670 lines of
i18n maps, KPIs, setup steps, quick actions, AI tips, health probes, grid
columns, empty states, and page headers inline. Every one of these has a
corresponding DB table already created (some promoted, some draft) and an
API endpoint either live or trivially addable to `ui-os-service`. The rewrite
replaces each hardcoded block with a DB fetch + static fallback, keeping the
same output shapes (`ResolvedWorkspaceSurface`, `WorkspaceNavLabelResolver`).

---

## 1. Architecture: DB-First, Static-Fallback

### Principle

```
DB fetch (ui-os-service)  -->  success?  -->  use DB payload
                               |
                               fail / empty
                               |
                               v
                          static fallback JSON  -->  use fallback
```

Every data category follows this pattern. The static fallback is NOT the
current inline code -- it is extracted into standalone JSON files that ship
with the SPA build. When the DB is seeded, the JSON files are never touched.
When the DB is empty, the SPA works identically to today.

### Why JSON files instead of inline maps

- Testable independently (import and assert shape).
- Deletable when DB is fully seeded (one PR, zero logic changes).
- Smaller resolver file (target: <250 lines).

---

## 2. Data Category Mapping

| # | Data Category | DB Table | API Endpoint (ui-os-service) | Fallback File |
|---|--------------|----------|------------------------------|---------------|
| 1 | i18n strings | `dos.ui_translations` | `GET /api/ui-os/translations/:locale` | `workspace-i18n-fallback.json` |
| 2 | KPIs | `dos.dynamic_ui_kpis` + `dos.ui_route_kpi` | `GET /api/ui-os/template-binding?route=/workspace-home` (props.kpis) | `workspace-kpis-fallback.json` |
| 3 | Setup steps | `dos.dynamic_ui_setup_steps` | **NEW** `GET /api/ui-os/workspace-surface/setup-steps` | `workspace-setup-steps-fallback.json` |
| 4 | Quick actions | `dos.dynamic_ui_quick_actions` | **NEW** `GET /api/ui-os/workspace-surface/quick-actions` | `workspace-quick-actions-fallback.json` |
| 5 | AI tips | `dos.dynamic_ui_ai_tips` | **NEW** `GET /api/ui-os/workspace-surface/ai-tips` | `workspace-ai-tips-fallback.json` |
| 6 | Health probes | `dos.dynamic_ui_health_probes` | **NEW** `GET /api/ui-os/workspace-surface/health-probes` | `workspace-health-probes-fallback.json` |
| 7 | Page headers | `dos.dynamic_ui_page_headers` | **NEW** `GET /api/ui-os/workspace-surface/page-header?route=/workspace-home` | `workspace-page-header-fallback.json` |
| 8 | Grid columns | `dos.dynamic_ui_grid_columns` | **NEW** `GET /api/ui-os/workspace-surface/grid-columns?scope=workspace.modules` | `workspace-grid-columns-fallback.json` |
| 9 | Empty states | `dos.dynamic_ui_empty_states` | **NEW** `GET /api/ui-os/workspace-surface/empty-states` | `workspace-empty-states-fallback.json` |
| 10 | Template binding / frame | `dos.ui_route_template_binding` | `GET /api/ui-os/template-binding?route=/workspace-home` | existing DynamicTemplatePageComponent fallback |
| 11 | Nav items (L1) | `dos.dynamic_ui_navigation` | `GET /api/dynamic-ui/workspace/nav` | L2-L6 pipeline (already implemented) |
| 12 | Tabs (sub-pages) | `dos.ui_route_tab` | `GET /api/ui-os/template-binding?route=...` (props.tabs) | flat stub routes (current behavior) |
| 13 | Shell binding | `dos.workspace_shell_binding` | `GET /api/ui-os/workspace-shell/:tenantId` | WorkspaceShellBindingService already fail-soft |

---

## 3. How the Resolver Fetches From Each API/Service

### 3.1 New Internal Service: `WorkspaceSurfaceDataService`

Location: `products/shahin-ai/app/src/app/shell/workspace-surface-data.service.ts`

This is a pure data-fetching service with no composition logic. Each method
returns `Signal<T | null>` where null means "not loaded / failed".

```typescript
@Injectable({ providedIn: 'root' })
export class WorkspaceSurfaceDataService {
  private readonly http = inject(HttpClient);

  // ── Translations ────────────────────────────────────────────────
  // Fetch once per locale, cache in a Map<DosLocale, Record<string,string>>.
  // Endpoint: GET /api/ui-os/translations/:locale?namespace=workspace,shell,nav
  private readonly _translations = signal<Record<string, string> | null>(null);
  readonly translations = this._translations.asReadonly();

  async loadTranslations(locale: DosLocale): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ translations: Record<string, string> }>(
          `/api/ui-os/translations/${locale}`,
          { params: { namespace: 'workspace,shell,nav,status,role,tenant_settings,common' } }
        ).pipe(timeout(2000), catchError(() => of(null)))
      );
      this._translations.set(res?.translations ?? null);
    } catch { this._translations.set(null); }
  }

  // ── Setup Steps ─────────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/setup-steps?tenant_id=X
  private readonly _setupSteps = signal<DbSetupStep[] | null>(null);
  readonly setupSteps = this._setupSteps.asReadonly();

  // ── Quick Actions ───────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/quick-actions?surface_key=workspace.home
  private readonly _quickActions = signal<DbQuickAction[] | null>(null);
  readonly quickActions = this._quickActions.asReadonly();

  // ── AI Tips ─────────────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/ai-tips
  private readonly _aiTips = signal<DbAiTip[] | null>(null);
  readonly aiTips = this._aiTips.asReadonly();

  // ── Health Probes ───────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/health-probes
  private readonly _healthProbes = signal<DbHealthProbe[] | null>(null);
  readonly healthProbes = this._healthProbes.asReadonly();

  // ── Page Header ─────────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/page-header?route=/workspace-home
  private readonly _pageHeader = signal<DbPageHeader | null>(null);
  readonly pageHeader = this._pageHeader.asReadonly();

  // ── Grid Columns ────────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/grid-columns?scope=workspace.modules
  private readonly _gridColumns = signal<DbGridColumn[] | null>(null);
  readonly gridColumns = this._gridColumns.asReadonly();

  // ── Empty States ────────────────────────────────────────────────
  // GET /api/ui-os/workspace-surface/empty-states
  private readonly _emptyStates = signal<DbEmptyState[] | null>(null);
  readonly emptyStates = this._emptyStates.asReadonly();

  /** Fetch everything in parallel. Called once at workspace entry. */
  async loadAll(tenantId: string, locale: DosLocale): Promise<void> {
    await Promise.allSettled([
      this.loadTranslations(locale),
      this.loadSetupSteps(tenantId),
      this.loadQuickActions(),
      this.loadAiTips(),
      this.loadHealthProbes(),
      this.loadPageHeader('/workspace-home'),
      this.loadGridColumns('workspace.modules'),
      this.loadEmptyStates(),
    ]);
  }
}
```

### 3.2 Revised `WorkspaceResolverService`

The resolver becomes a **composition layer** that reads from:

1. `WorkspaceSurfaceDataService` (DB data, possibly null)
2. Static fallback JSON (imported at build time)
3. `AccessStore` (session state -- user, tenant, modules, permissions)
4. `WorkspaceShellBindingService` (already DB-driven, no changes)

```typescript
@Injectable({ providedIn: 'root' })
export class WorkspaceResolverService implements DynamicUiResolverPort, WorkspaceNavLabelResolver {
  private readonly access = inject(AccessStore);
  private readonly surfaceData = inject(WorkspaceSurfaceDataService);

  // Fallback JSON (tree-shaken away when unused in production)
  private readonly fallbackI18n = FALLBACK_I18N; // imported from JSON

  // The t() function becomes:
  private t(key: string): ResolvedString {
    const loc = this.locale();
    // 1. Try DB translations
    const dbVal = this.surfaceData.translations()?.[key];
    if (dbVal !== undefined) return { key, value: dbVal, locale: loc, bidi: 'plain' };
    // 2. Try static fallback (current locale)
    const staticVal = this.fallbackI18n[loc]?.[key];
    if (staticVal !== undefined) return { key, value: staticVal, locale: loc, bidi: 'plain' };
    // 3. Try EN fallback
    const enVal = this.fallbackI18n.en?.[key];
    if (enVal !== undefined) {
      this._missingKeys.add(`${loc}:${key}`);
      return { key, value: enVal, locale: 'en', bidi: 'plain' };
    }
    // 4. Humanize
    this._missingKeys.add(key);
    return { key, value: this.humanize(key), locale: loc, bidi: 'plain' };
  }

  // composeWorkspace() changes for each section:
  //   kpis:         surfaceData.kpis() ?? fallbackKpis(accessStore)
  //   setupSteps:   surfaceData.setupSteps() ?? fallbackSetupSteps(accessStore)
  //   quickActions: surfaceData.quickActions() ?? fallbackQuickActions(accessStore)
  //   aiTips:       surfaceData.aiTips() ?? fallbackAiTips(accessStore)
  //   healthProbes: surfaceData.healthProbes() ?? fallbackHealthProbes(accessStore)
  //   pageHeader:   surfaceData.pageHeader() ?? fallbackPageHeader()
  //   moduleColumns: surfaceData.gridColumns() ?? fallbackGridColumns()
  //   emptyStates:  surfaceData.emptyStates() ?? fallbackEmptyStates()
}
```

---

## 4. Fallback Strategy: DB-First, Static-Second

### Load sequence at workspace entry

```
1. ShellHostComponent.ngOnInit()
     |
     +--> WorkspaceShellBindingService.refresh()       [already wired]
     +--> WorkspaceSurfaceDataService.loadAll(tid, loc) [NEW]
     |
2. WorkspaceResolverService.workspace (computed signal)
     |
     +--> For each data slot:
     |      dbValue = surfaceData.signal()
     |      if (dbValue !== null && dbValue.length > 0) use dbValue
     |      else use fallback transformer
     |
3. WorkspaceHomeComponent renders from workspace signal [no change]
```

### Timeout policy

Every DB fetch has a 2-second timeout via RxJS `timeout()`. On timeout or
HTTP error, the signal stays `null`, and the fallback activates silently.
Console warning emitted for observability; no user-visible error.

### Cache policy

- Translations: cached per locale, invalidated on locale switch.
- Other surface data: cached for `cacheTtlSec` (60s default), re-fetched
  on `refresh()` call.
- Template bindings: already cached by `TemplateBindingService`.

---

## 5. Shell Config: Consuming `WorkspaceShellBindingService` More

### Current state

`WorkspaceShellBindingService` already provides:
- `headerBrandLabel`, `headerHomeRoute`, `headerWorkspaceTitle`
- `statusBarSignals`, `actionQueueItems`, `agentActivities`
- `isSurfaceAllowed(key)` render gate
- `accountMenuEntries`

### What changes

The resolver should delegate shell chrome strings to the binding service
when available, with the i18n resolver as fallback:

```typescript
shellChromeString(key: string): string | null {
  // 1. Check WorkspaceShellBindingService props
  const bindingVal = this.shellBinding.stringFromSurface(key);
  if (bindingVal) return bindingVal;
  // 2. Check DB translations
  const dbVal = this.surfaceData.translations()?.[key];
  if (dbVal) return dbVal;
  // 3. Check static fallback
  return this.fallbackI18n[this.locale()]?.[key]
      ?? this.fallbackI18n.en?.[key]
      ?? null;
}
```

The `WorkspaceShellConfigService` (which currently reads from the resolver)
should also directly consume `WorkspaceShellBindingService` for surface
enablement decisions, removing the indirect path through the resolver.

---

## 6. Workspace Sub-Pages Become Tab-Based (from `dos.ui_route_tab`)

### Current state

Sub-pages like `/workspace/tasks`, `/workspace/approvals`,
`/workspace/modules`, `/workspace/activity`, `/workspace/ai` are referenced
in quick actions and empty states but are NOT routed -- they are flat stubs
or non-existent routes.

### Target state

The workspace-home page gains a tab strip driven by `dos.ui_route_tab` rows
for route `/workspace-home`. Each tab maps to a content zone within the
same page component (no child routing needed -- tabs are in-page panels).

### DB schema (already exists)

```sql
-- dos.ui_route_tab (already in template-binding resolver)
SELECT tab_id, sort_order, label_en, label_ar, permission
  FROM dos.ui_route_tab WHERE route=$1 ORDER BY sort_order
```

### Seed data needed

```sql
INSERT INTO dos.ui_route_tab (route, tab_id, sort_order, label_en, label_ar, permission) VALUES
  ('/workspace-home', 'overview',   10, 'Overview',   'نظرة عامة',   NULL),
  ('/workspace-home', 'tasks',      20, 'My Tasks',   'مهامي',        'tasks.read'),
  ('/workspace-home', 'approvals',  30, 'Approvals',  'الموافقات',    'workflow.read'),
  ('/workspace-home', 'activity',   40, 'Activity',   'النشاط',       'audit_trail.read'),
  ('/workspace-home', 'modules',    50, 'Modules',    'الوحدات',      NULL);
```

### How it works in the SPA

1. `template-binding` resolver already returns `props.tabs` for any route.
2. `WorkspaceHomeComponent` reads `workspace.tabs` from the resolved surface.
3. Each tab renders a different content zone (overview = current default,
   tasks = work queue, etc.).
4. Permission filtering: tabs with `permission` set are hidden when the
   user lacks that permission (checked via `AccessStore.hasPermission()`).
5. Fallback: when `props.tabs` is empty/null, render all sections in a
   single scrollable page (current behavior).

### Component change

```typescript
// WorkspaceHomeComponent (pseudocode)
readonly tabs = computed(() => {
  // DB-driven tabs from template-binding props
  const dbTabs = this.resolver.workspace().tabs ?? [];
  if (dbTabs.length > 0) return dbTabs.filter(t =>
    !t.permission || this.access.hasPermission(t.permission)
  );
  // Fallback: no tabs, single-page layout
  return [];
});

readonly activeTab = signal<string>('overview');
```

---

## 7. Page Frame / Container Becomes Dynamic

### Current state

`/workspace-home` is hardcoded in `app.routes.ts` to load
`WorkspaceHomeComponent`. The page frame (header gradient, KPI strip, zone
layout) is baked into that component's template.

### Target state

`/workspace-home` should also be resolvable through
`DynamicTemplatePageComponent` + `dos.ui_route_template_binding`, like
Foundation routes already are. However, because the workspace-home is a
complex multi-zone page (not a simple archetype), we use a **hybrid approach**:

1. **Keep `WorkspaceHomeComponent` as the rendered component** -- it is too
   complex for a generic archetype template (KPIs + setup wizard + module
   grid + AI tips + health probes + quick actions all in one page).

2. **The page header becomes DB-driven** via `dos.dynamic_ui_page_headers`:
   - `WorkspaceHomeComponent` reads `workspace.pageHeader` from the
     resolved surface instead of calling `this.pageHeader(...)` inline.
   - When the DB row exists, the header gradient, eyebrow, title, subtitle
     all come from the DB.
   - Fallback: current hardcoded `pageHeader()` call.

3. **The KPI strip becomes DB-driven** via template-binding `props.kpis`:
   - Already supported by the template-binding resolver (`loadProps`
     queries `dos.ui_route_kpi`).
   - `WorkspaceHomeComponent` reads `workspace.kpis` and renders them.
   - Fallback: current 4 hardcoded KPIs.

4. **Register a template-binding row for `/workspace-home`**:

```sql
INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, version, title_en, title_ar, eyebrow_en, eyebrow_ar)
VALUES
  ('/workspace-home', 'command-home', 'WorkspaceHomeComponent', 1,
   'Command Center', 'مركز القيادة', 'Workspace', 'مساحة العمل');
```

This means `/workspace-home` participates in the template-binding system
for metadata (masthead, kpis, tabs, columns) even though its component is
loaded by the route table, not by `DynamicTemplatePageComponent`.

---

## 8. Concrete File Structure

```
products/shahin-ai/app/src/app/shell/
  workspace-resolver.service.ts        -- REWRITTEN (~250 lines, composition only)
  workspace-surface-data.service.ts    -- NEW: DB fetch service
  workspace-surface-data.types.ts      -- NEW: DB row type interfaces
  fallbacks/
    workspace-i18n-en.json             -- extracted from current I18N.en
    workspace-i18n-ar.json             -- extracted from current I18N.ar
    workspace-kpis.json                -- extracted from current kpis array
    workspace-setup-steps.json         -- extracted from current steps array
    workspace-quick-actions.json       -- extracted from current actions array
    workspace-ai-tips.json             -- extracted from current tips array
    workspace-health-probes.json       -- extracted from current probes array
    workspace-page-header.json         -- extracted from current pageHeader()
    workspace-grid-columns.json        -- extracted from current moduleColumns
    workspace-empty-states.json        -- extracted from current emptyStates
    workspace-status-labels.json       -- extracted from STATUS_LABELS
    workspace-role-labels.json         -- extracted from ROLE_LABELS

services/ui-os-service/src/
  routes/
    workspace-surface.routes.ts        -- NEW: 6 endpoints for workspace content catalogs
  managers/
    ui-os-workspace-surface.manager.ts -- NEW: DB queries for the 6 content catalogs

platform/dos/migrations/public/
  20260504_XXXX_workspace_surface_seed.sql -- Seeds workspace data into draft tables
```

---

## 9. Backend: New `workspace-surface` Routes

Add to `services/ui-os-service/src/routes/workspace-surface.routes.ts`:

```typescript
export function createWorkspaceSurfaceRouter(pool: DbPool): Router {
  const router = Router();

  // Setup steps
  router.get('/workspace-surface/setup-steps', async (req, res) => {
    const tenantId = req.header('x-dos-tenant-id') ?? null;
    const { rows } = await pool.query(
      `SELECT step_key, label_key, description_key, icon, route,
              required_permission, sort_order, condition_kind, condition_payload
         FROM dos.dynamic_ui_setup_steps
        WHERE is_active = TRUE
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order`,
      [tenantId]
    );
    // De-dupe: tenant-specific rows override platform defaults by step_key
    const byKey = new Map();
    for (const r of rows) { if (!byKey.has(r.step_key)) byKey.set(r.step_key, r); }
    res.json({ steps: [...byKey.values()] });
  });

  // Quick actions
  router.get('/workspace-surface/quick-actions', async (req, res) => {
    const tenantId = req.header('x-dos-tenant-id') ?? null;
    const surfaceKey = req.query.surface_key ?? 'workspace.home';
    const { rows } = await pool.query(
      `SELECT action_key, eyebrow_key, label_key, description_key, icon,
              route, required_permission, sort_order, variant, tone
         FROM dos.dynamic_ui_quick_actions
        WHERE is_active = TRUE AND surface_key = $2
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order`,
      [tenantId, surfaceKey]
    );
    const byKey = new Map();
    for (const r of rows) { if (!byKey.has(r.action_key)) byKey.set(r.action_key, r); }
    res.json({ actions: [...byKey.values()] });
  });

  // AI tips
  router.get('/workspace-surface/ai-tips', async (req, res) => {
    const tenantId = req.header('x-dos-tenant-id') ?? null;
    const { rows } = await pool.query(
      `SELECT tip_key, title_key, body_key, cta_label_key, cta_route, icon,
              condition_kind, condition_payload, priority, required_permission
         FROM dos.dynamic_ui_ai_tips
        WHERE is_active = TRUE
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY priority, sort_order`,
      [tenantId]
    );
    res.json({ tips: rows });
  });

  // Health probes
  router.get('/workspace-surface/health-probes', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT probe_key, label_key, endpoint, ok_threshold, sort_order
         FROM dos.dynamic_ui_health_probes
        WHERE is_active = TRUE
        ORDER BY sort_order`
    );
    res.json({ probes: rows });
  });

  // Page header
  router.get('/workspace-surface/page-header', async (req, res) => {
    const route = req.query.route as string;
    const { rows } = await pool.query(
      `SELECT route_key, variant, density, eyebrow_key, title_key, subtitle_key,
              gradient_token, mesh_layers, hairline_visible, hairline_token
         FROM dos.dynamic_ui_page_headers
        WHERE route_key = $1 AND is_active = TRUE`,
      [route]
    );
    res.json({ header: rows[0] ?? null });
  });

  // Grid columns
  router.get('/workspace-surface/grid-columns', async (req, res) => {
    const scope = req.query.scope as string;
    const tenantId = req.header('x-dos-tenant-id') ?? null;
    const { rows } = await pool.query(
      `SELECT col_key, label_key, data_field, data_kind, format_payload,
              is_sortable, is_filterable, default_sort, sort_priority,
              align, is_visible, sort_order
         FROM dos.dynamic_ui_grid_columns
        WHERE scope = $2 AND is_active = TRUE
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order`,
      [tenantId, scope]
    );
    const byKey = new Map();
    for (const r of rows) { if (!byKey.has(r.col_key)) byKey.set(r.col_key, r); }
    res.json({ columns: [...byKey.values()] });
  });

  // Empty states
  router.get('/workspace-surface/empty-states', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT state_key, title_key, description_key, tone, illustration,
              primary_label_key, primary_route, secondary_label_key, secondary_route
         FROM dos.dynamic_ui_empty_states
        WHERE is_active = TRUE`
    );
    res.json({ states: rows });
  });

  return router;
}
```

Register in `services/ui-os-service/src/routes/index.ts`:
```typescript
app.use('/api/ui-os', createWorkspaceSurfaceRouter(pool));
```

---

## 10. Migrations / Seeds Needed

### 10.1 Promote Draft Tables

The draft migrations `20260502_0138` and `20260502_0139` must be promoted
from `_drafts/` to the main migrations folder. They create:

- `dos.dynamic_ui_setup_steps`
- `dos.dynamic_ui_empty_states`
- `dos.dynamic_ui_trial_banner_rules`
- `dos.dynamic_ui_page_headers`
- `dos.dynamic_ui_health_probes`
- `dos.dynamic_ui_quick_actions`
- `dos.dynamic_ui_ai_tips`
- `dos.dynamic_ui_grid_columns`

### 10.2 Seed Data Migration

New file: `platform/dos/migrations/public/20260504_XXXX_workspace_surface_seed.sql`

```sql
BEGIN;

-- ── Setup Steps ──────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_setup_steps
  (tenant_id, step_key, label_key, route, sort_order, condition_kind)
VALUES
  (NULL, 'profile', 'workspace.setup.profile', '/profile',           0, 'has_user_name'),
  (NULL, 'tenant',  'workspace.setup.tenant',  '/tenant-profile',    1, 'has_tenant_id'),
  (NULL, 'modules', 'workspace.setup.modules', '/workspace/modules', 2, 'has_modules'),
  (NULL, 'team',    'workspace.setup.team',     '/tenant-settings',  3, 'has_team_members')
ON CONFLICT DO NOTHING;

-- ── Quick Actions ────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_quick_actions
  (tenant_id, surface_key, action_key, eyebrow_key, label_key, description_key, route, sort_order, variant, tone)
VALUES
  (NULL, 'workspace.home', 'profile',        'workspace.action.account',   'workspace.action.account.title',   'workspace.action.account.desc',   '/profile',         10, 'solid', 'neutral'),
  (NULL, 'workspace.home', 'tenant-profile', 'workspace.action.workspace', 'workspace.action.workspace.title', 'workspace.action.workspace.desc', '/tenant-profile',  20, 'solid', 'neutral'),
  (NULL, 'workspace.home', 'settings',       'workspace.action.prefs',     'workspace.action.prefs.title',     'workspace.action.prefs.desc',     '/settings',        30, 'solid', 'neutral'),
  (NULL, 'workspace.home', 'ask-ai',         'workspace.action.copilot',   'workspace.action.copilot.title',   'workspace.action.copilot.desc',   '/workspace/ai',    40, 'gradient', 'accent'),
  (NULL, 'workspace.home', 'invite',         'workspace.action.invite',    'workspace.action.invite.title',    'workspace.action.invite.desc',    '/tenant-settings', 50, 'solid', 'neutral'),
  (NULL, 'workspace.home', 'tenant-settings','workspace.action.admin',     'workspace.action.admin.title',     'workspace.action.admin.desc',     '/tenant-settings', 60, 'solid', 'neutral')
ON CONFLICT DO NOTHING;

-- ── AI Tips ──────────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_ai_tips
  (tenant_id, tip_key, title_key, body_key, cta_label_key, cta_route, icon, condition_kind, priority)
VALUES
  (NULL, 'setup-incomplete', 'workspace.ai.setup.title',  'workspace.ai.setup.body',  'workspace.action.open', '/workspace/setup', 'sparkle', 'setup_below', 10),
  (NULL, 'open-foundation',  'workspace.ai.module.title', 'workspace.ai.module.body', 'workspace.action.open', '/foundation',      'sparkle', 'has_modules', 30),
  (NULL, 'invite-team',      'workspace.ai.invite.title', 'workspace.ai.invite.body', 'workspace.action.open', '/tenant-settings', 'sparkle', 'tenant_admin', 50)
ON CONFLICT DO NOTHING;

-- ── Page Header ──────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_page_headers
  (route_key, variant, density, eyebrow_key, title_key, gradient_token, hairline_visible, hairline_token)
VALUES
  ('/workspace-home', 'signature', 'comfortable', 'workspace.eyebrow', 'workspace.title',
   '--dos-gradient-brand-soft', TRUE, '--dos-gradient-kpi-line')
ON CONFLICT DO NOTHING;

-- ── Grid Columns (module launcher) ──────────────────────────────────
INSERT INTO dos.dynamic_ui_grid_columns
  (tenant_id, scope, col_key, label_key, data_field, data_kind, is_sortable, is_filterable, default_sort, sort_priority, align, is_visible, sort_order)
VALUES
  (NULL, 'workspace.modules', 'title',       'workspace.col.module',      'title.value',       'text',        TRUE,  TRUE,  'asc', 1, 'start', TRUE, 10),
  (NULL, 'workspace.modules', 'code',        'workspace.col.code',        'moduleCode',        'code',        TRUE,  TRUE,  NULL,  0, 'start', TRUE, 20),
  (NULL, 'workspace.modules', 'description', 'workspace.col.description', 'description.value', 'text',        FALSE, FALSE, NULL,  0, 'start', TRUE, 30),
  (NULL, 'workspace.modules', 'status',      'workspace.col.status',      'status',            'status_pill', TRUE,  FALSE, NULL,  0, 'start', TRUE, 40)
ON CONFLICT DO NOTHING;

-- ── Empty States ─────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_empty_states
  (state_key, title_key, description_key, tone, primary_label_key, primary_route)
VALUES
  ('workspace.tasks.empty',     'workspace.empty.tasks.title',     NULL, 'info',    'workspace.action.view_all', '/workspace/tasks'),
  ('workspace.approvals.empty', 'workspace.empty.approvals.title', NULL, 'warning', 'workspace.action.view_all', '/workspace/approvals'),
  ('workspace.activity.empty',  'workspace.empty.activity.title',  NULL, 'success', 'workspace.action.view_all', '/workspace/activity'),
  ('workspace.modules.empty',   'workspace.empty.modules.title',   'workspace.empty.modules.description', 'brand', 'workspace.action.ask_ai', '/workspace/ai')
ON CONFLICT DO NOTHING;

-- ── Template Binding for workspace-home ──────────────────────────────
INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, version, title_en, title_ar, eyebrow_en, eyebrow_ar)
VALUES
  ('/workspace-home', 'command-home', 'WorkspaceHomeComponent', 1,
   'Command Center', 'مركز القيادة', 'Workspace', 'مساحة العمل')
ON CONFLICT (route) DO NOTHING;

-- ── Tabs for workspace-home ──────────────────────────────────────────
INSERT INTO dos.ui_route_tab (route, tab_id, sort_order, label_en, label_ar, permission) VALUES
  ('/workspace-home', 'overview',  10, 'Overview',  'نظرة عامة',  NULL),
  ('/workspace-home', 'tasks',     20, 'My Tasks',  'مهامي',       'tasks.read'),
  ('/workspace-home', 'approvals', 30, 'Approvals', 'الموافقات',   'workflow.read'),
  ('/workspace-home', 'activity',  40, 'Activity',  'النشاط',      'audit_trail.read'),
  ('/workspace-home', 'modules',   50, 'Modules',   'الوحدات',     NULL)
ON CONFLICT DO NOTHING;

-- ── KPIs for workspace-home ──────────────────────────────────────────
INSERT INTO dos.ui_route_kpi (route, sort_order, label_en, label_ar, source_path, format) VALUES
  ('/workspace-home', 10, 'Tenant',           'المستأجر',         'tenant.name',   'text'),
  ('/workspace-home', 20, 'Status',           'الحالة',           'tenant.status', 'status_pill'),
  ('/workspace-home', 30, 'Your Role',        'دورك',            'membership.roleCode', 'text'),
  ('/workspace-home', 40, 'Modules Entitled', 'الوحدات المخصصة', 'modules.length', 'number')
ON CONFLICT DO NOTHING;

-- ── Health Probes ────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_health_probes
  (probe_key, label_key, endpoint, ok_threshold, sort_order)
VALUES
  ('dna-modules',    'workspace.health.dna',      '/api/health/dna',       200, 0),
  ('entitled-count', 'workspace.health.entitled',  '/api/health/entitled',  200, 10),
  ('openfga-seed',   'workspace.health.openfga',   '/api/health/openfga',   200, 20),
  ('trial-status',   'workspace.health.trial',     '/api/health/trial',     200, 30)
ON CONFLICT DO NOTHING;

COMMIT;
```

### 10.3 i18n Seed

The ~670 lines of EN/AR strings should be inserted into `dos.ui_translations`
as a separate bulk migration. This can be generated programmatically from the
current `I18N` constant:

```sql
-- Generated from WorkspaceResolverService I18N maps
INSERT INTO dos.ui_translations (locale_code, namespace, translation_key, translation_value)
VALUES
  ('en', 'workspace', 'workspace.eyebrow', 'workspace'),
  ('en', 'workspace', 'workspace.title', 'Command center'),
  -- ... (all ~335 EN entries)
  ('ar', 'workspace', 'workspace.eyebrow', 'مساحة العمل'),
  ('ar', 'workspace', 'workspace.title', 'مركز القيادة'),
  -- ... (all ~335 AR entries)
ON CONFLICT DO NOTHING;
```

---

## 11. Implementation Phases

### Phase WS-DB-1: Extract + Fallback Files (no behavior change)

1. Extract `I18N.en` and `I18N.ar` into `fallbacks/workspace-i18n-en.json`
   and `workspace-i18n-ar.json`.
2. Extract each hardcoded data block into its own fallback JSON file.
3. Rewrite `WorkspaceResolverService` to import from the JSON files instead
   of inline constants. **Same behavior, smaller file.**
4. Tests pass, no visual change.

### Phase WS-DB-2: Data Service + Backend Routes

1. Create `WorkspaceSurfaceDataService`.
2. Create `workspace-surface.routes.ts` in ui-os-service.
3. Promote draft table migrations.
4. Wire `loadAll()` into shell bootstrap.
5. Resolver reads from data service signals with JSON fallback.
6. **DB is empty**: fallback activates, behavior identical to Phase 1.

### Phase WS-DB-3: Seed Data

1. Apply the seed migration.
2. Insert i18n translations.
3. **DB is populated**: resolver now reads from DB automatically.
4. Validate: toggle DB off (delete rows) -> fallback activates -> toggle on
   (re-insert) -> DB values appear. Zero code changes.

### Phase WS-DB-4: Tab-Based Sub-Pages

1. Seed `dos.ui_route_tab` rows for `/workspace-home`.
2. Add tab strip rendering to `WorkspaceHomeComponent`.
3. Each tab renders a panel (overview = existing content, tasks = work queue
   stub, approvals = approval list stub, etc.).
4. Permission gating via `AccessStore.hasPermission()`.

### Phase WS-DB-5: L1 Nav Pipeline Activation

1. Ensure `GET /api/dynamic-ui/workspace/nav` returns workspace items.
2. Un-skip L1 `DynamicUiNavSource` (currently returns null due to backend
   `.skipped` flag).
3. Workspace nav items now come from DB; L2-L6 fill gaps.

### Phase WS-DB-6: Cleanup

1. Remove fallback JSON files if DB is stable for 2+ weeks.
2. Remove `WorkspaceResolverService.fallbackI18n` imports.
3. Delete the `STATUS_LABELS` and `ROLE_LABELS` inline maps.
4. Final file size target: <200 lines.

---

## 12. Interface Contracts Preserved

### `DynamicUiResolverPort` (no changes)

```typescript
resolveString(key: string): Promise<ResolvedString>
resolveWorkspace(): Promise<ResolvedWorkspaceSurface>
resolveTenantSettings(): Promise<ResolvedTenantSettingsSurface>
resolveSidebarNav(): Promise<ResolvedNavItem[]>
```

### `WorkspaceNavLabelResolver` (no changes)

```typescript
navGroupLabel(idOrLabel: string): string
navItemLabel(idOrLabel: string, fallbackId?: string): string
shellChromeString(key: string): string | null
string(key: string): string
```

### `ResolvedWorkspaceSurface` (no changes to shape)

All fields remain identical. The *source* of each field changes from inline
code to DB-or-fallback, but the *output type* is the same. Consumers
(`WorkspaceHomeComponent`, `WorkspaceShellConfigService`, etc.) require zero
changes.

---

## 13. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Draft tables not yet promoted | Phase WS-DB-2 promotes them; fallback covers the gap |
| ui-os-service down at runtime | 2s timeout + fallback JSON; console.warn for ops |
| i18n translations table empty | Fallback JSON files are exact copies of current inline maps |
| DB returns partial data | Per-field merge: DB field used when present, fallback field when null |
| Tab permission mismatch | Tabs without permission field always visible; tabs with permission checked against AccessStore |
| Breaking `ResolvedWorkspaceSurface` | Interface is untouched; only internal composition changes |
| Circular DI (resolver <-> shell config) | Data service is independent; resolver does not inject shell-config (same constraint as today) |

---

## 14. Verification Checklist

- [ ] `WorkspaceResolverService` < 250 lines
- [ ] All 10 data categories fetch from DB API
- [ ] All 10 data categories have static fallback
- [ ] `workspace` computed signal output unchanged when DB is empty
- [ ] `workspace` computed signal updates when DB seed is applied
- [ ] Shell chrome strings resolve from DB translations
- [ ] Tab strip renders from `dos.ui_route_tab` rows
- [ ] Tab permissions gated by AccessStore
- [ ] L1 nav source returns workspace items when backend is active
- [ ] No new circular DI injections
- [ ] `DynamicUiResolverPort` interface unchanged
- [ ] `WorkspaceNavLabelResolver` interface unchanged
- [ ] `ResolvedWorkspaceSurface` type unchanged
- [ ] E2E: workspace-home renders with DB on
- [ ] E2E: workspace-home renders with DB off (fallback)
