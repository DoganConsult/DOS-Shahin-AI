# Compliance Module — Service Level Objectives (SLO)

**Module**: `@dos/module-compliance` v1.0.0
**Effective**: 2026-04-30 (Wave 5 baseline; refined per real-world data after Wave 9 promotion)

This document defines the SLOs the compliance module commits to, the SLIs (indicators) used to measure them, the error budget, and the response when SLO is at risk.

---

## §1 — Service Level Objectives

### 1.1 Availability
| Metric | Target | Measurement window |
|--------|--------|---------------------|
| Module availability (any compliance route base returns 2xx/3xx for valid request) | **99.9%** (rolling 30-day) | per minute |
| Aspirational target post-Wave 69 (Phase E) | **99.99%** | per minute |

### 1.2 Latency
Per-endpoint p95 / p99 from edge (gateway) to client response, excluding wait on customer-controlled CCM connectors:

| Operation class | p95 target | p99 target |
|-----------------|-----------|-----------|
| Read (GET list / detail / health) | < 300ms | < 600ms |
| Write (POST / PATCH / DELETE — direct DB) | < 500ms | < 1s |
| Heavy ops (export / report generation / AI inference) | < 5s | < 15s |
| Real-time event (`/api/compliance-ws` push) | < 200ms end-to-end | < 500ms |

Excluded from SLO:
- CCM connector roundtrips (vendor-controlled latency).
- Bulk export jobs (async).
- Tenant-scoped scheduled drift sweeps.

### 1.3 Correctness
| Metric | Target |
|--------|--------|
| Error rate (5xx responses on valid requests) | < 0.1% |
| Data correctness (audit trail entries written = audit events emitted) | 100% (eventual; outbox-dispatched within 60s) |
| Tenant isolation breaches | 0 (any breach = P0) |

### 1.4 Durability
| Metric | Target |
|--------|--------|
| Tenant data durability | 99.999999% (eight 9s, mirrors S3-class storage) |
| Audit trail tamper detection (Wave 10+) | 100% (any chain break detected within 24hr) |
| Backup recoverability | tested quarterly; no failed restore allowed |

### 1.5 Recovery (Phase E)
| Metric | Pre-Wave-13 target | Post-Wave-13 target |
|--------|--------------------|----------------------|
| RPO (data loss in disaster) | < 4 hours | < 1 hour |
| RTO (service restoration) | < 12 hours | < 4 hours |

---

## §2 — Service Level Indicators (SLI)

### 2.1 Availability SLI
- **Source**: gateway metrics (`prom-client`) — request count by route base × status code class.
- **Numerator**: 2xx + 3xx responses.
- **Denominator**: 2xx + 3xx + 5xx responses (4xx excluded — those are valid client errors, not service failures).
- **Window**: rolling 30-day, evaluated continuously.
- **Dashboard**: `grafana://compliance/availability` (post-Wave 6).

### 2.2 Latency SLI
- **Source**: per-route Prometheus histograms `dos_compliance_request_duration_seconds`.
- **Buckets**: `[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]`.
- **Quantiles**: p50, p95, p99 over 5-min rolling window.
- **Per-tenant breakdown**: tagged by `tenant_id` for noisy-neighbor isolation analysis.

### 2.3 Correctness SLI
- **5xx rate**: count of 500/502/503/504 over total non-4xx responses.
- **Audit-trail completeness**: count of events emitted vs entries written; checked nightly.
- **Tenant isolation**: count of cross-tenant data leaks (target: 0). Detected via:
  - `check-tenant-isolation.sh` (static).
  - Runtime tenant-id assertion middleware (Wave 1).
  - Periodic data validation: random tenant queries should never return another tenant's rows.

### 2.4 Durability SLI
- WAL replication lag < 60s (continuous).
- Quarterly restore drill: pick random tenant + timestamp, restore to staging, verify integrity.

---

## §3 — Error Budget

99.9% availability target ⇒ allowed downtime per 30 days = **43 minutes 12 seconds**.

