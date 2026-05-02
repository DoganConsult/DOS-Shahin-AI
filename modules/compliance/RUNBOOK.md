# Compliance Module — Operational Runbook

**Module**: `@dos/module-compliance` v1.0.0
**Owner**: product-shahin-ai
**Host service**: `governance-policy-service`
**Lifecycle stage**: `ga` (target: `production` after Wave 9)

This runbook governs the operational lifecycle: pre-deployment preflight, CI/CD gate sequence, deployment, rollback, sign-offs. Modeled on `docs/db/foundation-gate-2b-preflight-runbook.md`.

---

## §1 — Preflight Checklist

Run before every promotion / staged rollout. Every check must return PASS.

### 1.1 Build & Type Safety
```bash
cd modules/compliance
npm run typecheck   # tsc -p tsconfig.json --noEmit → 0 errors
npm run build       # tsc -p tsconfig.build.json → dist emitted, 0 errors
```
**Threshold**: 0 errors. Failures block promotion.

### 1.2 Test Coverage
```bash
npm run test:smoke         # 7/7 pass
npm run test:integration   # ≥99.7% pass; target 100%
npx vitest run --coverage  # lines ≥90, statements ≥90, functions ≥90, branches ≥85
npx stryker run            # mutation: high≥85, low≥75, break=50
```
**Threshold**: per Wave 4 acceptance criteria.

### 1.3 Permission Catalog
```bash
npm run verify:permissions  # [verify-permissions] OK
```
**Threshold**: catalog audit passes; all referenced permission codes exist in catalog; no orphans.

### 1.4 Tenant Isolation
```bash
TENANT_ISOLATION_STRICT=1 bash ../../ops/scripts/check-tenant-isolation.sh
```
**Threshold**: 0 violations under `modules/compliance/`. Wave-0 baseline = 0; any new violation blocks promotion.

### 1.5 Database Migration Safety
```bash
npm run boot:harness    # asserts manifest counts: 9 tables, 13 events, 23 routeBases
node ../../scripts/validate-manifests.mjs   # 0 NEW failures vs baseline
```
**Threshold**: each migration must be idempotent (re-runnable), transactional (single BEGIN/COMMIT), have a `_down.sql` rollback companion, and carry guard conditions (e.g., `IF NOT EXISTS`).

### 1.6 OpenAPI Spec Validity
```bash
npx @apidevtools/swagger-cli validate openapi.yaml
```
**Threshold**: spec validates against OpenAPI 3.1.0 schema; no warnings.

### 1.7 Load Test Baseline
```bash
BASE_URL=https://staging.shahin-ai.com TOKEN=$(cat ~/.dos/staging-token) \
  k6 run tests/perf/compliance-baseline.k6.js
```
**Threshold**: p95 < 500ms, p99 < 1s, error rate < 1% across all 10 baseline endpoints.

### 1.8 Security Scan
```bash
npx trivy fs .
npm audit --audit-level=high
```
**Threshold**: 0 critical CVEs; high CVEs patched within 72hr.

---

## §2 — CI/CD Gate Sequence

These gates run automatically on every PR. PR cannot merge unless all green.

| Gate | Command | Owner | Failure response |
|------|---------|-------|-------------------|
| G1 — Type | `npm run typecheck` | platform | Block merge |
| G2 — Build | `npm run build` | platform | Block merge |
| G3 — Smoke | `npm run test:smoke` | module-compliance | Block merge |
| G4 — Integration | `npm run test:integration` | module-compliance | Block merge |
| G5 — Coverage | `npx vitest run --coverage` | module-compliance | Block merge if below threshold |
| G6 — Permissions | `npm run verify:permissions` | dauth | Block merge |
| G7 — Tenant isolation | `TENANT_ISOLATION_STRICT=1 ../../ops/scripts/check-tenant-isolation.sh` | platform-sec | Block merge |
| G8 — Manifest | `node ../../scripts/validate-manifests.mjs` | platform | Block merge if NEW failures |
| G9 — OpenAPI | `npx @apidevtools/swagger-cli validate openapi.yaml` | module-compliance | Block merge |
| G10 — Load | k6 baseline | sre | Warn only; block on regression > 20% |
| G11 — Security | trivy + npm audit | sec | Block on critical |
| G12 — Mutation | `npx stryker run` (Wave 4+) | module-compliance | Block on threshold break |

