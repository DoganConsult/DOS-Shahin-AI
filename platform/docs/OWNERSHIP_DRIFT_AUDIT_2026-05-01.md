# Ownership Drift Audit — 2026-05-01 (with delta after first fix pass)

> **Status as of fix pass 1:** F1.1, F1.2, F2 closed. F1.3 deferred to Phase C/F (depends on Dynamic UI resolver + DB-driven UI replacing the current pattern). F3 reclassified as false positive — `@dos/service-bootstrap.createServiceServer` auto-wires `/health` and `/health/:check` for every service.
> **Build status:** all 5 platform packages still build green (`@dos/design-tokens`, `@dos/ui-contracts`, `@dos/access-store`, `@dos/ui-system`, `@dos/module-foundation`).
>
> **Wave 3 + Wave 4 path residue swept:** 17 imports rewritten across 16 files (Wave 3 missed `../products/agrc/services/...` re-export shims; Wave 4b/4c missed relative paths to old `core/dos/`, `core/dauth/`). Generic relative-path repair pass updated 337 additional files.
>
> **Gate 2 (Shahin SPA build) — BLOCKED on pre-existing tech debt** (NOT introduced by Phase A / audit fixes): ~1225 unresolved relative imports remain across `platform/ai/services/ai-engine-service/...`, `platform/runtime/infrastructure/...`, `modules/governance/source/frontend/...`, and other internal `_sources/` trees. These require a focused multi-session SPA debt-reduction sprint, separate from the integrated plan phases. Acceptable per manifest §28 — never claim production readiness without proof; honest status here is **PARTIAL**, not PASS.

| Audit | Baseline | After fix 1 | Notes |
|-------|----------|-------------|-------|
| 1 — platform/→products|modules imports | 10 (3 runtime + 7 `_sources` legacy) | **1** (F1.3 ui-runtime-store, deferred) | F1.1 path correction in `module-kickstart.service.ts`; F1.2 generated route fragments moved to `platform/config-center/routing/generated/` and both component-registry imports updated |
| 2 — services/→product FE | 1 | **0** | Orphan duplicate `services/grc-auth.service.spec.ts` removed; canonical at `platform/core/services/` already clean |
| 3 — products/ cloud-only literals | 0 | 0 | clean ✓ |
| 4 — products/ direct model API | 0 | 0 | clean ✓ |
| 5 — products/shahin-ai/app/src `process.env`/`import.meta.env` | 0 | 0 | clean ✓ |
| 6 — products/ localStorage auth/session/perms | 0 | 0 | clean ✓ |
| 7 — hardcoded `MODULE_LABELS`/`MODULE_CODES` in products/ | 0 | 0 | clean ✓ |
| 8 — Foundation `'not-entitled'` anywhere | 0 | 0 | clean ✓ |



**Scope:** initial audit pass against [PLATFORM_OPERATING_MANIFEST.md](PLATFORM_OPERATING_MANIFEST.md). Read-only — no fixes applied. Each finding cites the manifest section it violates.

## Summary

| Category | Hits | Severity |
|----------|------|----------|
| `platform/` importing from `products/` or `modules/` | **9** files (mostly `platform/workflow/_sources/...` legacy + 3 platform/dos+config-center+workflow runtime files) | HIGH (§1.1 / §2 / §37) |
| `services/` importing product frontend | **1** test file (`grc-auth.service.spec.ts`) | LOW — likely test scaffolding, verify |
| Cloud-only URLs in `products/` | **0** | ✅ clean |
| Direct model API hostnames in `products/` | **0** | ✅ clean (Phase A invention rollback closed this) |
| Secret env access in `products/shahin-ai/app/src` | **0** | ✅ clean |
| localStorage for auth/access/runtime in `products/shahin-ai` | **0** | ✅ clean (Phase A AccessStore swap closed this) |
| Hardcoded `MODULE_LABELS` / `MODULE_CODES` arrays in `products/` | **0** | ✅ clean (Phase A Step 8 removed this) |
| Foundation marked `'not-entitled'` anywhere | **0** | ✅ clean (Phase A Step 6 removed this) |
| Services missing `/health` endpoint | **1 of 5 sampled** (`audit-service`) | MEDIUM (§29) |
| Tables missing tenant_id where likely tenant-scoped | **TBD** — needs full migration sweep | MEDIUM (§17 + §N data governance) |

