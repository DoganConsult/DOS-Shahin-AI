# Dogan-AI OS Platform Operating Manifest

> **The constitution.** Every decision must protect this model. Do not invent a local shortcut that violates it.
> Companion: [`/root/.claude/plans/you-are-taking-over-joyful-wave.md`](../../../.claude/plans/you-are-taking-over-joyful-wave.md) (active phased plan A–T) and [`docs/architecture.md`](../../docs/architecture.md) (canonical rules).

## Purpose

Dogan-AI OS is **not one product**. Dogan-AI OS is a multi-tenant, role-based, AI-native enterprise operating system that can host, manage, and scale many products now and later. **Shahin-AI is only the first product.**

The platform must support:
- Shahin-AI GRC now
- Future products later
- Shared modules across products
- Cloud SaaS
- Private SaaS
- On-prem deployment
- Strict tenant isolation
- Platform-owned AI, UI, config, workflow, billing, access, and audit

---

# 1. Non-Negotiable Architecture Rules

## 1.1 One Platform OS

There is one platform operating system. Platform DNA lives under `platform/`. Platform owns: identity, access, roles, permissions, UI system, dynamic UI resolver, config resolver, AI OS, workflow, billing, trials, readiness, audit, registry, provisioning, security, secrets, data governance, integrations, notifications, SDKs, admin console.

**No product may duplicate platform DNA.**

## 1.2 Products Consume

Products live under `products/`. Products are composition-only.

A product **may** own: product manifest, theme override, product-specific pages, route composition, landing/marketing, product-specific UX placement.

A product **must not** own: session state, access state, nav resolver core, readiness probes, shell primitives, generic UI, billing lifecycle, trial lifecycle, AI runtime, workflow engine, config resolver, tenant isolation, entitlement logic.

## 1.3 Modules Are Shared Business Libraries

Modules live under `modules/`. Modules are reusable business-domain libraries (risk, compliance, audit, evidence, controls, policy, vendor, incident, asset, reporting).

Modules **may** own: domain UI, domain contracts, domain API clients, module-specific workflows, module-specific AI tools/context, module-specific config declarations.

Modules are tenant-entitled. A product subscribes to modules in its product manifest. A tenant receives modules through entitlements.

## 1.4 Services Are Network Verbs

Services live under `services/`. Services are backend runtime processes exposing HTTP/RPC verbs: read, write, validate, transform, provision, audit, execute, notify.

Services **must not** own product UI. Services **must** enforce tenant/user/access context. Services **must** use platform contracts and SDKs.

## 1.5 Platform DNA Is Unconditional

Platform DNA is not tenant-entitled. Platform DNA is **never** disabled as `not-entitled`. Allowed DNA states: `hidden | enabled | missing-permission | backend-offline | route-not-wired | coming-soon`.

Foundation is platform DNA and the workspace business fabric. Foundation is **platform-owned**. Shahin **consumes** Foundation. Foundation is **never Shahin-owned**.

---

# 2. Four-Tier Model

| Tier | Path | What It Is | What It Is Not |
|------|------|------------|----------------|
| Platform DNA | `platform/` | Unconditional OS fabric: identity, access, UI-OS, Dynamic UI, Config OS, AI OS, Foundation, workflow, billing, audit, security | Not a product, not tenant-entitled, not duplicated |
| Services | `services/` | Network-addressable backend verbs | Not product UI, not frontend composition |
| Modules | `modules/` | Reusable tenant-entitled business libraries | Not products, not unconditional DNA |
| Products | `products/` | Composition/brand/deployment experiences | Not platform DNA, not module internals |

Dependency direction:

```
products consume modules + platform
modules consume platform and call services
services consume platform and approved contracts
platform consumes nothing upward
```

**Platform must never import product code.**

---

# 3. UI-OS

## 3.1 Rule

**UI-OS renders.** It does not resolve business logic. It does not own product state. It does not read secrets. It does not hardcode Shahin.

Canonical location: `platform/ui-system/`. Packages: `@dos/design-tokens`, `@dos/ui-contracts`, `@dos/ui-system`.

## 3.2 UI-OS Owns

