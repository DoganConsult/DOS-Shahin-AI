# Compliance Module — Substrate Needs Manifest (Step 1: Inventory)

> Layered audit of every platform substrate compliance depends on. For each layer:
> **PROVIDES** (what the substrate exposes), **CURRENT** (what compliance imports today),
> **NEEDS** (what should be declared in `module.manifest.json`), **VIOLATIONS** (rule breaks to fix).

Generated 2026-05-02.

---

## Layer 1 — Keycloak (Identity Provider)

**PROVIDES**
- OIDC realm `dogan` on `auth.shahin-ai.com` / `auth.dogan-ai.com`
- One client per product brand
- Realm roles, composite roles, group mappers
- PKCE login round-trip
- Token introspection endpoint
- Theme files at `/opt/keycloak/themes/`

**CURRENT** — `0` direct imports. ✅ Module never touches Keycloak directly.

**NEEDS** (declare in manifest)
```json
"identity": {
  "provider": "keycloak",
  "realm": "dogan",
  "clientScopes": ["openid", "profile", "compliance.read", "compliance.write"],
  "claims": ["sub", "tenantId", "permissions", "preferred_username"],
  "rolesConsumed": [
    "compliance.admin",
    "compliance.officer",
    "compliance.auditor",
    "compliance.viewer"
  ]
}
```

**VIOLATIONS** — none.

---

## Layer 2 — DAuth (Authorization Wrapper)

**PROVIDES**
- `@dos/dauth-shared` — `authenticate`, `requirePermission`, `requireAnyPermission`, `requireSuperAdmin`, `requireTenantId`, `requireDauth`, `requireOwnershipOf`
- AccessStore (`@dos/access-store`) — runtime permission resolution
- Session service (`@app/dauth/session/session.service`) — Angular side, lives in product

**CURRENT**
- `infrastructure/persistence/auth.adapter.ts` re-exports from `@dos/dauth-shared` ✅
- `bootstrap.ts` mounts via `auth.port.ts` ✅
- **3 UI files** import `@app/dauth/session/session.service` directly:
  - `ui/features/compliance/pages/frameworks-group/framework-mapping/framework-mapping.component.ts`
  - `ui/features/compliance/pages/assessments-group/sama-assessment/sama-assessment.component.ts`
  - `ui/features/compliance/pages/assessments-group/nca-assessment/nca-assessment.component.ts`

**NEEDS** (declare in manifest)
```json
"authorization": {
  "permissionPrefix": "compliance",
  "permissionsDeclared": [
    "compliance.read",
    "compliance.write",
    "compliance.approve",
    "compliance.export",
    "compliance.admin"
  ],
  "rolesGranted": {
    "compliance.officer":  ["compliance.read", "compliance.write"],
    "compliance.auditor":  ["compliance.read", "compliance.export"],
    "compliance.admin":    ["compliance.read", "compliance.write", "compliance.approve", "compliance.export", "compliance.admin"],
    "compliance.viewer":   ["compliance.read"]
  },
  "ports": ["@dos/dauth-shared", "@dos/access-store"],
  "ownershipChecks": ["framework", "control", "assessment", "obligation", "attestation"]
}
```

**VIOLATIONS**
- ❌ 3 UI components import `@app/dauth/...` (product-coupled). Must go through a UI port: `compliance/ui/ports/session.port.ts` injected by host.

---

## Layer 3 — Platform DNA (`@dos/*` packages)

