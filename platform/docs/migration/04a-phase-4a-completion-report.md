# Phase 4A — Completion Report

**Date:** 2026-04-29
**Phase:** 4A — Shahin-AI marketing website promotion
**Owner:** platform-core
**Status:** ✅ COMPLETE — atomic commit ready
**Predecessors:** Path FRESH-NOW (baseline `v0.1.0`), Phase 1 (schema), Phase 2 (skeleton), Phase 3 (platform promotions), Phase 3.5 (4D manifest standardization)
**Successors:** Phase 4B (scaffold 4 product placeholders), Phase 5 (business module promotions), Phase 6 (quarantine sweep), Phase 7 (workspace regen incl. `pnpm-lock.yaml`)

---

## 1. Objective

Promote the Shahin-AI marketing site from the legacy parent
`Shahin-AI Website/spa/` to the canonical product-layer location
`products/shahin-ai/website/`, completing the second half of the Shahin-AI
product split (the first half — `Shahin-AI Website/frontend/` →
`products/shahin-ai/app/` — was completed in Batch 1 before the FRESH-NOW reset).

After this phase, `Shahin-AI Website/` no longer exists as a directory; the
Shahin-AI product source is fully organized under `products/shahin-ai/`:

| Sub-root | Purpose | Phase |
| -------- | ------- | ----- |
| `products/shahin-ai/app/` | Product SPA (workspace UI, blueprint, features) | Batch 1 (pre-FRESH-NOW) |
| `products/shahin-ai/website/` | Marketing site (`shahin-ai.com`) | **Phase 4A (this report)** |

---

## 2. Scope

**In scope (this phase):**

- Single history-preserving `git mv Shahin-AI Website/spa products/shahin-ai/website` (1 888 files renamed in one operation).
- Removal of empty `Shahin-AI Website/` parent.
- Canonicalization of all **active** references to the legacy path:
  workspace config, runtime configs, routing/build scripts, registries,
  documentation index, runbooks, ops nginx, deploy docs, env file (local).
- Quarantine of two **orphaned helpers** (a contract publisher script + its
  smoke test) whose canonical TypeScript source
  (`foundation.module-contract.ts`) is missing from the FRESH-NOW baseline,
  with full provenance logged in `quarantine-register.json` and a dedicated
  `_quarantine/orphaned-foundation-publisher/README.md`.
- Quarantine of three **chat-paste artifact files** discovered with
  sentence-fragment filenames at the root of `Compliance Module/`,
  `Risk Module/`, `Workflow Module/`.

**Out of scope (deliberately deferred):**

- `pnpm-lock.yaml` regeneration — deferred to **Phase 7** (workspace + tsconfig
  alias regeneration is a single coordinated step). The lockfile still contains
  one stale `Shahin-AI Website/spa:` import key on line 443; this is harmless
  because `pnpm-workspace.yaml` no longer lists that path, so pnpm will drop the
  entry on the next `pnpm install`.
- AI-OS vendored `_sources/` references (2 files) — deferred to **Phase 5+**
  per the documented blockers in `platform/ai/README.md` (flattened
  `_sources/` layout, fragile relative build scripts, wrong `productCode`).
- Knowledge-pack evidence paths (12 files) — kept as point-in-time snapshots
  for audit-trail fidelity; a single canonicalization-notice banner was added
  to `docs/company-knowledge-pack/00_README.md` so readers know the legacy
  paths in evidence blocks are historical.
- Historical restructure-planning scripts
  (`scripts/restructure/{01,02,99}-*.mjs`) — preserved as-is; they encode the
  *original* move plan and audit gates. Modifying them would corrupt the
  planning record.
- Security-debt register (`platform/docs/security/{security-debt.json,
  SECURITY_DEBT_REGISTER.md}`) — references are inside `introducedBy`
  provenance fields documenting pre-existing debt; canonicalizing them would
  break the audit trail.