All generic reusable UI: design tokens, themes, shell, header, sidebar, workspace nav, nav item, nav section, mobile nav, drawer, bottom sheet, account menu, page header, cards, metric cards, service cards, responsive grid, empty state, loading state, status banner, tabs, command bar, badges/chips, modal/dialog, table/list/form wrappers when generic, AI assistant primitives when generic.

## 3.3 Products and Modules Consume UI-OS

Products/modules may not create local generic UI primitives. Forbidden in products: local shell, local sidebar, local nav row, local generic card system, local generic page header, raw workspace layout CSS, duplicate design system.

## 3.4 Master UI Library — IBM Carbon Design System (locked)

The platform's **master component library** is **IBM Carbon Design System for Angular** (`carbon-components-angular`, Apache-2.0). This is the canonical, world-leading, KSA-/Arabic-/RTL-aware enterprise design system the platform standardises on. All screens — workspace shell, module pages, admin console, AI surfaces, public-facing — render through Carbon primitives.

**Authoritative packages** (installed at product level):
- `carbon-components-angular` — 60+ Angular components (Button, Tile, Table, DataTable, Modal, Notification, Header, SideNav, Tabs, Forms, Toggle, Loading, Pagination, Breadcrumb, etc.)
- `@carbon/styles` — canonical token + component CSS straight from IBM
- `@carbon/icons-angular` — ~2,000 official Carbon icons
- `@carbon/charts-angular` — Carbon Charts (D3-based)
- `@carbon/themes` — White / Gray 10 / Gray 90 / Gray 100 themes
- `@carbon/grid`, `@carbon/layout`, `@carbon/motion`, `@carbon/type`, `@carbon/colors` — token packages
- `@carbon/pictograms` — illustration set

**Authoritative source** (when in doubt, this is the law):
- Storybook: https://angular.carbondesignsystem.com/
- GitHub: https://github.com/carbon-design-system/carbon-components-angular
- Design site: https://carbondesignsystem.com/
- TableModule docs: https://angular.carbondesignsystem.com/documentation/modules/TableModule.html

**Locked rules**:
1. **No competing UI library.** PrimeNG, Angular Material, NG-ZORRO, Tabler, custom-from-scratch primitives are FORBIDDEN as new code. Existing PrimeNG usage (3 leaf components on the landing page) is grandfathered and migrates to Carbon when those pages are next touched.
2. **`@dos/ui-system` becomes a thin facade.** Components in `@dos/ui-system/` are allowed only as: (a) compositions of `<ibm-*>` Carbon components; (b) thin wrappers that add manifest-/contract-driven props the raw Carbon component lacks; (c) shell layout glue that's product-neutral. New raw HTML/CSS components are forbidden — the equivalent Carbon primitive must exist or this rule blocks the change.
3. **Tokens are Carbon's `--cds-*` first.** Platform-extended tokens (`--dos-color-trial-*`, etc.) are allowed only when no Carbon equivalent exists. Refactor existing platform tokens to alias `--cds-*` where overlap exists.
4. **Icons come from `@carbon/icons-angular`.** The previous `DosIcon` component (custom inlined SVGs) is deprecated; replace with `<svg ibmIcon="ChevronRight16">` etc. as templates are touched.
5. **Forms come from Carbon Form components.** The `@ngx-formly/primeng` integration is deprecated; forms render through Carbon's `ibm-text-input`, `ibm-dropdown`, `ibm-radio`, `ibm-checkbox`, `ibm-date-picker`, `ibm-search`, `ibm-toggle`, `ibm-file-uploader` etc., or a Carbon Formly bridge if one is added later.
6. **Tables use `<ibm-table>` from `TableModule`.** Foundation Users / Teams / Roles / Locations / Audit-trail / etc. all consume `Table`, `TableModel`, `TableItem`, `TableHeaderItem` from `carbon-components-angular`. The Storybook "Basic" demo at `/?path=/story/components-table--basic` is the canonical reference; source: `src/table/table.component.ts` + `src/table/table.stories.ts` in the carbon-components-angular GitHub repo.
7. **Brand override via Carbon themes only.** Shahin/Tuwaiq-AI/etc. brand colours plug into Carbon's theme tokens (`$tag-color-blue`, `$button-primary`, etc.) via the SCSS theme layer; products do not author standalone CSS.
8. **Storybook parity.** Every screen we ship must look at-or-better than the matching Carbon Storybook story. PRs that ship UI without referencing the matching `https://angular.carbondesignsystem.com/?path=/story/...` page are rejected.

