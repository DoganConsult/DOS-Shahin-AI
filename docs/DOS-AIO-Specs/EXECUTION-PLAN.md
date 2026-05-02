# DOS-AIO Execution Plan — Platform / Product / Module

Distilled from the constitution, readiness rules, AGENTS.md, and the 58 module-patch templates.
Source-of-truth hierarchy: **DOS-AIO.md > Patch 0 > platform patches 1–15 > module patches MP-02..MP-58.**

---

## Phase 0 — Pre-flight & Baseline (do once, before any module work)

- [ ] **P0-1** Lock SoT hierarchy in writing — module patches must never override platform laws.
- [ ] **P0-2** Pause `ops/scripts/auto-sync.sh` (15s commit-everything) — re-baseline drift causes silent regressions.
- [ ] **P0-3** Re-verify the test harness — repo-root `strip_expects.js` / `skip_failed_tests.js` can pass-ify failing tests. Treat all cached test reports as suspect.
- [ ] **P0-4** Snapshot DB drift via `ops/normalization/ make help` and `dos.tenant_migrations`. No DDL outside `dos_migrator`.
- [ ] **P0-5** Confirm RBAC SoT = `canonical-*.ts` (544 perms / 13 roles / 12 mappings).
- [ ] **P0-6** Quarantine `_quarantine/` and the 34 root-level `* Module/` directories from the build until each is promoted.

---

## Phase 1 — Platform Core (DOS / DAuth / DSOC / DNOC) — must be neutral

> Constitutional Law 2 (Platform Core Neutrality) + Rule #1 (4D Platform Homes). Any product assumption inside `platform/` is a defect.

### P1-1 DOS — workflow + lifecycle + audit + tenants + migrations
- [ ] Verify `evaluateLifecycleTransition()` and `initiateApproval()` are the only paths protected transitions take.
- [ ] Audit writer/reader unified on `dos.audit_trail` (re-test).
- [ ] `dos.tenant_migrations` is the only DDL log; every module's SQL registers there.

### P1-2 DAuth — KC + OpenFGA + Cerbos + permissions/roles/SoD
- [ ] Close the 10 ENFORCE-flip gaps (write client, register/hire/fire push, invite, SCIM, divergence cron, OpenFGA approver tuples).
- [ ] 2 clean divergence cycles before flipping any tenant SHADOW → ENFORCE.
- [ ] One central realm `dogan`, one client per product brand; product hosts return 404 on `/realms/*`.

### P1-3 DSOC / DNOC — observability spine
- [ ] Diagnostics service per module exposes: latency, failure rate, overdue/stuck/unassigned/stale counts, AI usage.
- [ ] Pino + OpenTelemetry traces on every protected route.

### P1-4 Platform contracts — API shell, registry, config resolver
- [ ] Implement `UnifiedConfigService` + `SettingsResolver` per MP-58 before any module's runtime config work.
- [ ] Route catalog is authoritative: a route not in the catalog must not load.
- [ ] `config_center_audit_log` table + permissions `config.*.{read,write}` seeded.

### P1-5 Platform exit gate
- [ ] None of these may exist in `platform/`: hardcoded product catalogs, product-specific defaults, inline permissions, runtime tables without registry entries.

---

## Phase 2 — Product Layer (Shahin-AI first, then Dogan-AI / Hub / Lab / Consult)

> Constitutional Law 3 (Product Isolation). Each product owns its domain, schema, workflows, AI assets, onboarding, docs.

- [ ] **P2-1** Pick exactly ONE product as verticality target — **Shahin-AI**. Other 4 products freeze for net-new work.
- [ ] **P2-2** Confirm product manifest declares: enabled modules, providers, branding, locale (EN+AR), tenant defaults. Anything hardcoded that should be tenant-overridable goes through Config Center.
- [ ] **P2-3** Wire `products/shahin-ai/jobs/index.ts` — every scheduled job registered before its cron will fire.
- [ ] **P2-4** Frontend route shell — Angular routes in `platform-manifests/{module}.module.routes.ts`; sidebar reflects only enabled+ready modules; raw i18n keys = fail (use `lint-no-raw-i18n-key.mjs`).

---

