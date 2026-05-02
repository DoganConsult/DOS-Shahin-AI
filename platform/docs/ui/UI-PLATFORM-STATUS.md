# UI Platform Status — Single Source of Truth

> **Purpose**: One place that tracks the live state of the two UI surfaces — **Dynamic UI** (DB-driven shells) and **UI-OS** (`@dos/ui-system` primitives) — so we don't lose track again. Update this file when state changes; do **not** create parallel trackers.
>
> **Scope**: status, gaps, owners, gates, registries, APIs/routes, file-tree SoT.
> **Last reconciled**: 2026-05-01.

---

## 0. TL;DR — Where we are right now

| Surface | Code-complete | Blocker | Next-action |
|---|---|---|---|
| **Dynamic UI** | ~85% (Phases 0–5 shipped) | 53 drift violations + 8 PRR gates open | Apply migration 009 + register 21 Foundation `component_key`s |
| **UI-OS** | ~90% (Waves A–H shipped) | D-3/D-4 design calls + F-2 heatmap consolidation | Owner decision on `ShellRendererComponent` / `AppShellComponent` migration |
| **APIs / routes** | ~70% real, 30% stubs | `/api/widgets/{key}` has no handler; no `/health` on dynamic-ui-service; backend service is renamed `.dynamic-ui-service.skipped/` | Un-skip the service, expose `/health`, wire real handler |
| **File-tree SoT** | Fragmented across 5 directories | 3 copies of `dynamic-ui-bootstrap.service.ts` with different md5 | Consolidate into `platform/dynamic-ui/` (proposal in §6) |
| **pnpm-workspace** | Broken | Points to `platform/dnoc/modules/packages/*` (no @dos/ pkgs there); real location is `modules/packages/*`. node_modules `@dos/*` symlinks dangle. | Fix path; `pnpm install` |

---

## 1. Where the code lives today (the mess)

### 1.1 Dynamic UI — 5 scattered locations

```
platform/config-center/dynamic-ui/         enrollment.json + README.md         (config)
platform/config-center/contracts/          NO dynamic-ui/ subfolder            (gap)
platform/config-center/shared/dynamic-ui/  components/, registry/, services/,  (Angular runtime)
                                           telemetry/, models/, index.ts
platform/foundation/contracts/dynamic-ui/  widgets.json                        (Foundation widget contract)
products/shahin-ai/dynamic-ui/             enrollment.json (DIFFERENT md5)     (Shahin-specific overlay)
modules/compliance/db/seeds/dynamic-ui/    seeds 001–005                       (correct — module-local)
platform/config-center/services/.dynamic-ui-service.skipped/   pg-store, server  (DISABLED backend!)
```

**3 copies of `dynamic-ui-bootstrap.service.ts` with different md5 hashes**:

| Path | md5 | Imported by |
|---|---|---|
| `platform/config-center/services/platform/dynamic-ui-bootstrap.service.ts` | `621a0d5a` | (no live importers — orphaned) |
| `platform/core/services/platform/dynamic-ui-bootstrap.service.ts` | `5f6148ac` | `platform/core/services/platform/*.resolver.ts` |
| `platform/config-center/shared/dynamic-ui/services/dynamic-ui-bootstrap.service.ts` | `5c49e20a` | `module-grid.component.ts`, `foundation-overview.component.ts`, resolvers, `ui-runtime-store.service.ts` ← **LIVE** |

`config-center/shared/dynamic-ui/services/` is the live one; the other two are zombie copies.

### 1.2 UI-OS — packages location

```
platform/ui-system/dos-ui-system/        primitives (DosAppShell, DosDesktopDialog, …)
platform/ui-system/dos-ui-contracts/     capability-registry.ts
platform/ui-system/dos-design-tokens/    tokens
platform/docs/ui/                      roadmap + audits + visual proofs
```

**Workspace mismatch**: `pnpm-workspace.yaml` line 9 says `'platform/dnoc/modules/packages/*'` (only 4 dirs there, none are @dos/ pkgs). Real path is `modules/packages/*` (27 packages). Fallout: `node_modules/@dos/ui-system → ../../platform/ui-system/dos-ui-system` resolves to nothing.

### 1.3 Foundation UI dual path (per memory `feedback_foundation_ui_dual_path.md`)

```
platform/foundation/ui/    LIVE (mapped via @foundation-module/ui)
modules/foundation/ui/     UNUSED — edits there have no runtime effect
```