**Why Carbon (and not PrimeNG/Material/etc.)**: Apache-2.0; IBM-funded long-term; world-leading enterprise design system; deeply Arabic/RTL/Hijri aware via IBM Plex Arabic + Tajawal already loaded; 2,000+ official icons; pictograms set; semantic accessible-by-default components; one master vocabulary across all platform surfaces.

**This rule supersedes all earlier UI-OS guidance about hand-rolled primitives.**

---

# 4. Dynamic UI

## 4.1 Rule

**Dynamic UI resolves.** UI-OS renders. Dynamic UI tells the shell what to show.

Canonical owner: `platform/dynamic-ui/` + `services/dynamic-ui-service/`.

Resolves: workspace navigation, route catalog, page layout, widget placement, action availability, component keys, module visibility, platform DNA visibility, role/permission filtering, workflow-state actions, tenant/user overrides, feature flags, readiness/health states.

Dynamic UI must not output raw HTML. Must not hardcode Shahin. Must not fake entitlements.

## 4.2 Source Order

```
Config OS effective config
→ Platform DNA contracts
→ Module contracts
→ Product manifest/composition
→ AccessStore / DAuth
→ Workflow / readiness
→ Survival fallback only if real sources fail
```

Fallback routes only: `/workspace-home`, `/profile`, `/settings`, `/tenant-profile`, `/tenant-settings`. Fallback is survival only, not source of truth.

---

# 5. Config OS

## 5.1 Rule

**Config is platform DNA.** Canonical owner: `platform/config-center/` + `services/config-center-service/`.

Owns: config schemas, config resolver, config validation, effective config, config audit, secret references, platform/product/module/tenant/user config scopes.

## 5.2 Config Scopes

`platform | environment | product | module | tenant | user | secret`. Secrets are never frontend config. Secrets are references only.

## 5.3 Resolution Order

```
platform default → environment override → product default → module default
                 → tenant override → user override → runtime/session context
```

No product-local config resolver.

---

# 6. DB-Driven UI Management

## 6.1 Rule

**DB stores UI metadata, not component code.** DB stores: navigation, route registry, page layouts, widget placements, component keys, action definitions, visibility rules, permission requirements, tenant overrides, user preferences, workflow-aware action states, versioning/audit metadata.

DB does not store: Angular source, raw HTML, raw CSS, secrets, product-local shell code, backend business logic.

## 6.2 Registry Tables

`dos.ui_component_registry`, `dos.ui_route_registry`, `dos.ui_navigation_registry`, `dos.ui_page_layouts`, `dos.ui_widget_registry`, `dos.ui_widget_placements`, `dos.ui_action_registry`, `dos.ui_visibility_rules`, `dos.ui_tenant_overrides`, `dos.ui_user_preferences`, `dos.ui_audit_log`.

Runtime uses latest published version.

---

# 7. Access, RBAC, and Multi-Tenancy

## 7.1 Rule

**Frontend visibility is not security.** Tenant isolation must be enforced by: gateway, DAuth, services, database schema/search_path, RLS, OpenFGA/Cerbos where used, Config OS, Dynamic UI, AI OS, Workflow.

## 7.2 Tenant Context

Every authenticated request resolves: `tenantId, userId, productCode, roles[], permissions[], tenantModules[], locale, direction, correlationId`. Do not trust frontend `tenantId`/`userId`.

## 7.3 Roles and Permissions

Users may have multiple roles per tenant. Roles resolve to permissions. UI and backend should check permissions, not raw role strings.

Canonical permission style: `module.resource.action`. Examples: `foundation.read`, `foundation.org.write`, `tenant.config.write`, `user.config.write`, `risk.record.read`, `workflow.approval.write`, `ai.agent.run`.

