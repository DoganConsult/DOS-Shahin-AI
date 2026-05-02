# Wave 9 — Production Promotion Checklist

**Goal**: flip `module.manifest.json` `lifecycle.stage` from `ga` → `production` and roll out to tenants.

This document is the **acceptance gate**. All boxes must be ticked before the manifest flip lands.

Pre-condition: Waves 0-8 closed (acceptance criteria in their respective docs / commits).

---

## §1 — Code & Build Gates (G1)

- [ ] `npm run typecheck` → 0 errors (verified via CI on head commit)
- [ ] `npm run build` → 0 errors, dist regenerable from clean
- [ ] `npm run lint` → 0 errors (when added)
- [ ] No `_inbound/` staging tree present (Wave 3 closed)

## §2 — Test Gates (G2)

- [ ] `npm run test:smoke` → 7/7 pass
- [ ] `npm run test:integration` → 100% pass (no failing tests)
- [ ] `npm run test:contract` → 9/9 pass
- [ ] `npm run test:coverage` → lines ≥90, branches ≥85 (Wave 4 thresholds)
- [ ] `npx stryker run` → mutation kill rate ≥85 (Wave 4)

## §3 — Permission & Security Gates (G3, G4, G11)

- [ ] `npm run verify:permissions` → OK
- [ ] `bash ops/scripts/check-tenant-isolation.sh` → 0 violations across `services/` + `packages/`
- [ ] Wave 1 contract test (tenant-isolation): 0 NEW violations + baseline allowlist purged
- [ ] `npm audit --audit-level=high` → 0 high+ critical CVEs
- [ ] SBOM generated (Wave 78)
- [ ] Public security.txt + responsible disclosure published (Wave 77)

## §4 — Documentation (G5)

- [ ] `AS-BUILT.md` filled, all sections current, verdict line set
- [ ] `RUNBOOK.md` reviewed by SRE
- [ ] `SLO.md` reviewed by Product + SRE
- [ ] `openapi.yaml` validates against OpenAPI 3.1.0
- [ ] `docs/patterns/tenant-isolation.md` reviewed by platform-sec
- [ ] `docs/dr/` (Wave 13) — DR runbook + most-recent quarterly DR test artifact

## §5 — Operational Readiness (G6, G10)

- [ ] `/api/compliance/healthz` returns 200 against staging
- [ ] `/api/compliance/readyz` returns 200 (DB + ports bound)
- [ ] `/api/compliance/metrics` returns Prometheus text against staging
- [ ] k6 baseline run (`tests/perf/compliance-baseline.k6.js`) passes thresholds
- [ ] `docs/load-baseline-2026-04.json` populated with real numbers (not placeholder)
- [ ] Alerting configured (PagerDuty `compliance-oncall` rotation)
- [ ] Grafana dashboard `compliance/availability` published
- [ ] Error-budget burn-rate alerts configured (per SLO §3)

## §6 — Data Plane Readiness

- [ ] All declared `ownedTables` exist in `dos.tenants_*` schemas (boot:harness verifies)
- [ ] Per-tenant migrations idempotent (run-twice safe)
- [ ] Each migration has `_down.sql` rollback companion
- [ ] PITR window configured (Wave 13: 7 days minimum)
- [ ] Backup restoration tested in last quarter
- [ ] Tenant data residency policy enforced (Wave 12 — KSA / EU / US / APAC)

## §7 — Feature & Content Readiness

- [ ] All 23 declared `routeBases` are wired (no entries in `UNWIRED_ROUTEBASES_BASELINE`)
- [ ] All 8 declared `subscribes` events have real handlers (verified by contract test)
- [ ] Dynamic-UI seed manifest mirrors registry 1:1 (verified by contract test)
- [ ] EN + AR i18n complete (no missing keys; Wave 8)
- [ ] Frontend pages render without console errors (Playwright e2e)
- [ ] At least 1 framework content pack pre-loaded (Wave 26+ for ISO 27001)

## §8 — Sign-offs

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Code Owner (product-shahin-ai) | TBD | TBD | ☐ |
| DBA / Data Platform | TBD | TBD | ☐ |
| Security Engineering | TBD | TBD | ☐ |
| QA Lead | TBD | TBD | ☐ |
| Compliance Officer (Subject-Matter Expert) | TBD | TBD | ☐ |
| SRE Lead | TBD | TBD | ☐ |
| Product Manager | TBD | TBD | ☐ |
| Legal / DPO | TBD | TBD | ☐ |

## §9 — Manifest Flip

When all sign-offs collected, execute:

```bash
# 1. Update module.manifest.json
#    lifecycle.stage: "ga" → "production"
#    + add lifecycle.promotedAt + lifecycle.promotedBy fields
git add modules/compliance/module.manifest.json
git commit -m "feat(compliance): Wave 9 — promote lifecycle ga → production"

# 2. Tag the commit
git tag compliance/v1.0.0-production
git push origin compliance/v1.0.0-production

# 3. Update AS-BUILT.md verdict line:
#    "Signoff status: WIRED-NOT-PROMOTED" → "READY FOR COMMERCIAL ENTERPRISE PRODUCTION — promoted YYYY-MM-DD"
```

## §10 — Tenant Rollout

Per `RUNBOOK.md §3`:

1. **Day 1**: deploy to canary (1 internal tenant), soak 30 min, verify smoke + KPIs
2. **Day 2-3**: roll forward to 10% tenants, soak 2 hr each batch
3. **Day 4-5**: roll forward to 50%, soak 4 hr
4. **Day 6-7**: roll forward to 100%, soak 24 hr
5. **Day 8-14**: monitor SLO compliance + customer feedback channel
6. **Day 15-30**: post-launch retrospective; SLO recalibration if real-world data warrants
7. **Quarterly thereafter**: DR game day, chaos exercise, security review

---

## §11 — Hold Conditions (any one ⇒ abort promotion)

1. Any §1-§7 check FAILS.
2. Any sign-off in §8 outstanding.
3. Active P0/P1 incident on the platform.
4. Customer ramp paused due to legal/regulatory escalation.
5. SOC 2 / ISO 27001 audit observation period not satisfied (Phase F gates Wave 79+).
6. KSA NCA / SAMA cloud authorization pending (Phase F gates Wave 83).
7. DR test not run within last quarter.

---

**Last revised**: 2026-04-30 (Wave 9 — checklist template issued; sign-offs pending).
**Next milestone**: collect §8 sign-offs after Waves 1-8 close.
