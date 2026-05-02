# Current Folders → 19-Card GRC Target Mapping

**Workspace:** `.modules-isolation/workspace/modules/`
**Target:** Foundation + 18 Shahin-AI GRC business modules.

## Target → Current source folders (consolidations)

| # | Target card | Source folders to fold in | Notes |
|---|---|---|---|
| 0 | Foundation / Org & Access | (lives in `platform/foundation`, NOT a Shahin business card) | Platform base |
| 1 | Governance & Authority | `governance` + `raci-matrix` + `board-report` + `ethics-integrity` + `proactive-leadership` | Includes RACI/RAPID/DACI authority matrix |
| 2 | Qiyas / Maturity & Strategy | `qiyas` + `maturity` + `benchmarks` + `scoring` + `scoring-policy` + `scoring-policies` | Maturity assessment + target profile + roadmap |
| 3 | Regulatory Intelligence | `ksa-regulatory` + `regulation-compiler` + `regulatory-delta` + `regulatory-feeds` + `frameworks` + `nca-assessment` + `sama-assessment` + `dora` + `dpia` + `regulator-portal` + `ksa-hub` | KSA/NCA/SAMA/PDPL/DORA obligations |
| 4 | Compliance Management | `compliance` + `assessments` | Obligations, attestations, status |
| 5 | Risk Management | `risk` + `model-risk` | Register, scoring, treatment, residual |
| 6 | Controls Management | `controls` | Library, design, testing |
| 7 | Policy Management | `policy` + `procedures` | Policies/standards/procedures lifecycle |
| 8 | Asset & Business Context | `asset` + `digital-twin` + `operations-hub` | Assets, services, BIA dependencies |
| 9 | Third-Party / Vendor Risk | `vendor` + `vendors` + `vendor-hub` + `vendor-portal` + `vendor-risk-ext` | Due diligence, contracts |
| 10 | Incident Management | `incident` + `vulnerabilities` | Incidents, breaches, escalation |
| 11 | Exceptions & Waivers | `exceptions` | Risk acceptance, waivers |
| 12 | Issues, Actions & Remediation | `issues` + `findings` + `action` + `remediation` + `process-tasks` | Findings → actions → closure |
| 13 | Evidence Management | `evidence` | Requests, collection, mapping, expiry |
| 14 | Audit & Assurance | `audit` | Audit plans, workpapers, assurance |
| 15 | BCP & Operational Resilience | `bcp` | BIA, BCP, crisis, recovery |
| 16 | Training & Awareness | `training` | Campaigns, training proof |
| 17 | Reporting, Analytics & Executive Cockpit | `reporting` + `analytics` + `dashboard` + `agrc-dashboard` + `sample-reports` + `widgets` | KPIs/KRIs/exec packs |
| 18 | AI Governance / AGRC Engine | `agrc-engine` + `mcp` + `unified-squad` + `akb` + `knowledge` + `knowledge-base` + `knowledge-hub` + `local-knowledge-hub` | AI orchestration + AI knowledge fabric |

## Fabric / shell — NOT business cards (relocate to platform/shell)

| Folder | Move to | Reason |
|---|---|---|
| `inbox`, `notifications`, `notification-center`, `messaging`, `approval-center` | `platform/inbox/` (Phase P) | Inbox/Tasks/Notifications shell layer |
| `mobile` | `platform/runtime/` or product shell | Cross-cutting shell |
| `privacy` | Either fold into Compliance OR keep as Privacy submodule under Compliance | PDPL/DPIA-ish, ambiguous |
| `shared`, `widgets` (workspace-only) | `modules/packages/module-shared` | Cross-module utilities |
| `errors`, `not-found`, `placeholder`, `sample-reports` | DELETE / archive | Stub or scaffolding pages |

## Folders to ARCHIVE / DELETE (no role in 19-card model)

`errors`, `not-found`, `placeholder`, `sample-reports` (sample data fixture, move to seeds)

## Build artifacts kept at modules/ root

`tsconfig.base.json`, `tsconfig.modules.build.json` — keep.

## Total

- 18 GRC business modules (cards 1-18)
- + Foundation (card 0, lives in platform/)
- = **19 visible workspace cards**
- 11 fabric/shell folders relocated
- 4 stub folders archived

This mapping is the source of truth for the manifests in §next.