CI script: `modules/compliance/ops/scripts/ci.mjs` orchestrates G1-G8 today. Gates G9-G12 added in Waves 5/4/6.

---

## §3 — Deployment Checklist

For each promotion to staging or production:

### Pre-deployment
- [ ] All §1 preflight checks PASS within last 24hr.
- [ ] All §2 CI gates GREEN on the merge commit.
- [ ] Migration plan reviewed by DBA (for any DB schema changes).
- [ ] Rollback SQL verified for every migration.
- [ ] Feature flags set per release plan (default: gated to internal cohort first).
- [ ] Dependencies (governance-policy-service, gateway, dynamic-ui) version-pinned in deployment manifest.
- [ ] Communication: changelog posted to `#compliance-eng`, runbook delta posted to `#oncall`.

### Deployment
- [ ] `auto-sync.sh` halted on the deployment branch (per memory: 15s commit cadence risks partial state).
- [ ] Deploy to canary (1 internal tenant) → soak 30min → verify smoke.
- [ ] Roll forward to 10% tenants → soak 2hr → verify smoke + KPIs.
- [ ] Roll forward to 50% → soak 4hr.
- [ ] Roll forward to 100% → soak 24hr.
- [ ] Post-deployment smoke: hit each route base, expect 2xx; check `/health` and `/ready` (Wave 6+).

### Post-deployment
- [ ] Metrics within SLO band (see SLO.md).
- [ ] Error rate < baseline × 1.2.
- [ ] No customer-impacting incidents within 24hr.
- [ ] Changelog updated.

---

## §4 — Rollback Plan

### 4.1 Immediate rollback (binary revert)
If a deployment surfaces P0/P1 issues within 24hr:
1. Halt further tenant rollout (`pnpm pm2 stop compliance-cohort-roll`).
2. Revert deploy: `pnpm deploy --version=$(git rev-parse HEAD~1) --target=production`.
3. Verify all canary tenants returned to prior version.
4. Post-mortem within 48hr.

### 4.2 DB migration rollback
For any migration that's already executed on production:
1. Identify migration set: `SELECT * FROM dos.schema_migrations WHERE module='compliance' ORDER BY applied_at DESC LIMIT 10;`
2. Run companion `_down.sql` files in reverse order: `psql $DATABASE_URL -f db/tenant/migrations/<file>_down.sql`
3. If `_down.sql` is destructive (drops data), prefer PITR from §4.3 instead.
4. Verify rollback: `npm run boot:harness` should show prior manifest counts.

### 4.3 Point-in-Time Recovery (PITR)
For data corruption requiring rollback before a known-good timestamp:
1. Halt all writes to the affected tenant: `UPDATE dos.tenants SET status='suspended' WHERE id=$tenant;`
2. Initiate PITR on Postgres replica: `barman recover --target-time '$timestamp' compliance-pitr`
3. Validate restored state.
4. Switch primary, lift suspension.
5. RPO target: < 1 hour data loss (Wave 13: < 15 min).

### 4.4 Service Restart Sequence
Order matters: lower-tier first.
1. `pm2 restart compliance-cron-jobs` (drift detector, retention sweeper).
2. `pm2 restart governance-policy-service` (hosts compliance routes).
3. `pm2 restart gateway` (proxies + auth).
4. Verify `/api/compliance/health` returns 200 within 30s of step 3.

---

## §5 — Incident Response

### Severity definitions
- **P0**: tenant-impacting outage, data loss, or security breach. Page on-call immediately.
- **P1**: degraded UX for >10% of tenants, missed SLO. On-call within 30min.
- **P2**: contained issue, single tenant or non-critical feature. Next business day.
- **P3**: cosmetic / log-noise. Backlog.