## Phase 3 — Per-Module Verticality (the bulk of the work)

> **Rule (constitutional, non-negotiable): one module fully complete before starting the next.** No horizontal "all exports first / all permissions first" passes.

### 3A. Per-module recipe (apply for each of MP-02..MP-58)

For module **M**:

1. **Read the patch** — `module-patch-NN-{M}-end-to-end.md`. Re-read §2 (boundaries), §6 (API surface), §15 (fail conditions).
2. **Score the 10 problem groups** — FE/BE contract, runtime config, permissions, export, realtime, AI, placeholders, tenant safety, views/preferences, validation/proof. Mark each `NOT_APPLICABLE / ALREADY_COMPLETE / PARTIAL_BROKEN / MISSING`. Act only on the last two.
3. **Centralize truth** — pick canonical home (`modules/{M}/` default), AI hooks import from there.
4. **Backend skeleton** per §3 — full directory tree. Every service must have real code. No stubs / TODO / `return null`.
5. **Data model** per §5 — migrations under `modules/{M}/db/`, `__TENANT_SCHEMA__` prefix + `IF NOT EXISTS`, registered in `migrations-index.json` and tracked in `dos.tenant_migrations`.
6. **API surface** per §6 — every route in catalog, permission codes use `module.resource.action`, every body Zod-validated, every mutation calls `setAuditData()`.
7. **Workflow + DAuth** per §7 — every state transition routes through `evaluateLifecycleTransition()`; protected transitions create `approval_requests` via `initiateApproval()`; SoD typed and seeded; **role-check-only approvals = fail condition**.
8. **AI** per §8 — allowed: scoring, recommendation, narrative, summarization. Forbidden: autonomous approval, hidden override. Stay inside the 13 canonical agents A01–A13.
9. **UI states** per §9 — empty / loading / error / blocked / delegated / escalated / overdue / archived. EN+AR JSON, RTL-safe (`margin-inline-start`), `[dir]="i18n.direction()"`.
10. **Admin surface** per §10 — diagnostics, runbook, SLA/escalation visibility.
11. **Observability** per §11 — logs, metrics, diagnostics service, AS-BUILT.md mandatory before merge.
12. **Tests** per §12 — unit + integration + contract + workflow enforcement + DAuth authority/delegation/SoD/lifecycle + diagnostics + smoke. Real DB, never mocked.
13. **Build instruction** per §13 — execute the patch's centralization steps verbatim.
14. **Acceptance** per §14 — domain truth centralized, boundaries respected, workflow explicit, all 17 artifact classes present, AS-BUILT updated.
15. **Negative tests** per §15 — protected-bypass blocked, fragmented truth absent, diagnostics complete.
16. **Pick the next module** per §16.
17. **Apply §17 one-line use instruction.**

### 3B. Recommended module sequence

| Wave | Modules | Why |
|---|---|---|
| W1 (P0 spine) | 23-Bootstrap → 34-Navigation → 18-Admin → 35-Notification → 02-Workflow → 03-AI → 04-Governance | Nothing renders right without these. |
| W2 (DAuth-heavy core GRC) | 14-Controls → 07-Policy → 05-Risk → 06-Compliance → 09-Evidence → 08-Audit | Protected-transition cluster. |
| W3 (operational) | 13-Incident → 17-Action → 16-Remediation → 15-Exception → 30-Issues → 29-Inbox → 31-Journey | Day-2 ops. |
| W4 (assurance & external) | 10-Vendor → 21-Asset → 22-BCP → 38-Privacy → 25-DORA → 32-KSA-Regulatory → 47-Knowledge → 33-Local-Knowledge | Regulatory + 3rd-party. |
| W5 (intelligence & UX) | 19-AGRC-Engine → 20-AI-Governance → 26-Governance-AI → 27-Governance-OS → 39-Proactive-Leadership → 54-Playbooks → 56-MCP | AI agents wired through platform-AI. |
| W6 (admin/visibility) | 24-Dashboard → 52-Dashboard-Editor → 11-Reporting → 12-Analytics → 50-Platform-Stats → 57-Executive → 53-GRC-Query → 55-Operating-Cockpit | Read-side surfaces. |
| W7 (lifecycle/HR-shaped) | 40-Provisioning → 41-Qiyas → 42-Records → 43-Training → 51-Attestation → 46-Team → 36-Packs → 49-Benchmarks → 48-Fitch → 28-Integrations → 37-Portals | People + content + interop. |
| W8 (closing) | 44-Widgets → 45-Mobile → 58-Config-Center | Config Center last — consumes everyone's keys. |

