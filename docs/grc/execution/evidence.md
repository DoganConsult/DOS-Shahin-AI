# Module 5 — Evidence

**Canonical route manifest:** `platform/config-center/board-report/platform-manifests/module-routes-governance/evidence.module.routes.ts`

---

## Pass 1 — Audit

### Children (representative)

- `home`, `work-queue`, `overview`, `vault`, `catalog`, `requests`, `reviews`, `freshness`, `expiry`, `reuse`, `packages`, `mappings`, `connectors`, `automated-collection`, `tasks`, `reports`, `admin`, plus many specialized routes (blockchain, classification, legal hold, chain-of-custody, quality, predictive, sensitive-data, third-party attestations, workspace binding, etc.).

### Gaps vs pack

- Pack lists **Expiry & Coverage** — manifest has **`freshness`** and **`expiry`** separately; IA may combine in nav labels only (no route churn unless needed).
- **Automated collection** ↔ `connectors` / `automated-collection` — clarify single entry in operator docs.

### File plan (Pass 1)

- Map routes → feature components under evidence module paths (trace `loadComponent` imports).
- Identify duplicate entry points (e.g. vault vs catalog) for consolidation **Pass 2**.

---

## Pass 2 — Implement

- Vault / requests / reviews: one pattern for list + detail + workflow state.
- Versioning / expiry: surface API fields; no silent omission of custody metadata.
- Connectors: gate behind permissions; no secrets in FE.

---

## Pass 3 — Polish / QA

- [ ] Sensitive evidence: permission visibility and masking.
- [ ] Version and expiry clarity in detail drawer.
- [ ] Regression: upload → request → review → map to control → expiry alert path (as enabled).
