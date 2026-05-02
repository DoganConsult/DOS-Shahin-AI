# DOS-AIO Architecture — Four-Tier Reference (canonical)

> **The constitution lives at [platform/docs/PLATFORM_OPERATING_MANIFEST.md](../platform/docs/PLATFORM_OPERATING_MANIFEST.md) (28 sections).** This file is the rules-quick-reference. The integrated multi-phase plan is at `/root/.claude/plans/you-are-taking-over-joyful-wave.md`. All three stay in sync.


Canonical reference for the four-tier ownership model. Every file/folder in the repo
belongs to **exactly one** tier. The wording below is the locked version — use it
verbatim in code reviews, READMEs, and PR descriptions.

## The four tiers (locked phrasing)

### `platform/` — system DNA

Unconditional, platform-owned, never tenant-entitled. Provides identity, access,
UI-OS, Foundation, runtime, observability, AI, schemas, **configuration**, and
operating fabric. DNA can be **hidden**, **permission-gated**, **route-gated**,
or **health-gated**, but **never `'not-entitled'`**.

Most platform DNA is not an end-user feature surface. **UI-System ships primitives,
not product pages.** **Foundation is the exception** — it is platform-owned workspace
business fabric.

### `services/` — network-addressable backends

Expose HTTP/RPC verbs, enforce auth/context, and orchestrate platform/module
backend capabilities. They may host backend handlers for a domain, but they
expose that logic through HTTP/RPC. **Services do not own product UI** — domain
UI ownership belongs to modules; product UI composition belongs to products.

### `modules/` — reusable business-domain libraries

Contain domain UI, contracts, API clients, and module-specific logic.
Product-subscribed and tenant-entitled. Multi-product reusable: any product can
enroll any module via `product.manifest.json#enabledModules[]`.

### `products/` — composition-only consumers

Own brand, theme override, route composition, product manifest, and
product-specific pages. **Products do not own access/session/nav/readiness/shell/
generic UI.** Anything not strictly product composition belongs in `platform/`
or `modules/`.

## Hard rules (non-negotiable)

1. **`platform/` must never import `products/`, `modules/`, or product-specific service code.**
2. **`products/` must never own platform DNA.**
3. **`services/` must never import product frontend code.**
4. Single canonical home — every concern has exactly one folder. No dual paths.
   Dead duplicates → `platform/_archive/orphans-<date>/`.
5. Naming: kebab-case, no spaces, no "Module" suffix. Module folder name =
   `moduleCode`. Product folder name = `productCode`. Service folder name =
   `<name>-service`.

## Dependency direction (precise — not strictly linear)

- **`products/`** consume `modules/` + `platform/` UI/access packages.
- **`modules/`** consume `platform/` (contracts/UI/access) and call `services/` through API clients.
- **`services/`** consume `platform/` packages and may use `modules/` backend contracts/domain libraries when explicitly designed for cross-tier reuse.
- **`platform/`** consumes nothing upward.

## Platform DNA visibility (locked)

Platform DNA is unconditional infrastructure, but **not every DNA module appears
in end-user nav**. Only DNA with `workspaceVisible=true` OR a non-empty nav
contract can appear.

A DNA module's nav state can be one of:

| State | When it applies |
|-------|-----------------|
| `hidden` | The DNA module does not declare `workspaceVisible=true` and has no nav contract; or the user holds zero matching permissions. **Important for DAuth/DSOC/DNOC/DOS/AI** when they are not workspace-visible for the current user. |
| `enabled` | All conditions met (workspace-visible + permission held + route wired + health up). |
| `'missing-permission'` | User lacks the required permission for the entry/sub-page. |
| `'backend-offline'` | Health probe failed (`/api/health/<dna-module-code>` returned non-`up`). |
| `'route-not-wired'` | Route catalog has no entry for the path. |

**`'not-entitled'` is forbidden for DNA — by construction.**