## Findings

### F1 — `platform/` files importing from products/ or modules/ (HIGH — manifest §1.1, §2, §37)

The hard rule says **`platform/` must never import `products/`, `modules/`, or product-specific service code.** Found 10 violations:

**Live runtime files (need fix):**
1. [platform/dos/shell/module-kickstart.service.ts](platform/dos/shell/module-kickstart.service.ts) — confirm what it imports; likely module type that should move to `@dos/contracts` or `platform/registry`.
2. [platform/config-center/routing/component-registry.ts](platform/config-center/routing/component-registry.ts) — likely catalog of module routes; should read from manifest, not import them.
3. [platform/config-center/runtime/ui-runtime-store.service.ts](platform/config-center/runtime/ui-runtime-store.service.ts) — same pattern.

**Legacy `_sources/` trees (lower priority — staging, not runtime):**
4–10. [platform/workflow/_sources/modules_workflow/source/backend/workflow/temporal/activities/](platform/workflow/_sources/modules_workflow/source/backend/workflow/temporal/activities/) — provisioning, assessment, evidence, gap, monitoring, maintenance, risk activities. These are inside a `_sources/` migration staging area; either promote them properly to `platform/workflow/` or move to `modules/<x>/services/`. Phase M (Workflow Operating Fabric) cleanup point.

**Action:** confirm each via manifest lens; for runtime files, redirect imports through `@dos/contracts` / registry / manifest. For `_sources/` files, complete migration into the canonical home.

### F2 — `services/grc-auth.service.spec.ts` references product code (LOW — manifest §1.4)

Single test file. Review whether it imports from `products/` (likely fixture/spec, not a hard violation). Action: open the file, decide keep/move/delete.

### F3 — `services/audit-service` missing `/health` endpoint (MEDIUM — manifest §29)

Sampled 5 services; 4 have `/health`, audit-service does not. **No production service is accepted without health endpoint** (§29). Foundation already got `/api/health/foundation` in Phase A Step 2; audit-service needs the same treatment.

**Action:** add `services/audit-service/src/routes/health.ts` returning the safe shape `{status, ts, checks[]}` per §29.

### F4 — Phase A wins confirmed (CLEAN ✅)

The audit confirms Phase A's invention rollback + corrective action successfully closed:
- `MODULE_LABELS` map deleted from workspace-home.
- Foundation never marked `'not-entitled'` anywhere.
- No `process.env`/`import.meta.env` access from product app code.
- No localStorage for auth/access/runtime tokens.
- No direct model API hostnames in products/.

### F5 — Catalog/reference table tenant scoping (MEDIUM — §17 + §N)

`dos.foundation_cat_tenant_defaults` exists. Need full audit of every table:
- Phase E1 migration header standard (owner / scope / tenant_isolation_model / rollback / classification).
- Phase N data-governance rulebook (every table classified A/B/C/D).

**Action:** Phase E1 + N implementation will add the header standard; backfill audit will catch any tables missing tenant_id where they should have it. Until then, this is in-progress technical debt.

## Honest status

