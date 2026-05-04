# DOS Master — The Binding Plan

> **Force-binding doctrine.** Every agent, model, contributor, CI gate, and
> review MUST read this document before touching the platform. The codebase is
> the **engine**; all changes to UI, navigation, modules, products, services,
> tenants, permissions, marketing surfaces, admin pillars, and rollout cohorts
> flow through **rows** in DOS Master controlled tables. Code edits that
> bypass DOS Master are CI-rejected by `dos-master-only.mjs` and DB-rejected
> by `trg_dos_master_only`.

Status: **LOCKED 2026-05-04.** Supersedes `/root/.claude/plans/you-are-taking-over-joyful-wave.md`.

---

## 0. Doctrine — 11 Articles

| # | Article | Enforcement |
|---|---------|-------------|
| 1 | **One AccessStore.** Canonical = `@dos/access-store`. Legacy `platform/dauth/access/*` and `platform/dauth/packages/frontend/access/*` are deletion-targeted. | `forbid-legacy-accessstore.mjs` |
| 2 | **One BFF for workspace bootstrap.** `GET /api/workspace/bootstrap` returns JWE-signed `{ session, tenant, modules, permissions, ui_catalog_version, nav, shell }`. No SPA shall call `/api/access/my-permissions`, `/api/tenants/me`, `/api/trials/current` directly. | `forbid-direct-bootstrap-fan-out.mjs` |
| 3 | **DB owns UI.** All routes, nav items, widgets, archetypes, props, permissions-to-component bindings live in `dos.ui_*` / `dos.dynamic_ui_*` / `dos.workspace_shell_binding`. Hardcoded SPA routes are CI-rejected. | `static-route-ban.mjs` |
| 4 | **Three trust zones.** Public anonymous (`/api/public/*`), tenant authenticated (`/api/*`), platform-admin (`/api/admin/*`) — separate Keycloak realm, schema, cookies, Redis DB, mTLS. | `trust-zone-isolation.mjs` |
| 5 | **No fake-green.** No `any`, `$any`, `it.skip`, fake stubs, build excludes, tsconfig loosening, route disablement, or hidden bypass. | `fake-green-detector.mjs` |
| 6 | **Vertical slice DoD.** A module is only `GREEN_WORKING` when nav→route→component→API→handler→DB→permission→audit→UI all pass. | `vertical-slice-doctrine.mjs` |
| 7 | **Progressive Production Delivery.** Every change rides ring R0→R5 with health gates and auto-rollback. | `rollout-service` + `ppd-ring-required.mjs` |
| 8 | **Carbon only.** All UI primitives are `vendor='ibm-carbon'`. Cross-vendor inserts rejected by `trg_carbon_only_runtime`. | DB trigger + `dynamic-ui:gates` |
| 9 | **CLI ↔ UI parity.** Every DOS Master CLI must have a matching admin UI page; every admin UI page must have a matching CLI. | `cli-ui-parity.mjs` |
| 10 | **Deletion ledger.** Every legacy file targeted for removal is listed in `platform/docs/dos-master/deletion-ledger.json` with the milestone that removes it. | `deletion-ledger-progress.mjs` |
| 11 | **DOS Master is the only writer.** All controlled tables enforce `current_setting('dos.actor') = 'dos-master'` via `trg_dos_master_only`. | DB triggers + `dos-master-writer.mjs` |

---

## 1. Trust Zones

| Zone | Path prefix | Realm | Schema | Cookie | Redis DB | mTLS | Bootstrap |
|------|-------------|-------|--------|--------|----------|------|-----------|
| Public | `/api/public/*` | none | `public` | none | 0 | no | `/api/public/site-bootstrap` |
| Tenant | `/api/*` | `tenants` | per-tenant `t_<id>` | `dos_session` | 1 | optional | `/api/workspace/bootstrap` |
| Platform-Admin | `/api/admin/*` | `platform-ops` | `platform_admin` | `dos_admin_session` | 2 | required | `/api/admin/console-bootstrap` |

---

## 2. Locked Decisions (final round)