**PROVIDES** — used by every module
- `@dos/platform-core/http` — express middleware, error handler, request context
- `@dos/platform-core/resilience` — retry, circuit-breaker, timeout
- `@dos/platform-core/workflows` — `createProcessTask`, lifecycle helpers
- `@dos/platform-core/observability` — logger, tracer, metrics
- `@dos/platform-core/jobs` — outbox, scheduler
- `@dos/platform-core/events` — domain event bus
- `@dos/platform-core/lifecycle` — module lifecycle hooks
- `@dos/platform-core/notifications` — outbound notification port
- `@dos/platform-core/storage` — blob/file storage port
- `@dos/platform-core/tenancy` — `withTenantClient`, RLS
- `@dos/platform-core/constants` — shared enums
- `@dos/platform-core/shell/navigation/navigation-integration` — nav contract
- `@dos/db` — postgres pool, RLS, migration runner
- `@dos/types` / `@dos/types/errors` / `@dos/types/express` / `@dos/types/db` — shared TS types
- `@dos/module-sdk` — module helpers (audit, lifecycle factories)
- `@dos/module-auth` — auth middleware factory
- `@dos/module-soc` — SoD, segregation runtime
- `@dos/module-dos` — platform meta-module
- `@dos/event-backbone` — cross-module event router
- `@dos/service-client` — typed cross-service HTTP client
- `@dos/service-bootstrap` — service start helpers
- `@dos/dauth-shared` — auth (Layer 2)

**CURRENT** — heavy, healthy usage:

| Package | Imports |
|---|---|
| `@dos/db` | 99 |
| `@dos/types` | 73 |
| `@dos/module-sdk` | 70 |
| `@dos/platform-core/http` | 65 |
| `@dos/platform-core/resilience` | 63 |
| `@dos/module-auth` | 15 |
| `@dos/platform-core/workflows` | 13 |
| `@dos/platform-core/observability` | 12 |
| `@dos/platform-core/jobs` | 7 |
| `@dos/platform-core/lifecycle` | 6 |
| `@dos/platform-core` (root) | 6 |
| others (events, constants, tenancy, notifications, storage, shell, service-client) | 1–3 each |

**NEEDS** (declare in manifest)
```json
"platform": {
  "runtime": "@dos/platform-core",
  "minVersion": "1.0.0",
  "dependsOn": [
    "@dos/db",
    "@dos/types",
    "@dos/module-sdk",
    "@dos/module-auth",
    "@dos/platform-core/http",
    "@dos/platform-core/resilience",
    "@dos/platform-core/workflows",
    "@dos/platform-core/observability",
    "@dos/platform-core/jobs",
    "@dos/platform-core/events",
    "@dos/platform-core/lifecycle",
    "@dos/platform-core/notifications",
    "@dos/platform-core/storage",
    "@dos/platform-core/tenancy",
    "@dos/event-backbone",
    "@dos/service-client",
    "@dos/dauth-shared"
  ],
  "portsImplemented": [
    "auth", "audit", "database", "ai", "dynamic-ui",
    "foundation", "events", "jobs", "lifecycle",
    "logger", "middleware", "platform", "resilience",
    "schemas", "soc", "errors"
  ]
}
```

**VIOLATIONS** — none in platform layer.

---

## Layer 4 — Foundation (Platform DNA)

**PROVIDES**
- Employee lifecycle (13-state machine)
- Departments / Org Units / Scope tree
- SoD evaluation engine (`SoDEvaluationInput`, `SoDEvaluationResult`)
- Authority Matrix
- 6 workflow templates
- Foundation events: `foundation.scope_changed`, `foundation.org_created`

**CURRENT**
- `ports/foundation.port.ts` defines the contract ✅
- `bootstrap.ts` requires `getFoundationPort` injection ✅
- `application/observability/health.ts` uses `getFoundationPort` for readiness ✅
- `interface/security/publish.ts` calls SoD evaluation through port ✅
- `application/compliance/assessments/compliance-audit-export.service.ts` uses `compliance-foundation-lookups.service` (internal lookup that hits Foundation) ✅
- 1 internal cross-route import (orphan: `compliance-workspace.routes.ts` → `cws-posture-foundation.routes.ts`) — to be fixed by route consolidation

**NEEDS** (declare in manifest)
```json
"foundation": {
  "tablesConsumed": ["employees", "departments", "org_units", "authority_matrix"],
  "eventsSubscribed": ["foundation.scope_changed", "foundation.org_created"],
  "sodPolicies": [
    "control_owner_cannot_test",
    "approver_cannot_be_assessor",
    "obligation_creator_cannot_close"
  ],
  "lifecycleHooks": ["employee.terminated → revoke compliance.* roles"],
  "port": "./ports/foundation.port.ts"
}
```

