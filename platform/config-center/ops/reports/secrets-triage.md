# Secrets Triage — DOS-AIO

- Total secret findings: **500**
- Total PII findings: **500**
- Generated: `security-report.json` -> `ops/reports/secrets-scan-raw.json`

## Classification summary

| Bucket | Count |
|---|---|
| REAL_SECRET | 188 |
| PII_NEEDS_REVIEW | 270 |
| TEST_FIXTURE | 42 |
| FALSE_POSITIVE | 0 |

## REAL_SECRET — top findings by file (values redacted)

| File | Line | Type | Confidence |
|---|---|---|---|
| `.claude/settings.local.json` | 117 | Database URL | 0.7 |
| `.claude/settings.local.json` | 179 | Database URL | 0.7 |
| `.claude/settings.local.json` | 269 | Database URL | 0.7 |
| `.claude/settings.local.json` | 285 | Database URL | 0.7 |
| `.claude/settings.local.json` | 286 | Database URL | 0.7 |
| `.claude/settings.local.json` | 287 | Database URL | 0.7 |
| `.claude/settings.local.json` | 292 | Database URL | 0.7 |
| `.claude/settings.local.json` | 295 | Database URL | 0.7 |
| `.claude/settings.local.json` | 300 | Database URL | 0.7 |
| `.claude/settings.local.json` | 302 | Database URL | 0.7 |
| `.claude/settings.local.json` | 454 | Database URL | 0.7 |
| `.github/workflows/ci.yml` | 250 | Database URL | 0.7 |
| `.github/workflows/ci.yml` | 251 | Redis URL | 0.7 |
| `.github/workflows/ci.yml` | 400 | Database URL | 0.7 |
| `.github/workflows/ci.yml` | 408 | Database URL | 0.7 |
| `.github/workflows/ci.yml` | 412 | Database URL | 0.7 |
| `.github/workflows/ci.yml` | 444 | Database URL | 0.7 |
| `.github/workflows/ci.yml` | 445 | Redis URL | 0.7 |
| `.health/phase-0/pm2-snapshot.json` | 1 | Database URL | 0.7 |
| `migration/migration-runner.ts` | 336 | Database URL | 0.7 |
| `migration/migration-runner.ts` | 337 | Database URL | 0.7 |
| `migration/migration-runner.ts` | 338 | Database URL | 0.7 |
| `migration/migration-runner.ts` | 342 | Database URL | 0.7 |
| `migration/migration-runner.ts` | 392 | Database URL | 0.7 |
| `migration/migration-runner.ts` | 393 | Database URL | 0.7 |
| `modules/audit/source/backend/audit/services/retention-core.service.ts` | 19 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 16 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 28 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 48 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 64 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 67 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 73 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 126 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.js` | 127 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 28 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 39 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 58 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 78 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 82 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 89 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 154 | Database URL | 0.7 |
| `modules/fitch/source/platform/dos/config.ts` | 155 | Database URL | 0.7 |
| `platform/config-center/env/ai-gateway-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/audit-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/auth-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/gateway.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/notification-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/onboarding-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/tenant-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/user-service.env` | 4 | Database URL | 0.7 |
| `platform/config-center/env/workflow-service.env` | 4 | Database URL | 0.7 |
| `ops/scripts/env-audit.ts` | 78 | Database URL | 0.7 |
| `ops/scripts/env-audit.ts` | 79 | Database URL | 0.7 |
| `ops/scripts/env-audit.ts` | 122 | Database URL | 0.7 |
| `ops/scripts/load/register-dup.ts` | 7 | Database URL | 0.7 |
| `ops/scripts/migration-runner.ts` | 7 | Database URL | 0.7 |
| `ops/scripts/migration-runner.ts` | 17 | Database URL | 0.7 |
| `ops/scripts/migration-runner.ts` | 26 | Database URL | 0.7 |
| `ops/scripts/schema-drift-detection.ts` | 11 | Database URL | 0.7 |
| `ops/scripts/tenant-data-export.ts` | 10 | Database URL | 0.7 |
| `ops/scripts/test-rls-cross-tenant.ts` | 14 | Database URL | 0.7 |
| `ops/scripts/test-tenant-isolation.ts` | 8 | Database URL | 0.7 |
| `ops/scripts/validate-env.ts` | 23 | Database URL | 0.7 |
| `ops/scripts/validate-env.ts` | 34 | Database URL | 0.7 |
| `ops/scripts/validate-env.ts` | 72 | Database URL | 0.7 |
| `ops/scripts/validate-env.ts` | 80 | Database URL | 0.7 |
| `packages/dos-contracts/src/platform/config-boundary.js` | 36 | Database URL | 0.7 |
| `packages/dos-contracts/src/platform/config-boundary.ts` | 48 | Database URL | 0.7 |
| `packages/dos-contracts/src/platform/production-infrastructure-contracts.ts` | 76 | Database URL | 0.7 |
| `packages/dos-contracts/src/platform/production-infrastructure-contracts.ts` | 627 | Database URL | 0.7 |
| `packages/dos-contracts/src/platform/production-infrastructure-contracts.ts` | 631 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 28 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 39 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 58 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 78 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 82 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 89 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 154 | Database URL | 0.7 |
| `packages/dos-db/src/config.ts` | 155 | Database URL | 0.7 |
| `packages/dos-db/src/pool.ts` | 90 | Database URL | 0.7 |
| ... (108 more REAL_SECRET rows elided) | | | |

## PII_NEEDS_REVIEW — top file hotspots

| File | Findings |
|---|---|
| `pnpm-lock.yaml` | 129 |
| `frontend/products/shahin/src/app/pnpm-lock.yaml` | 71 |
| `frontend/products/shahin/src/app/package-lock.json` | 70 |

## TEST_FIXTURE — count by file (first 40 hotspots)

| File | Findings |
|---|---|
| `tests/migration/migration-runner.unit.test.ts` | 6 |
| `packages/dos-runtime-config/src/__tests__/runtime-config.test.ts` | 5 |
| `tests/migration/email-verification-legacy-invalidation.test.ts` | 4 |
| `ops/scripts/seed-platform-admin.ts` | 3 |
| `packages/dos-event-backbone/src/__tests__/redis-stream-bus.test.ts` | 3 |
| `tests/integration/onboarding-idempotency.test.ts` | 3 |
| `tests/integration/tenant-provisioning.test.ts` | 3 |
| `tests/phase-d/golden-path.test.ts` | 3 |
| `ops/scripts/run-question-seed.ts` | 2 |
| `tests/integration/tenant-isolation.test.ts` | 2 |
| `tests/multi-tenant-stress.test.ts` | 2 |
| `ops/scripts/seed-demo-data.ts` | 1 |
| `ops/scripts/seed-platform-complete.ts` | 1 |
| `tests/e2e/new-user-journey.e2e.test.ts` | 1 |
| `tests/integration/register-golden-path.test.ts` | 1 |
| `tests/integration/service-domain-schema-crud.test.ts` | 1 |
| `tests/integration/wave1-module-allowlist.test.ts` | 1 |

> Secret values are NOT printed in this file per task rules. Raw report preserved at `ops/reports/secrets-scan-raw.json`.
