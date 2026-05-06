# Module 7 — Reporting / Analytics

**Core manifest:** `platform/config-center/board-report/platform-manifests/module-routes-core/reporting.module.routes.ts`  
**Operational shell:** `platform/config-center/board-report/platform-manifests/module-routes-operations/reports.module.routes.ts`  
**Workspace path:** `w/:workspaceId/reports` (see reporting.core + operations manifests).

---

## Pass 1 — Audit

### `reporting.module.routes.ts` (core)

- **`children: {}`** — only `path: ''` default + **standalone** entries in practice: check file for `report-scenario`, analytics/report-builder entries, and `w/:workspaceId/reports` lazy `WorkspaceReportsHostComponent`.

### `reports.module.routes.ts` (operations)

- Rich tree: `overview`, `builder`, `risk`, `compliance`, `audit`, `evidence`, `executive`, `library`, `exports`, `scheduled`, `builder-advanced`, `hub`, `center`, `generator`, `scenario`, `ext`, `powerbi`, `samples`, etc.

### Gaps vs pack

- Pack assumes **single “Reporting” module**; codebase splits **core reporting host** vs **operations reports hub** — document for agents: **both** are in scope but **different manifests**.
- **Duplicate dashboards:** executive KPIs may also appear on module overviews — Pass 3 reconciles or links.

### File plan (Pass 1)

- Read both manifests fully; list each route → component.
- Map KPIs to originating APIs (executive snapshot, compliance summary, etc.).

---

## Pass 2 — Implement

- Executive / cross-module KPIs **only** with real endpoints; each card links to filtered source module route.
- Reuse existing chart/card primitives (`@dos/ui-system` where applicable per AGENTS.md).
- Power BI / ext samples: feature-flag or hide if non-production.

---

## Pass 3 — Polish / QA

- [ ] KPI reconciliation: dashboard number ↔ drill-down list count.
- [ ] Chart empty states and date filters.
- [ ] Export flows centralized in `exports` where possible.
- [ ] Remove or consolidate duplicate dashboard pages only when safe (diff review).