Foundation is the only currently nav-visible DNA module by default. DAuth, DNOC,
DSOC, DOS, AI become visible only when their nav contracts + health endpoints
land AND the user has the right permission.

### Foundation visibility nuance

**Foundation entry/overview is always part of the workspace fabric for
authenticated users, but Foundation's sub-pages (and even the Foundation entry
itself) are still per-item permission-gated.** Each entry in
[`platform/foundation/contracts/navigation/navigation.json`](../platform/foundation/contracts/navigation/navigation.json)
carries its own `permission`. Missing permission → `'missing-permission'`.

Examples:
- `/foundation/overview` → `foundation.read`
- `/foundation/users` → `foundation.user.read`
- `/foundation/roles` → `foundation.admin.read`
- `/foundation/audit` → `audit_trail.read`
- `/foundation/access-review` → `access_review:create`

A read-only user sees Overview/Users/Departments/Locations. An admin
additionally sees Roles/Permissions/Access Reviews. An auditor uniquely sees
Audit Trail. **Same tenant, same DNA, different per-user nav projection.**

## Module visibility (locked)

A module should appear only when **both** are true:

1. **Product manifest subscribes to it** (`product.manifest.json#enabledModules[]` includes its `moduleCode`).
2. **Tenant entitlement grants it** (`access.modules()` includes its `moduleCode`).

Therefore `'not-entitled'` applies **only after** the product has subscribed to
the module but the tenant lacks entitlement. If the product hasn't subscribed,
the module isn't emitted into nav at all.

| State | When it applies |
|-------|-----------------|
| `hidden` | Product manifest does not subscribe — not emitted into nav. |
| `enabled` | Subscribed + entitled + permission held + route wired. |
| `'not-entitled'` | Subscribed in manifest, but tenant entitlement missing. |
| `'missing-permission'` | Subscribed + entitled, but user lacks the required permission for that item. |
| `'route-not-wired'` | Subscribed + entitled, but no route in the catalog. |

## Product layer (locked)

Products MAY compose:
- their route map
- their theme overrides
- which `modules/` they subscribe to (in `product.manifest.json#enabledModules[]`)
- product-specific page content

Products MAY NOT own:
- session state
- access logic
- nav resolver core
- readiness probes
- shell primitives
- generic UI components
- any other DNA

Anything not strictly product composition belongs in `platform/` or `modules/`.

## Multi-tenant SaaS / RBAC / Deployment model

**Multi-tenant SaaS rule:** platform DNA is unconditional. `modules/` are
tenant-entitled. `products/` compose. **Services enforce tenant context. Schemas/DB/RLS
isolate data. Roles resolve to permissions.** AI, Dynamic UI, Config, Workflow, and
UI-OS are platform-owned and tenant-aware. **On-prem is a deployment mode, not a
different product.**

### Four deployment models (all supported)

| Model | When | Isolation |
|-------|------|-----------|
| Shared DB + tenant schema | Standard multi-tenant SaaS | `tenant_<code>` schema; platform globals in `dos`/`platform_*`; `tenant_id` + RLS; service guards |
| Shared DB + RLS | Registries, audit, config, entitlements | Shared tables include `tenant_id`; RLS enforces |
| Dedicated DB per tenant | Enterprise / on-prem / high-isolation | Same contracts; resolver must not assume all tenants in one DB |
| On-prem | Customer-controlled infra | Same contracts; external services may be disabled or replaced; no cloud-only assumption |

### Isolation truth (frontend visibility is NEVER security)

Real isolation in this order: gateway → services → DAuth/AccessStore → DB schema/search_path → RLS → OpenFGA/Cerbos → Config OS resolver → Dynamic UI resolver → AI OS tool/memory/context layer. A hidden button is not security.

### Multi-role + multi-tenant

A user may have multiple roles in one tenant AND belong to multiple tenants with
different roles per tenant. **Roles resolve to permissions.** Backend enforces every
sensitive operation. Frontend uses permissions only for enabled/disabled/hidden state.

### Database classification (every table + every migration header)