## 7.4 Tenancy Deployment Models

The platform supports: shared DB + tenant schema; shared DB + RLS; dedicated DB per tenant; on-prem; hybrid. **No code should assume public SaaS only.**

---

# 8. Foundation

Foundation is platform-owned workspace business fabric. Canonical owner: `platform/foundation/`.

Owns: organization structure, business units, departments, teams, users, roles, permissions, delegations, committees, ownership mapping, access review, reference data, lifecycle hooks, Foundation contracts, navigation, routes, UI, bootstrap.

Shahin consumes Foundation. Foundation is never: a Shahin product module, duplicated inside Shahin, tenant-entitled, disabled as `not-entitled`.

Foundation visibility/actions may be: `enabled | missing-permission | backend-offline | route-not-wired`.

---

# 9. AI OS

## 9.1 Rule

**AI OS is platform DNA.** Canonical owner: `platform/ai/`. Products expose AI. Modules contribute tools/context. Services execute. Platform AI orchestrates.

## 9.2 AI OS Owns

AI kernel, agent runtime, agent registry, agent squads, model router, prompt registry, tool registry, MCP contracts, memory, RAG/context, Temporal/LangGraph orchestration, workflow integration, policy/governance, AI audit ledger, observability, evals, cost tracking, safety filters, tenant/user permission enforcement.

**Products must never call model providers directly.**

## 9.3 AI Layers

`platform/ai/{kernel, agents, squads, model-router, prompts, tools, mcp, memory, context, orchestration, governance, observability, evals}/`.

## 9.4 AI Safety

Agent cannot exceed user permissions. Every AI run must include: `tenant_id, user_id, product_code, permissions context, correlation_id, audit event, cost ledger entry`. Mutating AI actions must go through workflow approval when required.

---

# 10. Workflow OS

Workflow is platform DNA. Canonical owner: `platform/workflow/` + `services/workflow-service/`.

Owns: lifecycle states, approval templates, maker-checker, SoD, delegation, pending tasks, allowed transitions, workflow action context, human approval gates.

Dynamic UI must consume workflow context before enabling actions. AI must consume workflow context before mutating data.

---

# 11. Billing and Trial OS

## 11.1 Rule

**Billing is platform DNA. Payment provider is optional.** Trial/subscription/entitlement lifecycle must work without Stripe/Tap/HyperPay/Moyasar being ready.

Canonical owner: `platform/config-center/billing/` + `services/billing-service/` (or temporary platform-owned adapter until service exists).

## 11.2 Billing OS Owns

Plans, trial plans, subscriptions, billing status, trial status, entitlements, limits, grace period, suspension, manual conversion, provider mode, billing audit.

## 11.3 Provider Modes

`manual | invoice_offline | payment_provider_pending | external_provider`.

Payment gateway is **not required** for: trial creation, self-registration, product activation, module entitlements, expiry, suspension, workspace state.

---

# 12. Self-Registration and Trial Lifecycle

## 12.1 Rule

Self-registration creates a real tenant and real trial. Not just a user.

Self-registration must atomically create: tenant, owner user, tenant membership, trial record, subscription record, product activation, trial entitlements, default config, Foundation bootstrap, audit rows.

## 12.2 Trial Lifecycle

States: `trial_pending_verification | trial_active | trial_expiring | trial_grace | trial_suspended | trial_converted | trial_cancelled | trial_expired`.

Trial duration comes from Config OS. **No hardcoded trial time in routes/components.**

---

# 13. Provisioning Orchestrator

Provisioning is platform DNA. Canonical owner: `platform/provisioning/` + `services/provisioning-service/` (or tenant-service adapter temporarily).

Owns: tenant creation, owner creation, membership creation, subscription/trial creation, product activation, module entitlements, Config OS defaults, Foundation bootstrap, Keycloak/DAuth projection, OpenFGA/Cerbos projection, Dynamic UI registry seed, AI tenant namespace seed, audit rows, rollback/compensation.

**No scattered registration side effects.**

---

# 14. Platform Registry

Registry is platform DNA. Canonical owner: `platform/registry/`.