- One historical, single-shot consolidation script
  (`Compliance Module/tools/compliance-boundary-consolidate.sh`) — annotated
  with a deprecation header instead of having stale `mv` paths rewritten,
  because the legacy source dirs no longer exist (re-running it is a no-op).

---

## 3. Pre-flight findings

| Check | Result |
| ----- | ------ |
| Working tree status (start) | Clean baseline (`v0.1.0` from FRESH-NOW) |
| Source `Shahin-AI Website/spa/` exists | Yes (1 888 tracked files) |
| Source contained untracked build artifacts | Yes — `.angular/` and `node_modules/` |
| Destination `products/shahin-ai/website/` exists | No (clean target) |
| Sibling `products/shahin-ai/app/` exists | Yes (Batch 1 product SPA) |
| Active validator passing pre-phase | Yes (43 manifests, 9 transitional warnings) |

**Pre-clean action:** `rm -rf Shahin-AI Website/spa/{.angular,node_modules}`
ran cleanly before the `git mv` so the rename only carried tracked files.

---

## 4. Move + cleanup operations (in order)

| # | Operation | Files | Notes |
| - | --------- | ----- | ----- |
| 1 | `git mv "Shahin-AI Website/spa" products/shahin-ai/website` | 1 888 renames | History-preserving (single rename op, all `R` lines in `git status`). |
| 2 | `rmdir "Shahin-AI Website"` | — | Parent verified empty after the move. |
| 3 | `git mv platform/foundation/scripts/publish-contract.mjs _quarantine/orphaned-foundation-publisher/scripts/` | 1 | Source TS missing — see `_quarantine/orphaned-foundation-publisher/README.md`. |
| 4 | `git mv platform/foundation/tests/smoke/contract-publisher.test.mjs _quarantine/orphaned-foundation-publisher/tests/` | 1 | Same orphan; test cannot run without the script. |
| 5 | `git mv "Compliance Module/Yes — same principle for **Compliance Mo" _quarantine/stray-files/business-module-paste-files/compliance-module-boundary-paste.md` | 1 | Sentence-fragment paste artifact; renamed to a real Markdown filename in quarantine. |
| 6 | `git mv "Risk Module/Yes — same boundary rule for **Risk Modu" _quarantine/stray-files/business-module-paste-files/risk-module-boundary-paste.md` | 1 | Same artifact pattern. |
| 7 | `git mv "Workflow Module/Yes — same boundary rule for **Workflow" _quarantine/stray-files/business-module-paste-files/workflow-module-boundary-paste.md` | 1 | Same artifact pattern. |

---

## 5. Active references canonicalized (19 files modified)

All edits replace `Shahin-AI Website/spa` (or `Shahin-AI Website/frontend`)
with the corresponding `products/shahin-ai/{website,app}/` canonical path.
A Phase 4A note was added inline wherever a future reader benefits from
the migration context.

