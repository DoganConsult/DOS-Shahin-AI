# UI-OS Tables 0100–0130 — What's Left + Conflicts + Beyond-SQL Work

**Status:** REVIEW — 2026-05-01
**Scope:** post-draft audit. Companion to [ui-os-tables-0100-0130-plan.md](./ui-os-tables-0100-0130-plan.md) and [ui-os-gap-closure-plan.md](./ui-os-gap-closure-plan.md).

---

## 1. Master checklist §27 coverage — DONE

| Source | Tables |
|---|---:|
| Already migrated (0302–0307) | 35 |
| Drafted 0099–0130 (this session) | 126 |
| **Master checklist §27 target** | **152** |
| Coverage gap | **0** |

Every table from §27 is either already in `shahin_grc.dos.*` or sitting as a normalized draft under `_drafts/`. The 5 extra tables in the drafts (`ui_widget_instance_role_grants`, `ui_search_scope_indexes`, `ui_help_collection_articles`, `ui_checklist_steps`, `ui_ai_prompt_template_tools`) are 1NF children that explode `TEXT[]` of first-class entities — additions, not deviations.

---

## 2. CONFLICTS — must resolve before promoting drafts out of `_drafts/`

Migration `20260501_0307_ui_os_admin_publishing.sql` is **already applied** and registered in `migrations-index.json`. It created 4 tables that my drafts also define **with incompatible schemas**:

| Table | 0307 schema (deployed) | My draft (0123/0124) | Resolution |
|---|---|---|---|
| `dos.ui_draft_versions` | `draft_key, target_type, target_key, status, payload, validation, created_by, submitted_by` | `target_kind ENUM, target_id, version, payload, author_id, is_active` | **Drop from draft 0124.** 0307 wins. Schema reconciliation later. |
| `dos.ui_published_versions` | `target_type` (text), `version_id` FK, ... | `target_kind ENUM, target_id, version, payload, published_by, is_current` | **Drop from draft 0123.** 0307 wins. |
| `dos.ui_rollback_points` | `version_id UUID FK` (refs ui_published_versions) | `target_kind, target_id, version, payload, reason, created_by` | **Drop from draft 0124.** 0307 wins. |
| `dos.ui_admin_activity_log` | `actor VARCHAR(120)`, ... | `actor_id VARCHAR(64), target_kind ENUM, target_id, action_code, payload` | **Drop from draft 0124.** 0307 wins. |

### Conflict resolution PR (small, separate)

1. Remove these 4 `CREATE TABLE` blocks from `_drafts/20260502_0123_governance_publish.sql` and `_drafts/20260502_0124_governance_drafts_audit.sql`.
2. Add a comment header in each draft pointing to 0307: *"Tables `ui_draft_versions/ui_published_versions/ui_rollback_points/ui_admin_activity_log` are already created by `20260501_0307_ui_os_admin_publishing.sql`. Schema reconciliation deferred to a separate ALTER migration."*
3. Adjust the 0123/0124 down files to match.
4. Open a follow-up ticket: `ui-os: reconcile 0307 schema with normalized §16 design (ENUMs, target_kind, FK by id)`.

After this, drafts 0123 = 1 table (`ui_change_log`) + 1 table (`ui_publish_requests`) + 1 table (`ui_publish_approvals`) — wait, those are net new — recount below.

### Recount after conflict resolution

| Migration | Tables before | Tables after | Net change |
|---|---:|---:|---:|
| 0123 | 4 | 3 | drop `ui_published_versions` |
| 0124 | 5 | 2 | drop `ui_draft_versions`, `ui_rollback_points`, `ui_admin_activity_log` |
| **Total drafts** | **126** | **122** | **–4** |

---

## 3. What's left INSIDE the SQL files — 6 follow-up DDL items

| Item | Where | Why deferred | When to do |
|---|---|---|---|
| **A. RLS policies** | All 126 drafted tables + 35 existing | Phase 1.1 of [gap-closure plan](./ui-os-gap-closure-plan.md). Migration runner doesn't generate them; they need their own `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` migrations. | Numbered `0200–0230`, one per `0100–0130` |
| **B. RLS policy for existing 35** | 0302–0307 tables | Same — never had RLS applied | Same wave |
| **C. Schema reconciliation for 4 conflict tables** | `ui_draft_versions`, `ui_published_versions`, `ui_rollback_points`, `ui_admin_activity_log` | 0307 is in production — can't drop & recreate | Separate migration `20260601_0001_ui_os_governance_schema_reconcile.sql` |
| **D. Refresh policy for `refresh_on_event_codes` / `metric_keys` TEXT[]** | 0101, 0125 | No event/metric registry exists yet — deliberately kept as free-form tags | Promote to child tables once registry lands |
| **E. Partitioning for telemetry tables** | 0126, 0127 | Nine event tables will grow unbounded; need `PARTITION BY RANGE (occurred_at)` declarative partitioning + monthly partition cron | After Phase 4 observability ships |
| **F. Initial seed data** | `ui_locales`, `ui_visibility_rule_kinds`, `ui_widget_catalog_categories`, `ui_theme_profiles` (system defaults), `ui_help_collections` | Schema-only migrations don't seed | Separate seed scripts under `seeds/ui-os/` |

