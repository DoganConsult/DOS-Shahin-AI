# Agent delegation pack: seven GRC modules (3 passes each)

Canonical copy-paste source for Cursor agents.  
**Do not edit** `.cursor/plans/*.plan.md` — update this file if the pack changes.

**DOS-Platform — repo-grounded Pass 1–3 ledgers (routes, gaps, QA):** [execution/README.md](./execution/README.md)

## How to use

- Run **one module only** per agent session (or one pass only for smaller steps).
- Paste **Block 0 (preamble)** at the top of every message, then **only** the pass for that module.
- Optional closing line (paste after your task body):

```text
Do not boil the ocean. Stay strictly inside this module only.
Do not refactor unrelated modules. Prefer small, reviewable, production-safe changes.
Before making changes, list existing files and routes related to this module.
```

## DOS-Platform (this repo)

Add this line to Block 0 when working here:

```text
Follow AGENTS.md: no hardcoded shell/nav; UI-OS renders; Dynamic UI resolves; do not edit gateway or run DB migrations unless approved.
```

---

## Block 0 — Preamble (paste every time)

```text
You are working inside an existing production-oriented GRC platform codebase.
Do not redesign the whole system. Do not create parallel architecture.
Do not invent new modules if equivalent ones already exist.

Your job is to improve and organize the EXISTING module in-scope using current routes, services, shared components, design system, table patterns, permission model, and API conventions.

Rules:
1) Inspect existing code first; cite files you found before proposing changes.
2) Reuse existing components/services/DTOs/guards; no duplicate pages unless consolidating.
3) Do not break public APIs unless unavoidable; if you must, list migration impact.
4) Output format every time:
   - Current findings (what exists, where it lives)
   - Gaps / duplication / conflicts
   - Target navigation + route map for THIS module only
   - File-by-file plan (create/update/delete) with reasons
   - Risks and dependencies
   - Test/QA checklist
5) Do not implement in Pass 1 (audit pass). Implement only when Pass 2 is explicitly requested.

We execute in 3 controlled passes for this module:
Pass 1 = audit + target structure only
Pass 2 = implementation / rewiring only
Pass 3 = polish + permissions + empty/loading/error + QA checklist only
Do not jump ahead to the next pass.
```

---

## Module 1 — Foundation / Platform Core

### Pass 1 — Audit

```text
Module: Foundation / Platform Core ONLY.

Scope: org profile, tenant/workspace, departments/units, branches/locations, users, roles/permissions, reference/master data, notifications, audit logs, platform settings, document/attachment foundations at platform level.

Tasks:
1) Find all routes, pages, services, entities, APIs for the above.
2) Map exists vs missing vs duplicated.
3) Propose sidebar: Overview, Organization, Users, Roles & Permissions, Departments, Locations, Reference Data, Notifications, Audit Logs, Settings.
4) List merges/renames/moves; file-by-file plan. No code changes yet.
```

### Pass 2 — Implement

```text
Module: Foundation / Platform Core ONLY — implement Pass 1 plan.

Requirements:
- Overview with summary cards (counts) only if real APIs exist.
- Each sub-page: list + filters + create/edit pattern consistent with platform.
- Roles: separate catalog, permission matrix, assigned users if supported.
- Audit logs: filters (actor, action, date, module) if data exists.

Deliver: routes changed, files touched, blockers, QA notes.
```

### Pass 3 — Polish

```text
Module: Foundation / Platform Core ONLY — production polish.

Verify: guards, breadcrumbs, titles, responsive, validation messages, empty/loading/error states, permission visibility, remove dead routes/labels. Output regression checklist + backend gaps as separate bullets.
```

---

## Module 2 — Governance

### Pass 1 — Audit

```text
Module: Governance ONLY.

Scope: policies, procedures/standards, committees/meetings, decisions, approvals, actions, exceptions/waivers, governance calendar.

Deliver: current scatter, target structure (Overview, Policies, Procedures & Standards, Committees, Decisions, Actions, Exceptions, Calendar), lifecycle definitions (policy and exception), file plan. No code yet.
```

### Pass 2 — Implement

```text
Module: Governance ONLY — implement approved structure.

Wire existing components; policies need status/version/owner/review date; exceptions need approval + expiry; link decisions/actions where DB supports it. Overview KPIs only from real data.
```

### Pass 3 — Polish

```text
Module: Governance ONLY — lifecycle consistency, overdue/due badges, empty states, permission clarity, terminology alignment, drill-down from overview counts.
```