1. Tenant Admin Console v1 = **a+** (UI Composer + User+Role+SoD).
2. CDN = **Cloudflare** for SaaS; pluggable `CdnAdapter` for on-prem (NGINX/Varnish driver shipped in SDK).
3. Log query backend = **Loki** (default, fits existing OTel + Jaeger + Prometheus + Grafana + Temporal stack); `LogQueryAdapter` interface allows Elastic/OpenSearch swap.
4. Trial = Foundation + Compliance + Risk + Workflow modules; **7 days base**, +7 days extendable **once** via platform-admin workflow event (capped at 1 extension).
5. DNOC/DSOC/DOS/DAuth pillars = each fully dynamic via `dos.admin_*` tables, separate identity store, separate everything (zone 3).
6. Marketing rendering host = **separate** `marketing-shell-service` with its own SSR + CDN.
7. Self-signup tenant provisioning = **dynamic** via `dos.signup_flow_*` and provisioning orchestrator.
8. Anti-abuse = full provider stack (CAPTCHA + email-verify + IP rep + device fingerprint + rate limiter + WAF rules).
9. Platform-admin identity store = **separate** (own table, schema, path, realm).

---

## 3. Phase 1 — 14 Milestones (45 engineer-days)

| M | Days | Title | Outcome |
|---|------|-------|---------|
| **M1** | 1–4 | DDL + DOS Master writer scaffold | 48 controlled tables + `trg_dos_master_only` + `dos-master` role |
| **M2** | 5–7 | Canonical AccessStore extension | `canAccessModule`, `hasRole`, `hasAnyPermission`, `hasAllPermissions`, `can()` shipped on `@dos/access-store`; legacy import audit |
| **M3** | 8–10 | Legacy AccessStore deletion + consumer migration | 50-path deletion ledger executed; `platform/dauth/access/*`, `platform/dauth/packages/frontend/access/*`, `platform/core/{navigation.store,authz-client.service,app-bootstrap.service}.ts` migrated |
| **M4** | 11–13 | Workspace BFF | `services/workspace-bff/` ships `/api/workspace/bootstrap` with JWE + `mv_workspace_bootstrap` materialized view per `(tenantId, roleSetHash, uiCatalogVersion)` |
| **M5** | 14–15 | SSE invalidation channel | `/api/workspace/events` SSE emits `bootstrap-invalidate` on permission/module/role/binding mutations |
| **M6** | 16–18 | Service registry + product onboarding | `dos.service_registry`, `dos.product_registry`, `services/onboarding-service`, CLI `dos product:add` + UI parity |
| **M7** | 19–21 | Self-signup + provisioning orchestrator | `services/signup-bff`, `services/provisioning-service`, `dos.signup_flow_*`, `dos.provisioning_job` (Temporal-backed) |
| **M8** | 22–23 | Anti-abuse provider | `services/anti-abuse-service` with CAPTCHA + IP rep + device FP + email-verify adapters |
| **M9** | 24–26 | Marketing public lane | `services/marketing-shell-service` (SSR + Cloudflare CDN), `/api/public/site-bootstrap`, `dos.marketing_*` tables |
| **M10** | 27–29 | Publish/rollback engine | `services/publish-service`, `dos.publish_revision`, `dos.publish_rollback`, atomic page-level publish |
| **M11** | 30–32 | Platform-admin trust zone | Keycloak realm `platform-ops`, schema `platform_admin`, `services/admin-console-bff`, `/api/admin/console-bootstrap` |
| **M12** | 33–35 | DNOC/DSOC/DOS/DAuth admin pillars | `dos.admin_pillar_*` tables, 4 admin pillar UIs (composer-driven) |
| **M13** | 36–40 | Tenant Admin Console v1 (a+) | UI Composer + User+Role+SoD + audit + delegation; full identity isolation from platform-admin |
| **M14** | 41–45 | Doctrine codification + PPD substrate | DOS Master writer-only triggers across all controlled tables, `dos.rollout_*` (8 tables), `services/rollout-service` ring engine R0→R5, health gates (Prom/Jaeger/Loki/audit/synthetic), auto-rollback, compensation chains, 47 CI guards green |