**VIOLATIONS** — minor (cross-route import inside orphans, addressed by route consolidation step).

---

## Layer 5 — AI Module / AI-OS

**PROVIDES**
- `platform/ai/services/engine` (port 4008)
- `platform/ai/services/gateway` (port 4007) — `gatewayJSON`, `gatewayComplete`
- `platform/ai/services/governance` (port 4034) — Langfuse, evals
- `@dos/ai-sdk` (target — currently uses raw paths)
- 13 agents A01–A13
- Memory store (`ai_drafts`)
- Tool registry, model router, kill switch

**CURRENT**
- `ports/ai.port.ts` defined ✅
- **3 direct violations** — code reaches into `ai/services/gateway/ai-gateway.service` instead of using the port:
  - `application/compliance/assessments/compliance-assessment-findings.service.ts`
  - `infrastructure/integrations/vendor/services/misc/regulator-portal.service.ts`
  - `application/regulatory-submission/ai-narrative.ts`

**NEEDS** (declare in manifest)
```json
"ai": {
  "agentsUsed": [
    "A03_compliance_officer",
    "A05_assessment_analyst",
    "A09_regulatory_writer"
  ],
  "tools": [
    "compliance.draftFinding",
    "compliance.summarizeEvidence",
    "compliance.classifyControl",
    "compliance.draftRegulatorReply"
  ],
  "models": {
    "primary": "claude-opus-4-7",
    "fallback": "claude-sonnet-4-6",
    "offline": "ollama-stub"
  },
  "promptTemplates": "./application/ai/prompts/",
  "memoryNamespaces": ["compliance.drafts", "compliance.findings"],
  "evalSets": ["langfuse:compliance.findings.v1", "langfuse:compliance.regulator.v1"],
  "port": "./ports/ai.port.ts"
}
```

**VIOLATIONS**
- ❌ 3 files bypass the port. Must route through `getAiPort().gatewayJSON(...)` etc.

---

## Layer 6 — UI System (`@dos/ui-system`)

**PROVIDES**
- Carbon-based design tokens (`tokens.css`, `styles.css`)
- Standalone Angular components (Button, Tile, DataTable, Tag, Modal, Drawer, Tabs)
- Layout primitives (Shell, Header, Sidebar, Footer)
- Form controls (Input, Select, Combobox, DatePicker)
- Charts wrapper (`@app/charts` → echarts)
- Language switcher
- Breakpoint observer
- Notification toast
- Theme service (light/dark/RTL)

**CURRENT** — `0` imports of `@dos/ui-system` from `ui/`. ❌

**NEEDS** (declare in manifest)
```json
"uiSystem": {
  "designSystem": "@dos/ui-system",
  "tokensImported": true,
  "componentsUsed": [
    "ds-button", "ds-tile", "ds-data-table", "ds-tag",
    "ds-modal", "ds-drawer", "ds-tabs", "ds-form-grid",
    "ds-input", "ds-select", "ds-date-picker",
    "ds-language-switcher", "ds-toast"
  ],
  "themesSupported": ["light", "dark"],
  "rtl": true,
  "i18n": ["en", "ar"]
}
```

**VIOLATIONS**
- ❌ 0 of 105 UI components import `@dos/ui-system`. Compliance UI is rolling its own primitives — must migrate to ui-system before "drop-in reusable" is true.

---

## Layer 7 — Dynamic UI (UI Metadata Resolver)

**PROVIDES**
- `@dos/ui-contracts` — schema for nav, routes, layouts, widgets, actions
- `@dos/ui-os` runtime — resolves manifest + Config OS + AccessStore + Workflow + readiness → final UI
- `dos.ui_*` 11 metadata tables (nav/routes/layouts/widgets/actions/perms/tenant+user overrides)
- Component registry — modules register components by name
- Seed manifest (`db/seeds/dynamic-ui/index.json`)