---

## 4. What's needed BEYOND the SQL — production-grade UI-OS

The 126+35 tables are necessary but far from sufficient. Below is everything still required to make UI-OS actually run, organized by layer.

### 4.1 Backend (TS managers + routes) — §21 coverage gap

Currently shipped (per [services/ui-os-service](../../services/ui-os-service)): 14 managers, 53 endpoints, **service not running, gateway not proxying** (per [ui-os-gap-closure-plan.md](./ui-os-gap-closure-plan.md) Phase 0 audit).

**Missing managers that match the 31 new draft groups:**

| Section | Manager(s) needed | LOC estimate |
|---|---|---:|
| §5 widget runtime | `UiOsWidgetInstanceManager`, `UiOsWidgetVisibilityManager` | ~600 |
| §6 grid extensions | `UiOsGridColumnCatalogManager`, `UiOsGridBulkJobManager` | ~500 |
| §7 forms | `UiOsFormDefinitionManager`, `UiOsFormSubmissionManager`, `UiOsFormApprovalManager` | ~900 |
| §8 search | `UiOsSearchProviderManager` (extends existing search), `UiOsSearchHistoryManager` | ~400 |
| §9 notifications | `UiOsNotificationManager`, `UiOsInboxManager` | ~700 |
| §10 help/onboarding | `UiOsHelpArticleManager`, `UiOsChecklistManager`, `UiOsReleaseNoteManager` | ~500 |
| §11 branding/theme | `UiOsBrandAssetManager` (extends existing branding), `UiOsThemeProfileManager` | ~500 |
| §12 i18n | `UiOsTranslationGovernanceManager`, `UiOsRtlAuditManager` | ~400 |
| §13 a11y | `UiOsAccessibilityManager` | ~300 |
| §14 WebOS | `UiOsWorkspaceSessionManager`, `UiOsWindowStateManager` | ~600 |
| §15 visibility/security | `UiOsVisibilityRuleManager`, `UiOsRoleAssignmentManager`, `UiOsPolicyAuditManager` | ~600 |
| §16 governance | `UiOsPublishManager`, `UiOsDraftManager`, `UiOsRollbackManager` (must reconcile with 0307) | ~700 |
| §17 flags/experiments | `UiOsFeatureFlagManager`, `UiOsExperimentManager` | ~600 |
| §18 telemetry | `UiOsTelemetryIngestManager` (write-only), `UiOsTelemetryQueryManager` (read-only) | ~700 |
| §19 AI workspace | `UiOsAiContextManager`, `UiOsAiSuggestionManager`, `UiOsAiActionDraftManager` | ~700 |
| §20 Studio | `UiOsManagerProjectManager`, `UiOsManagerDraftManager`, `UiOsManagerLockManager`, `UiOsManagerPreviewManager` | ~900 |
| **Total** | **30 managers** | **~9 800 LOC** |

### 4.2 API surface (master checklist §22) — endpoint gap

Currently: **53 of 63 §22 endpoints** shipped. Missing:

- 3 of 4 `/bootstrap` sub-routes: `/bootstrap/minimal`, `/bootstrap/module/:moduleCode`, `/bootstrap/route/:routeKey`
- 7 admin publishing endpoints (depend on 0307 + reconciliation)
- + ~120 new endpoints for the 30 new managers above

Total to ship: **~130 new HTTP routes** — same shape as existing zod-bounded routers.

### 4.3 Frontend (master checklist §23 + §24) — almost all unbuilt

| Layer | Currently shipped | Still needed |
|---|---|---|
| Stores | None | `UiOsStateStore`, `UiOsPreferenceStore`, `UiOsThemeStore`, `UiOsI18nStore`, `UiOsAccessStoreAdapter` |
| Renderers | None for §23 set | All 26 renderers from §23 (ShellRenderer, NavigationRenderer, ModuleRenderer, RouteRenderer, PageRenderer, DashboardRenderer, WidgetRenderer, ActionRenderer, FormRenderer, DataGridRenderer, ChartRenderer, ReportRenderer, SearchRenderer, CommandPaletteRenderer, NotificationCenterRenderer, TourRenderer, HelpRenderer, EmptyStateRenderer, ErrorStateRenderer, LoadingStateRenderer, PermissionDeniedRenderer, BrandingRenderer, ThemeRenderer, LocaleDirectionRenderer, AccessibilityRenderer, AiPanelRenderer) |
| Component allowlists (§24) | None | `PAGE_COMPONENT_MAP`, `WIDGET_COMPONENT_MAP`, `FORM_FIELD_COMPONENT_MAP`, `ACTION_COMPONENT_MAP`, `CHART_COMPONENT_MAP`, `GRID_CELL_COMPONENT_MAP`, `EMPTY_STATE_COMPONENT_MAP`, `TOUR_STEP_COMPONENT_MAP`, `AI_PANEL_COMPONENT_MAP` |
| Admin Studio screens (§25) | None | All 18 admin screens (Dashboard Builder, Widget Catalog Manager, Navigation Builder, Page Layout Builder, Form Builder, Grid View Manager, Theme/Branding Manager, Translation Manager, Tour Builder, Command Palette Manager, Announcement Manager, Saved View Manager, Feature Flag Manager, Role-Based Visibility Manager, Publish/Approval Console, Version History/Rollback Console, Drift Validation Console, Preview Mode, Import/Export Manager) |