Every table classified into: A) platform-global, B) tenant-scoped shared,
C) tenant-schema, or D) dedicated-tenant DB. Every migration declares
`owner layer / scope / tenant isolation model / rollback safety / data classification`.

### On-prem first-class

No hardcoded cloud endpoints. No required external model provider. Service URLs from
env/Config OS. Model providers via secret refs. Local observability/DB/Keycloak options
supported. Deterministic upgrade/migration scripts.

Full Phase E spec: `/root/.claude/plans/you-are-taking-over-joyful-wave.md` § Phase E.

## Configuration is platform DNA

**Config is platform DNA.**

- **`platform/config-center/` owns** schemas, resolver, audit, API, and safe UI.
- **products/modules declare** config (defaults, schema, permissions).
- **tenants/users override** config (within their scope).
- **services enforce** config (server-side validation, RBAC).
- **UI-OS and Dynamic UI consume** effective config (read-only, post-resolution).
- **secrets are never frontend config.**

**Config scopes (precedence — lowest to highest):**

```
platform default → environment → product default → module default
                 → tenant override → user override → runtime/session
```

| Scope | Owner | Examples |
|-------|-------|----------|
| `platform` | Platform admin | enabled DNA, auth mode, UI-OS version, default locale |
| `environment` | Deployment | API base URLs, service URLs, **public** runtime flags only on FE |
| `product` | Product owner | theme, title, route composition, subscribed modules |
| `module` | Module owner | per-module defaults, feature flags, validation schema |
| `tenant` | Tenant admin | locale, timezone, enabled modules, sector pack, branding override |
| `user` | End user | language, dir, timezone, dashboard layout, notification prefs |
| `secret` | Server-only | API keys, DB passwords, OAuth secrets — **never** to FE |

**Hard rules:**
1. **Secrets never reach the browser.** Frontend gets only the `public` subset.
2. **No product-local config stores.** Shahin/Tuwaiq/etc. consume the platform config client; they don't own a resolver.
3. **No localStorage for auth/access/runtime config.** Use `@dos/access-store` and `@dos/config-client` instead.
4. **Env variables are deployment inputs, not UI settings.** Classify each as `secret`, `server runtime`, or `public runtime`.
5. **Config keys must be registered in schema.** Free-form `Record<string, any>` config blobs are forbidden.

Full Config OS spec: see `platform/docs/config/` (Phase C0+ deliverables).

## Dynamic UI (clarification)

Dynamic UI **resolves contracts/navigation/widgets** — it is **not** a
product-local hardcoded nav map. Hardcoded module lists, hardcoded
`MODULE_LABELS` maps, and literal mobile-bottom-nav arrays inside product code
are anti-patterns. The 6-layer nav resolver in `@dos/access-store` is the
canonical resolution path.

## Self-registration trial lifecycle + Billing OS (Phases G + H, locked specs)

**Phase G — Trial Lifecycle:** Self-registration = tenant + owner + product trial +
subscription + entitlements + workspace, all created **atomically** by tenant-service.
**Trial duration is Config OS data**, never hardcoded. Trial states:
`trial_pending_verification → trial_active → trial_expiring → trial_grace →
trial_suspended` with branches `trial_converted | trial_cancelled | trial_expired`.
Foundation is platform DNA, never `'not-entitled'` under any trial state.

**Phase H — Billing OS:** Billing is platform DNA. **Payment provider is optional.**
Subscription/trial/entitlement lifecycle works **before** Stripe/Tap/HyperPay/etc.
exists, via `ManualBillingProvider`. Four provider modes: `manual`, `invoice_offline`,
`payment_provider_pending`, `external_provider`. `BillingProvider` interface designed
now; concrete providers plugged later.

Shared DB tables across G+H (one canonical set, no duplication):
`dos.tenant_trials`, `dos.tenant_subscriptions`, `dos.tenant_product_entitlements`,
`dos.tenant_module_entitlements`, `dos.trial_audit_log`, `dos.billing_plans`,
`dos.billing_plan_features`, `dos.billing_audit_log`.

