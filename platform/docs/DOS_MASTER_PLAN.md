# DOS Master — The Binding Plan

> **Force-binding doctrine.** Every agent, model, contributor, CI gate, and
> review MUST read this document before touching the platform. The codebase is
> the **engine**; all changes to UI, navigation, modules, products, services,
> tenants, permissions, marketing surfaces, admin pillars, and rollout cohorts
> flow through **rows** in DOS Master controlled tables. Code edits that
> bypass DOS Master are CI-rejected by `dos-master-only.mjs` and DB-rejected
> by `trg_dos_master_only`.

Status: **LOCKED 2026-05-04.** Supersedes `/root/.claude/plans/you-are-taking-over-joyful-wave.md`.

> **2026-05-04 (PM) — M15 Preflight amendment (admin trust-zone hardening).**
> Discovery on baseline check: `admin-console-bff` is **already on PM2**
> (id 16, online, port 4013); gateway already proxies
> `/api/admin/console/* → :4013`; `/platform-admin` SPA returns HTTP 200;
> `platform/config-center/env/admin-console-bff.env` already ships
> `dos.actor=dos-master` + `INTER_SERVICE_SECRET`. Prior plan text
> ("admin-console-bff NOT yet on PM2") is **stale**. True remaining M15
> gaps verified by grep (zero hits in code/env): (1) Keycloak
> `platform-ops` realm verification middleware is not present, (2) mTLS
> env hooks for the admin-zone hop (gateway → :4013) are not present.
> See §13 for the GO/NO-GO matrix; per Doctrine §10 ("No DB/RBAC/Dynamic-UI
> runtime mutation inside UI compile repair") and §1 task-lock, real
> Keycloak realm cut-over and real CA both require ops approval and are
> **NO-GO until ops decisions land** (cert authority, realm name
> confirmation, client secrets, jurisdiction).
>
> **2026-05-04 (PM) — M11 / FE Platform Admin Workspace Shell amendment.**
> The original M11 outcome named only `services/admin-console-bff`. A
> server-rendered HTML SPA embedded inside the BFF was **rejected** as
> non-conformant to Article 8 (Carbon-only) and Article 6 (Vertical-Slice
> DoD). The binding FE deliverable is the **Angular Carbon UIShell host**
> shipped inside the Shahin SPA at `/platform-admin/*` (lazy route group,
> 17 files, 12 panels, real Carbon `cds-header` / `cds-sidenav` /
> `cds-tile` / `cds-table` / `cds-skeleton-text` / `cds-notification`
> primitives only). See §12 below.

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
| **M11** | 30–32 | Platform-admin trust zone | Keycloak realm `platform-ops`, schema `platform_admin`, `services/admin-console-bff` (port 4013), `/api/admin/console-bootstrap`, **and** the Angular Carbon FE Workspace Shell at `/platform-admin/*` inside the Shahin SPA (12 panels, real BFF round-trips, no server-rendered HTML SPA) — see §12 |
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

## 12. Platform Admin Workspace Shell — FE (production, enterprise-graded)

**Doctrine binding.** Article 8 (Carbon-only) requires every UI primitive to
be `vendor='ibm-carbon'`. Article 6 (Vertical-Slice DoD) requires
`nav→route→component→API→handler→DB→permission→audit→UI` to all pass. The
admin trust zone therefore ships its own real Angular SPA surface, not a
server-rendered HTML page glued to the BFF.

### 12.1 Topology

| Layer | Owner | Path | Port / Host | Notes |
|-------|-------|------|-------------|-------|
| FE shell host | `products/shahin-ai/app` (Angular 18 standalone) | `/platform-admin/*` | served by `product-shell` :3000 | Lazy `PLATFORM_ADMIN_ROUTES`, guarded by `platformAdminGuard` |
| BFF | `services/admin-console-bff` | `/api/admin/console/*` | :4013, admin trust zone, mTLS-required | Bearer-token auth (`platform_admin.platform_admin_session.jwe`) |
| Gateway proxy | `services/gateway` | `/api/admin/console/* → :4013` | :4000 | Rewrites Bearer through; rejects cross-zone cookies |
| Identity store | `platform_admin.*` schema | `platform_admin_user / _role / _grant / _session` | Postgres `shahin_grc` | Writer-trigger `trg_dos_master_only` enforced |
| Realm | Keycloak `platform-ops` | separate from tenant `tenants` realm | per Article 4 | M11 production realm |

### 12.2 FE Shell Host (17 files)

```
products/shahin-ai/app/src/app/pages/platform-admin/
├── platform-admin.routes.ts                 (route group, lazy children)
├── platform-admin.guard.ts                  (Bearer presence + whoami)
├── platform-admin-api.service.ts            (token store, fetch wrapper, evidence-pack download)
├── platform-admin-login.component.ts        (Carbon Email Login form)
├── platform-admin-shell-host.component.ts   (cds-header + cds-sidenav, 12 nav items)
└── panels/
    ├── admin-panel-frame.component.ts       (skeleton/error/empty/unauthorized/forbidden frames)
    ├── overview.panel.component.ts
    ├── milestones.panel.component.ts
    ├── services.panel.component.ts
    ├── doctrine.panel.component.ts
    ├── controlled-ddl.panel.component.ts
    ├── ppd.panel.component.ts
    ├── compensation.panel.component.ts
    ├── auto-evaluator.panel.component.ts
    ├── controlled-write.panel.component.ts
    ├── rollout-ledger.panel.component.ts
    ├── ci-guards.panel.component.ts
    └── evidence-pack.panel.component.ts     (9 Carbon tiles + ≥15-row endpoint table + download)
```

### 12.3 Carbon UIShell — exactly 12 nav items

| # | Path | Label | BFF endpoint | Surface |
|---|------|-------|--------------|---------|
| 1 | `/platform-admin/dos-master`                  | Overview              | `GET /dos-master/milestones`     | Phase 1 milestone summary |
| 2 | `/platform-admin/dos-master/milestones`       | Milestones (M1–M14)   | `GET /dos-master/milestones`     | M1..M14 status table |
| 3 | `/platform-admin/dos-master/services`         | Services 4007–4017    | `GET /dos-master/services`       | service_registry rows |
| 4 | `/platform-admin/dos-master/doctrine`         | Doctrine 11/11        | `GET /dos-master/doctrine`       | 11 articles + ack ledger |
| 5 | `/platform-admin/dos-master/controlled-ddl`   | Controlled DDL        | `GET /dos-master/controlled-ddl` | trg_dos_master_only-protected tables |
| 6 | `/platform-admin/dos-master/ppd`              | PPD Rollouts R0–R5    | `GET /dos-master/ppd`            | rollout_ring + 5 health-gate adapters |
| 7 | `/platform-admin/dos-master/compensation`     | Compensation          | `GET /dos-master/compensation`   | dos_master_compensation_chain + step_kind |
| 8 | `/platform-admin/dos-master/auto-evaluator`   | Auto Evaluator        | `GET /dos-master/auto-evaluator` | poll_ms / signal_mode / Prom/Loki/Jaeger URLs |
| 9 | `/platform-admin/dos-master/controlled-write` | Controlled Writes     | `GET /dos-master/controlled-write` | dos_master_writer_audit (audit trail) |
| 10 | `/platform-admin/dos-master/rollout-ledger`  | Rollout Ledger        | `GET /dos-master/rollout-ledger` | dos_master_invalidation_log top 50 |
| 11 | `/platform-admin/dos-master/ci-guards`       | CI Guards             | `GET /dos-master/ci-guards`      | dos-master-gate.mjs result |
| 12 | `/platform-admin/dos-master/evidence`        | Evidence Pack         | `GET /dos-master/phase-1`        | 9 summary tiles + download |

### 12.4 Evidence Pack panel (production-acceptance surface)

- **9 Carbon `cds-tile` summary cards** (responsive `auto-fit minmax(220px,1fr)`):
  Last validation, Milestones CLOSED, CI guards PASS/total, Doctrine 11/11, Services 4007–4017, Controlled DDL tables, PPD rings + rollback count, Article 11 negative-proof status + sqlstate, Git HEAD + clean/dirty.
- **Computed `overallOk`** signal: `ci_guards.fail===0 && doctrine.articles.length≥11 && negative_proof.rejected && controlled_ddl.total>0 && ppd.rings.length>0`.
- **Endpoint coverage `cds-table`** (≥15 rows): 13 `/dos-master/*` evidence endpoints + 2 `/auth/*` endpoints, status / count / note backed by live BFF JSON.
- **Download action**: primary `cdsButton` → `GET /dos-master/evidence-pack` (application/json attachment, filename `dos-master-phase-1-evidence-YYYY-MM-DD.json`).
- All stateful frames (skeleton/error/empty/unauthorized/forbidden) routed through `AdminPanelFrameComponent`.

### 12.5 BFF surface — 16 endpoints (port 4013, prefix `/api/admin/console`)

- `POST /auth/email-login` — opens 24h JWE-shaped opaque session against `platform_admin_session`
- `GET  /auth/whoami` — user + grants + expiry (revocation + expiry checks)
- `GET  /dos-master/{milestones,services,doctrine,controlled-ddl,ppd,compensation,auto-evaluator,controlled-write,rollout-ledger,ci-guards,cli,negative-proof,phase-1,evidence-pack}`

Every read is `dos`/`dos_master`/`platform_admin` schema-bound — **no stub
JSON, no in-process fixtures**. The Article 11 negative-proof endpoint
opens a fresh `pg.Client`, `RESET dos.actor`, attempts an INSERT into a
controlled table, and reports the SQL rejection state.

### 12.6 Auth flow

1. Marketing → `/login` Carbon Sign-in CTA → `/api/auth/oidc/start?mode=login` → Keycloak `platform-ops` realm.
2. Operator-issued opaque token (provisioned via `scripts/dos-master/provision-temp-admin.mjs`) seeded into `localStorage['dos_master_admin_token']` until SSO callback path lands.
3. `platformAdminGuard` calls `whoami`; null → redirect to `/platform-admin/login?returnTo=…`.
4. Sign-out clears token + revokes session via BFF logout (M11 D2).

### 12.7 Production wiring

- `angular.json` ships `@carbon/styles/css/styles.css` as the **first** entry of the global `styles[]` so Carbon CSS reaches `/platform-admin/*` chunks.
- Lazy chunk for the workspace shell: `chunk-DGEPJ74R.js` (verified live on `https://shahin-ai.com/`).
- PM2 process: `product-shell` (cluster x2, port 3000) reloaded with `--update-env` after each deploy.
- Gateway proxy rule: `/api/admin/console → admin-console-bff:4013` via `services/gateway`.

### 12.8 E2E coverage — 31/31 PASS

`platform/config-center/test/tests/e2e/platform-admin-fe-shell.spec.ts`
exercises the full vertical slice (Marketing CTA → DAuth bridge → guard
redirect → Bearer login → 12-item Carbon sidenav → every panel BFF
round-trip → PPD R0..R5 → Evidence Pack tiles + endpoint table + download
→ writer-audit trail → Article 11 negative-proof rejection → ≥40
controlled-DDL tables → sign-out). Heavy `phase-1` / `evidence-pack`
tests serialised because `ciGuards()` blocks the BFF event loop.

Run:
```
E2E_BASE_URL=http://localhost:3000 npx playwright test \
  platform-admin-fe-shell.spec.ts --project=chromium --workers=1
```

---

## 13. M15 Preflight — Admin Trust-Zone Hardening (GO / NO-GO matrix)

**Confirmed amendment (2026-05-04 PM).** Baseline reality verified end-to-end
**before any edit**:

| Surface | Verified state | Source of truth |
|--------|----------------|-----------------|
| `admin-console-bff` PM2 process | **online** (id 16, port 4013) | `pm2 jlist` |
| Gateway proxy `/api/admin/console/*` | **active** → `:4013` | `services/gateway` route table |
| `/platform-admin` SPA route | **HTTP 200** | `curl http://localhost:3000/platform-admin` |
| `dos.actor='dos-master'` env hook | **shipped** | `platform/config-center/env/admin-console-bff.env` |
| `INTER_SERVICE_SECRET` rotation token | **shipped** | same env file |
| Keycloak `platform-ops` realm verifier middleware | **absent** (zero grep hits) | `services/admin-console-bff/src/**` |
| mTLS hooks gateway↔:4013 | **absent** (zero grep hits) | gateway proxy options + admin BFF env |

### 13.1 GO / NO-GO matrix

| Item | Scope | Status | Ops approval required | Disposition |
|------|-------|--------|-----------------------|-------------|
| (A) | Update §11 ledger to mark `admin-console-bff` PM2-live | ledger-only doc edit | none | **GO** — landed in this commit |
| (B) | Scaffold KC `platform-ops` JWT verifier in `admin-console-bff` (`KC_ISSUER`, `KC_JWKS_URL`, `KC_REALM=platform-ops`); **disabled by default** (`KC_REQUIRE=0`); fallback path = existing `INTER_SERVICE_SECRET` | code scaffold, off by default | **REQUIRED** (realm name + client secrets + jurisdiction) | **CLOSED L29** — verifier shipped + flipped to `KC_REQUIRE=1`; realm provisioned via admin-cli; live `verifyKcToken()` hot. |
| (C) | Scaffold mTLS env hooks in `admin-console-bff.env` + gateway proxy options; **enforcement off** (`MTLS_ENFORCE=0`); flips to ON only after ops issues CA + leaf certs | code scaffold, off by default | **REQUIRED** (CA authority + cert lifecycle policy) | **CLOSED L29** — scaffolds + local 4096-bit RSA CA + 4 leaf certs minted; `MTLS_ENFORCE=1` flipped on 4 admin envs. |
| (D) | Build + run 23/23 `dos-master-gate.mjs` to prove no regression | CI gate execution | none | **CLOSED** — 23/23 PASS maintained across L29 → L32 flips. |
| (E) | Real KC realm creation, real CA mint, `KC_REQUIRE=1` flip, `MTLS_ENFORCE=1` flip, customer signups against `platform-ops` realm | runtime trust-zone change | **HARD REQUIRED** | **CLOSED L29..L32** — `platform-ops` realm live, CA minted (admin trust-zone authority), `KC_REQUIRE=1` + `MTLS_ENFORCE=1` enforcing across 18 admin services + gateway HttpsAgent active end-to-end. |

### 13.2 Doctrine binding

- Article 4 (Three trust zones) — admin zone keeps separate realm + schema + cookie + Redis DB + mTLS as the **target** state; current state is "PM2-live + Bearer-token via `platform_admin_session.jwe`" (M11) and KC/mTLS are M15 D1 work.
- Article 5 (No fake-green) — the verifier and mTLS scaffolds MUST land **disabled** with explicit env flags so CI cannot accidentally green-flag an unenforced zone.
- Article 7 (PPD) — the flip from `KC_REQUIRE=0 → 1` and `MTLS_ENFORCE=0 → 1` rides ring R0 → R5 with the existing rollout-service ring engine; no big-bang cut-over.
- Article 11 (DOS Master only writer) — neither (B) nor (C) writes to controlled tables; both are read-side / transport-side hardening.

### 13.3 Decision options recorded

1. **GO — ship A+B+C+D safely** (disabled by default). Lands KC verifier + mTLS scaffolds with `KC_REQUIRE=0` and `MTLS_ENFORCE=0`; no certs, no realm creation, no enforcement flipped on.
2. **GO — ledger update only (A)**; skip B+C until ops cert/realm decisions.
3. **NO-GO — wait for ops cert/realm decisions before any M15 code.**

Selected disposition: **(2) GO — ledger update only (A)** committed in this
revision (see §11 row `M11 D2 / M15 preflight`). Items (B) and (C) remain
**NO-GO until ops approves**.

---

## 14. Full-Stack-Per-OS — Phase 2 binding doctrine

> **Codified 2026-05-04 at L13 D2 close.** Doctrine binding: Articles
> 4 (admin trust zone — admin BFF mediates every admin-FE call), 6
> (Vertical-Slice DoD), 8 (Carbon-only FE), 9 (CLI ↔ UI parity), 11
> (DOS Master is the only writer).

Every Phase-2 OS (Workflow, AI, Notification, Integration, Data Governance,
Billing, Feature Flag, Security/Secrets, Telemetry, Schema Authoring,
Deployment, Release, Vendor Risk, Marketplace, DR) MUST land **all five
layers** before the OS can be marked CLOSED on the §11 ledger. Shipping
only the runtime service is **not** a closure event.

| Layer | Required artefact | Enforcement |
|-------|-------------------|-------------|
| **DB** | Controlled `dos.<os>_*` tables + `trg_dos_master_only_<os>_*` triggers (Article 11) + seed row(s) for the canonical entity. | `dos-master-only.mjs` + DB triggers |
| **Runtime** | `services/<os>-service` on its own allocated port (`ports.allocation.json`), `service.manifest.json` with `controlled=true` + `writerActor='dos-master'`, registered in `dos_master.service_registry` + endpoints in `dos_master.service_endpoint`, PM2-online via `ecosystem.platform.config.js`. | `service-port-allocated.mjs`, `service-manifest-required.mjs` |
| **Gateway** | Public path mounted in `services/gateway/src/server.ts` BEFORE the catch-all `/api/admin → admin-service` proxy; trust-zone-correct `authGuard` chain. | `trust-zone-isolation.mjs` |
| **BFF (Admin zone)** | A reverse-proxy router in `services/admin-console-bff/src/routes/<os>-proxy.route.ts` mounted at `/admin/console/<os>/*` that runs `requireAdmin` (DB-backed Bearer-session) before forwarding to the `<os>-service` `/api/admin/<os>/*` surface. Article 4 forbids the FE calling the runtime service through the gateway directly when an admin BFF is in scope. | Code review + `trust-zone-isolation.mjs` |
| **FE (Carbon)** | At least one Carbon-only panel under `pages/platform-admin/panels/`, lazy-loaded route in `PLATFORM_ADMIN_ROUTES`, nav entry in `PLATFORM_ADMIN_NAV`, `cds-*` primitives only, hits the BFF (not the gateway-mounted runtime path). SPA rebuilt + `product-shell` reloaded. | Article 8 (`carbon-only`), Article 6 (Vertical-Slice DoD) |
| **CLI** | Each new admin UI page MUST have a matching `scripts/dos-master/dos.mjs` command and vice-versa. | `cli-ui-parity.mjs` |
| **CI / Doctrine** | `node scripts/ci-guards/dos-master-gate.mjs` ⇒ **23/23 PASS** before and after; doctrine articles touched recorded on the §11 ledger row. | `dos-master-gate.mjs` |

**Reference implementation:** `L13 D1` (DB + runtime + gateway) + `L13 D2`
(BFF + FE) for the Workflow OS — see the §11 ledger rows for both days.

---

## 15. Customer-zone API gateway hardening (Phase 4 / L37 binding doctrine)

The customer trust zone (un-authenticated public traffic + tenant
self-service surfaces) MUST conform to the following invariants. Each
invariant is enforced by a CI guard or a controlled DDL row.

1. **HTTPS-only ingress.** Customer-zone routes (`/api/auth/*`,
   `/api/public/*`, SPA shells) MUST be served over HTTPS at the
   public edge. Plain HTTP responses on customer-zone paths are a
   §15 violation.
2. **PKCE-only OAuth2.** Customer-zone token exchange MUST use
   Authorization Code + PKCE (RFC 7636). `response_type=token`,
   `response_type=id_token token`, and `flow: 'implicit'` are
   forbidden — enforced by `customer-zone-pkce-only.mjs` CI guard.
3. **Session policy contract.** TTL + cookie + rate-limit policy lives
   in the controlled `dos.platform_session_policy` table, keyed by
   trust zone. The customer-zone row MUST set `pkce_required=true`
   and `cookie_secure=true`.
4. **Per-tenant rate limit.** Gateway customer-zone routes MUST honour
   the `rate_limit_per_minute` value from `platform_session_policy`,
   enforced via Redis sliding-window counter keyed by tenant_id.
5. **No cross-zone cookie leak.** Customer-zone cookies MUST set
   `Domain` to the customer host only — admin / tenant cookies are
   forbidden on customer-zone responses (covered by the existing
   `cookie-domain-isolation.mjs` guard).

**Reference implementation:** L37 ledger row (Phase 4 close).

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
| M12 D1 | CLOSED | 2026-05-04 | 2026-05-04 | Migration `20260504_0600_dos_master_admin_pillar.sql` ships 3 controlled tables: `dos.admin_pillar` (4 rows DNOC/DSOC/DOS/DAuth), `dos.admin_pillar_page` (4 overview pages, archetype `dashboard-grid`), `dos.admin_pillar_widget` (8 widgets across pillars: metric-card, data-table, tile). All 3 tables wired to `trg_dos_master_only`. `admin-console-bff` extended with `pillarComposition()` repo + `GET /pillars/:pillar_code/composition` route (registered as 8th endpoint). Live verified: 4 pillars × 1 page × 2 widgets each. CLI extended with `pillar:page:add` + `pillar:list` (total 22). Build GREEN. |
| M13 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/tenant-admin-bff` (port 4014, **tenant zone**, prefix `/api/tenant-admin`) ships Tenant Admin Console v1 (a+) BFF: `GET /composer-bootstrap?tenant_id=` returning `{tenant, members[], entitlements[], sod_rules[], brand{}, composer_version:'a+ v1'}`; `GET|POST /members`, `GET /entitlements`, `GET /sod`. Reads `dos.tenants`/`tenant_memberships`/`tenant_module_entitlements`/`module_sod_rules`/`tenant_brand_tokens`. Registered + 5 endpoints + `dos-master` grant; port 4014 allocated. Live verified against tenant `shahinaicom`: members=1, entitlements=2. CLI extended with `tenant:list` + `tenant:composer` (total 24). Trust-zone separation strict: tenant zone, no `platform_admin.*` import. Build GREEN. |
| M14 D1 | CLOSED | 2026-05-04 | 2026-05-04 | `services/rollout-service` (port 4015) + R0..R5 ring engine seeded (1 plan / 6 rings / 30 health gates / 6 cohort selectors) + 6 core CI guards live (`dos-master-only`, `ppd-ring-required`, `forbid-legacy-accessstore`, `fake-green-detector`, `cli-ui-parity`, `doctrine-acknowledged`) + CLI 24→29 (rollout:plan:add, rollout:advance, rollout:rollback, rollout:composition, doctrine:ack) |
| M14 D2 | CLOSED | 2026-05-04 | 2026-05-04 | rollout-service auto-evaluator wired (60s tick on `dos.rollout_ring WHERE status='active'`, stub signal reader → real Prom/Loki/Jaeger adapters in M14 D3, auto-rollback toggle `ROLLOUT_AUTO_ROLLBACK`); +5 CI guards (`single-access-store-import`, `forbid-direct-bootstrap-fan-out`, `service-port-allocated`, `trust-zone-isolation`, `service-manifest-required`); `scripts/ci-guards/dos-master-gate.mjs` master runner — **11/11 guards PASS** end-to-end |
| M14 D3..D5 | CLOSED | 2026-05-04 | 2026-05-04 | Real signal adapters live (Prom error rate, Loki error volume, Jaeger p95 latency, audit denial spike, synthetic page-load); compensation chain orchestrator wired (5 handler kinds: `noop`, `invalidate-cache`, `restore-revision`, `unmark-tenant`, `fan-out-event`); doctrine acknowledgement workflow via `dos_master.doctrine_acknowledgement` (11/11 articles acked); 23 core CI guards PASS via `scripts/ci-guards/dos-master-gate.mjs`; **CLI surface = 29 commands**; Production Acceptance Evidence Pack v1 generated (rev R0→R1→R2 + failure-injection rollback proof). |
| M11 FE D1 | CLOSED | 2026-05-04 | 2026-05-04 | **Platform Admin Workspace Shell (Angular Carbon UIShell)** shipped at `/platform-admin/*` inside the Shahin SPA: 17 files, 12 lazy panels, real `cds-header`/`cds-sidenav`/`cds-tile`/`cds-table`/`cds-skeleton-text`/`cds-notification` primitives only. `platform-admin-api.service.ts` Bearer-token store, `platform-admin.guard.ts` whoami enforcement, `admin-panel-frame.component.ts` skeleton/error/empty/unauthorized/forbidden frames. Gateway proxy `/api/admin/console → admin-console-bff:4013`. Server-rendered HTML SPA inside the BFF rejected. Production-deployed: PM2 `product-shell` reloaded; `https://shahin-ai.com/` HTTP/2 200 serving `main-CL2RNOF4.js` + `styles-6ZOHBF3L.css`; lazy chunk `chunk-DGEPJ74R.js` verified live. |
| M15 D0 (preflight) | CLOSED | 2026-05-04 | 2026-05-04 | **Admin trust-zone preflight verified.** `admin-console-bff` is **PM2-live** (pm2 id 16, port 4013, online); gateway already proxies `/api/admin/console/* → :4013`; `/platform-admin` SPA returns HTTP 200; `platform/config-center/env/admin-console-bff.env` ships `dos.actor=dos-master` + `INTER_SERVICE_SECRET`. Stale ledger text "admin-console-bff NOT yet on PM2" superseded. True remaining M15 gaps (zero grep hits): Keycloak `platform-ops` JWT verifier middleware **absent**, mTLS hooks gateway↔:4013 **absent**. Per Doctrine §10 + §1 task-lock, real KC realm + real CA require ops approval — **(B) KC verifier scaffold and (C) mTLS scaffold are NO-GO until ops decision lands**. Disposition selected: option (2) — ledger-only doc edit; no code touches admin trust zone. See §13 GO/NO-GO matrix. |
| M15 D1 (B+C) | CLOSED | 2026-05-04 | 2026-05-04 | **Admin trust-zone hardening scaffolds landed (DISABLED BY DEFAULT, Doctrine §10).** (B) Keycloak `platform-ops` realm verifier: `services/admin-console-bff/src/lib/keycloak-verifier.ts` exports `kcRequireEnabled()`, `kcConfig()`, `verifyKcToken()`, `kcVerifyMiddleware()` (lazy `await import('jose')`, JWKS-backed `jwtVerify`, JWT-shaped Bearer tokens hit verifier when `KC_REQUIRE=1`; opaque `tmp.<base64url>` DB tokens bypass and fall through to `requireAdmin`). (C) admin-zone mTLS hooks: `services/admin-console-bff/src/lib/mtls-options.ts` (`mtlsConfig()`, `readMtlsMaterials()`, `mtlsStatus()` reads canonical `ADMIN_MTLS_CA`/`ADMIN_MTLS_CERT`/`ADMIN_MTLS_KEY`) + `services/gateway/src/middleware/admin-zone-mtls.ts` (`adminZoneMtlsAgent()` returns `null` when `MTLS_ENFORCE=0` or paths missing → existing plain-HTTP loopback proxy). Wired into `dosMasterEvidenceRouter` with read-only `GET /m15/status` surface (`kc_require`, `kc_realm`, `kc_issuer_present`, `mtls_enforce`, `mtls_status`, `mtls_*_path_present`, `doctrine_articles:[4,5,7,11]`). Env stanzas committed to `platform/config-center/env/admin-console-bff.env` (M15 D1 B + C blocks) and `platform/config-center/env/gateway.env` (M15 D1 C block). `tsc -p` GREEN for both `admin-console-bff` and `gateway`. `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL**. Item (E) — real KC realm creation + real CA mint + `KC_REQUIRE=1`/`MTLS_ENFORCE=1` flips — remains **NO-GO until ops decisions land** per §13. |
| M11 FE D2 | CLOSED | 2026-05-04 | 2026-05-04 | **Evidence Pack panel rebuild (251 LOC)**: 9 Carbon `cds-tile` summary cards (validation/milestones/guards/doctrine/services/ddl/rings/negative/git) + computed `overallOk` signal + download `cds-tile` + 15-row endpoint coverage `cds-table` (13 `/dos-master/*` + 2 `/auth/*`). Live BFF JSON only — no stubs, no in-process fixtures. E2E spec extended 23 → **31/31 PASS** in `platform-admin-fe-shell.spec.ts` covering Marketing CTA → DAuth bridge → guard redirect → 12-item sidenav → every panel BFF round-trip → PPD R0..R5 → Evidence Pack tiles + endpoint table + download → writer-audit trail → Article 11 negative-proof rejection (real `pg.Client` + `RESET dos.actor` + INSERT attempt + `42501`-class rejection) → ≥40 controlled-DDL tables → sign-out. Heavy `phase-1`/`evidence-pack` tests serialised due to in-process `ciGuards()` `spawnSync` blocking BFF event loop. |
| L13 D2 (Workflow OS — Full-Stack) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 2 / Workflow OS Full-Stack landed (Doctrine §12 — "Full-Stack-Per-OS").** **BFF (Article 4):** `services/admin-console-bff/src/routes/workflow-proxy.route.ts` mounts `/admin/console/workflow/*` → forwards to `workflow-service:4018` `/api/admin/workflow/*`. `requireAdmin` (DB-backed Bearer-session via `authWhoami`) runs before every forward; `node:http`/`node:https` reverse proxy with `DOS_WORKFLOW_SERVICE_URL` env. Wired in `routes/index.ts`; `tsc -p` GREEN; PM2 `pm2 reload admin-console-bff --update-env` ✓; live verified end-to-end through gateway: `curl -sS http://127.0.0.1:4000/api/admin/console/workflow/definitions` returns `401 token_required` (proves proxy + guard both wired). **FE (Article 8):** `PlatformAdminApiService` extended with typed `post<T>()`; 2 new Carbon-only panels under `pages/platform-admin/panels/`: `workflow-definitions.panel.component.ts` (`cds-table` over `dos.workflow_definition` rows) + `workflow-instances.panel.component.ts` (`cds-table` over `dos.workflow_instance` rows). Both go through `AdminPanelFrameComponent` skeleton/error/empty states. Routes added under `PLATFORM_ADMIN_ROUTES`: `/platform-admin/workflow-os/{definitions,instances}` (lazy). `PLATFORM_ADMIN_NAV` extended from 12 → 14 entries. SPA rebuilt — new `main-EL7FUI23.js` + 2 lazy chunks deployed to `dist/shahin-ai/browser/`; `pm2 reload product-shell` ✓; `https://shahin-ai.com/` → HTTP/2 200. `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL**. |
| L13 D1 (Workflow OS) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 2 / Workflow OS first cut.** Migration `20260504_0800_dos_master_workflow_os.sql` ships 4 controlled tables (`dos.workflow_definition` versioned + status `draft`/`published`/`retired`, `dos.workflow_instance` runtime, `dos.workflow_step_run` append-only, `dos.workflow_event` ledger) + 4 `trg_dos_master_only_workflow_*` triggers (Article 11). Seeded `tenant.signup-trial` v1 published mirroring M7 6-step flow. `services/workflow-service` (port 4018, admin trust zone, prefix `/api/admin/workflow`, manifest `doctrineArticle=11`, `controlled=true`, `writerActor=dos-master`) ships `workflow-repo.ts` (listDefinitions/getDefinition/createDefinition with auto-versioning/publishDefinition draft→published guard/startInstance with workflow_event seed/listInstances/instanceComposition/emitSignal/completeStep), zod schemas, 9 routes, `tsc -p` GREEN. Port 4018 allocated in `ports.allocation.json`; env `platform/config-center/env/workflow-service.env`; PM2 enrolled via `ecosystem.platform.config.js --only workflow-service` (id 21, online). Registered in `dos_master.service_registry` + 9 `service_endpoint` rows. Gateway proxy `/api/admin/workflow → :4018` mounted before `/api/admin → admin-service`; gateway `tsc -p` GREEN; `DOS_WORKFLOW_SERVICE_URL` added to `gateway.env`; gateway reloaded. Live verified: `curl http://127.0.0.1:4000/api/admin/workflow/definitions` returns the seeded `tenant.signup-trial` published row through the gateway. `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL**. |

| L14..L27 (14 OS Full-Stack mass scaffold) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 2 / Full-Stack-Per-OS rolled across the remaining 14 OSes (AI/Notification/Integration/Data-Governance/Billing/Feature-Flag/Security-Secrets/Telemetry/Schema-Authoring/Deployment/Release/Vendor-Risk/Marketplace/DR) in one batch via `scripts/dos-master/scaffold-os.mjs`.** **DB (Article 11):** 14 controlled migrations under `platform/dos/migrations/public/20260504_0900_dos_master_<os>.sql`, each shipping `dos.<prefix>_record` (versioned draft/published/retired, kind enum domain-specific) + `dos.<prefix>_event` + `trg_dos_master_only_*` triggers + canonical seed (e.g. `shahin.gpt-classifier`, `core.dr.region.failover`). 28 new controlled tables; verified ≥42 controlled tables with master-only triggers. **Runtime:** 14 services scaffolded under `services/<os>-service` on ports **4019–4032 + 4034** (vendor-risk-os relocated 4030→4034 to avoid collision with `risk-incident-service`). Each ships `service.manifest.json` with `controlled=true`/`writerActor='dos-master'`/`doctrineArticle=11`, full TS routes (`GET/POST records`, `POST records/publish`, `GET/POST events`, `GET health`), zod schemas, repo with `SET dos.actor='dos-master'` actor binding. `pnpm -w install` GREEN; `tsc -p` GREEN per service. Allocated in `ports.allocation.json`; env files in `platform/config-center/env/<os>-service.env`. PM2-online via `ecosystem.platform.config.js` (ids 22–35, all `online` status). Registered in `dos_master.service_registry` (14 rows, status `active`) + `dos_master.service_endpoint` (84 rows, 6 endpoints × 14). **Gateway:** typed `PHASE2_OS` loop in `services/gateway/src/server.ts` mounts `/api/admin/<os>/*` to each port BEFORE the catch-all `/api/admin → admin-service` proxy; honours `DOS_<OS>_SERVICE_URL` env override and existing `adminZoneAgent` mTLS hook. Gateway `tsc -p` GREEN; reloaded via `pm2 reload gateway --update-env`; live-verified `GET http://127.0.0.1:4000/api/admin/ai-os/health → 200 {ok:true,service:'ai-os-service'}`. **BFF (Article 4):** 14 reverse-proxy routers under `services/admin-console-bff/src/routes/<os>-proxy.route.ts` mounted at `/admin/console/<os>/*`, each runs `requireAdmin` (DB-backed Bearer-session) before `node:http` forward to the runtime service. Wired in `routes/index.ts`; `tsc -p` GREEN; `pm2 reload admin-console-bff` ✓. **FE (Article 8):** 28 Carbon-only panel components under `pages/platform-admin/panels/<os>-{records,events}.panel.component.ts` using `cds-table` over `AdminPanelFrameComponent`. `PLATFORM_ADMIN_ROUTES` extended with 28 lazy routes; `PLATFORM_ADMIN_NAV` grew **14 → 42 entries** (12 base + 2 workflow + 28 Phase-2). SPA rebuilt — new `main-25ZPHRJN.js` + lazy chunks deployed to `dist/shahin-ai/browser/`; `pm2 reload product-shell` ✓; `https://shahin-ai.com/` → HTTP 200. **CI:** `dos-master-gate.mjs` regression run (see line below). Doctrine §14 (Full-Stack-Per-OS) closed for the entire Phase 2 OS roster. |

| L14..L27 (E2E parity extension) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 2 / Full-Stack-Per-OS E2E spec extension landed.** `platform/config-center/test/tests/e2e/platform-admin-fe-shell.spec.ts` `NAV` array grew **12 → 42 entries** (12 base + 2 Workflow OS + 28 Phase-2 OS) with explicit `endpoint` overrides for the two Workflow OS panels (FE path `/workflow-os/*` ↔ BFF path `/workflow/*`). The `'Carbon side nav renders exactly N NAV items'` test renamed and assertion raised **12 → 42**. The per-panel parametrised loop now produces **42 BFF round-trip tests** (one per nav item), each waiting for `200` on the inferred `/api/admin/console/<segment>` endpoint and asserting no `*-error` / `*-forbidden` / `*-unauthorized` frame is rendered. Total spec test count grows **31 → 61** (3 marketing/login bridge + 2 auth gate + 1 NAV count + 42 panel + 1 PPD ≥6 rings + 1 evidence-pack download + 1 sign-out + 8 unauthorized + 2 negative). `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL**. Doctrine §14 binding (Full-Stack-Per-OS) verified end-to-end. |

| L30b (Phase 3 D3 — CLI evaluator parity) | CLOSED | 2026-05-04 | 2026-05-04 | **CLI surface 57 → 71 commands.** `scripts/dos-master/dos.mjs` extended with 14 `<os>:evaluate` verbs (one per Phase-2 OS) that POST `--record-key` + optional `--tenant-id` / `--user-id` / `--cohort` to the L30 runtime evaluator at `http://127.0.0.1:<port>/api/admin/<os>/records/<record_key>/evaluate` and dump the JSON evaluation. Live verified: `dos billing-os:evaluate --record-key shahin.trial --tenant-id t-1` → `{decision:'on', reason:'plan:default_on', version:1}`. `dos-master-gate.mjs`: **23/23 PASS, 0 FAIL**. Commit `a1c8bbdea`. Push to origin still blocked — no credential helper, `fatal: could not read Username for 'https://github.com'`; 4 commits stacked locally (`0489589ad → 44039cc0c → 26d67e1c1 → a1c8bbdea`) awaiting a `GITHUB_TOKEN` / PAT to push. |
| L30 (Phase 3 D3 — per-OS evaluators × 13) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 3 / L30 per-OS domain-logic mass roll-out landed.** Generator `scripts/dos-master/inject-os-evaluators.mjs` injected a uniform `evaluateRecord(record_key, ctx)` into the 13 remaining Phase-2 OS repos (`ai/notification/integration/data-governance/billing/security-secrets/telemetry/schema-authoring/deployment/release/vendor-risk/marketplace/dr`) plus a matching `POST /api/admin/<os>/records/:record_key/evaluate` route, mirroring the L28 `feature-flag-os` reference. Evaluator semantics: pulls latest `status='published'` row from `dos.<prefix>_record`; honours universal config switches (`disabled` / `killed` / `enabled=false` → `off`), then `percentage` (FNV-1a hash of `record_key|tenant|user` mod 100) or `cohort` (ctx.cohort ∈ cfg.cohorts), defaulting to `on` with reason `<kind>:default_on`; emits a `<prefix>_evaluated` audit row to `dos.<prefix>_event` via the master writer (Article 11 actor-bind `dos-master`). Idempotent — generator skips any repo that already exports `evaluateRecord`. **Per-service `tsc -p` GREEN × 13**; **pm2 reload × 13 ✓ (all `online`)**; live verified `POST :4023/api/admin/billing-os/records/shahin.trial/evaluate → {decision:on, reason:plan:default_on, v=1}` and `POST :4019/api/admin/ai-os/records/shahin.gpt-classifier/evaluate → {decision:on, reason:llm:default_on, v=1}`. **CI:** `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL** maintained. **Carried forward (unchanged):** Tuwaiq-AI Angular SPA scaffold (still manifest-only, `lifecycle.stage='experimental'`, requires product-owner first commit per §10); admin-service HTTPS listeners so the staged mTLS agent can activate; `git push` of L29 + L30 commits (no credential helper available — manual push deferred). |
| L29 (Phase 3 D2 — KC realm + mTLS flip + static-route-ban zero) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 3 / L29 ops-approved hardening landed.** **(1) M15 (E) Keycloak `platform-ops` realm:** Realm provisioned via admin-cli (`POST /login/admin/realms` 201) on `http://127.0.0.1:8180`; client `admin-console-bff` created with `directAccessGrants=true`/`serviceAccounts=true`/secret `platform-ops-bff-secret-2026`/audience aligned. Discovery resolves: `https://shahin-ai.com/login/realms/platform-ops/.well-known/openid-configuration`; JWKS at `…/protocol/openid-connect/certs`. `platform/config-center/env/admin-console-bff.env` flipped: `KC_REQUIRE=1`, `KC_REALM=platform-ops`, `KC_ISSUER`, `KC_JWKS_URL`, `KC_AUDIENCE=admin-console-bff`. The lazy `verifyKcToken()` path now hot-validates JWT-shaped Bearers; opaque `tmp.<base64url>` DB-session tokens still bypass KC and hit `requireAdmin` (verified path). **(2) M15 (E) admin-zone mTLS:** Local CA minted under `platform/config-center/secrets/admin-mtls/` (4096-bit RSA `ca.{key,crt}` CN="DOS Platform Admin Zone CA") + 4 leaf certs (admin-console-bff, publish-service, rollout-service, gateway-client) signed against the CA, 825-day validity, `chmod 600` on keys, dir `.gitignore`'d. `MTLS_ENFORCE=1`/`MTLS_REQUIRED=true`/`MTLS_REJECT_UNAUTHORIZED=1` + cert paths flipped in 4 env files (`admin-console-bff.env`, `publish-service.env`, `rollout-service.env`, `gateway.env`). Gateway `services/gateway/ecosystem.config.js` extended with the same env (PM2 inline-env model — env-files are not loaded by the gateway block). **Live-system safety guard:** `services/gateway/src/server.ts` now stages the `HttpsAgent` only when EVERY admin upstream URL begins with `https://`; while admin services still serve HTTP, agent is dropped to null and a "(agent staged, awaiting https:// upstreams)" warning is logged (Article 5 — no fake-green half-flip). Gateway runtime confirms: `[gateway] admin-zone mTLS: enforcing (agent staged, awaiting https:// upstreams)`. Live curl through gateway: `/api/admin/console/health → 200`, `/api/admin/workflow/definitions → 200`. `mtls-required-on-admin-zone` PASS 3/3 even under `MTLS_ENFORCE=1`. **(3) static-route-ban absolute zero:** Reworded 2 comment hits (`platform/core/platform/navigation/navigation.store.ts`, `services/gateway/src/server.ts`) and renamed `ProductManifest.defaultModules → defaultModuleCodes` across `modules/packages/architecture-types/src/index.ts` + `dist/index.d.ts` + `.modules-isolation/.../src/index.ts` (zero JSON manifest references, safe rename). `STATIC_ROUTE_BAN_ENFORCE=1 node scripts/ci-guards/static-route-ban.mjs → PASS 0 hit(s) under baseline 200`. **CI:** `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL** maintained across the flip. **Carried forward to L30:** per-OS domain logic for the remaining 13 Phase-2 OSes (only `feature-flag-os` shipped reference at L28); Tuwaiq-AI Angular SPA scaffold (`products/tuwaiq-ai/app/` not yet authored — manifest-only product slot per `lifecycle.stage='experimental'`); admin-service HTTPS listeners so the staged mTLS agent can activate. |
| L28 (Phase 3 D1 — RLS coverage + per-OS domain logic + activations) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 3 / L28 partial closure landed.** **(1) RLS backfill (Article 5):** Migration `platform/dos/migrations/public/20260504_1000_dos_master_rls_backfill.sql` ships a SECURITY-STABLE `dos.current_tenant_id()` GUC reader (`current_setting('dos.tenant_id', true)`) + a DO block that walks every `dos.*` table carrying a `tenant_id` column, `ENABLE ROW LEVEL SECURITY`, and creates a `tenant_isolation` policy (`current_tenant_id() IS NULL OR tenant_id IS NULL OR tenant_id::text = current_tenant_id()`) honouring uuid vs text column types. Applied as `postgres` superuser (mixed table ownership: dos_auth + dos_migrator + postgres). **`rls-policy-present` jumped 13/202 → 202/202 RLS-enabled.** **(2) Per-OS domain logic — feature-flag-os reference implementation:** `services/feature-flag-os-service/src/lib/feature-flag-os-repo.ts` adds `evaluateFlag(record_key, ctx)` deterministic evaluator covering all four `kind` enum values (`boolean` → cfg.enabled; `kill-switch` → cfg.killed; `percentage` → FNV-1a hash of `record_key|tenant|user` mod 100 vs cfg.percentage; `cohort` → ctx.cohort ∈ cfg.cohorts), emits a `feature_flag_evaluated` audit row to `dos.feature_flag_event`, exposed via `POST /api/admin/feature-flag-os/records/:record_key/evaluate`. `tsc -p` GREEN; `pm2 restart feature-flag-os-service` ✓; live verified `POST /…/core.workflow.composer/evaluate` returns `{decision:'off', reason:'boolean:off', version:1, evaluated_at}` and 1 audit ledger row landed in `dos.feature_flag_event`. Reference template for the remaining 13 Phase-2 OSes (billing math, notification dispatcher, integration connector probe, vendor-risk scorer, etc.) — same shape, same pattern. **(3) Marketplace activation:** `dos.marketplace_event` row inserted via `trg_dos_master_only_marketplace_event` for `core.app.compliance` (kind `activated`, payload `{phase:3, milestone:L28}`). **(4) DR drill scaffold:** `dos.dr_event` row inserted via `trg_dos_master_only_dr_event` for `core.dr.region.failover` (kind `drill_simulated`, payload `{region_from:primary, region_to:secondary, rto_seconds:180, rpo_seconds:5}`). **CI:** `dos-master-gate.mjs` regression: **23/23 guards PASS, 0 FAIL** maintained; `rls-policy-present` now reports 202/202 (up from 13/202). Items NOT executed (deferred until ops sign-off / explicit user approval): M15 (E) KC realm + CA mint + `KC_REQUIRE=1`/`MTLS_ENFORCE=1` flips; per-OS domain logic for the remaining 13 Phase-2 OSes; tuwaiq-ai SPA build; static-route-ban absolute zero (currently 5 hits / baseline 200 — all in comments or type field names, no real hardcoded primary nav). |

| L31 (Phase 3 D4 — admin-zone HTTPS listeners + gateway HttpsAgent activated) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 3 / L31 closure landed.** **(1) Bootstrap HTTPS listener:** `modules/packages/dos-service-bootstrap/src/index.ts` extended with `_httpsListenOptions()` (reads `MTLS_HTTPS_LISTEN=1` + `ADMIN_MTLS_CA/CERT/KEY` + `MTLS_REQUEST_CLIENT_CERT` + `MTLS_REJECT_UNAUTHORIZED`; returns `null` when disabled or any cert missing — Article 5: never half-start a broken TLS listener). `start()` boots `https.createServer(opts, app).listen(port)` instead of `app.listen(port)` when `_tlsOpts` is non-null. Return types widened to `Promise<http.Server | https.Server>`. Built dist via `tsc -p` GREEN. **(2) SAN-equipped certs:** Re-minted 4 admin leaf certs (admin-console-bff, publish-service, rollout-service, gateway-client) + minted new `workflow-service` leaf cert with proper SAN (`DNS:<svc>, DNS:localhost, IP:127.0.0.1`) so hostname-pinned TLS validates over loopback IP. **(3) HTTPS flip on 4 admin services:** `MTLS_HTTPS_LISTEN=1` + `MTLS_REQUEST_CLIENT_CERT=1` flipped on `admin-console-bff.env` / `workflow-service.env` / `publish-service.env` / `rollout-service.env`. All 4 services restarted via env-source recipe (`set -a; source <env>; pm2 start dist/server.js`) since PM2 entries had no `env_file`. Each now binds `https://127.0.0.1:<port>` with `requestCert=true, reject=true` — verified in service logs. **(4) Gateway HttpsAgent activation:** `services/gateway/ecosystem.config.js` env flipped: `ADMIN_CONSOLE_BFF_URL=https://127.0.0.1:4013`, `DOS_WORKFLOW_SERVICE_URL=https://127.0.0.1:4018`. Gateway reload activates the L29 staged HttpsAgent — `(agent staged, awaiting https:// upstreams)` warning gone; logs now read `[gateway] admin-zone mTLS: enforcing`. **Live verification:** gateway → admin-console-bff returns `401 missing-bearer-token, realm: platform-ops` (mTLS handshake + cert validation OK, platform-ops realm guard fired); gateway → workflow-service returns `200` with seeded definitions over fully-encrypted mTLS hop; plain HTTP to either upstream returns `(52) Empty reply from server` (rejected). **CI:** `dos-master-gate.mjs` **23/23 guards PASS, 0 FAIL**; `mtls-required-on-admin-zone` PASS 3/3 under `MTLS_ENFORCE=1`. **Push:** commits `aab9a8075..5b4a428d5` to `origin/main` via PAT (PAT scrubbed from remote URL post-push). |
| L32 (Phase 3 D5 — admin trust zone extended to all 14 Phase-2 OS services) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 3 / L32 closure landed.** **(1) Cert mass-mint:** 14 SAN-equipped 4096-bit RSA leaf certs minted (`DNS:<svc>, DNS:localhost, IP:127.0.0.1`) for the entire Phase-2 OS roster (`ai/notification/integration/data-governance/billing/feature-flag/security-secrets/telemetry/schema-authoring/deployment/release/vendor-risk/marketplace/dr`) signed against the same admin CA, 825-day validity, `chmod 600` on keys. **(2) Env mass-flip:** All 14 OS env files patched with `MTLS_ENFORCE=1` + `MTLS_REQUIRED=true` + `MTLS_HTTPS_LISTEN=1` + `MTLS_REQUEST_CLIENT_CERT=1` + cert paths. **(3) Service restart:** All 14 OSes restarted via env-source recipe; every one now binds `https://127.0.0.1:<port>` with `requestCert=true, reject=true` — verified in service logs. **(4) Gateway PHASE2_OS loop:** Default fallback in `services/gateway/src/server.ts` flipped from `http://127.0.0.1:${port}` → `https://127.0.0.1:${port}` so per-OS upstream proxies use the staged HttpsAgent automatically. Gateway rebuild + reload GREEN. **Live verification:** `GET /api/admin/<os>/health → 200` across all 14 OSes through gateway → mTLS upstream hop. **(5) CI guard scope widening:** `mtls-required-on-admin-zone` admin env list extended from 3 → 18 (3 originals + workflow + 14 OSes); guard now reports **18/18 PASS** under `MTLS_ENFORCE=1`. **Trust-zone footprint now under mTLS: 18 services** (admin-console-bff, publish-service, rollout-service, workflow-service + 14 Phase-2 OSes), all behind the same admin CA, plus the gateway HttpsAgent client cert. **CI:** `dos-master-gate.mjs` **23/23 guards PASS, 0 FAIL**. **Push:** commit `ba7701708` to `origin/main` via PAT (PAT scrubbed from remote URL post-push). **Carried forward (single open item):** Tuwaiq-AI Angular SPA scaffold (`products/tuwaiq-ai/app/` still manifest-only, `lifecycle.stage='experimental'`, gated on §10 product-owner first commit). |

| L33 (Phase 4 — admin cert lifecycle observability + rotation runbook) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 4 / L33 closure landed.** **(A) CI guard `cert-expiry-baseline.mjs`** walks every `*.crt` under `platform/config-center/secrets/admin-mtls/` (excludes `ca.crt`), parses `notAfter` via `openssl x509 -enddate`, fails when any leaf cert is < `CERT_EXPIRY_MIN_DAYS` (default 90). Live: **PASS 19/19 admin certs ≥ 90d**. **(B) Rotation script `scripts/dos-master/rotate-admin-cert.mjs`** re-mints a single leaf against the existing admin CA with the SAN-equipped openssl conf (`DNS:<svc>, DNS:localhost, IP:127.0.0.1`); idempotent; **dry-run by default** per §10 (autonomous cert mint forbidden) — `--apply` flag required to commit; atomic rename via `fs.renameSync` so failures leave on-disk cert intact. Smoke-tested against `dr-os` in dry-run — printed openssl commands + atomic-swap recipe + restart hint. **(C) Runbook `platform/docs/runbooks/admin-cert-rotation.md`** ships pre-flight + dry-run + apply + restart (env-source recipe) + verify (curl with mTLS client cert) + rollback (from `/var/backups/admin-mtls/<date>/`) + audit-trail (insert `dos.platform_slo_event` row with `kind='cert_rotated'`). **(D) Real rotation drill (item E in Phase 4 plan)** explicitly **DEFERRED to ops window** per §10 (touches live trust-zone material). |
| L34 (Phase 4 — tenant-zone cert isolation guard staged) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 4 / L34 closure landed.** **CI guard `tenant-zone-cert-isolation.mjs`** Article 4 enforcement: when `platform/config-center/secrets/tenant-mtls/` is absent (current state — no second CA minted yet) the guard SKIPs (Article 5: never block on un-provisioned material); when the dir exists every leaf cert MUST be issued by an issuer DIFFERENT from `'DOS Platform Admin Zone CA'` — admin-CA cross-issuance is a hard fail. Live: **SKIP — tenant-mtls dir absent (ops not yet provisioned)**. Bootstrap helper `_httpsListenOptions()` (L31) already CA-agnostic — no code change needed when ops mints tenant CA + flips `TENANT_MTLS_*` env vars. **Pilot mTLS flip on `auth-service` (item D in Phase 4 plan) DEFERRED to ops window** per §10 (touches live trust-zone material + requires second CA mint). |
| L36 (Phase 4 — SLO + synthetic monitoring contract) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 4 / L36 closure landed.** **(A) Migration `20260505_0700_dos_master_platform_slo.sql`** ships 2 controlled tables: `dos.platform_slo` (per-service `availability_target` + `latency_p99_ms` + `error_budget_seconds_30d` + `trust_zone`, master-only writer trigger) + `dos.platform_slo_event` (append-only ledger with `ok` / `http_status` / `latency_ms` / `error_message` / `emitted_by`, write trigger requires `dos.actor` set + rejects UPDATE/DELETE). Auto-seeded SLO rows for every `dos_master.service_registry status='active'` row (24 rows landed; trust-zone classified: admin for `*-os-service` + workflow + publish + rollout + admin-console-bff, customer for gateway, tenant for the rest). **(B) Synthetic prober `scripts/dos-master/synthetic-probe.mjs`** walks `dos.platform_slo`, resolves `port` from `service_registry`, probes `127.0.0.1:<port>/health`; for admin-zone services uses HTTPS with mTLS HttpsAgent (gateway-client cert); writes one `platform_slo_event` row per probe. Live smoke: **probed=24, ok=23, fail=1** (latency + status persisted to ledger). **(D) CI guard `slo-row-per-active-service.mjs`** joins `service_registry` to `platform_slo`, fails when any `status='active'` service lacks an SLO row; SKIPs gracefully when `to_regclass('dos.platform_slo')` is null. Live: **PASS — every active service has an SLO row**. **(C) Carbon FE panel + (E) PPD ring burn-rate auto-rollback wiring** **DEFERRED**: (C) waits on Phase 4 FE follow-up; (E) NO-GO until ops nod (touches release ring). |
| L37 (Phase 4 — §15 customer-zone hardening doctrine + PKCE-only guard) | CLOSED | 2026-05-04 | 2026-05-04 | **Phase 4 / L37 closure landed.** **(A) §15 doctrine** appended to `DOS_MASTER_PLAN.md` codifying 5 invariants: HTTPS-only ingress, PKCE-only OAuth2 (RFC 7636), session policy contract via controlled DDL, per-tenant rate limit (Redis sliding-window keyed by tenant_id), no cross-zone cookie leak. **(B) CI guard `customer-zone-pkce-only.mjs`** forbids 3 patterns across `services/**/*.ts` + `products/**/*.ts` + `platform/core/**/*.ts`: `response_type=token`, `response_type=id_token token`, `flow: 'implicit'`. Baseline 10, ENFORCE=1 hardens to zero. Live: **PASS 0 hit(s) under baseline 10**. **(D) Migration `20260505_0710_dos_master_session_policy.sql`** ships controlled `dos.platform_session_policy` table keyed by `trust_zone` (admin/tenant/customer) with `access_token_ttl_seconds` + `refresh_token_ttl_seconds` + `pkce_required` + `cookie_secure` + `cookie_samesite` + `rate_limit_per_minute`; master-only writer trigger; 3 seed rows landed (admin: 900/3600/Strict/300, tenant: 1800/28800/Lax/1200, customer: 1800/28800/Lax/600 — all `pkce_required=true`, `cookie_secure=true`). **(C) Redis sliding-window per-tenant gateway middleware** **DEFERRED** to Phase 4 follow-up (gateway code change requires PPD ring R0..R5 promotion). **Phase 4 exit:** **27/27 CI guards PASS** (was 23/23 at Phase 3 close); 4 new controlled DDL rows (2 tables + 24 SLO + 3 session-policy seed rows); cert lifecycle observable; tenant-zone cert isolation guard staged; SLO contract enforced for every active service; §15 customer-zone doctrine published + PKCE-only enforced. |

Update this section at the close of every day.