### 4.4 CI / validation guards (§26) — not ratcheted

19 named guards in §26. Needed:

```
ui-os-schema-guard
ui-os-contract-shape-guard
ui-os-component-allowlist-guard
ui-os-no-raw-html-guard
ui-os-no-remote-js-guard
ui-os-permission-binding-guard
ui-os-navigation-route-drift-guard
ui-os-widget-component-drift-guard
ui-os-i18n-completeness-guard
ui-os-rtl-compatibility-guard
ui-os-mobile-responsive-guard
ui-os-theme-token-guard
ui-os-accessibility-guard
ui-os-dashboard-layout-guard
ui-os-grid-state-guard
ui-os-publish-version-guard
ui-os-tenant-isolation-guard      ← partially exists, scope to ui-os-service
ui-os-audit-log-guard
ui-os-performance-budget-guard
```

Each guard is a TS script + GitHub Actions step; baseline gates currently grandfathered per [project_dynamic_ui_hardening_2026-04-30](memory).

### 4.5 Operational layers — currently absent

| Layer | What's needed |
|---|---|
| **PM2 / process** | Add `ui-os-service` to PM2 actually online on :4015 (Phase 0.4 of gap-closure plan). |
| **Gateway proxy** | Mount `/api/ui-os/*` in [services/gateway/src/server.ts](../../services/gateway/src/server.ts) with HMAC + tenant header injection (Phase 0.5). |
| **OpenAPI** | Generate 3.1 spec from zod schemas; lint in CI. |
| **PRR + runbook** | Per Onboarding PRR-foundation pattern. |
| **Observability** | Langfuse trace for `/bootstrap`; Grafana panels (`ui-os-latency`, `ui-os-error-rate`, `ui-os-bootstrap-cache-hit-rate`); 60s synthetic smoke. |
| **Telemetry partitioning** | Declarative `PARTITION BY RANGE (occurred_at)` on the 9 telemetry tables once they're applied, with a monthly partition cron. |
| **Backup / WAL economics** | Per `project_disk_topology_2026-04-24` memory: barman WAL bloats unbounded — need backup cycle before applying telemetry tables. |

### 4.6 Tenant DB forward-migration

Only `shahin_grc` has the 35 existing tables. Cert DBs (`shahin_grc_m1_cert`, `m2_cert`, `m3_cert`), staging (`shahin_grc_gate2b_staging`), and `shahin_fresh_full` have **zero** UI-OS tables. Forward-migration order:

1. Apply 0302–0307 to the empty DBs first (catch them up to current state).
2. Apply ledger backfill (`step-0.1-backfill-ui-os-ledger.sql`).
3. Then promote drafts wave-by-wave per the 10-wave order.

### 4.7 Per-tenant data migration

Schema-per-tenant constraint: each new `dos.ui_*` table is `public` (platform-global), so per-tenant fan-out is **N/A** for UI-OS. But module-side tables that *consume* UI-OS metadata (e.g. `vendor.dashboard_widgets` referencing `dos.ui_widget_instances`) need their own migration sequence per tenant.

---

## 5. Ordered priority for the next 3 weeks

In order of unblocking power:

1. **Phase 0 of [gap-closure plan](./ui-os-gap-closure-plan.md)** — start `ui-os-service`, proxy gateway, fix env SoT (3 days).
2. **Conflict resolution PR** — drop 4 duplicate tables from drafts 0123/0124 (1 hour).
3. **Phase 1 of gap-closure plan** — RLS, RBAC, audit, OpenAPI for the 53 already-shipped endpoints (1 week).
4. **Promote Wave 3 drafts** (0099 + 0100–0108) — widgets + grids + forms (3 days).
5. **Build managers + routes for Wave 3** (5 days).
6. Continue per the wave order in plan §"Wave assignment".

**Do not** attempt to apply all 31 drafts at once. Per the 12 reasons in the prior conversation: scope creep, unverifiable migration ledger, RLS unaudited, module overlap risk.

---

## 6. Memory snapshot saved

This audit is saved to `/root/.claude/projects/-root-DOS-AIO/memory/project_ui_os_drafts_0100_0130_state_2026-05-01.md` so future sessions know:

- 31 drafts + 1 ENUM migration are reservation-locked under `_drafts/`
- 4 tables conflict with already-applied 0307
- 30 managers + 130 endpoints + 26 renderers + 9 allowlists + 19 CI guards + 18 admin screens still to build
- Forward-migration order for 5 cert/staging DBs
- Phase 0 + Phase 1 + conflict resolution must precede any draft promotion