Disabled reasons cumulative across phases: `'not-entitled' | 'trial-expired' |
'trial-limit-reached' | 'subscription-suspended' | 'missing-permission' |
'backend-offline' | 'route-not-wired'`. Foundation never `'not-entitled'`.

Full Phase G + H specs: `/root/.claude/plans/you-are-taking-over-joyful-wave.md`
§ Phases G + H.

## DB-driven UI Management (Phase F, locked spec)

**UI-OS renders components. Dynamic UI resolves what to show. Config OS stores
effective settings. DB stores UI metadata. Code components stay in `@dos/ui-system`
and `modules/products`.**

UI metadata (nav, routes, layouts, widgets, actions, permissions, tenant/user
overrides, versioning, audit) lives in 11 platform-owned `dos.ui_*` tables:
`ui_component_registry`, `ui_route_registry`, `ui_navigation_registry`,
`ui_page_layouts`, `ui_widget_registry`, `ui_widget_placements`,
`ui_action_registry`, `ui_visibility_rules`, `ui_tenant_overrides`,
`ui_user_preferences`, `ui_audit_log`.

Source-of-truth flow: contracts in repo → `pnpm ui-registry:import` → DB → runtime
resolver = DB + Config OS + AccessStore + Workflow + readiness → effective UI for
FE. **Component code is never stored in DB** — only `componentKey + props`,
validated against `dos.ui_component_registry`.

Versioning: `draft → validated → published → archived`. Runtime uses latest
published. Rollback switches active version.

Full Phase F spec: `/root/.claude/plans/you-are-taking-over-joyful-wave.md` § Phase F.

## Source-of-truth files

- Architecture rules: [docs/architecture.md](architecture.md) (this file).
- Module ownership: each module's `module.manifest.json`.
- Product enrollment: each product's `product.manifest.json` → `enabledModules[]`.
- Platform DNA registry: [platform/access/dos-access-store/src/platform-dna.registry.ts](../platform/access/dos-access-store/src/platform-dna.registry.ts).
- Foundation nav contract: [platform/foundation/contracts/navigation/navigation.json](../platform/foundation/contracts/navigation/navigation.json).
- Foundation route catalog: [platform/foundation/contracts/routing/routes.json](../platform/foundation/contracts/routing/routes.json).
- Service routing: [platform/config-center/ops/ecosystem.m1.config.js](../platform/config-center/ops/ecosystem.m1.config.js).
- Config OS: [platform/config-center/contracts/config/](../platform/config-center/contracts/config/) (schemas), [platform/config-center/resolver/](../platform/config-center/resolver/) (merge logic), [platform/docs/config/config-source-inventory.md](../platform/docs/config/config-source-inventory.md) (Phase C0 audit).
- Env config: `platform/config-center/env/<service>.env`.
- Port allocation: [platform/config-center/ops/ports.allocation.json](../platform/config-center/ops/ports.allocation.json).
- Nav resolver: [platform/access/dos-access-store/src/nav-sources/](../platform/access/dos-access-store/).

## Current products (2026-05-01)

| Product | Path | Stage | Domain |
|---------|------|-------|--------|
| Shahin-AI | [products/shahin-ai/](../products/shahin-ai/) | beta | shahin.local, shahin-ai.dogan-ai.os |
| Tuwaiq-AI | [products/tuwaiq-ai/](../products/tuwaiq-ai/) | experimental (scaffold) | tuwaiq-ai.com |
| Dogan-AI | [products/dogan-ai/](../products/dogan-ai/) | experimental (scaffold) | dogan-ai.local |
| DoganConsult | [products/doganconsult/](../products/doganconsult/) | experimental | doganconsult.local |
| DoganHub | [products/doganhub/](../products/doganhub/) | experimental | doganhub.local |
| DoganLab | [products/doganlab/](../products/doganlab/) | experimental | doganlab.local |