| Layer | File | Change |
| ----- | ---- | ------ |
| Workspace | `pnpm-workspace.yaml` | `Shahin-AI Website/spa` entry → `products/shahin-ai/website`; legacy comment refreshed. |
| Ops nginx | `ops/nginx/frontend.conf` | `root` directive + comment block updated. |
| Ops env (local-only, gitignored) | `platform/config-center/env/product-shell.env` | Comment refreshed; canonical `PRODUCT_SHELL_SPA_DIR` already pointed at `products/shahin-ai/app`. |
| Ops docs | `ops/docs/deploy-frontend.md` | Build path + nginx root snippets + Phase 4A notice. |
| Ops runbooks | `ops/runbooks/ai-employees-phase-1.md` | FE component + workspace-route paths. |
| Ops runbooks | `ops/runbooks/ai-trace-surfaces.md` | DNOC trace-surfaces FE path. |
| Services | `services/privacy-service/src/routes/privacy-ops.routes.ts` | FE-consumer comment. |
| Audits | `scripts/audits/deca-build-scan-set.mjs` | `FRONTEND_HINTS` array entries. |
| Public-truth | `scripts/public-truth/extract-landing-sources.mjs` | `LANDING_SECTIONS_DIR` constant + emitted `sourceRoot`; added migration comment. |
| Registries | `registries/platform.registry.json` | 21 `sourceRoot`/`provenance` entries (also dropped the spurious `blueprint/` segment that doesn't exist in the website's `src/app/`). |
| Registries | `registries/landing-sources.registry.json` | 21 entries — same pattern as above. |
| Platform foundation | `platform/foundation/ui/index.ts` | Header comment. |
| Platform foundation | `platform/foundation/tests/smoke/dynamic-ui-drift.test.mjs` | Two test resource paths (Dynamic UI seed + product SPA component map). |
| Platform dynamic-ui | `platform/dynamic-ui/ui/index.ts` | Header comment. |
| Platform dynamic-ui | `platform/dynamic-ui/db/public/seeds/002_seed_foundation_nav_routes_shell.sql` | `COMPONENT_MAP` allowlist comment. |
| Platform dynamic-ui | `platform/dynamic-ui/db/public/seeds/005_seed_foundation_contract.sql` | TS-source comment + note that the canonical TS file is currently absent (see quarantine README). |
| Migration register | `platform/docs/migration/quarantine-register.json` | 5 new entries (Q4A-001…Q4A-005); description + `lastUpdated` refreshed. |
| Knowledge pack | `docs/company-knowledge-pack/00_README.md` | Single canonicalization-notice banner covering all 12 evidence-bearing pack files. |
| Boundary tool (deprecated) | `Compliance Module/tools/compliance-boundary-consolidate.sh` | Deprecation header explaining one-shot nature + canonical path mapping; stale `mv` arguments preserved as audit trail. |
| Specs | `DOS-AIO-Specs/dynamic-ui-enrollment-page-experience-widgets-spec.md` | Section 36 (P0 SPA Shell Incident Playbook) — canonical roots, restore commands, build paths, env vars all updated; Phase 4A note added. |