### Burn-rate alerts
| Burn rate | Window | Page severity | Action |
|-----------|--------|---------------|--------|
| 14.4× (consuming 30-day budget in 2hr) | 5 min | P0 | Page on-call immediately |
| 6× (consuming budget in 5hr) | 30 min | P1 | Page on-call |
| 1× (steady budget burn) | 6 hr | P2 | Investigate next business day |

### Budget-exhaustion response
When error budget exhausted in a 30-day window:
1. **Halt feature releases** for the module until budget recovers.
2. Reliability work takes priority over features for next 14 days minimum.
3. Post-mortem published to `#compliance-eng`.
4. SLO re-evaluation by SRE + product (target adjustment OR architectural fix).

---

## §4 — Per-Route SLI Targets

Top-priority routes (read p95 < 300ms / write p95 < 500ms baseline):

| Route base | SLI target | Notes |
|------------|-----------|-------|
| `/api/compliance` (overview) | read p95 < 250ms | Hot read; cache backed (Wave 63). |
| `/api/compliance-ws` | event push < 200ms e2e | WebSocket; uses tenant-isolated message bus. |
| `/api/controls` | read p95 < 300ms; write p95 < 500ms | Largest table per tenant. |
| `/api/frameworks` | read p95 < 250ms | Mostly read-only reference data. |
| `/api/compliance-attestation` | write p95 < 500ms | Includes audit log write. |
| `/api/compliance-assertions` | read p95 < 300ms | Posture composite query. |
| `/api/ucf` | read p95 < 400ms | Cross-mapping graph traversal. |
| `/api/ksa-regulatory-changes` | read p95 < 300ms; ingest p95 < 5s | Daily bulletin polling. |
| `/api/nca-export` | export p95 < 30s | Bulk export job. |
| `/api/scoring-policies` | read p95 < 200ms; recompute p95 < 2s | Cached scoring engine. |

(Remaining 13 route bases: same class defaults as §1.2.)

---

## §5 — Capacity Planning

### Current baseline (Wave 0)
- Active tenants: TBD post Wave-9 promotion
- Avg controls / tenant: TBD
- Audit events / day / tenant: TBD
- Storage / tenant (evidence): TBD

### Phase-E targets (Wave 67 benchmark)
- 1,000 tenants concurrent
- 10,000 controls / tenant
- 100,000 evidence items / tenant
- 1,000,000 audit entries / day platform-wide
- p95 < 500ms held under above load

---

## §6 — Maintenance Window Allowance

Scheduled maintenance windows (per RUNBOOK §8) are excluded from SLO.

- **Weekly minor**: 2hr × 4 = 8hr/month deduction from budget.
- **Major**: 4hr × 1 = 4hr/month.
- **Total**: ~12hr/month deduction allowed.

Net availability target after maintenance: 99.9% of the remaining 720 - 12 = 708 hours = ~99.74% on raw clock.

---

## §7 — Compliance-Specific KPIs (beyond SLO)

These are product KPIs the team tracks but are not strict SLOs — they reflect compliance domain quality:

| KPI | Target | Phase |
|-----|--------|-------|
| Attestation campaign completion rate | ≥ 95% on time | Phase A baseline |
| Time-to-first-control after onboarding | < 1 hour (with content packs) | Phase C (Wave 26+) |
| Regulatory change → control update latency | < 24 hours after regulator publication | Phase B (Wave 16) |
| AI suggestion acceptance rate | > 60% (signal of suggestion quality) | Phase D (Wave 41+) |
| Customer-reported false-positive rate on findings | < 5% | Phase D |
| Trust center / customer-portal uptime | 99.99% | Phase B (Wave 45) |

---

## §8 — Review Cadence

- **Weekly**: SLI dashboard review by SRE on-call.
- **Monthly**: SLO + error budget review by tech lead + SRE + product.
- **Quarterly**: SLO target recalibration based on real-world data and customer feedback.
- **After every P0/P1 incident**: blameless post-mortem, update SLI/SLO if architectural learning.

---

**Last revised**: 2026-04-30 (Wave 5 — initial issue).
**Next review**: after Wave 9 promotion (1-month real-world data review) → quarterly thereafter.