**CURRENT**
- `ports/dynamic-ui.port.ts` defined ✅
- `application/ui/register-components.ts` registers via port ✅
- `ui/component-registry.ts` ships seed manifest ✅
- `application/observability/health.ts` checks port readiness ✅

**NEEDS** (declare in manifest)
```json
"dynamicUI": {
  "componentsRegistered": [
    "compliance.framework-list",
    "compliance.control-detail",
    "compliance.assessment-runner",
    "compliance.posture-heatmap",
    "compliance.gap-board",
    "compliance.attestation-campaign",
    "compliance.regulator-bulletin",
    "compliance.ksa-sector-maturity"
  ],
  "navContributions": [
    { "id": "compliance",          "label": "compliance.nav.label",          "icon": "shield",  "route": "/compliance",          "permission": "compliance.read" },
    { "id": "compliance.controls", "label": "compliance.nav.controls",       "icon": "list",    "route": "/compliance/controls", "permission": "compliance.read" },
    { "id": "compliance.frameworks","label":"compliance.nav.frameworks",     "icon": "book",    "route": "/compliance/frameworks","permission": "compliance.read" },
    { "id": "compliance.assessments","label":"compliance.nav.assessments",   "icon": "checkmark","route": "/compliance/assessments","permission": "compliance.read" },
    { "id": "compliance.gaps",     "label": "compliance.nav.gaps",           "icon": "warning", "route": "/compliance/gaps",     "permission": "compliance.read" },
    { "id": "compliance.regulator","label": "compliance.nav.regulator",      "icon": "building","route": "/compliance/regulator","permission": "compliance.export" }
  ],
  "seedManifest": "./db/seeds/dynamic-ui/index.json",
  "port": "./ports/dynamic-ui.port.ts"
}
```

**VIOLATIONS** — none.

---

## Layer 8 — Services (audit / notification / workflow / tenant / config)

**PROVIDES**
- `services/audit-service` (port 4040) — write/query audit trail
- `services/notification-service` — outbound notifications
- `services/tenant-service` (port 4060) — tenant resolution, gateway-origin HMAC
- `services/admin-service` (port 4080)
- Config Center (`platform/config-center`, `@dos/runtime-config`)
- Workflow runtime (in `@dos/platform-core/workflows`)

**CURRENT**
- `infrastructure/messaging/consumer.ts` uses `@dos/service-client` ✅
- `infrastructure/persistence/notification.adapter.ts` uses `@dos/service-client` ✅
- `infrastructure/integrations/{dora,admin}/ports/lifecycle.port.ts` uses `@dos/platform-core/workflows` ✅
- `interface/http/misc/helpers.ts` uses `createProcessTask` ✅
- 27 references total — all healthy via shared clients

**NEEDS** (declare in manifest)
```json
"services": {
  "audit": {
    "client": "@dos/service-client",
    "writes": ["compliance.framework.*", "compliance.control.*", "compliance.assessment.*"],
    "retentionDays": 2555
  },
  "notification": {
    "channels": ["email", "in-app"],
    "templates": [
      "compliance.assessment_due",
      "compliance.gap_opened",
      "compliance.attestation_request",
      "compliance.regulator_bulletin"
    ]
  },
  "workflow": {
    "templates": [
      "compliance.assessment_review",
      "compliance.gap_remediation",
      "compliance.attestation_campaign",
      "compliance.regulator_submission"
    ],
    "stateMachines": ["framework", "control", "assessment", "obligation", "attestation"]
  },
  "tenant": { "client": "@dos/service-client", "gatewayOriginHmac": true },
  "config": {
    "namespace": "compliance",
    "scopes": ["platform", "environment", "product", "module", "tenant", "user"],
    "schema": "./config/schema.ts"
  }
}
```

**VIOLATIONS** — none.

---

## Layer 9 — Database (`@dos/db`)

