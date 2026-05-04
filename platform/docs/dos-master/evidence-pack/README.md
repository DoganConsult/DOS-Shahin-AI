# DOS Master Phase 1 — Production Acceptance Evidence Pack

**Status:** `PHASE_1_IMPLEMENTATION_CLOSED` — evidence captured 2026-05-04.

This pack provides reproducible proof for each acceptance gate. Every artifact
is regeneratable from `shahin_grc` + the repo at HEAD `2248c7b4d`.

## Acceptance summary

| Gate | Result | Artifact |
|------|--------|----------|
| 1. CI guards (23/23) | **PASS** | `01-ci-guards.txt` |
| 2. Doctrine articles (11/11 + acks) | **PASS** | `02-doctrine.txt` |
| 3. Controlled DDL (50 tables under `trg_dos_master_only`; doctrine target = 48) | **PASS** | `03-controlled-tables.txt` |
| 4. PPD substrate (R0..R5 × 5 gates × 1 cohort) | **PASS** | `04-ppd.txt` |
| 5. Services on ports 4007–4015 (9 services) + 37 endpoints | **PASS** | `05-services.txt` |
| 6. CLI surface (29 commands) | **PASS** | `06-cli.txt` |
| 7. Writer audit (173 audit rows × 28 tables × dos-master actor) | **PASS** | `07-writer-audit.txt` |
| 8. AccessStore canonical (`@dos/access-store`; legacy paths deleted) | **PASS** | `08-accessstore.txt` |

## Reproduction

```bash
# 1. CI guards
node scripts/ci-guards/dos-master-gate.mjs

# 2. Doctrine + acks
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c \
  "SELECT article_no, title FROM dos_master.doctrine_article ORDER BY article_no; \
   SELECT article_no, actor FROM dos_master.doctrine_acknowledgement ORDER BY article_no;"

# 3. Controlled-table coverage
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c \
  "SELECT count(DISTINCT (n.nspname,c.relname)) FROM pg_trigger tg \
   JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace \
   WHERE NOT tg.tgisinternal AND tg.tgname LIKE 'trg_dos_master_only%';"

# 4. PPD rings
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c \
  "SELECT r.ring_code, r.status, \
   (SELECT count(*) FROM dos.rollout_health_gate g WHERE g.ring_id=r.id) AS gates, \
   (SELECT count(*) FROM dos.rollout_cohort co WHERE co.ring_id=r.id) AS cohorts \
   FROM dos.rollout_ring r JOIN dos.rollout_plan p ON p.id=r.plan_id \
   WHERE p.title='platform-rollout' ORDER BY r.ring_order;"

# 5. Services
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c \
  "SELECT service_code, port, trust_zone, status FROM dos_master.service_registry ORDER BY port;"

# 6. CLI surface
grep -oE "'[a-z]+:[a-z:]+'" scripts/dos-master/dos.mjs | sort -u | wc -l

# 7. Writer audit
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c \
  "SELECT count(*) AS audit_rows, count(DISTINCT actor) AS actors, \
   count(DISTINCT table_schema||'.'||table_name) AS tables \
   FROM dos.dos_master_writer_audit;"
```

## Production acceptance — pending evidence

Phase 1 implementation is closed. The following operational evidence is required
before flipping to `PRODUCTION_ACCEPTED`:

1. **PM2 fleet boot** — all 9 services online simultaneously under
   `pnpm boot` with health endpoints green for ≥1 hour (off-hours blocker).
2. **End-to-end smoke** — public signup → tenant provisioned → workspace
   bootstrap → publish → rollback → rollout advance → auto-rollback on
   synthetic gate breach. Captured as PM2 logs + audit ledger diff.
3. **Real observability adapters** — Prom + Loki + Jaeger live readings
   feeding `RealSignalReader` (currently degrades to NEUTRAL when
   upstream missing — Article 5 compliant but not yet exercised on real
   signal).
4. **Negative-path proof bundle** — DB rejection on missing `dos.actor`,
   trust-zone cross-call rejection, fake-green detector with
   `FAKE_GREEN_ENFORCE=1` ratcheted to 0.
5. **Customer pitch matrix v1 publish** — 39-row matrix marked
   `published` per capability with linked CLI/UI parity entry.

Each item maps to a Phase 2 ticket in the master ledger
(`platform/docs/DOS_MASTER_PLAN.md` §11).
