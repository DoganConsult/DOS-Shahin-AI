# Pre-promotion service inventory

> Audit date: 2026-04-30. Scope: 19 service directories that exist on disk under `services/` but are **not** members of `pnpm-workspace.yaml`. None are reachable by the root `pnpm run build`.

The Phase-3/4/5 promotion waves moved canonical services into `platform/<pillar>/services/` and `modules/<module>/`. The dirs below were left in place. This file is the disposition register; it is not a runtime artifact.

## Canonical workspace members (already promoted, do not touch)

These ARE in `pnpm-workspace.yaml` and are the production-canonical homes:

| Pillar / module | Canonical path |
|---|---|
| `services/*` (legacy, still in workspace) | mcp-gateway, notification, gateway, dashboard-widgets, analytics, user, dynamic-ui, tenant, integrations, product-shell |
| `platform/dauth/services/*` | auth-service |
| `platform/admin/services/*` | admin-service ← **canonical for `@dos/platform-admin-service`** |
| `platform/ai/services/*` | ai-engine, ai-gateway, ai-governance |
| `platform/dnoc/services/*` | dnoc-service |
| `platform/dos/services/*` | dos-service |
| `platform/dsoc/services/*` | dsoc-service |

## 19 orphan dirs — disposition recommendations

`ts` = source `.ts` file count. `pm2_refs` = referenced in `ops/ecosystem*.config.js`. `manifests` = referenced from any `module.manifest.json`. `ext_imports` = referenced from a TS import outside its own dir.

| # | Dir | ts | pkg name | pm2 | manifests | ext_imports | Recommended action |
|---|---|---:|---|---:|---:|---:|---|
| 1 | `platform-admin-service` | 8 | `@dos/platform-admin-service` | 0 | 0 | 1 | **DELETE** — exact duplicate of canonical `platform/admin/services/admin-service` (same package name, same files; diff is empty). Promotion left behind. |
| 2 | `audit-service` | 19 | `@dos/audit-service` | **1** | 0 | 0 | **PROMOTE** — referenced from PM2; needs a 4D home (likely `platform/dsoc/services/`). Add to workspace after promotion. |
| 3 | `platform-core-service` | 21 | `@dos/platform-core-service` | **1** | 5 | 0 | **PROMOTE** — heavy manifest references + PM2 reference. Likely belongs at `platform/dos/services/platform-core-service` if it's distinct from `dos-service`. |
| 4 | `asset-service` | 22 | `@dos/asset-service` | 0 | 1 | 2 | **PROMOTE** — has external imports + manifest reference. Likely `modules/asset/`. |
| 5 | `privacy-service` | 23 | `@dos/privacy-service` | 0 | 1 | 3 | **PROMOTE** — external imports + manifest. Likely `modules/privacy/`. |
| 6 | `risk-incident-service` | 46 | `@dos/risk-incident-service` | 0 | 2 | 0 | **PROMOTE** — substantial code (largest of the orphans). Likely `modules/risk/` or `modules/incident/`. |
| 7 | `governance-policy-service` | 28 | `@dos/governance-policy-service` | 0 | 4 | 0 | **PROMOTE** — manifest-rich. Likely `modules/governance/` or split. |
| 8 | `evidence-audit-reporting-service` | 32 | `@dos/evidence-audit-reporting-service` | 0 | 3 | 0 | **PROMOTE** — manifest-rich. Likely `modules/evidence/`. |
| 9 | `remediation-action-service` | 29 | `@dos/remediation-action-service` | 0 | 4 | 0 | **PROMOTE** — manifest-rich. Likely `modules/remediation/`. |
| 10 | `analytics-reporting-service` | 21 | `@dos/analytics-reporting-service` | 0 | 2 | 0 | **PROMOTE** — analytics adjacent; consider merge with workspace `analytics-service` or move to `modules/reporting/`. |
| 11 | `executive-intelligence-service` | 21 | `@dos/executive-intelligence-service` | 0 | 2 | 0 | **PROMOTE** — likely `modules/executive/`. |
| 12 | `notification-inbox-service` | 21 | `@dos/notification-inbox-service` | 0 | 2 | 0 | **MERGE OR PROMOTE** — overlaps with workspace `notification-service`; decide if these are one service or two. |
| 13 | `dora-service` | 22 | `@dos/dora-service` | 0 | 1 | 0 | **PROMOTE** — likely `modules/dora/`. |
| 14 | `portals-service` | 21 | `@dos/portals-service` | 0 | 1 | 0 | **PROMOTE** — likely `platform/dauth/services/` if portal auth, else `modules/portals/`. |
| 15 | `records-service` | 21 | `@dos/records-service` | 0 | 1 | 0 | **PROMOTE** — likely `modules/records/`. |
| 16 | `training-service` | 21 | `@dos/training-service` | 0 | 1 | 0 | **PROMOTE** — likely `modules/training/`. |
| 17 | `agrc-os-service` | 26 | `@dos/agrc-os-service` | 0 | 0 | 0 | **REVIEW** — 26 TS files but zero references anywhere. Possibly stillborn. |
| 18 | `platform-product-service` | 21 | `@dos/platform-product-service` | 0 | 0 | 0 | **REVIEW** — 21 TS files, no references. Possibly stillborn or duplicates `services/product-shell`. |
| 19 | `platform-app-shell` | 1 | `@dos/platform-app-shell` | 0 | 0 | 0 | **REVIEW** — only 1 TS file. Likely scaffold debris. |

## Risks of leaving orphans in `services/`

- They get the Wave 1 tsconfig fix (`paths: {}`) applied to their `tsconfig.json` even though they don't build, so future audits will list them as "fixed" without proof of build.
- New developers may read `services/<name>/` and assume it's live, then write imports against it.
- The PM2 references at `ops/ecosystem*.config.js` for `audit-service` and `platform-core-service` will fail to start the service if these dirs are ever cleaned up without a migration.

## Recommended Phase 6 sequence (separate effort, not this PR)

1. **Delete** `services/platform-admin-service/` (item #1) — true duplicate, immediate.
2. **Promote** items #2–#16 in batches (3-5 services per PR), with `git mv` to preserve history, then add to `pnpm-workspace.yaml`. Each batch should land green builds.
3. **Investigate then either promote or quarantine** items #17–#19. If `agrc-os-service` is the AGRC orchestrator, it likely belongs at `platform/ai/services/`; if not, move to `_quarantine/`.

This file should be deleted once all 19 entries have been resolved.
