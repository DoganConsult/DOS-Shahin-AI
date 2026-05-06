# Module 4 — Compliance

**Canonical route manifest:** `modules/compliance/ui/routes/compliance.module.routes.ts`  
**Standalone:** `complianceStandaloneRoutes` — controls/monitoring, maturity, registry, framework-hub, mappings, ksa-hub, assessments, etc.

---

## Pass 1 — Audit

### Children (core)

- `overview`, `frameworks`, `assessments`, `attestations`, `obligations`, `obligation-workspace`, `obligations/:id`, `findings`, `gaps`, `posture`, `heatmap`, `calendar`, `roadmap`, `templates`, `regulatory-changes`, `assertion-dashboard`, `rcsa-campaigns`, `regulatory-reasoning-studio`, `work-queue`, `exceptions`, `evidence-ops`, `reports`, `admin`.
- **Redirects:** `controls` → `/controls/library`; `controls-monitoring` → `/controls/monitoring` (standalone).

### Cross-module

- **Governance** redirects obligations/exceptions here — this module owns those surfaces for navigation purposes.

### Gaps vs pack

- **Mappings:** primarily **standalone** `mappings` route — ensure nav in Dynamic UI exposes it or document as “deep link”.
- **Obligations vs controls library:** controls browsing may live under global `/controls/**` — avoid duplicate UIs.

### File plan (Pass 1)

- Map each child to `modules/compliance/ui/features/compliance/pages/**`.
- List BFF/API per feature (framework catalog, assessments, gaps, posture scoring).

---

## Pass 2 — Implement

- Reuse existing framework/control/assessment components; **posture** and **gaps** must drill down to real rows (no fake metrics).
- Preserve **KSA** terminology if seeded in DB/copy (`ksa-hub`).
- Standalone routes: keep `requiredPermission` + `moduleCode: 'compliance'`.

---

## Pass 3 — Polish / QA

- [ ] KPI counts match list endpoints.
- [ ] Severity / status badges consistent (findings, gaps).
- [ ] Empty/error states on posture and heatmap.
- [ ] Regression: activate framework → assessment → gap → remediation → posture.