| Manifest section | Status | Notes |
|------------------|--------|-------|
| §1 Non-Negotiable Rules | PARTIAL | F1 (10 platform→products imports) violates §1.1 |
| §2 Four-Tier | PARTIAL | F1 same |
| §4 Dynamic UI | PASS | F4 confirmed clean |
| §5 Config OS | PARTIAL | C0+C1 done; C2-C6 pending |
| §6 DB-driven UI | NOT READY | Phase F not started |
| §7 Multi-tenancy | PARTIAL | E0–E4 pending; F5 pending |
| §8 Foundation | PASS | F4 confirmed Foundation never `'not-entitled'` |
| §9 AI OS | NOT READY | Phase D not started |
| §10 Workflow | NOT READY | Phase M not started |
| §11 Billing OS | NOT READY | Phase H not started |
| §12 Self-registration | NOT READY | Phase G not started |
| §13 Provisioning | NOT READY | Phase J not started |
| §14 Registry | NOT READY | Phase I not started |
| §15 Readiness | PARTIAL | Phase A built `PlatformReadinessService` for DNA; Phase K extends to all layers |
| §16 Audit | NOT READY | Phase L not started; per-phase audit logs scattered (F G H D) |
| §17 Data Governance | PARTIAL | Phase E classification declared in spec; E1 header standard pending; full backfill pending |
| §18 Integrations | NOT READY | Phase O not started |
| §19 Notifications | NOT READY | Phase P not started; `modules/inbox/` moved during Phase 0 — needs platform-tier consolidation |
| §20 Security/Secrets | PARTIAL | `SecretRef` schema (Phase B C1) exists; vault provider not wired; Phase Q not started |
| §21 SDK Enforcement | PARTIAL | `@dos/access-store`, `@dos/ui-system`, `@dos/ui-contracts`, `@dos/runtime-config` exist; `@dos/dynamic-ui-client`, `@dos/billing-client`, `@dos/workflow-client`, `@dos/ai-sdk` pending |
| §22 Admin Console | NOT READY | Phase T not started |
| §23 Guards / release gate | PARTIAL | `pnpm ui-os:guards` exists; other guards pending (`config:guards`, `dynamic-ui:guards`, `billing:guards`, etc.); `pnpm platform:release-gate` pending |
| §24-26 Manifest contracts | PARTIAL | `product.manifest.json` + `module.manifest.json` exist; `workspaceVisible=true` declaration formalization pending |
| §27 Final System Rule | PARTIAL | accuracy depends on phases A-AB completing |
| §28 Completion Definition | NOT READY | Multiple criteria not met; never claim "complete" until all are |
| §29 Observability/SRE | PARTIAL | F3 (audit-service health endpoint missing); other services have /health but full §29 (correlationId/tenantId/userId/productCode emission) needs full sweep |
| §30 Release/Versioning | NOT READY | Phase V not started |
| §31 Backup/DR | NOT READY | Phase W not started |
| §32 L10n/A11y | PARTIAL | UI-OS components are token-styled; full L10n/A11y audit pending; ar/en bundles exist for Foundation |
| §33 Edition/Plan | NOT READY | Phase Y not started; Phase H billing plans pending |
| §34 Marketplace/Module Lifecycle | PARTIAL | Manifest format declared; lifecycle states + draft/published flow pending (Phase Z) |
| §35 Compliance Evidence | NOT READY | Phase AA not started; per-phase audit logs exist scattered |
| §36 Environment/Deployment | PARTIAL | Phase E names the 4 modes; Phase AB declares per-service support flags pending |
| §37 Master Ownership Rule | PARTIAL | F1 violations show the rule needs CI enforcement (Phase S `pnpm platform:ownership-drift-audit`) |

## Recommended immediate next steps

1. **Fix F1 high-priority runtime files** (3 files in `platform/dos/shell/`, `platform/config-center/routing/`, `platform/config-center/runtime/`) before any further phase work — these are active ownership-drift violations.
2. **Fix F3** by adding `/api/health/audit-service` endpoint to audit-service — small, low-risk, closes a §29 gap.
3. **Triage F2** — open `services/grc-auth.service.spec.ts` and either move/refactor or document as test fixture.
4. **Defer `_sources/` cleanup** to its proper phase (M Workflow OS or migration consolidation).
5. **Continue per the integrated plan's milestone sequence** — M1 (UI-OS finish) → M2 (Config OS) → M3 (SaaS substrate) → … with audit guards landing as Phase S `pnpm platform:ownership-drift-audit` to make this audit run automatically in CI.

## Honest verdict

**STATUS: PARTIAL.**

Phase 0 consolidation + Phase A (UI-OS) + Phase B C0+C1 (Config audit + schemas) are real wins confirmed by clean grep results in F4. Phases B C2–C6 + C–AB are locked specs but not yet executed. Until Phase S `pnpm platform:release-gate` runs and reports green or honest baselines, the platform is **not complete** per §28.

This audit will be re-run after each milestone to track drift trend.