**New files (untracked, will be added in this phase's commit):**

- `_quarantine/orphaned-foundation-publisher/README.md`
- `_quarantine/stray-files/business-module-paste-files/README.md`

---

## 6. Validator state (before vs after)

| Metric | Before Phase 4A | After Phase 4A | Δ |
| ------ | --------------- | -------------- | - |
| Manifests validated | 43 | 43 | 0 |
| Modules (modules/ + platform/) | 6 | 6 | 0 |
| Services | 31 | 31 | 0 |
| Products | 1 | 1 | 0 |
| Warnings (transitional) | 9 | 9 | 0 |
| Errors | 0 | 0 | 0 |

**Conclusion:** zero regression. All 9 warnings are pre-existing Phase 5+
service-promotion deferrals (workflow, ai-gateway, ai-engine,
ai-governance, onboarding, compliance-controls, bcp, qiyas-journey,
vendor) — none introduced by Phase 4A.

---

## 7. Final grep verification

A repo-wide `grep "Shahin-AI Website"` was run after all edits. Every remaining
hit was triaged into one of the categories below:

| Category | Count | Disposition |
| -------- | ----- | ----------- |
| **Active code/config canonicalized** | 19 | All modified — see §5. |
| Knowledge-pack evidence (frozen snapshots) | 12 | Single banner notice in `00_README.md` covers all. |
| Historical restructure scripts (`scripts/restructure/01,02,99-*.mjs`) | 3 files | Preserved — encode the original move plan; modifying them corrupts audit history. |
| Security-debt provenance (`introducedBy`) | 2 files | Preserved — modifying breaks audit fidelity. |
| AI-OS vendored `_sources/` (2 files) | 2 hits | Deferred to Phase 5+ per `platform/ai/README.md` blockers. |
| Phase 4A migration documentation (this report + register + quarantine READMEs) | new | Intentional self-references documenting the move. |
| `pnpm-lock.yaml` (1 line) | 1 | Deferred to Phase 7 (lockfile regenerated alongside workspace + tsconfig aliases). |

**Net result:** zero **active** references to the legacy
`Shahin-AI Website` path remain in code, configuration, registries,
runbooks, or runtime documentation.

---

## 8. Quarantine register additions (Phase 4A)

| ID | Kind | Quarantined path | Original location |
| -- | ---- | ---------------- | ----------------- |
| Q4A-001 | orphaned-script | `_quarantine/orphaned-foundation-publisher/scripts/publish-contract.mjs` | `platform/foundation/scripts/publish-contract.mjs` |
| Q4A-002 | orphaned-test | `_quarantine/orphaned-foundation-publisher/tests/contract-publisher.test.mjs` | `platform/foundation/tests/smoke/contract-publisher.test.mjs` |
| Q4A-003 | stray-file | `_quarantine/stray-files/business-module-paste-files/compliance-module-boundary-paste.md` | `Compliance Module/Yes — same principle for **Compliance Mo` |
| Q4A-004 | stray-file | `_quarantine/stray-files/business-module-paste-files/risk-module-boundary-paste.md` | `Risk Module/Yes — same boundary rule for **Risk Modu` |
| Q4A-005 | stray-file | `_quarantine/stray-files/business-module-paste-files/workflow-module-boundary-paste.md` | `Workflow Module/Yes — same boundary rule for **Workflow` |

Total quarantine register entries after Phase 4A: **10** (5 pre-existing + 5 new).
Per-entry rollback commands are recorded in
`platform/docs/migration/quarantine-register.json`.

---

## 9. Known follow-ups (deferred, not regressions)

| Item | Owner phase | Reason |
| ---- | ----------- | ------ |
| Re-author `foundation.module-contract.ts` (or formally retire it) | Phase 5 (Foundation hardening) | Source is missing from FRESH-NOW baseline; scripts depending on it are quarantined with restoration plan. |
| Regenerate `pnpm-lock.yaml` | Phase 7 (workspace regen) | One stale import key remains; harmless until next `pnpm install`. |
| AI-OS `_sources/` canonical path rewrite | Phase 5+ (AI-OS promotion) | Vendored snapshot; full unfolding required first. |
| Decide fate of `compliance-boundary-consolidate.sh` | Phase 5 (Compliance promotion) | One-shot tool, deprecation header added; either delete or rewrite during Compliance promotion. |
| Three quarantined chat-paste files | Phase 6 (final sweep) | Marked `delete-later` in register. |
| Canonicalize knowledge-pack evidence paths during next pack re-author | Future content refresh | Currently frozen snapshot with banner notice. |

---

## 10. Rollback procedure

Phase 4A is delivered as one atomic commit. To revert:

```bash
# Identify the Phase 4A commit
git log --oneline | grep -i "phase-4a" | head -1

# Revert it as a single operation (preserves history)
git revert <commit-sha>

# Or, hard reset if no other work has been built on top
git reset --hard <commit-sha>^
```

The `git mv` is reversed by the revert. The 5 quarantine entries can be
rolled back individually using the per-entry commands recorded in
`platform/docs/migration/quarantine-register.json`.

---

## 11. Sign-off

- ✅ History-preserving move (1 888 renames in a single `git mv`)
- ✅ Empty parent directory removed
- ✅ Validator green (43 manifests, 0 errors, 9 expected warnings)
- ✅ Zero active references to legacy path remain
- ✅ All historical / vendored / frozen references explicitly classified
- ✅ Quarantine register updated with 5 new entries + per-entry rollback
- ✅ Atomic commit ready

**Verdict:** Phase 4A is **complete** and ready for the atomic commit.
Phase 4B (scaffold 4 placeholder products) may proceed.
