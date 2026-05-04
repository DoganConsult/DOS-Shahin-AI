# DOS Master — Phase 4 Plan (Production Hardening & Owner-Gated Feature Roll-Out)

> **Predecessor:** Phase 3 closed at L32 (2026-05-04). 31/31 ledger rows
> CLOSED, 23/23 CI guards PASS, 18 admin services on mTLS+HTTPS, gateway
> HttpsAgent active, KC `platform-ops` realm enforcing, RLS 202/202.
>
> **Phase 4 charter:** harden the live trust zone for production-grade
> operations (cert lifecycle, observability, SLOs), close the only
> intentional carve-out (Tuwaiq-AI SPA — gated on §10 owner sign-off),
> and extend doctrine coverage to the runtime tenant-zone services.
>
> **Doctrine binding (unchanged):** Articles 1–11 + §10 (no autonomous
> ops/secret/cert/realm decisions) + §14 (Full-Stack-Per-OS).

---

## L33 — Cert lifecycle observability + rotation runbook

| Item | Scope | Article | Disposition |
|------|-------|---------|-------------|
| (A) | `cert-expiry.metric.mjs` — emit `dos_admin_cert_expiry_seconds{svc=…}` Prometheus gauge per leaf cert (parses `notAfter` on PM2 reload) | observability | **GO** (no ops nod needed — read-only) |
| (B) | CI guard `cert-expiry-baseline.mjs` — fails when any admin cert ≤ 90 days from expiry | CI gate | **GO** |
| (C) | `scripts/dos-master/rotate-admin-cert.mjs` — re-mint + atomic-swap a single leaf cert with the env-source restart recipe; idempotent | ops tool | **GO** |
| (D) | Rotation runbook `platform/docs/runbooks/admin-cert-rotation.md` — checklist + dry-run + rollback | docs | **GO** |
| (E) | Real cert rotation drill against one admin service (e.g. `dr-os-service`) end-to-end | runtime | **NO-GO until ops nod** (touches live trust-zone material) |

**Acceptance:** 24/24 CI guards green; `cert-expiry-baseline` reports
`19/19 admin certs ≥ 90d`; runbook merged; (E) deferred to ops window.

---

## L34 — Tenant-zone mTLS expansion (second CA — Article 4 segregation)

| Item | Scope | Article | Disposition |
|------|-------|---------|-------------|
| (A) | Mint **second** CA `tenant-mtls/ca.{key,crt}` (separate authority — Article 4 forbids cross-zone CA reuse) | runtime | **NO-GO until ops nod** |
| (B) | Bootstrap helper `_httpsListenOptions()` already supports any CA — extend env-rule docs to cover `TENANT_MTLS_*` vars | code | **GO** |
| (C) | New CI guard `tenant-zone-cert-isolation.mjs` — fails if any tenant cert chains to the admin CA | CI gate | **GO** |
| (D) | Pilot mTLS flip on **one** tenant runtime service (`auth-service:4001`); validate gateway → service over HTTPS | runtime | **NO-GO until ops nod + (A) lands** |

**Acceptance:** Article 4 guard extended; 25/25 CI guards green; pilot
deferred to ops window.

---

## L35 — Tuwaiq-AI Angular SPA scaffold (closes the §10 carve-out)

| Item | Scope | Article | Disposition |
|------|-------|---------|-------------|
| (A) | Product-owner first commit on `products/tuwaiq-ai/app/` (manifest already at `lifecycle.stage='experimental'`) | runtime | **NO-GO until product-owner sign-off** |
| (B) | Once (A) lands: scaffold Angular Carbon UIShell mirroring `shahin-ai/app` pattern (vertical slice — header, side-nav, 1 panel) | code | **GO post-(A)** |
| (C) | Lifecycle flip `experimental → beta` via `dos-master` writer + audit row | runtime | **NO-GO until QA cohort signs off** |

**Acceptance:** SPA returns HTTP 200 at `/tuwaiq/*`; first row in
`dos.product_lifecycle_event` (kind `stage_changed`).

---

## L36 — SLO + Synthetic monitoring contract

| Item | Scope | Article | Disposition |
|------|-------|---------|-------------|
| (A) | `dos.platform_slo` controlled table — per-service `availability_target`, `latency_p99_ms`, `error_budget_seconds_per_30d` | DDL | **GO** |
| (B) | Synthetic prober (`scripts/dos-master/synthetic-probe.mjs`) — runs on cron, posts to `dos.platform_slo_event` ledger | code | **GO** |
| (C) | New nav entry **Operations → SLOs** (Carbon table over `dos.platform_slo` + per-service burn-rate) | FE | **GO** |
| (D) | CI guard `slo-row-per-active-service.mjs` — fails if any `service_registry.status='active'` row lacks an SLO row | CI gate | **GO** |
| (E) | Wire 7-day error-budget burn into PPD R0 → R5 promotion gate (auto-rollback on > 2× burn) | runtime | **NO-GO until ops nod** (touches release ring) |

**Acceptance:** 26/26 CI guards green; SLO table seeded for all 33 PM2
services; synthetic probe runs every 5m; FE panel landed.

---

## L37 — Doctrine §15 — Customer-zone API gateway hardening

| Item | Scope | Article | Disposition |
|------|-------|---------|-------------|
| (A) | New §15 in `DOS_MASTER_DOCTRINE.md` — codifies customer-zone HTTPS-only ingress, OAuth2 PKCE-only token exchange, no opaque cookies leak across zones | doctrine | **GO** |
| (B) | `customer-zone-pkce-only.mjs` CI guard | CI gate | **GO** |
| (C) | Rate-limit envelope per tenant (Redis-backed sliding window) wired into gateway customer-zone routes | code | **GO** |
| (D) | Customer-zone session TTL contract row in `dos.platform_session_policy` controlled table | DDL | **GO** |

**Acceptance:** 27/27 CI guards green; doctrine §15 published.

---

## Phase-4 exit criteria

- 27/27 CI guards green (was 23/23 at Phase 3 close).
- Cert lifecycle observable + rotation runbook merged.
- Tenant-zone mTLS isolation guard live (pilot deferred to ops).
- SLO contract enforced for every PM2-active service.
- §15 customer-zone doctrine published + PKCE-only enforced.
- Tuwaiq-AI SPA scaffold landed (post product-owner sign-off).

## Out of scope (deferred to Phase 5)

- Multi-region active-active (DR-OS already seeds drill events; real
  failover requires infra commit).
- Marketplace billing reconciliation (depends on Stripe webhook contract).
- Customer-facing self-service tenant CA (Article 4 — separate trust
  authority per customer; needs legal sign-off).

---

**Author:** DOS Master
**Status:** DRAFT — awaiting Phase 4 kickoff approval
**Predecessor ledger:** `platform/docs/DOS_MASTER_PLAN.md` rows L1..L32
