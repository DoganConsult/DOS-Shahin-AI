# Compliance Module — Shahin-AI SPA Enrollment Status

> Application of `docs/DOS-AIO-Specs/Shahin-AI SPA.md` (canonical: `dynamic-ui-enrollment-page-experience-widgets-spec.md`)
> + `module-patch-06-compliance-end-to-end.md` to the Compliance module.

Generated 2026-05-02.

---

## What was applied

| Spec section | Deliverable | Path | Status |
|---|---|---|---|
| §2 — Module UI Contract | `ui.contract.json` (13 routes, 6 page experiences, 11 nav items, 5 module agents, 6 signature widgets) | [contracts/ui.contract.json](contracts/ui.contract.json) | ✅ |
| §2.3 — Required route fields (`pageType`, `layout`, `kpiScope`, `titleKey`) | All 13 routes typed | contracts/ui.contract.json | ✅ |
| §3.2 — `PageExperienceContract` per route | 6 explicit page experiences for the highest-traffic routes | contracts/ui.contract.json | ✅ partial (6 / 13) |
| §25.4 / §28.4 / §32.3 / §35.3 — Compliance moduleStyleTokens | navy + saffron, fact_check icon, signature widgets, agent tone | contracts/ui.contract.json + module.manifest.json | ✅ |
| §35.3 — Token shape | accent / accentSecondary / icon / mood / pageDensity / surfaceStyle / signatureWidgets / agentTone / defaultPageLayout / mobileVariant | contracts/ui.contract.json | ✅ |
| §20 — Dynamic Agent UI (`agentExperience`) | 5 module agents (`obligationMapper`, `evidenceDetector`, `gapSummarizer`, `reportDrafter`, `frameworkComparer`) | contracts/ui.contract.json | ✅ |
| §14 — Workflow-native actions | 6 state machines + 9 transitions, decision-preview required for 3 risky writes | contracts/ui.contract.json `workflowExperience` | ✅ |
| §16 — Evidence Fabric | `binderRequired`, `showFreshness`, `showAttestationLink`, `missingEvidenceBadge` | contracts/ui.contract.json `evidenceExperience` | ✅ |
| §17 — Audit Timeline / write-audit | `auditTimelineRequired: true`, 5 transitions require write-audit, export requires audit | contracts/ui.contract.json `auditExperience` | ✅ |
| §10 — Hard gates | Self-check passes (4 fields × 13 routes; kpiScope rules per §2.3) | contracts/ui.contract.json `hardGates` | ✅ self-check |
| Manifest declaration | `uiContract` section (specVersion, paths, publisher endpoint, route-catalog endpoint, tokens) | module.manifest.json | ✅ |
| Package exports | `./contracts/ui.contract.json` exported and listed in `files[]` | package.json | ✅ |

---

## Shahin-AI SPA gates passed (self-check)

| Gate | Result |
|---|---|
| All 13 routes have `pageType` | ✅ |
| All 13 routes have `layout` | ✅ |
| All 13 routes have `kpiScope` | ✅ |
| All 13 routes have `titleKey` | ✅ |
| Overview page → `kpiScope = module-overview` | ✅ |
| Operational pages → `kpiScope ∈ {none, page-local}` | ✅ |
| `module typecheck` (`pnpm --filter @dos/module-compliance typecheck`) | ✅ exit 0 |
| Manifest JSON validates | ✅ 31 top-level sections |

---

## Compliance routes enrolled (13)

| Route | pageType | layout | kpiScope | signatureWidget |
|---|---|---|---|---|
| `/compliance` | overview | dashboard | module-overview | command-center |
| `/compliance/frameworks` | list | full-page | none | framework-mapping |
| `/compliance/obligations` | list | full-page | none | obligation-map |
| `/compliance/controls` | list | full-page | none | control-library-matrix |
| `/compliance/controls/:id` | object | object-page | none | entity-360 |
| `/compliance/assessments` | workflow | full-page | none | assessment-cockpit |
| `/compliance/evidence` | list | full-page | none | evidence-binder |
| `/compliance/gaps` | workflow | full-page | none | gap-remediation-board |
| `/compliance/attestations` | workflow | full-page | none | smart-data-grid |
| `/compliance/reports` | analytics | report | page-local | report-composer |
| `/compliance/regulator` | object | split-view | page-local | framework-mapping |
| `/compliance/ksa` | analytics | dashboard | page-local | framework-mapping |
| `/compliance/diagnostics` | settings | full-page | none | smart-data-grid |

