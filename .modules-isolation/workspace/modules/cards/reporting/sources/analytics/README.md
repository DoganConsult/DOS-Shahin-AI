# Analytics module (`analytics`)

Tenant-entitled business module for dashboards, KPIs, datasets, and reporting-related surfaces. **Definition of Done** and roadmap: [docs/module-definition-of-done.md](../../docs/module-definition-of-done.md), [docs/module-dod-wave-1-analytics.md](../../docs/module-dod-wave-1-analytics.md).

## Start here (canonical owners — provisional until Wave 1 completes)

| Owner | Role | Current / target path |
|-------|------|----------------------|
| **Business** | Routes → services → jobs → events wiring | *Target:* single `source/backend/` entry + one `ports/` tree — see wave doc |
| **Dynamic UI** | Shell enrollment, route manifest | `source/frontend/analytics/analytics.routes.ts` (verify no duplicate product-level registrations) |
| **UI system** | Layout, tokens, page states | Module pages should consume `@dos/ui-system` / design tokens — audit in Wave 4 |

## Manifest

- `module.manifest.json` — entitlement, events, owned tables.

## Pilot status

This module is the **first execution batch** for module DOD. Expect duplicate `source/backend/*/ports/` trees until converged; **do not add new parallel port folders**.