### P0/P1 paging contacts
- On-call rotation: PagerDuty schedule `compliance-oncall`.
- Escalation path: oncall → tech lead (`product-shahin-ai`) → engineering manager → CTO.

### Common incidents + first response
| Symptom | Likely cause | First-response |
|---------|--------------|----------------|
| `/api/compliance/health` returns 503 | DB connection pool exhausted | Check `pgbouncer` stats; increase pool if needed; investigate slow queries |
| Surge in 500s on `/api/controls` | Migration drift or schema mismatch | Compare `schema_migrations` table on app vs DB; run `boot:harness` |
| Attestation evidence collection failures | CCM connector down (Wave 14+) | Check connector circuit breaker state; manual evidence upload as fallback |
| Tenant compliance posture stuck | Drift detector cron not firing (Wave 40+) | Check `pm2 list compliance-cron-jobs`; restart if down |
| Audit trail gaps | Outbox dispatcher backlog | Check `dos.outbox` queue depth; restart `outbox-dispatcher` |

---

## §6 — Sign-off Matrix

Each promotion to **production** lifecycle requires explicit sign-off from:

| Role | Sign-off responsibility | Wave-9 Promotion sign-off |
|------|------------------------|----------------------------|
| Code Owner (product-shahin-ai) | Code review, feature spec accuracy | ☐ |
| DBA / Data Platform | Migration safety, rollback verified | ☐ |
| Security Engineering | Tenant-isolation gate clean, no critical CVEs | ☐ |
| QA | Test coverage thresholds met, e2e green | ☐ |
| Compliance Officer (Subject-Matter) | Framework content accuracy, regulatory mappings correct | ☐ |
| SRE | SLO/SLI defined, runbook tested, on-call ready | ☐ |
| Product Manager | User stories met, GTM ready | ☐ |
| Legal / DPO | DPA + DPIA for tenant data handling | ☐ |

---

## §7 — Hold Conditions (any one ⇒ abort promotion)

1. Any §1 preflight check FAILS.
2. Any §2 CI gate RED on the head commit.
3. Active P0/P1 incident on the platform.
4. Customer ramp paused due to legal/regulatory escalation (e.g., new SAMA notice during ramp).
5. SOC 2 / ISO 27001 audit observation period not satisfied (Phase F: Wave 79+).
6. KSA NCA / SAMA cloud authorization pending (Phase F: Wave 83).
7. DR test not run within last quarter (Wave 13: monthly).

---

## §8 — Maintenance Windows

- **Weekly minor releases**: Tuesday 02:00-04:00 SAST (UTC+3) — historic low traffic.
- **Major releases**: First Tuesday of month, same window.
- **Emergency hotfixes**: any time, with on-call coordinator approval.
- **Database maintenance**: Sunday 02:00-06:00 SAST, monthly. 24hr advance notice to all tenants.

---

## §9 — Post-Promotion Activities (after Wave 9)

- **Day 1**: smoke verification on every route base, every route mounted via gateway. Tenant rollout to 1 canary.
- **Day 2-7**: gradual ramp to 10% → 50% → 100% per `4.1` schedule.
- **Day 8-14**: monitor SLO compliance, error budget burn rate, customer feedback channel (`#compliance-feedback`).
- **Day 15-30**: write post-launch retrospective; update RUNBOOK with lessons learned; update SLO targets if real-world data warrants.
- **Quarterly thereafter**: DR game day, chaos exercise, security review, SLO recalibration.

---

## §10 — Final Verdict (Wave 9 acceptance)

This runbook is signed and effective only when:
- All Wave 0-9 artifacts committed.
- Sign-off matrix (§6) fully populated.
- §1 preflight + §2 gates GREEN.
- Tenant cohort plan (canary → 10% → 50% → 100%) approved by Product + SRE.
- Manifest `lifecycle.stage` flipped from `ga` → `production`.

**Until that point: status = `WIRED-NOT-PROMOTED`**.

---

**Last revised**: 2026-04-30 (Wave 5 — initial issue).
**Next review**: after Wave 9 promotion.