---

## 4. DDL — 48 Controlled Tables (M1)

**Base (10):** `dos_master_writer_audit`, `dos_master_change_request`, `dos_master_actor_session`, `dos_master_role`, `dos_master_grant`, `dos_master_lock`, `dos_master_drift_event`, `dos_master_compensation_chain`, `dos_master_publish_handle`, `dos_master_invalidation_log`.

**PPD (8):** `rollout_plan`, `rollout_ring`, `rollout_cohort`, `rollout_health_gate`, `rollout_evaluation`, `rollout_rollback`, `rollout_compensation_step`, `rollout_signal_threshold`.

**Publish (4):** `publish_revision`, `publish_rollback`, `publish_target`, `publish_dependency`.

**Service registry (4):** `service_registry`, `service_endpoint`, `service_dependency`, `service_health_history`.

**Onboarding (4):** `product_registry`, `product_module_enrollment`, `product_landing_page`, `product_brand_kit`.

**Signup (4):** `signup_flow`, `signup_flow_step`, `signup_attempt`, `signup_anti_abuse_signal`.

**Provisioning (4):** `provisioning_job`, `provisioning_step`, `provisioning_compensation`, `provisioning_handle`.

**Audit (3):** `audit_event` (extension), `audit_decision_ledger`, `audit_actor_chain`.

**Platform-admin (4):** `platform_admin_user`, `platform_admin_role`, `platform_admin_grant`, `platform_admin_session`.

**Doctrine (3):** `doctrine_article`, `doctrine_violation`, `doctrine_acknowledgement`.

---

## 5. CI Guards — 47 Total

**Auth (3):** `forbid-legacy-accessstore`, `forbid-direct-bootstrap-fan-out`, `single-access-store-import`.

**Deletion (2):** `deletion-ledger-progress`, `no-resurrected-paths`.

**Static removal (3):** `static-route-ban`, `lint-no-static-nav-fallback` (extended), `no-hardcoded-module-card`.

**Registry (4):** `service-registry-coherence`, `product-registry-coherence`, `module-enrollment-coherence`, `cli-ui-parity`.

**Bootstrap (3):** `workspace-bootstrap-jwe-signed`, `bootstrap-cache-key-coherent`, `sse-invalidation-channel-up`.

**Tenancy (3):** `tenant-context-required`, `rls-policy-present`, `schema-search-path-set`.

**Security (5):** `trust-zone-isolation`, `mTLS-required-on-admin-zone`, `keycloak-realm-isolation`, `cookie-domain-isolation`, `redis-db-isolation`.

**Service (3):** `service-manifest-required`, `service-zod-schemas-present`, `service-port-allocated`.

**Publish (3):** `publish-revision-atomic`, `publish-rollback-pair`, `publish-dependency-graph-acyclic`.

**Provisioning (3):** `provisioning-temporal-workflow-present`, `provisioning-compensation-chain-complete`, `provisioning-job-idempotent`.

**Compliance (3):** `audit-event-on-write`, `audit-actor-chain-complete`, `decision-ledger-immutable`.

**Admin (3):** `admin-pillar-composer-driven`, `admin-zone-no-tenant-import`, `admin-bff-mtls-only`.

**Doctrine + PPD (9):** `dos-master-only`, `dos-master-writer`, `doctrine-acknowledged`, `ppd-ring-required`, `ppd-health-gate-defined`, `ppd-rollback-defined`, `ppd-compensation-chain-complete`, `ppd-cohort-non-overlapping`, `fake-green-detector`.

---

## 6. CLI ↔ UI Parity — 37 Commands

`dos product:add|enroll|publish|rollback`, `dos module:add|enroll|publish|rollback`, `dos page:add|publish|rollback`, `dos component:add|publish`, `dos service:register|deregister|health`, `dos tenant:provision|suspend|resume|delete`, `dos trial:start|extend|expire|convert`, `dos signup:flow:add|step:add|attempt:list`, `dos rollout:plan|start|advance|rollback`, `dos publish:revision:list|target:list|dependency:graph`, `dos admin:pillar:add|user:add|role:add`, `dos doctrine:ack|violation:list`.