Total: 57 module passes (MP-01 Onboarding inline in DOS-AIO.md, rides W1).

---

## Phase 4 — Promote root-level `* Module/` extractions into `modules/`

For each of the 34 `* Module/` folders at repo root:

- [ ] **P4-1** `git mv "X Module" modules/{x}/` — preserves history.
- [ ] **P4-2** Strip vendored `dist/` and `node_modules/` before commit.
- [ ] **P4-3** Resolve stray non-source files (e.g. the chat-output file in `Risk Module/`).
- [ ] **P4-4** Add to workspace + tsconfig paths (`@modules/{x}/*`); apply inherited path-mapping clear from commit `31666c74`.
- [ ] **P4-5** Update `module.manifest.json` `name` + `path`.
- [ ] **P4-6** Run that module's Phase 3 recipe — promotion ≠ done.

---

## Phase 5 — Tenant Runtime & Config

- [ ] **P5-1** Every module's runtime config goes through Config Center (MP-58). No env reads inside module code.
- [ ] **P5-2** Schema-per-tenant continues (~2200 tables/tenant + ~280 public). `app.current_tenant_id` RLS setting set on every connection.
- [ ] **P5-3** Tenant settings overrides stored in `dos.tenants.settings` JSONB (column is `settings`, not `config`).
- [ ] **P5-4** Per-tenant migrations tracked in `dos.tenant_migrations`. Drift detection runs nightly; any drift = defect (Law 10).

---

## Phase 6 — Cross-cutting Acceptance Gates

All must be true to ship:

- [ ] **G1 — i18n** sentinel + sweep green; zero raw keys (`scripts/ci-guards/lint-no-raw-i18n-key.mjs`).
- [ ] **G2 — RTL/Nav** direction-aware; sidebar shows only ready modules.
- [ ] **G3 — Tables/States** responsive; empty/loading/error/blocked/delegated/escalated states explicit.
- [ ] **G4 — Lifecycle proofs** one graph-invariant proof per stateful module (mirror existing 6 G1–G5 proofs).
- [ ] **G5 — Production hardening** Zod + RBAC + rate-limiters + policy SoD on all transition routes; `withTenantClient` everywhere; RLS on; Stryker + vitest 90% gate.
- [ ] **G6 — AS-BUILT.md** present and current per module.
- [ ] **G7 — DAuth ENFORCE** only after 2 clean divergence cycles per tenant.
- [ ] **G8 — Drift = 0** code/DB, backend/frontend, docs/runtime, route/permission must agree.

---

## Phase 7 — Rollout & Operations

- [ ] **P7-1** Per-tenant gate: SHADOW → PILOT (1 tenant) → ENFORCE.
- [ ] **P7-2** Each module ships with rollback plan + alert thresholds + runbook link in AS-BUILT.md.
- [ ] **P7-3** Disk topology guard — `vdb` 75 G `/data` requires periodic barman backups; cron prevents WAL bloat.
- [ ] **P7-4** PM2 env edits use `pm2 delete && pm2 start` (not restart/reload); never commit env-var snapshots.

---

## "Done" definition per module (16 layers)

A module is `GREEN_WORKING` only when all 16 are true:
Navigation, FE Route, API Contract, Gateway Routing, Service Handler, DB Schema, Seed Data, AuthN, AuthZ, SoD, Workflow, Events, Observability, UI Quality, Negative Test, AS-BUILT.md.

Any one failing = `YELLOW_RENDERING_WITH_GAPS` at best.

---

## First concrete step

Start with **W1 (Bootstrap → Navigation → Admin → Notification → Workflow → AI → Governance)** because Risk's UI/approvals/observability require those to exist. Open one PR per module with the 17-step recipe applied verbatim from its patch file.