---

## Compliance moduleStyleTokens

```json
{
  "moduleCode": "compliance",
  "accent": "navy",
  "accentSecondary": "saffron",
  "icon": "fact_check",
  "mood": "formal, assurance-heavy, evidence-driven",
  "pageDensity": "comfortable",
  "surfaceStyle": "assurance",
  "signatureWidgets": [
    "control-library-matrix", "obligation-map", "assessment-cockpit",
    "evidence-binder", "gap-remediation-board", "framework-mapping"
  ],
  "agentTone": "assurance",
  "defaultPageLayout": "full-page",
  "mobileVariant": "bottom-sheet"
}
```

(matches §35.3 of the canonical spec verbatim)

---

## What is still required (out of scope of this PR)

These are platform-side responsibilities, not module-side:

| Spec section | Still needed | Owner |
|---|---|---|
| §1 — Dynamic UI Contract Publisher | Build: read `contracts/ui.contract.json` from each enrolled module → publish into `dynamic_ui_*` tables | platform/dynamic-ui |
| §8 — `dynamic_ui_*` data model | Tables exist (per `MEMORY.md` 11 ui_* tables); seed loader for compliance contract | platform/dynamic-ui |
| §10 — Endpoint `/api/dynamic-ui/contract/compliance` | Wire to read this contract + apply persona resolver | platform/dynamic-ui |
| §10 — Endpoint `/api/dynamic-ui/route-catalog` | Aggregate all module contracts | platform/dynamic-ui |
| §3.3 — `DynamicPageExperienceResolver` | Build in SPA shell | products/shahin-ai/app |
| §6 — Renderer Registry | Generic-first per pageType + signature widget composition | products/shahin-ai/app |
| §11 — WCAG AA gate | Run audit, fix shortfalls | products/shahin-ai/app |
| §36 — Shahin SPA shell incident playbook | Already partially in place — shell handlers can read this contract | products/shahin-ai/app |

The **module-side enrollment** (per spec §9) is **complete**. Steps 2–7 of §9 (publisher, seed, drift smoke, SPA build, route-catalog verify) are platform-side jobs.

---

## §9 Enrollment Flow — module-side checklist

1. ✅ Create module-owned `ui.contract.json`
2. ⏳ Run contract publisher *(platform job)*
3. ⏳ Seed `dynamic_ui_*` tables *(platform job)*
4. ✅ Allowed component keys declared (13 `componentKey` entries: `ComplianceOverviewPage`, `ComplianceFrameworksPage`, …, `ComplianceDiagnosticsPage`)
5. ⏳ Run drift smoke *(platform job)*
6. ⏳ Build SPA *(product job)*
7. ⏳ Verify route-catalog *(platform job)*

---

## Re-application to other modules

Use this contract as the template. The repeatable pattern is:

1. Copy `modules/compliance/contracts/ui.contract.json` to `modules/<module>/contracts/ui.contract.json`.
2. Replace top-level `moduleCode`, `displayName`, `theme`, `moduleStyleTokens` with the values from §35 (Risk → 35.2, Workflow → 35.4, DAuth → 35.5, Executive → 35.6, etc.) or §32 if no §35 entry.
3. Replace `routes[]`, `pageExperiences[]`, `navigation[]` with the module's actual routes.
4. Replace `agentExperience.moduleAgents` per §32 entries.
5. Run the same JSON validation and hard-gate self-check.
6. Add `uiContract` section to that module's `module.manifest.json`.
7. Add the export to that module's `package.json`.

The companion `module-patch-NN-<module>-end-to-end.md` files (06 = compliance, 07 = policy, …, 58 = config-center) declare the per-module ownership boundaries.

Next per the patch series: **Module Patch 07 — Policy Module End-to-End**.