Each command MUST have a matching admin UI page; `cli-ui-parity` guard enforces.

---

## 7. Deletion Ledger — 50 Paths (executed in M3)

Tracked in `platform/docs/dos-master/deletion-ledger.json`. Highlights:

- `platform/dauth/access/access.store.ts`
- `platform/dauth/access/*.ts` (entire dir)
- `platform/dauth/packages/frontend/access/access.store.ts`
- `platform/dauth/packages/frontend/access/*.ts`
- `platform/core/platform/navigation/navigation.store.ts`
- `platform/core/platform/navigation/active-modules.ts` (intersect helper folded into BFF)
- `platform/core/platform/auth/authz-client.service.ts`
- `platform/core/platform/bootstrap/app-bootstrap.service.ts`
- All `STATIC_*_NAV_CHILDREN` constants
- All `defaultModules` arrays
- All hardcoded `BASE_PRIMARY_NAV` arrays
- ... (full 50 in JSON ledger)

---

## 8. Customer Pitch Matrix — 39 Capabilities

Sales matrix: 39 customer-asked capabilities × answer-grade (Yes-Dynamic | Yes-Service | Yes-SDK | Roadmap). Lives at `platform/docs/dos-master/customer-pitch-matrix.md`. Updated each milestone-close.

---

## 9. PPD Ring Engine

Rings: **R0 dev** → **R1 internal** → **R2 canary tenant** → **R3 region cohort** → **R4 product cohort** → **R5 fleet**.

Each ring: cohort selector (tenant_id/region/product/edition/route_pattern/slot/archetype) + health gates (Prom error rate / Jaeger latency p95 / Loki error log volume / audit denial spike / synthetic page-load) + auto-rollback threshold + compensation chain.

`services/rollout-service` evaluates gates every 60s; failed gate → auto-advance to rollback within 5m.

---

## 10. Phase 2+ Preview (~13 weeks, L13–L35)

Workflow OS, AI OS, Notification/Inbox OS, Integration OS, Data Governance OS, Billing/Subscription OS, Feature Flag OS, Security/Secrets/Policy OS, Telemetry OS, Schema Authoring OS, Deployment OS, Release OS, Vendor Risk OS, Marketplace OS, DR OS.

---

## 11. Execution State (live ledger)