Knows: platform DNA modules, services, products, modules, permissions, routes, navigation, config schemas, workflow templates, AI agents/tools, billing plans, health endpoints, readiness checks.

Resolvers must use registry, not random hardcoded scans.

---

# 15. Readiness OS

Readiness is platform DNA. Canonical owner: `platform/readiness/`.

Resolves: service health, DNA health, module route readiness, module backend readiness, config readiness, DB migration readiness, trial/billing readiness, AI readiness, workflow readiness.

**No fake enabled UI buttons.**

---

# 16. Audit and Decision Ledger

Audit is platform DNA. Canonical owner: `platform/audit/` + `services/audit-service/`.

Must cover: registration, tenant provisioning, trial changes, subscription changes, entitlement changes, config changes, Dynamic UI changes, permission decisions, workflow approvals, AI runs, tool calls, billing lifecycle, admin actions.

**Every sensitive decision must be auditable.**

---

# 17. Data Governance

Data governance is platform DNA. Canonical owner: `platform/data-governance/` + `platform/db/`.

Every table must declare: owner layer, owner service/module/platform, scope (`global | tenant-shared | tenant-schema | dedicated-db`), data classification, tenant isolation model, migration owner, retention rule, audit requirement.

**No table without owner.**

---

# 18. Integrations OS

Integrations are platform DNA. Canonical owner: `platform/integrations/` + `services/integration-service/`.

Owns: connector registry, OAuth/secret refs, ERP/HRIS/ITSM/SIEM/GRC connectors, webhooks, sync jobs, mapping rules, retries/dead letters, tenant-scoped connector config, integration audit.

**No product-local connector framework.**

---

# 19. Notification and Inbox OS

Notifications and inbox are platform DNA. Canonical owner: `platform/notifications/` + `platform/inbox/` + `services/notification-service/`.

Own: user inbox, tenant admin tasks, workflow approvals, AI review tasks, trial notices, billing notices, module alerts, system alerts, email/SMS/web push providers.

**No product-local notification OS.**

---

# 20. Security, Secrets, and Policy OS

Security is platform DNA. Canonical owner: `platform/security/` + `platform/secrets/` + `platform/policy/`.

Owns: secret refs, Vault/provider integration, policy registry, rate limits, abuse controls, CAPTCHA policy, email/domain policy, PII redaction, prompt injection defense, tenant isolation checks, security audit.

**No frontend secrets. No model keys in product config. No raw secret values in browser.**

---

# 21. SDK Enforcement

Platform SDKs make reuse mandatory. Canonical packages: `@dos/access-store`, `@dos/config-client`, `@dos/ui-contracts`, `@dos/ui-system`, `@dos/module-sdk`, `@dos/product-sdk`, `@dos/service-client`, `@dos/dynamic-ui-client`, `@dos/billing-client`, `@dos/workflow-client`, `@dos/ai-sdk`.

SDKs enforce: manifest format, route contracts, nav contracts, permission declarations, config declarations, AI tool declarations, workflow action declarations, tenant entitlement checks, audit metadata.

---

# 22. Config Center Admin Console

Config Center becomes the platform admin console. Canonical owner: `platform/config-center/`.

Must manage: Platform Registry, Product Registry, Module Registry, Service Registry, Config OS, Dynamic UI Manager, Billing/Trial Manager, Tenant Manager, User/Role/Permission Manager, Workflow Manager, AI OS Manager, Integration Manager, Audit/Decision Ledger, Readiness Dashboard, Secrets/Policy Manager, UI Registry, Entitlement Manager.

**Config Center is platform-owned, not Shahin-owned.**

---

# 23. Guards and Release Gates

Every OS layer must have guards. Required commands:

```
pnpm ui-os:guards
pnpm dynamic-ui:guards
pnpm config:guards
pnpm billing:guards
pnpm trial:guards
pnpm tenancy:guards
pnpm ai-os:guards
pnpm workflow:guards
pnpm provisioning:guards
pnpm registry:guards
pnpm security:guards
pnpm platform:guards
```

Final release gate: `pnpm platform:release-gate`. **No fake green. No skipped tests to claim readiness. No product-local bypass.**