---

## 2. Dynamic UI — open work (53 drift violations + 8 PRR gates)

### 2.1 Drift violations — `ops/reports/dynamic-ui-drift-2026-04-30.md`

| Class | Count | What | Fix |
|---|---|---|---|
| **D1** | 1 | `/foundation/access-review` permission `foundation:read` ≠ widget required `access_review:read` | Edit seed `009_seed_foundation_actions_widgets_agents.sql` |
| **D2** | 21 | 21 Foundation routes with `component_key` missing from `COMPONENT_MAP` | Register in `platform/config-center/shared/dynamic-ui/registry/` |
| **D3** | 3 | `widget_key` missing from `WIDGET_KEY_MAP`: `risk`, `risk-register-grid` ×2 | Add to `widget-key-map.ts` |
| **D4** | 14 | 14 permissions used in seeds but absent from `dos.permission_catalogue` | `pnpm dynamic-ui:seed-perm-catalogue` after migration 009 |
| **D5** | 14 | Same 14 not granted to any role | Edit `ops/scripts/seed-data/role-permission-map.ts` |

**D2 — the 21 Foundation component_keys missing**:
foundation-overview, foundation-organization, foundation-business-units, foundation-users, foundation-roles, foundation-teams, foundation-locations, foundation-departments, foundation-job-titles, foundation-employees, foundation-policies, foundation-procedures, foundation-controls, foundation-risks, foundation-vendors, foundation-incidents, foundation-audits, foundation-reports, foundation-dashboards, foundation-settings, foundation-access-review.

> **Action**: see §7 below.

### 2.2 PRR gates — checklist

| Gate | Status | Notes |
|---|---|---|
| DUI-1 Drift gate | ✅ live | `pnpm dynamic-ui:drift-gate` |
| DUI-2 Loader resolvability | ✅ live | `pnpm dynamic-ui:loader-resolvability` |
| DUI-3 YAML SoT | ❌ **missing** | `platform/dynamic-ui/contracts/registry.yaml` doesn't exist |
| DUI-4 Schema drift constraints | ⚠️ migration written, **NOT applied** | `009_*` not in `dos.schema_migrations` on any env |
| DUI-5 Telemetry sink | ✅ live | Grafana board wired |
| DUI-6 PRR template | ✅ live | only `onboarding-service.md` + `user-service.md` written |
| DUI-7 Route smoke | ❌ needs `DOS_DYNAMIC_UI_BASE` on staging | |
| DUI-8 STRICT boot | ❌ `window.DOS_DYNAMIC_UI_STRICT=true` not tried on staging | |

### 2.3 PRR docs missing

`platform/docs/runbooks/PRR/` — only 2 of N modules covered. Missing: foundation, compliance, risk, governance, vendor, audit, BCP.

---

## 3. UI-OS — open work

### 3.1 Architectural design calls (D-3 / D-4) — BLOCKERS

| Tag | Component | Lines | Why blocked | Decision needed |
|---|---|---|---|---|
| D-3 | `ShellRendererComponent` | 329 | Parallel shell with `masthead` / `KPI strip` / `action-bar` slots — doesn't map to `DosAppShell` | New `DosAppShell` variant, or rewrite component |
| D-3 | `WorkspaceIgniteCardComponent` | 418 | Multi-action chrome ≠ `DosServiceCard` (single-CTA) | Split, or new primitive |
| D-3 | `IntelligenceSidebarContainer` | — | Chrome lives in parent (`onboarding-os` shell) | Edit parent |
| D-4 | `AppShellComponent` (website) | 220 | flex-column (topbar full-width + sidebar+main below) ≠ `DosAppShell` CSS-grid (sidebar full-height left) | New variant, or custom slot CSS |

> **Action**: design call doc + meeting (separate from this tracker).

### 3.2 F-2 — Risk heatmap consolidation (NOT STARTED)

Decision (Wave F): **ECharts wins**. 3 variants in repo:
- `RiskHeatmapWidget` (ECharts) — keep, rename → `RiskHeatmapComponent`
- `RiskHeatmapChart` (D3) — quarantine
- `RiskHeatmapEchart` — quarantine
- Rewire 2 dashboard composers to canonical name.

### 3.3 Capability registry — 4 keys missing