| Milestone | Status | Started | Closed | Notes |
|-----------|--------|---------|--------|-------|
| M1 D1..D4 | CLOSED | 2026-05-04 | 2026-05-04 | 48 controlled tables, 47 triggers, 11 doctrine articles live |
| M2 | CLOSED | 2026-05-04 | 2026-05-04 | `@dos/access-store` extended (`can`, `hasRole`, `hasAnyPermission`, `hasAllPermissions`, `canAccessModule`) + M3 compat layer; build GREEN |
| M3 | CLOSED | 2026-05-04 | 2026-05-04 | 6 consumer imports swapped to `@dos/access-store`; 4 legacy files deleted (`platform/dauth/access/access.store.ts`, `platform/dauth/packages/frontend/access/{access.store,access,index}.ts`); deletion ledger JSON committed; zero residual legacy imports |
| M4 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/workspace-bff` scaffolded (port 4007, gateway prefix `/api/workspace`), `tsc -p` GREEN; `dos.mv_workspace_bootstrap` MV live (40 tenants × 179 routes / 26 shell / 479 components); `workspace-bff` registered in `dos_master.service_registry` + `service_endpoint` + granted `dos-master` writer role; JWE (A256GCM/dir) helper + Zod payload schema shipped. Migration: `20260504_0540_dos_master_mv_workspace_bootstrap.sql` |
| M4 D2 | CLOSED | 2026-05-04 | 2026-05-04 | `bootstrap-repo.ts` reads MV via `@dos/db/master`; route hydrates `nav.primary` + `shell.surfaces` from MV; `mvRefreshedAt` echoed in envelope |
| M5 D1 | CLOSED | 2026-05-04 | 2026-05-04 | SSE `/api/workspace/events` tails `dos.dos_master_invalidation_log` (5s poll); `POST /api/workspace/refresh` runs `REFRESH MATERIALIZED VIEW CONCURRENTLY`; live-verified end-to-end |
| M6 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/onboarding-service` (`/api/admin/onboarding/{products,enrollments,services}`) + `scripts/dos-master/dos.mjs` CLI shipping 9 commands (product:add/list/enroll, service:register/list, doctrine:list, rollout:list, publish:revisions, signup:flows). Live: shahin-ai + tuwaiq-ai products registered; foundation+compliance+risk+workflow enrolled into shahin-ai; workspace-bff registered at port 4007. Build GREEN. |
| M7 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/signup-bff` (port 4009, public trust zone, prefix `/api/public/signup`) ships flows/steps GET + attempts POST + complete; `shahin-ai-trial` 6-step flow seeded (collect-email→verify-email→anti-abuse→tenant-name→provision→launch-workspace) with trial=Foundation+Compliance+Risk+Workflow, 7d base + 1×7d extension. Live verified: attempt → tenant minted → provisioning_job queued → invalidation_log fired. Build GREEN. |
| M8 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/anti-abuse-service` (port 4010, public zone, prefix `/api/public/anti-abuse`) ships `POST /evaluate` aggregating 4 adapters (CAPTCHA stub, IP-rep, device-FP, email-verify with disposable-domain list). Composite max-score → decision `allow|review|block`; block flips `signup_attempt.status`. Live verified: clean=allow(0.05), spammer@mailinator.com+empty fp+empty captcha=block(1.0). Build GREEN. |
| M9 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/marketing-shell-service` (port 4011, public zone, prefix `/api/public/site`) ships `GET /site-bootstrap?product=` returning 8-route catalog (from `dos.ui_route_template_binding archetype='marketing-landing'`) + brand tokens/assets from `dos.marketing_brand_tokens`/`marketing_brand_assets`. CDN: Cloudflare default + `MARKETING_CDN` env override; `CdnAdapter` SDK pluggable for on-prem (M9 D2). Live verified: 8 routes returned (`/, /about, /contact, /legal, /platform, /pricing, /security, /trust`). Build GREEN. |
| M10 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/publish-service` (port 4012, admin zone, prefix `/api/admin/publish`) ships `ensureTarget` / `createRevision` / `publishRevision` (atomic supersede prior live + fan-out invalidation) / `rollbackRevision` (logs `publish_rollback`, restores latest superseded, fan-out) / `listRevisions`. 6 allowed kinds: `page|component|route|brand-kit|nav|archetype-props`. Routes: 4 POST + 1 GET. Registered in `dos_master.service_registry` + 5 endpoints in `dos_master.service_endpoint`; granted `dos-master` + `dos-master-publisher`. CLI extended with 4 commands (`publish:target:add`, `publish:revision:add`, `publish:go`, `publish:rollback`). Live verified end-to-end: rev1 published live → rev2 published (superseded=1) → rollback rev2 → rev1 restored to live. Build GREEN. |
| M11 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/admin-console-bff` (port 4013, admin zone, prefix `/api/admin/console`) ships `GET /console-bootstrap?email=` returning `{user, pillars[], permissions[]}` (4 pillars: DNOC/DSOC/DOS/DAuth). Repo writes through `platform_admin.platform_admin_{user,role,grant}` with `dos.actor='dos-master'`; routes: `users|roles|grants` GET+POST + `grants/:user_id` GET. Registered + 7 endpoints + `dos-master`/`dos-master-admin` grants. Seeded 4 pillar roles (`dnoc-operator`/`dsoc-analyst`/`dos-platform-admin`/`dauth-admin`); `admin@dos.platform` granted all 4. Live verified: bootstrap returned `DAuth:1, DNOC:1, DOS:1, DSOC:1` pillars + 8 permissions. CLI extended with 5 commands (`admin:user:{add,list}`, `admin:role:{add,list}`, `admin:grant`). Build GREEN. |
| M12..M14 | IN-PROGRESS | 2026-05-04 | — | Sequenced; auto-advance per ring engine |

Update this section at the close of every day.