---

# 24. Product Manifest Contract

Every product must declare:

```json
{
  "productCode": "shahin-ai",
  "name": "Shahin-AI",
  "type": "product",
  "theme": {},
  "defaultRoute": "/workspace-home",
  "subscribedModules": [],
  "ai": {},
  "billing": {},
  "trial": {},
  "navigationComposition": {},
  "dynamicUiEnrollment": {},
  "config": {}
}
```

Product manifest declares composition only. It does not own platform DNA.

---

# 25. Module Manifest Contract

Every module must declare:

```json
{
  "moduleCode": "risk",
  "name": "Risk",
  "type": "module",
  "contracts": {
    "routes": [],
    "navigation": [],
    "widgets": [],
    "actions": [],
    "config": [],
    "permissions": [],
    "workflows": [],
    "aiTools": []
  }
}
```

Modules are tenant-entitled.

---

# 26. Platform DNA Manifest Contract

Every platform DNA module may declare:

```json
{
  "code": "foundation",
  "type": "platform-dna",
  "workspaceVisible": true,
  "contracts": {
    "routes": [],
    "navigation": [],
    "widgets": [],
    "actions": [],
    "config": [],
    "permissions": [],
    "health": []
  }
}
```

Platform DNA is never tenant-entitled.

---

# 27. Final System Rule

```
UI-OS renders.
Dynamic UI resolves.
Config OS configures.
AccessStore authorizes.
Workflow governs actions.
AI OS orchestrates intelligence.
Billing OS controls subscriptions/trials.
Provisioning creates tenants/products/modules correctly.
Registry is source of truth.
Readiness prevents fake enabled UI.
Audit records every sensitive decision.
Security protects secrets and tenant isolation.
Products compose.
Modules provide domain libraries.
Services expose network verbs.
Platform owns the operating system.
```

---

# 28. Completion Definition

The platform is **not** complete because a page renders.

The platform is complete only when:
- Platform DNA is separated from products/modules
- UI-OS is canonical
- Dynamic UI resolves workspace/nav/pages/widgets/actions
- Config OS resolves effective config
- AccessStore is platform-owned
- Billing/trial lifecycle works without payment provider
- Self-registration creates tenant + owner + trial + subscription + entitlements
- AI OS is platform-owned
- Modules are tenant-entitled
- Products are composition-only
- Foundation is platform-owned
- Readiness gates prevent fake enabled UI
- Audit ledger records all sensitive actions
- Security/secrets rules hold
- On-prem mode is not blocked by cloud-only assumptions
- Guards run
- Builds pass
- Real authenticated smoke tests pass

Until then, status must be honest: `PASS | PARTIAL | BLOCKED | NOT READY`.

**Never claim production readiness without proof.**

---

# 29. Observability and SRE OS

Observability is platform DNA. Canonical owner: `platform/observability/` + `platform/sre/` + `services/observability-service/`.

Owns: logs, metrics, traces, service health, uptime checks, readiness checks, alerting, incident records, performance budgets, tenant-level operational telemetry, AI cost/latency telemetry, workflow latency telemetry, billing/trial event telemetry.

**Every service must emit:** `correlationId`, `tenantId` (where applicable), `userId` (where applicable), `productCode` (where applicable), service name, route/action name, latency, status, error class.

**No production service is accepted without:** health endpoint, readiness endpoint, structured logs, metrics, trace propagation, alert rule (or documented reason).

---

# 30. Release, Versioning, and Migration OS

Release management is platform DNA. Canonical owner: `platform/release/` + `platform/migrations/` + `platform/versioning/`.

Every platform DNA, module, service, and product must declare: version; compatibility range; migration requirements; rollback plan; feature flags; contract version; breaking-change status.

**Required release gates:** contract compatibility check; DB migration dry run; rollback dry run where possible; UI registry verification; Dynamic UI contract verification; Config schema verification; permission catalogue verification; service health verification; smoke test.

**No migration may be silent. No destructive migration without rollback or explicit approval. No fake green release.**

---

# 31. Backup, Restore, Archive, and DR OS

