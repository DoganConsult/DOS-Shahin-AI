# Module #1 (compliance) — Carried-Items Closure

Branch: stabilize/phase-0  Date: 2026-04-19

Closes / triages every item carried forward from Phase 0 G0 and from
Steps 1–6 of the compliance vertical, before Step 7 (AI wiring).

## A. Items closed in this pass (compliance vertical scope)

| # | Source | Item | Action | Proof |
|---|---|---|---|---|
| A-1 | Step 1 §7 | `routes/index.ts` mounted `/compliance/continuous-attestation`, `/nca-assessment`, `/nca-export`, `/rcsa`, `/sama-assessment` twice (lines 134-138 AND 149-162), pointing to the same canonical router constants → middleware/auth ran twice on every hit | Removed the duplicate lower mounts; kept the canonical assessment/* mounts; left in-place comments explaining the dedup at [./services/compliance-controls-service/src/routes/index.ts:149](./services/compliance-controls-service/src/routes/index.ts:149) | `pnpm --filter compliance-controls-service build` → 0 errors. `pm2 restart compliance-controls-service` → online. Live probes all 5 paths → still 401 (mounted, auth-gated, no regression). `/health` → 200. |
| A-2 | Step 1 §5 | `module.manifest.json` declared only `routeBases: ["/api/compliance"]` while the service publishes 22 prefixes for this module's surface | Widened to the full 22 published prefixes at [./modules/compliance/module.manifest.json:66](./modules/compliance/module.manifest.json:66) | `pnpm run validate:manifests` → 93 manifests validated, 0 errors |

## B. Items deferred to their assigned named owner (no horizontal sweep)

Per AGENTS.md: "Do NOT solve one layer for all modules first. Do NOT do
horizontal passes." Each item below has an explicit named owner outside
the compliance vertical and will be closed in that vertical.

| # | Source | Item | Owner (already named) | Why not now |
|---|---|---|---|---|
| B-1 | GATE-FINDING-G0-01 | Gateway CSRF rate-limit cascade (logs+DB persists per denial) | Gateway module vertical | Cross-cutting gateway middleware change; touching it from inside compliance would be a horizontal sweep |
| B-2 | GATE-FINDING-G0-02 | 20 release-gate tests collide with rate-limiter (HTTP 429) | Gateway module vertical | Same root cause as B-1 |
| B-3 | GATE-FINDING-G0-03 | `packages/shahin-product` imports `modules/*` outside its `rootDir` | Phase 4 (Service Substance) | Repo-level rootDir / project-references redesign — explicitly Phase 4 in the 6-phase plan |
| B-4 | GATE-FINDING-G0-04 | `modules/tsconfig.modules.json` yields 9 095 TS errors when checked as a single project | Per-module Step 11 over Phase 2 | Each module owns its own slice; compliance's slice will close at compliance Step 11 (Gate G1) |
| B-5 | Step 5 carry | Async / progress / download export lifecycle for compliance module codes | Future per-module action when a compliance UI surface actually needs it | No compliance UI page calls async export today; building it now would be speculative scope |
| B-6 | Step 5 carry | `MODULE_TABLE_MAP` curated row + tenant table provisioning for `compliance-posture` / `compliance-obligations` / `compliance-frameworks` / `compliance-gaps` / `controls-monitoring-*` | Future per-module action when a BE-driven aggregation export is required | Inline export path (Step 5) covers every existing compliance UI export end-to-end |
| B-7 | Step 6 carry | Bespoke compliance pages do not yet `RealtimeService.connect()` | Compliance UX enhancement (not vertical-blocking) | The bus → SSE bridge is now production-ready (Step 6); wiring subscribers in 7 separate bespoke pages without an explicit UX requirement would be horizontal/speculative |
| B-8 | Step 6 observation | Pre-existing `email-consumer` error in notification-service ("Cannot read properties of undefined (reading 'replace')" — Journey verification email) | Notification-service module vertical / Onboarding-Journey module vertical | Pre-dates Phase 2; not introduced by compliance Step 6; touching it from inside compliance would be horizontal |

## C. Verdict

All carried items in compliance-vertical scope are closed. All
remaining carried items have an explicit, written, named owner in
either another module's vertical or a later phase, exactly as the
6-phase plan committed.

The compliance vertical is now ready to move to **Step 7 — AI wiring**.