Add to `platform/ui-system/dos-ui-contracts/src/capability-registry.ts`:
- `Audit.FindingsHeatmap`
- `Analytics.RegulatorHeatmap`
- `Qiyas.MaturityHeatmap`
- `Analytics.ConfidenceHeatmap`

### 3.4 Core primitives deferred (3)

`Stepper` (needed for `SetupWizardPage`), `Breadcrumb` (currently inside `DosPageHeader` slot), `DataFilterBar`.

### 3.5 Baseline ratchet — 1169 grandfathered violations

| Guard | Entries | Effort |
|---|---:|---|
| `ui-no-raw-css` | 1112 | multi-quarter (G-3a..f); top offenders: shahin-ai/app=717, modules/compliance=90, foundation=41 |
| `ui-rtl-logical-css` | 55 | 1–2 weeks (mechanical: `padding-left → padding-inline-start`) |
| `ui-no-overlapping-fabs` | 2 | in-session — 4 sites in shell + mobile |
| `ui-responsive-contract` | 0 | clean ✅ |

Guard runs ratchet-down only; no entry can be added.

### 3.6 ORPHAN_DEAD components — 782

Re-run census with `--include-routes`:
- 649 in shahin-ai app (likely lazy-loaded false positives)
- 50 in `modules/foundation/` (likely real dead — dual-path; see §1.3)
- Remaining scattered.

---

## 4. APIs / routes — wiring status

### 4.1 dynamic-ui backend service — DISABLED

```
platform/config-center/services/.dynamic-ui-service.skipped/
   src/server.ts
   src/pg-store.ts
```

The whole backend is renamed with leading `.` and `.skipped` suffix → not built, not started by pm2. Yet:
- gateway routes `/api/widgets/{widgetKey}` exist
- 26 compliance route seeds + 21 foundation seeds exist
- frontend resolvers call those endpoints

**Result**: in production the `/api/widgets/*` calls go to the gateway which delegates to `@dos/dynamic-ui-platform` library — no real DB-backed handler. This contradicts the seed-driven model.

### 4.2 Missing endpoints

| Endpoint | State |
|---|---|
| `GET /health` on dynamic-ui-service | missing |
| `GET /api/widgets/:widgetKey` (real handler) | delegated to library, no DB read |
| `GET /api/dynamic-ui/routes` | missing |
| `GET /api/dynamic-ui/components/:key` | missing |
| Permission enforcement middleware | not visible in service code |

### 4.3 Frontend resolver targets

- `platform/core/services/platform/dynamic-ui-bootstrap.service.ts` (lone copy in `core/`)
- `platform/core/services/platform/dynamic-page-experience.resolver.ts`
- `platform/core/services/platform/dynamic-agent-experience.resolver.ts`
- `platform/core/services/platform/dynamic-widget.resolver.ts`

These import the **`core/`** copy of the bootstrap, not the live `config-center/shared/dynamic-ui/` one — drift risk.

---

## 5. Workflow — adding/changing a Dynamic UI route

```
1. Seed:   modules/<module>/db/seeds/<NNN>_seed_<module>.sql
           - dos.dynamic_ui_routes  (route + permission_key + signature_widget + component_key)
           - dos.dynamic_ui_widgets (INSERT … SELECT FROM dos.dynamic_ui_routes — NEVER VALUES)
2. Register:
           component_key  → platform/config-center/shared/dynamic-ui/registry/page-renderers.ts
           widget_key     → platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts
3. Permissions:
           dos.permission_catalogue (canonical)
           ops/scripts/seed-data/role-permission-map.ts
4. Local gates:
           pnpm dynamic-ui:gates:static-precheck
           = drift-gate + loader-resolvability + yaml-coverage + lints
5. Staging:
           pnpm dynamic-ui:route-smoke <module>            (DUI-7)
           DOS_DYNAMIC_UI_STRICT=true on SPA boot          (DUI-8)
6. Sign PRR checklist (DUI-1..DUI-8) → platform/docs/runbooks/PRR/<module>.md
```

## 5.1 Workflow — adding/changing a UI-OS primitive

