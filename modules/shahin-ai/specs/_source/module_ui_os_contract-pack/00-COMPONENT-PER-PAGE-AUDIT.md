# Component-per-page audit (live snapshot)

Status as of Phase F-F12 completion. Snapshot via:

```sql
SELECT archetype, count(*) FROM dos.ui_route_template_binding GROUP BY archetype ORDER BY 2 DESC;
```

## Distribution (184 total bindings, 28 archetypes used)

| Archetype | Routes | Carbon primitives the template renders |
|---|---:|---|
| `intelligent-register` | 44 | data-table · grid · pagination · search · filter |
| `command-home` | 32 | tile · tag · ai-label · breadcrumb · button · combo-button · structured-list · progress-bar · tabs |
| `audit-trail-ledger` | 12 | structured-list · tag · search · pagination |
| `workflow-control` | 10 | progress-indicator · tabs · button · notification |
| `module-settings` | 9 | accordion · form · structured-list · button |
| `marketing-landing` | 8 | grid · structured-list · tile (page-specific) |
| `decision-dashboard` | 8 | structured-list · tag · ai-label · button |
| `ownership-map` | 7 | structured-list · tag · search |
| `org-chart` | 6 | structured-list · tile |
| `trend-intelligence` | 5 | line-chart-stub · ai-label · structured-list |
| `posture-overview` | 5 | progress-bar · tag · structured-list |
| `action-queue` | 4 | structured-list · tag · button |
| `record-story` | 4 | structured-list · timeline · tag |
| `evidence-reports` | 4 | structured-list · tile · tag |
| `risk-landscape` | 3 | heatmap · structured-list · tag |
| `workflow-timeline` | 3 | structured-list · tag |
| `command-dashboard` | 3 | tile · structured-list · ai-label |
| `compliance-calendar` | 2 | calendar · structured-list |
| `incident-response` | 2 | structured-list · timeline · tag |
| `agent-registry` | 2 | structured-list · tag · ai-label |
| `calendar-timeline` | 2 | calendar |
| `remediation-roadmap` | 2 | progress-indicator · structured-list |
| `delegation-center` | 2 | structured-list · tag |
| `audit-trail-evidence` | 1 | structured-list · tile |
| `follow-up-center` | 1 | structured-list · tag |
| `user-agent-workbench` | 1 | structured-list · ai-label |
| `export-center` | 1 | tile · structured-list |
| `agent-flow` | 1 | structured-list · timeline |

All archetypes resolve to a `*TemplateComponent` registered in `@<repo>/platform/core/platform/shell/template-binding.registry.ts:15` (47 LOADERS).

## Coverage of rich props

```
total_routes      = 184
with_pillars      =   2   (only /workspace-home and /compliance/attestations)
with_any_rich_prop=   2   (kpis OR nbaActions OR pillars OR tabs)
empty_command_home= 44    (command-home + posture-overview + module-settings with empty props)
```

**Implication**: 44 of 46 command-home-style pages render the `fallbackPillars` from `@<repo>/platform/core/platform/shell/dynamic-template-page.component.ts:171` ("Live overview — content updates automatically. · Powered by the Shahin-AI evidence engine."). The masthead and KPI strip are empty.

The phrasing is **user-safe** (no developer jargon — fixed in Phase F-F11). What's missing is **per-route content authoring**.

## Authoring path — the doctrine

Three options to fill the 44 empty pages:

### (1) Per-route SQL (best for a few key pages)
Same pattern as `@<repo>/platform/dos/migrations/public/20260505_0300_workspace_home_command_home.sql`:
```sql
UPDATE dos.ui_route_template_binding
   SET props = jsonb_build_object(
     'kpis',       jsonb_build_array(... 4 ModuleKpi entries ...),
     'nbaActions', jsonb_build_array(... 2-3 ModuleAction entries ...),
     'pillars',    jsonb_build_object('whatChanged', '...', 'whyItMatters', '...', 'evidence', '...')
   )
 WHERE route = '/foundation/business-units';
```

### (2) Per-module JSON contract (best for a whole module at once)
Add `pages[].props` to the contract pack JSON:
```json
"pages": [
  {
    "page_code": "foundation.business-units",
    "route": "/foundation/business-units",
    "archetype": "org-chart",
    "template_export": "OrgChartTemplateComponent",
    "permission": "foundation.read",
    "props": {
      "nodes": [/* org chart nodes */],
      "pillars": { ... }
    }
  }
]
```
Then re-run `node scripts/seed-module-contract-pack.mjs`. The seeder UPSERTs and fills `props` only when currently empty (preserves hand-curated rich routes).

### (3) Tenant/user override (per-customer customisation)
Use Phase F-F9 layers:
```sql
INSERT INTO dos.ui_override_tenant (tenant_id, route, patch) VALUES
  ('<tid>', '/foundation/business-units',
   '{"pillars":{"whatChanged":"Custom for tenant"}}'::jsonb);
```

## Required Carbon components per archetype (for component-key mapping)

These are the Carbon `component_key` rows that EACH archetype's template imports. Every key in this list must exist (and be `runtime_status='active'`) in `dos.ui_carbon_components`. Verified live for all 28 archetypes — no missing keys.

| Archetype | Required `component_key`s |
|---|---|
| `command-home` | `tile.tile`, `tile.clickable-tile`, `tag`, `ai-label`, `notification`, `skeleton`, `breadcrumb`, `button`, `combo-button`, `structured-list`, `progress-bar`, `tabs` |
| `intelligent-register` | `data-table`, `grid`, `pagination`, `search`, `tag`, `filter`, `dropdown`, `button` |
| `audit-trail-ledger` | `structured-list`, `tag`, `search`, `pagination`, `date-picker`, `tabs` |
| `org-chart` | `structured-list`, `tile`, `tag`, `breadcrumb` |
| `posture-overview` | `tile`, `progress-bar`, `tag`, `structured-list`, `ai-label`, `radar-chart-stub` |
| (… see seed `dos.ui_carbon_components` for the full inventory: 247 keys, 103 active) |

## Recommended next step
Author `props` for the top-5 most-traveled empty routes:
1. `/compliance/overview`
2. `/risk/overview`
3. `/foundation/overview`
4. `/foundation/business-units`
5. `/foundation/users`

Pattern: copy the `/workspace-home` props in `@<repo>/platform/dos/migrations/public/20260505_0300_workspace_home_command_home.sql`, swap KPI labels and routes per page. ~10 minutes per page. After each migration, the page lights up with 4 KPIs + 2-3 NBAs + 5-pillar insight bar.