**PROVIDES**
- Schema-per-tenant + RLS (`app.current_tenant_id`)
- Migration runner (`dos_migrator`) with `dos.tenant_migrations` tracking
- `withTenantClient` / `withPlatformClient`
- `tquery` / `pquery` helpers

**CURRENT** — 99 imports of `@dos/db`. ✅

**NEEDS** (declare in manifest)
```json
"database": {
  "ownedSchema": "compliance",
  "ownedTables": [
    "frameworks", "controls", "compliance_mappings",
    "compliance_assessments", "compliance_gaps", "compliance_requirements",
    "control_objectives", "control_testing", "control_evidence_links",
    "attestation_campaigns", "attestation_records", "attestation_drafts",
    "csa_campaigns", "csa_responses", "ucf_controls", "crosswalk_mappings",
    "sod_conflict_matrix", "regulator_bulletins", "submission_packets",
    "ksa_sector_maturity", "ksa_regulatory_changes", "ksa_regulatory_reports"
  ],
  "referencedTables": [
    "tenants", "users", "workflow_instances", "risks",
    "evidence_items", "policies", "audit_trail",
    "employees", "departments", "org_units"
  ],
  "migrations": "./db/migrations",
  "seeds": "./db/seeds",
  "rls": true,
  "tenantIsolationGate": "tquery|withTenantClient mandatory"
}
```

**VIOLATIONS** — sweep done in Compliance Sprint 1; re-verify with tenant-isolation gate.

---

## Layer 10 — Events / Outbox

**PROVIDES**
- `@dos/event-backbone` — cross-module event router
- Outbox dispatcher pattern
- Domain event bus

**CURRENT** — 2 imports of `@dos/event-backbone`, plus internal event handlers wired via `ports/events.port.ts`. ✅

**NEEDS** (declare in manifest) — already in current manifest under `events.publishes` / `events.subscribes`. Keep.

---

## Summary — Manifest Schema (proposed v2)

```
module.manifest.json
├── core:           id, version, kind, ownership, status, lifecycle
├── identity:       Keycloak realm/client/scopes/claims/roles  ← NEW
├── authorization:  permissions, role grants, ownership checks ← NEW
├── platform:       @dos/* deps + ports implemented            ← NEW
├── foundation:     tables/events/SoD policies                 ← NEW
├── ai:             agents/tools/models/prompts/memory         ← NEW
├── uiSystem:       components used, themes, RTL, i18n         ← NEW
├── dynamicUI:      registered components, nav contributions   ← NEW
├── services:       audit/notif/workflow/tenant/config         ← NEW
├── database:       owned/referenced tables, migrations, RLS   ← expanded
├── events:         publishes/subscribes                       ← keep
└── routeBases:     HTTP mount points                          ← keep
```

## Open Violations (must fix before "drop-in reusable")

| # | Layer | File(s) | Fix |
|---|---|---|---|
| 1 | DAuth (UI) | 3 components import `@app/dauth/session/...` | Inject session via UI port |
| 2 | AI | 3 services import `ai/services/gateway/ai-gateway.service` directly | Route through `ports/ai.port.ts` |
| 3 | UI System | 0 of 105 UI components use `@dos/ui-system` | Migrate primitives to ui-system |
| 4 | Self-enclosure | `_inbound/`, `_legacy/`, `node_modules/` tracked in repo | Remove from tree |
| 5 | Routes | 78 orphan route files in `interface/http/{misc,cws,ksa,regulator,compliance,admin}/` | Mount or delete (decided in earlier audit) |

---

## Step 1 result: ✅ inventory complete

Next steps (in order):
- **Step 2:** Apply manifest v2 schema (replace current `module.manifest.json`).
- **Step 3:** Fix 5 violations above.
- **Step 4:** Flatten `interface/http/` (route consolidation from earlier audit).
- **Step 5:** Migrate UI to `@dos/ui-system`.
- **Step 6:** Standalone-build smoke (`pnpm --filter @dos/module-compliance build && test`).
- **Step 7:** Drop-in proof — copy `modules/compliance/` into a fresh product host, verify boot.