Disaster recovery is platform DNA. Canonical owner: `platform/backup/` + `platform/dr/` + `platform/archive/`.

The platform must define: backup policy; restore policy; tenant restore procedure; point-in-time recovery; archive policy; retention policy; deletion policy; legal hold policy; evidence retention policy; AI memory deletion policy; audit retention policy.

Every tenant-scoped data store must declare: backup owner; restore path; retention class; data classification; deletion behavior; archive behavior.

**Production readiness requires restore proof, not backup existence only.**

---

# 32. Localization, RTL, Accessibility, and UX Quality

Localization and accessibility are platform DNA for UI. Canonical owner: `platform/localization/` + `platform/accessibility/` + `platform/ui-system/`.

The platform must support: English; Arabic; RTL/LTR switching; locale-specific dates/numbers; timezone handling; accessibility labels; keyboard navigation; focus states; mobile safe-area handling; responsive behavior; low-vision readable contrast.

Every UI-OS component must be: RTL-safe; keyboard-accessible; mobile-safe; token-styled; theme-compatible; translatable.

**No hardcoded user-facing strings** in product/module UI unless explicitly marked temporary and tracked.

---

# 33. Edition, Plan, and Capability Model

Commercial packaging is platform DNA. Canonical owner: `platform/billing/` + `platform/entitlements/` + `platform/capabilities/`.

The platform must separate: platform DNA; product subscription; module entitlement; feature flag; usage limit; role permission; workflow approval; AI credit/limit.

A tenant's access resolves from: product subscription + billing/trial status + module entitlements + plan capabilities + tenant config + user roles/permissions + service readiness.

**No product may hardcode edition behavior.**

---

# 34. Marketplace and Module Lifecycle

Module lifecycle is platform DNA. Canonical owner: `platform/marketplace/` + `platform/module-registry/`.

Modules must support lifecycle states: `draft | available | enrolled | active | suspended | deprecated | archived`.

Every module must declare: manifest; contracts; permissions; config schema; routes; navigation; widgets; workflows; AI tools; migrations; health/readiness requirements; entitlement model; version.

A product can subscribe to modules. A tenant can be entitled to modules. A module can be disabled by lifecycle/readiness. **A module is never copied into a product.**

---

# 35. Compliance Evidence and Governance Mapping

Compliance evidence is platform DNA, especially for Shahin-AI. Canonical owner: `platform/governance/` + `platform/evidence/` + `platform/compliance-mapping/`.

The platform must produce evidence for: access decisions; configuration changes; workflow approvals; AI decisions/tool calls; billing/trial lifecycle; tenant provisioning; module entitlement changes; security events; data retention/deletion; integration syncs; admin actions.

Evidence must be: tenant-scoped; timestamped; actor-linked; immutable or append-only where required; exportable; mapped to controls/frameworks where applicable.

**GRC products consume this evidence fabric. They do not invent separate evidence stores.**

---

# 36. Environment and Deployment Model

Deployment model is platform DNA. Canonical owner: `platform/deployment/` + `platform/environments/`.

Supported deployment modes: public SaaS; private SaaS; on-prem; hybrid.

Every service/config/provider must declare: public SaaS support; private SaaS support; on-prem support; required external dependencies; local replacement option; secret requirements; network requirements.

**No cloud-only assumption unless explicitly marked unsupported for on-prem.**

---

# 37. Master Ownership Rule

If it is **reusable, cross-product, cross-module, security-sensitive, tenant-sensitive, config-sensitive, billing-sensitive, AI-runtime-related, workflow-related, or audit-related** → it belongs to **platform**.

If it is **business-domain logic** → it belongs to **modules**.

If it is **network execution** → it belongs to **services**.

If it is **brand composition, route composition, theme override, landing content, or product-specific page content** → it belongs to **products**.

When unsure:

```
platform owns the operating system.
modules own reusable domains.
services expose verbs.
products compose experiences.
```

---

# Short instruction to agent

> This manifest is the constitution. Do not invent a local shortcut that violates it.
> Products compose.
> Modules provide reusable business domains.
> Services expose network verbs.
> Platform owns the OS.