```
1. Domain widget?  → live in module + register componentKey in
                     platform/ui-system/dos-ui-contracts/src/capability-registry.ts
   Core primitive? → platform/ui-system/dos-ui-system/ only
2. Tokens from @dos/design-tokens — never raw CSS
3. RTL — logical properties (padding-inline-start, not padding-left)
4. Run: pnpm ui-os:guards
        = no-raw-css + rtl-logical-css + component-allowlist
        + responsive-contract + no-overlapping-fabs
5. Allowed: PrimeNG, ECharts, D3 — banned: replacing them globally
6. Visual proof at 390 / 430 / 768 / 1440 → platform/docs/ui/visual-proof/
```

---

## 6. Proposed consolidation (NOT YET EXECUTED — needs sign-off)

### 6.1 Move plan (Dynamic UI)

```
FROM                                                    TO
platform/config-center/dynamic-ui/             →  platform/dynamic-ui/configs/
platform/config-center/shared/dynamic-ui/      →  platform/dynamic-ui/runtime/
platform/foundation/contracts/dynamic-ui/      →  platform/dynamic-ui/contracts/foundation-widgets.json
products/shahin-ai/dynamic-ui/enrollment.json  →  platform/dynamic-ui/configs/shahin-overlay.json
platform/config-center/services/.dynamic-ui-service.skipped/  →  platform/dynamic-ui/service/
modules/compliance/db/seeds/dynamic-ui/         (stays — module-local)

NEW
platform/dynamic-ui/contracts/registry.yaml    ← DUI-3 SoT (consolidates 3 registries)
```

Touches `git mv` + import codemod for ~30 files. Cannot run silently in auto mode — needs explicit OK.

### 6.2 Zombie copy cleanup

- Delete `platform/config-center/services/platform/dynamic-ui-bootstrap.service.ts` (orphaned, no importers)
- Reconcile `platform/core/services/platform/*.resolver.ts` against the live `config-center/shared/dynamic-ui/services/*` copies — pick one, delete the other.

### 6.3 pnpm-workspace.yaml fix

```diff
-  - 'platform/dnoc/modules/packages/*'
+  - 'modules/packages/*'
```

Then `pnpm install` to refresh `node_modules/@dos/*` symlinks.

---

## 7. Concrete next-actions (ordered by ROI)

| # | Action | Blast radius | Expected impact |
|---:|---|---|---|
| 1 | Fix pnpm-workspace.yaml + `pnpm install` | low (reversible) | Restores `@dos/*` resolution |
| 2 | Apply migration `009_seed_foundation_actions_widgets_agents.sql` on staging | **medium** (DDL) | Fixes D4 (14) + D5 (14) = 28 of 53 violations |
| 3 | Register 21 Foundation `component_key`s in `page-renderers.ts` | low | Fixes D2 (21) violations |
| 4 | Add 3 missing `widget_key`s + 4 missing capability keys | low | Fixes D3 (3) + closes 4 capability gaps |
| 5 | Un-skip dynamic-ui-service: rename, add `/health`, wire real `/api/widgets/:key` handler | medium | Closes API gap |
| 6 | Write `registry.yaml` SoT | low | Closes DUI-3 gate |
| 7 | F-2 heatmap consolidation | low (rename + rewire 2) | UI-OS Wave F closure |
| 8 | Delete orphan `dynamic-ui-bootstrap.service.ts` copies | low | Prevents future drift |
| 9 | Big consolidation (§6.1) | **high** | Single SoT — needs sign-off |
| 10 | D-3 / D-4 design-call doc | — | Owner decision required |

---

## 8. Owners / references

| Area | File / location | Owner |
|---|---|---|
| Drift report | `ops/reports/dynamic-ui-drift-2026-04-30.md` | platform-ui |
| Census + roadmap | `platform/docs/ui/ui-component-{census,migration-roadmap}.{md,json}` | platform-ui |
| Wave F heatmap decision | `platform/docs/ui/wave-f-risk-heatmap-decision.md` | platform-ui |
| Wave G baseline audit | `platform/docs/ui/wave-g-baseline-audit.md` | platform-ui |
| PRR gates | `platform/docs/runbooks/PRR/*.md` | platform-ui |
| Capability registry (UI-OS) | `platform/ui-system/dos-ui-contracts/src/capability-registry.ts` | platform-ui |
| Component map (Dynamic UI) | `platform/config-center/shared/dynamic-ui/registry/page-renderers.ts` | platform-ui |
| Widget key map (Dynamic UI) | `platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts` | platform-ui |
| Permission catalogue | `dos.permission_catalogue` (DB) + `ops/scripts/seed-data/role-permission-map.ts` | platform-auth |