---

## Module 3 — Risk

### Pass 1 — Audit

```text
Module: Risk ONLY.

Scope: register/categories, methodology/scales, assessments, inherent/residual, treatment, KRIs, acceptance, heatmaps/reports, linkages to controls/assets/incidents/findings.

Deliver: fragmentation map, target structure (Overview, Register, Assessments, Methodology, Treatment, KRIs, Acceptance, Heatmap & Reports), end-to-end flow definition, file plan. No code yet.
```

### Pass 2 — Implement

```text
Module: Risk ONLY — implement using existing chart/table patterns only.

Register fields (owner, scores, review date); treatment plans with owners/dates; KRI thresholds if data exists; heatmap uses existing chart approach.
```

### Pass 3 — Polish

```text
Module: Risk ONLY — score consistency across pages, overdue drill-downs, duplicate label cleanup, permission + regression checklist (create → assess → treat → heatmap).
```

---

## Module 4 — Compliance

### Pass 1 — Audit

```text
Module: Compliance ONLY.

Scope: frameworks/versions, controls library, obligations, mappings, assessments, gaps/remediation, posture dashboards.

Deliver: overlap map, target structure (Overview, Frameworks, Controls, Obligations, Assessments, Gaps, Mappings, Posture), end-to-end flow, file plan. No code yet.
```

### Pass 2 — Implement

```text
Module: Compliance ONLY — reuse existing framework/control/assessment UIs; posture and gaps must drill down to real records; preserve local/KSA terminology if already in data.
```

### Pass 3 — Polish

```text
Module: Compliance ONLY — KPI vs record consistency, status/severity badges, empty/error states, regression checklist (activate framework → assess → gap → remediation → posture).
```

---

## Module 5 — Evidence

### Pass 1 — Audit

```text
Module: Evidence ONLY.

Scope: vault, requests, reviews, versioning/expiry, mappings, automation connectors if any, coverage/quality views.

Deliver: current vs scattered entry points, target structure (Overview, Vault, Requests, Reviews, Expiry & Coverage, Automated Collection, Mappings), flows, file plan. No code yet.
```

### Pass 2 — Implement

```text
Module: Evidence ONLY — wire upload/request/review patterns; expiry and coverage views only if APIs exist; centralize entry points where duplicates exist.
```

### Pass 3 — Polish

```text
Module: Evidence ONLY — sensitive-data permissions, version/expiry clarity, regression checklist (upload → request → review → map → expiry alert).
```

---

## Module 6 — Audit and findings

### Pass 1 — Audit

```text
Module: Audit & Findings ONLY.

Scope: audit plan/universe, engagements, workpapers/checklists, findings, CAPA/remediation, validation/closure, reporting.

Deliver: fragmentation, target structure (Overview, Audit Plan, Audits, Findings, CAPA, Validation, Reports), end-to-end flow, file plan. No code yet.
```

### Pass 2 — Implement

```text
Module: Audit & Findings ONLY — link findings to controls/risks/evidence when supported; CAPA milestones; validation states; overview metrics from live queries only.
```

### Pass 3 — Polish

```text
Module: Audit & Findings ONLY — severity/due consistency, reopen rules clarity, regression checklist (plan → audit → finding → CAPA → closure evidence → validate).
```

---

## Module 7 — Reporting / analytics

### Pass 1 — Audit

```text
Module: Reporting / Analytics ONLY.

Scope: executive dashboard, domain analytics (risk/compliance/evidence/audit), scheduled reports, exports, drill-down filters, data-quality indicators.

Deliver: duplicate dashboards/KPIs, target structure (Executive, Risk, Compliance, Audit, Evidence, Scheduled Reports, Exports), KPI ownership + drill targets, file plan. No code yet.
```

### Pass 2 — Implement

```text
Module: Reporting / Analytics ONLY — reuse existing chart library; executive cross-module KPIs only with real endpoints; each KPI links to filtered source page; avoid fake metrics.
```

### Pass 3 — Polish

```text
Module: Reporting / Analytics ONLY — KPI reconciliation with source tables, chart empty states, export behavior, cleanup of duplicate dashboards elsewhere if safe.
```

---

## Suggested order

Foundation → Governance → Risk → Compliance → Evidence → Audit → Reporting.

## Optional 2-pass mode

Merge Pass 2+3 only after Pass 1 is approved **and** the module is small/stable; keep Pass 1 separate whenever the agent tended to wander.
