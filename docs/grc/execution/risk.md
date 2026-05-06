# Module 3 — Risk

**Workspace route manifest:** imports `riskRouteChildren` from `@risk-module/ui`  
**On-disk reference:** `.modules-isolation/workspace/modules/cards/risk/sources/risk/ui/routes/risk.module.routes.ts`  
**Standalone:** `risk-standalone.routes` — `vulnerabilities`, `model-risk`

---

## Pass 1 — Audit

### Route children (truth)

| Key | Component area |
|-----|----------------|
| `home` | Risk overview |
| `work-queue` | Work queue |
| `register`, `register/:id` | Register + detail |
| `assessments` | Assessments |
| `indicators` (alias `kris`) | KRIs |
| `treatment` (alias `treatments`) | Treatments |
| `issues` | Issues |
| `scenarios` | Scenarios |
| `reports` | Reports |
| `admin` | Admin |
| `scoring` | Methodology / scoring |
| `acceptance` | Risk acceptance |
| `heatmap` | Heatmap |
| `metrics` | Metrics |
| `appetite` | Appetite |
| `bowtie` | Bowtie |

**Redirects:** `overview` → `home`; `kris` → `indicators`; `treatments` → `treatment`.

### Gaps vs pack

- Pack lists **Methodology** as separate; manifest uses **`scoring`** — treat as methodology surface or add alias route in manifest **only** if product agrees.
- **Treatment** vs **issues** — both present; ensure IA explains difference.

### File plan (Pass 1)

- Inventory pages under `.../risk/ui/features/risk/pages/`.
- Map APIs used per page (risk register service, heatmap, KRI thresholds).

---

## Pass 2 — Implement

- Register: owner, inherent/residual, review date, status — align with backend DTOs.
- Treatment: owners, due dates, progress; link to risks.
- KRIs: thresholds and trend widgets if API supports.
- Heatmap: **existing** chart library only (Chart.js / platform pattern).
- Standalone: vulnerabilities, model-risk — same permission model (`risk.record.read`).

---

## Pass 3 — Polish / QA

- [ ] Score consistency: register ↔ detail ↔ heatmap ↔ reports.
- [ ] Overdue drill-down links.
- [ ] Duplicate label cleanup (`kris`/`indicators`).
- [ ] Regression: create risk → assess → treatment → acceptance → heatmap.
