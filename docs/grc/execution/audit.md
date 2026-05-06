# Module 6 — Audit & Findings

**Canonical route manifest:** `platform/config-center/board-report/platform-manifests/module-routes-governance/audit.module.routes.ts`  
**Standalone:** `audit-standalone.routes.ts` (audit-trail, login-history, audit-package, akb, audit-workpapers, etc.)

---

## Pass 1 — Audit

### Children (representative)

- `overview`, `plan`, `engagements`, `findings`, `capa`, `validation`, `reports`, `universe`, `working-papers`, `team`, `quality-assurance`, `trends`, `committee`, `external-audits`, `regulatory-exams`, `test-plans`, `settings`, `admin`, plus analytics and assurance subtrees (`analytics/**`, `assurance/**`), imports, issues, and redirects (`issues` → `/audit/issues` root handling per manifest).

### Gaps vs pack

- **CAPA** and **validation** are first-class routes — ensure findings link to both where schema supports.
- Large surface: risk of **overwhelming nav**; Dynamic UI grouping should mirror operational mental model (plan → execute → remediate → report).

### File plan (Pass 1)

- Map manifest keys to `modules/**/audit/**` or platform audit features (follow imports).
- Distinguish **tenant audit** vs **platform audit** standalone routes (trust zone).

---

## Pass 2 — Implement

- Findings: severity, owner, due date, link to control/risk/evidence when IDs exist.
- CAPA: milestones, evidence of closure.
- Validation: retest / close / reopen states explicit in UI.
- Overview metrics from **live** queries only.

---

## Pass 3 — Polish / QA

- [ ] Severity and due date consistent across plan, engagement, finding, CAPA.
- [ ] Reopen rules documented in UI helper text if complex.
- [ ] Regression: plan → engagement → finding → CAPA → closure evidence → validate.
