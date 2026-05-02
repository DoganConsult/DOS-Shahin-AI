# DOS-AIO.md — Master Document Index

> **27,000+ lines · 16 platform patches (0–15) + 58 module patches (MP-01–MP-58) · Single source of truth for DOS / DAuth / Shahin-AI**
>
> Platform chain: **0** → **1** → **2** → **3** → **4** → **5** → **6** → **7** → **8** → **9** → **10** → **11** → **12** → **13** → **14** → **15**
> Module chain (inline MP-01–MP-16): **MP-01** → **MP-02** → **MP-03** → **MP-04** → **MP-05** → **MP-06** → **MP-07** → **MP-08** → **MP-09** → **MP-10** → **MP-11** → **MP-12** → **MP-13** → **MP-14** → **MP-15** → **MP-16**
> Extended module library (MP-01–MP-58): See [`DOS-AIO-Specs/`](DOS-AIO-Specs/README.md)
> Operational registry: [`DOS-AIO-actualcodebase.csv`](DOS-AIO-actualcodebase.csv) — 202 columns × 66 modules

---

## Project Document Landscape

| Category | Count | Location | Status |
|----------|-------|----------|--------|
| **DOS-AIO.md** (this file) | 1 | `DOS-AIO-Specs/` | **Governing** — single source of truth |
| **CLAUDE.md** | 1 | Root | **Governing** — code review enforcement |
| **Patch standalone files** | 8 | Root (`patch-*.md`) | Source drafts for Patches 0–7. AGENTS.md is authoritative. |
| **Module Patch Library** | 58 | [`DOS-AIO-Specs/`](DOS-AIO-Specs/) | End-to-end module patches MP-01–MP-58. Canonical per-module specs. |
| **Operational Registry** | 1 | [`DOS-AIO-actualcodebase.csv`](DOS-AIO-Specs/DOS-AIO-actualcodebase.csv) | 202 cols × 65 modules. Code-verified metrics, release gates, blocker tracking. |
| **Audit report** | 1 | `docs/codebase-audit-report.md` | 28 gaps found (3 P0, 8 P1, 13 P2, 4 P3) |
| **Root-level docs** | 82 | Root (`*.md`) | Legacy reports — pre-rebuild. Reference only. |
| **docs/ subdirectory** | 196 | `docs/` | Legacy implementation plans, audits, gap analyses. Reference only. |
| **Total .md files** | ~280 | Across project | Most are pre-rebuild legacy — AGENTS.md supersedes all. |

> **Rule (Patch 0 §AP.2):** No markdown docs inside `backend/src/` or `frontend/src/` runtime source trees unless intentionally product documentation. DOS-AIO.md and CLAUDE.md are the governing documents. All other .md files are reference-only.


### Module Operational Registry (`DOS-AIO-actualcodebase.csv`)

> **202 columns × 65 module surfaces.** Repository-verified operational registry mapping every codebase surface to its governing spec.
> Cross-references: DOS-AIO.md inline specs (MP-01–MP-16) + `DOS-AIO-Specs/module-patch-*.md` external specs (MP-01–MP-58).

#### Registry Column Families (202 columns)

| Prefix | Cols | Purpose |
|--------|------|---------|
| `SPEC:` | 14 | Specification — patch numbers, target descriptions, service lists |
| `ACTUAL:` | 27 | Live codebase metrics — LOC, DB tables, FE components (filesystem-verified) |
| `EXTRA:` | 48 | Module manifest — tier, routeBase, ownedTables, sharedTables |
| `REGISTRY:` | 6 | Existence flags — BE/FE directory presence |
| `LIVE:` | 10 | Runtime counts — services, APIs, tests (grep-verified) |
| `DETAIL:` | 49 | Module identification |
| `REL:` | 6 | Release control — wave, status, gate score (0–5), go-live decision, rollback |
| `OWN:` | 5 | Ownership — engineering/product/security/QA owners (git-derived) |
| `BLOCK:` | 5 | Blockers — P0/P1 counts, @ts-ignore, _shared dependency, waivers |
| `VERIFY:` | 8 | Verification — build, lint, typecheck, unit/integration/smoke test status |
| `OPS:` | 7 | Operations — health endpoints, runbooks, rollback plans, backup evidence |
| `DEPLOY:` | 7 | Deployment — runtime type, deployable unit, air-gap support, DB migration |
| `RISK:` | 5 | Risk — customer exposure, data classification, security criticality, availability |
| `CLASS:` | 5 | Classification — canonical MP mapping, spec coverage, surface class, spec depth |

#### Surface Classification (65 → 4 statuses)

| Status | Count | LOC | Meaning |
|--------|-------|-----|---------|
| `covered_inline_in_agents` | 22 | 419,873 | Spec inline in DOS-AIO.md (MP-01–MP-16 + aliases) |
| `covered_in_external_module_patch_library` | 41 | 286,677 | Spec in `DOS-AIO-Specs/module-patch-*.md` |
| `platform_or_dauth_surface_not_a_product_module` | 3 | 10,810 | DOS/DAuth concern — not a product module |
| **Total** | **66** | **717,360** | |

#### Complete Module-to-Spec Map

| MP (CSV) | Module | Canonical Spec | Coverage | Surface Class | LOC |
|----------|--------|---------------|----------|---------------|-----|
| MP-17 Action | `action` | MP-17 | ✅ external | canonical_spec_module | 5,431 |
| MP-18 Admin | `admin` | MP-18 | ✅ external | canonical_spec_module | 10,084 |
| MP-19 AGRC Engine | `agrc-engine` | MP-19 | ✅ external | canonical_spec_module | 11,859 |
| MP-43 Training | `ai` | MP-03 | ✅ inline | canonical_spec_module | 50,344 |
| MP-20 AI Governance | `ai-governance` | MP-20 | ✅ external | canonical_spec_module | 48,498 |
| MP-12 Analytics | `analytics` | MP-12 | ✅ inline | canonical_spec_module | 14,736 |
| MP-21 Asset | `asset` | MP-21 | ✅ external | canonical_spec_module | 8,196 |
| MP-51 Attestation | `attestation` | MP-51 | ✅ external | cross_module_surface | 403 |
| MP-08 Audit | `audit` | MP-08 | ✅ inline | canonical_spec_module | 21,312 |
| MP-22 BCP | `bcp` | MP-22 | ✅ external | canonical_spec_module | 8,487 |
| MP-49 Benchmarks | `benchmarks` | MP-49 | ✅ external | cross_module_surface | 505 |
| MP-23 Bootstrap | `bootstrap` | MP-23 | ✅ external | platform_core_surface | 6,473 |
| MP-06 Compliance | `compliance` | MP-06 | ✅ inline | canonical_spec_module | 61,119 |
| MP-58 Config Center | `config-center` | MP-58 | ✅ external | platform_core_surface | 0 |
| MP-14 Controls | `controls` | MP-14 | ✅ inline | canonical_spec_module | 13,789 |
| MP-24 Dashboard | `dashboard` | MP-24 | ✅ external | canonical_spec_module | 13,896 |
| MP-52 Dashboard Editor | `dashboard-editor` | MP-52 | ✅ external | technical_support_surface | 338 |
| MP-25 DORA | `dora` | MP-25 | ✅ external | canonical_spec_module | 7,350 |
| MP-09 Evidence | `evidence` | MP-09 | ✅ inline | canonical_spec_module | 28,285 |
| MP-15 Exception | `exception` | MP-15 | ✅ inline | canonical_spec_module | 9,149 |
| MP-57 Executive | `executive` | MP-57 | ✅ external | technical_support_surface | 115 |
| MP-48 Fitch | `fitch` | MP-48 | ✅ external | technical_support_surface | 791 |
| MP-50 Foundation | `foundation` | (platform/DAuth) | ⚙️ platform | platform_core_surface | 5,025 |
| MP-51 Governance | `governance` | MP-04 | ✅ inline | product_bundle_or_hub | 37,493 |
| MP-52 Governance Ai | `governance-ai` | MP-26 | ✅ external | alias_or_duplicate_surface | 8,636 |
| MP-27 Governance OS | `governance-os` | MP-27 | ✅ external | alias_or_duplicate_surface | 12,307 |
| MP-53 GRC Query | `grc-query` | MP-53 | ✅ external | cross_module_surface | 254 |
| MP-29 Inbox | `inbox` | MP-29 | ✅ external | canonical_spec_module | 5,773 |
| MP-13 Incident | `incident` | MP-13 | ✅ inline | canonical_spec_module | 9,927 |
| MP-28 Integrations | `integrations` | MP-28 | ✅ external | canonical_spec_module | 10,987 |
| MP-30 Issues | `issues` | MP-30 | ✅ external | canonical_spec_module | 5,597 |
| MP-31 Journey | `journey` | MP-31 | ✅ external | canonical_spec_module | 9,318 |
| MP-47 Knowledge | `knowledge` | MP-47 | ✅ external | cross_module_surface | 1,704 |
| MP-32 KSA Regulatory | `ksa-regulatory` | MP-32 | ✅ external | canonical_spec_module | 9,565 |
| MP-33 Local Knowledge | `local-knowledge` | MP-33 | ✅ external | canonical_spec_module | 14,506 |
| MP-56 MCP | `mcp` | MP-56 | ✅ external | technical_support_surface | 172 |
| MP-45 Mobile | `mobile` | MP-45 | ✅ external | technical_support_surface | 4,404 |
| MP-57 Module Onboarding | `module-onboarding` | MP-01 | ✅ inline | alias_or_duplicate_surface | 328 |
| MP-34 Navigation | `navigation` | MP-34 | ⚙️ platform | platform_core_surface | 4,876 |
| MP-35 Notification | `notification` | MP-35 | ✅ external | canonical_spec_module | 7,335 |
| MP-01 Onboarding | `onboarding` | MP-01 | ✅ inline | canonical_spec_module | 22,432 |
| MP-58 Onboarding OS | `onboarding-os` | MP-01 | ✅ inline | alias_or_duplicate_surface | 11,916 |
| MP-55 Operating Cockpit | `operating-cockpit` | MP-55 | ✅ external | technical_support_surface | 220 |
| MP-36 Packs | `packs` | MP-36 | ✅ external | canonical_spec_module | 7,679 |
| MP-50 Platform Stats | `platform-stats` | MP-50 | ✅ external | technical_support_surface | 409 |
| MP-54 Playbooks | `playbooks` | MP-54 | ✅ external | product_bundle_or_hub | 233 |
| MP-07 Policy | `policy` | MP-07 | ✅ inline | canonical_spec_module | 20,582 |
| MP-62 Policy Impact | `policy-impact` | MP-07 | ✅ inline | alias_or_duplicate_surface | 401 |
| MP-37 Portals | `portals` | MP-37 | ✅ external | canonical_spec_module | 5,402 |
| MP-38 Privacy | `privacy` | MP-38 | ✅ external | canonical_spec_module | 7,283 |
| MP-39 Proactive Leadership | `proactive-leadership` | MP-39 | ✅ external | canonical_spec_module | 3,821 |
| MP-40 Provisioning | `provisioning` | MP-40 | ✅ external | platform_core_surface | 7,723 |
| MP-41 Qiyas | `qiyas` | MP-41 | ✅ external | canonical_spec_module | 12,979 |
| MP-42 Records | `records` | MP-42 | ✅ external | canonical_spec_module | 5,906 |
| MP-16 Remediation | `remediation` | MP-16 | ✅ inline | canonical_spec_module | 6,294 |
| MP-11 Reporting | `reporting` | MP-11 | ✅ inline | canonical_spec_module | 16,323 |
| MP-63 Reports | `reports` | MP-11 | ✅ inline | alias_or_duplicate_surface | 7,391 |
| MP-05 Risk | `risk` | MP-05 | ✅ inline | canonical_spec_module | 28,391 |
| MP-64 Security (FE) | `security` | (platform/DAuth) | ⚙️ platform | platform_core_surface | 909 |
| MP-46 Team | `team` | MP-46 | ✅ external | canonical_spec_module | 3,639 |
| MP-66 Training | `training` | MP-43 | ✅ external | canonical_spec_module | 8,707 |
| MP-10 Vendor | `vendor` | MP-10 | ✅ inline | canonical_spec_module | 14,298 |
| MP-67 Vendor Risk | `vendor-risk` | MP-10 | ✅ inline | alias_or_duplicate_surface | 3,082 |
| MP-44 Widgets | `widgets` | MP-44 | ✅ external | canonical_spec_module | 9,692 |
| MP-02 Workflow | `workflow` | MP-02 | ✅ inline | canonical_spec_module | 41,854 |
| MP-68 Workpapers | `workpapers` | MP-08 | ✅ inline | alias_or_duplicate_surface | 427 |

#### Module Patch Library Index (`DOS-AIO-Specs/`)

| Spec | Module | Patch File | Depth | Code Surfaces |
|------|--------|------------|-------|---------------|
| MP-01 | onboarding | `module-patch-01-onboarding-end-to-end.md` | inline+ext | `module-onboarding`, `onboarding`, `onboarding-os` |
| MP-02 | workflow | `module-patch-02-workflow-end-to-end.md` | inline+ext | `workflow` |
| MP-03 | ai | `module-patch-03-ai-end-to-end.md` | inline+ext | `ai` |
| MP-04 | governance | `module-patch-04-governance-end-to-end.md` | inline+ext | `governance` |
| MP-05 | risk | `module-patch-05-risk-end-to-end.md` | inline+ext | `risk` |
| MP-06 | compliance | `module-patch-06-compliance-end-to-end.md` | inline+ext | `compliance` |
| MP-07 | policy | `module-patch-07-policy-end-to-end.md` | inline+ext | `policy`, `policy-impact` |
| MP-08 | audit | `module-patch-08-audit-end-to-end.md` | inline+ext | `audit`, `workpapers` |
| MP-09 | evidence | `module-patch-09-evidence-end-to-end.md` | inline+ext | `evidence` |
| MP-10 | vendor | `module-patch-10-vendor-end-to-end.md` | inline+ext | `vendor`, `vendor-risk` |
| MP-11 | reporting | `module-patch-11-reporting-end-to-end.md` | inline+ext | `reporting`, `reports` |
| MP-12 | analytics | `module-patch-12-analytics-end-to-end.md` | inline+ext | `analytics` |
| MP-13 | incident | `module-patch-13-incident-end-to-end.md` | inline+ext | `incident` |
| MP-14 | controls | `module-patch-14-controls-end-to-end.md` | inline+ext | `controls` |
| MP-15 | exception | `module-patch-15-exception-end-to-end.md` | inline+ext | `exception` |
| MP-16 | remediation | `module-patch-16-remediation-end-to-end.md` | inline+ext | `remediation` |
| MP-17 | action | `module-patch-17-action-end-to-end.md` | external | `action` |
| MP-18 | admin | `module-patch-18-admin-end-to-end.md` | external | `admin` |
| MP-19 | agrc-engine | `module-patch-19-agrc-engine-end-to-end.md` | external | `agrc-engine` |
| MP-20 | ai-governance | `module-patch-20-ai-governance-end-to-end.md` | external | `ai-governance` |
| MP-21 | asset | `module-patch-21-asset-end-to-end.md` | external | `asset` |
| MP-22 | bcp | `module-patch-22-bcp-end-to-end.md` | external | `bcp` |
| MP-23 | bootstrap | `module-patch-23-bootstrap-end-to-end.md` | external | `bootstrap` |
| MP-24 | dashboard | `module-patch-24-dashboard-end-to-end.md` | external | `dashboard` |
| MP-25 | dora | `module-patch-25-dora-end-to-end.md` | external | `dora` |
| MP-26 | governance-ai | `module-patch-26-governance-ai-end-to-end.md` | external | `governance-ai` |
| MP-27 | governance-os | `module-patch-27-governance-os-end-to-end.md` | external | `governance-os` |
| MP-28 | integrations | `module-patch-28-integrations-end-to-end.md` | external | `integrations` |
| MP-29 | inbox | `module-patch-29-inbox-end-to-end.md` | external | `inbox` |
| MP-30 | issues | `module-patch-30-issues-end-to-end.md` | external | `issues` |
| MP-31 | journey | `module-patch-31-journey-end-to-end.md` | external | `journey` |
| MP-32 | ksa-regulatory | `module-patch-32-ksa-regulatory-end-to-end.md` | external | `ksa-regulatory` |
| MP-33 | local-knowledge | `module-patch-33-local-knowledge-end-to-end.md` | external | `local-knowledge` |
| MP-34 | navigation | `module-patch-34-navigation-end-to-end.md` | external | `navigation` |
| MP-35 | notification | `module-patch-35-notification-end-to-end.md` | external | `notification` |
| MP-36 | packs | `module-patch-36-packs-end-to-end.md` | external | `packs` |
| MP-37 | portals | `module-patch-37-portals-end-to-end.md` | external | `portals` |
| MP-38 | privacy | `module-patch-38-privacy-end-to-end.md` | external | `privacy` |
| MP-39 | proactive-leadership | `module-patch-39-proactive-leadership-end-to-end.md` | external | `proactive-leadership` |
| MP-40 | provisioning | `module-patch-40-provisioning-end-to-end.md` | external | `provisioning` |
| MP-41 | qiyas | `module-patch-41-qiyas-end-to-end.md` | external | `qiyas` |
| MP-42 | records | `module-patch-42-records-end-to-end.md` | external | `records` |
| MP-43 | training | `module-patch-43-training-end-to-end.md` | external | `training` |
| MP-44 | widgets | `module-patch-44-widgets-end-to-end.md` | external | `widgets` |
| MP-45 | mobile | `module-patch-45-mobile-end-to-end.md` | external | `mobile` |
| MP-46 | team | `module-patch-46-team-end-to-end.md` | external | `team` |
| MP-47 | knowledge | `module-patch-47-knowledge-end-to-end.md` | external | `knowledge` |
| MP-48 | fitch | `module-patch-48-fitch-end-to-end.md` | external | `fitch` |
| MP-49 | benchmarks | `module-patch-49-benchmarks-end-to-end.md` | external | `benchmarks` |
| MP-50 | platform-stats | `module-patch-50-platform-stats-end-to-end.md` | external | `platform-stats` |
| MP-51 | attestation | `module-patch-51-attestation-end-to-end.md` | external | `attestation` |
| MP-52 | dashboard-editor | `module-patch-52-dashboard-editor-end-to-end.md` | external | `dashboard-editor` |
| MP-53 | grc-query | `module-patch-53-grc-query-end-to-end.md` | external | `grc-query` |
| MP-54 | playbooks | `module-patch-54-playbooks-end-to-end.md` | external | `playbooks` |
| MP-55 | operating-cockpit | `module-patch-55-operating-cockpit-end-to-end.md` | external | `operating-cockpit` |
| MP-56 | mcp | `module-patch-56-mcp-end-to-end.md` | external | `mcp` |
| MP-57 | executive | `module-patch-57-executive-end-to-end.md` | external | `executive` |
| MP-58 | config-center | `module-patch-58-config-center-end-to-end.md` | external | `config-center` |

---


---

## Document Map

### Patch 0 — Common Enforcement Standard (lines 260–1218)

Shared rules inherited by every later patch. Read this first.

| § | Section | Line |
|---|---------|------|
| 0 | Patch Identity | 71 |
| 1 | Locked System Identity (names, packages, class naming) | 112 |
| 2 | Core Intent — control design, not inspire it | 176 |
| 3 | Maximum-Target Rule — always enterprise-grade, never MVP | 191 |
| 4 | **15 Shared Architecture Laws** (authoritative numbering) | 232 |
| 5 | 5-Layer Ownership Model (DOS, DAuth, Product, Module, AI/Agent) | 302 |
| 6 | Common Object Types | 379 |
| 7 | Mandatory Patch Structure for every future patch | 409 |
| 8 | Compare-and-Build Model | 493 |
| 9 | Shared Artifact Matrix | 513 |
| 10 | **Gap Classification Taxonomy** (9 types × 4 severities) | 536 |
| 11 | Shared Acceptance Model (PASS / CONDITIONAL PASS / FAIL) | 573 |
| 12 | Shared Agent Output Format (11 fields) | 605 |
| 13 | Shared Review Checklist | 630 |
| 14 | File and Folder Standards (soft 12, hard 15, redesign 25) | 646 |
| 15 | Shared Data Bucket Rules (5 buckets) | 669 |
| 16 | Shared Event Contract Rules | 697 |
| 17 | Shared Workflow and Lifecycle Rules | 721 |
| 18 | Shared UI and UX Rules | 741 |
| 19 | Shared Security and Control Rules | 759 |
| 20 | Shared Testing Rules | 774 |
| 21 | Shared As-Built Update Rule | 801 |
| 22 | Build This / Do Not Build This pattern | 817 |
| 23 | Shared Example Requirement | 849 |
| 24 | Common Patch Ordering Rule | 865 |
| 25 | Patch-Level Fail Conditions | 879 |
| 26 | Common Execution Instruction for Agents | 896 |
| 27 | Common Audit Instruction for Reviewers | 913 |
| 28 | Shared Platform-Wide Non-Negotiables | 929 |
| 29–34 | Acceptance, fail conditions, as-built, next patch, one-line instruction | 946–959 |

### DAuth / DOS Rebuild Design Freeze (lines 960–1917)

Canonical domain model and implementation contracts frozen before code begins.

| § | Section | Line |
|---|---------|------|
| 0 | Status | 962 |
| 1 | System Naming and Ownership | 969 |
| 2 | Rebuild Laws (mirrors Patch 0 §4) | 1024 |
| 3 | Canonical Domain Model (Identity, Profile, Access, Scope, Lifecycle, Delegation, SoD) | 1048 |
| 4 | Canonical Ownership Matrix (11 concerns) | 1127 |
| 5 | Canonical Runtime Tables (Identity, Foundation, Access, Lifecycle, Presentation) | 1145 |
| 6 | Table Classification + Migration Maps (§6.6 DAuth 18 tables, §6.7 DOS 2 tables, §6.8 Bucket math) | 1226 |
| 7 | Canonical Access Model (profiles, roles, permissions, authorities, 14-step formula) | 1335 |
| 8 | Canonical Scope Model (8 types, assignment shape, inheritance) | 1415 |
| 9 | Delegation Model (7 requirements, 5 sources, 5 rules) | 1461 |
| 10 | SoD Model (owner, inputs, outcomes, forbidden) | 1493 |
| 11 | Lifecycle Authorization Model | 1522 |
| 12 | Module Registration Contract | 1547 |
| 13 | Foundation Scope Contract | 1573 |
| 14 | Profile Contract | 1601 |
| 15 | Onboarding / Bootstrap Contract (10 steps) | 1625 |
| 16 | AI / Agent Auth Contract | 1651 |
| 17 | Frontend Consumption Contract | 1676 |
| 18 | Package and Naming Structure | 1710 |
| 19 | Forbidden Patterns | 1745 |
| 20 | File and Directory Budgets | 1762 |
| 21 | Implementation Order (Phase 0–9) | 1782 |
| 22 | Pre-Implementation Checks (14 items) | 1880 |
| 23 | Exit Criteria for Design Freeze | 1901 |

### Phase 0 — Complete Audit Report (lines 1918–2299)

Post-deletion baseline audit. What exists, what's broken, what's next.

| § | Section | Line |
|---|---------|------|
| 1 | Deletion Summary (724 files, 128,498 lines) | 1924 |
| 2 | Post-Deletion Codebase State | 1933 |
| 3 | Database Table Classification (1,066 tables → 5 buckets) | 1946 |
| 4 | Canonical Source Map (6 cross-cutting concerns) | 2100 |
| 5 | Duplicate & Broken Service Audit (§5B imports, §5C consolidation, §5D V2 death dates) | 2118 |
| 6 | Module Registration Contract (Frozen) | 2161 |
| 7 | Provisioning Pipeline Status (step 5 broken → fixed in Phase 0.5) | 2174 |
| 8 | Critical Path Broken Imports | 2202 |
| 9 | Immediate Action Items (Priorities 0–6) | 2210 |
| 10 | Risk Assessment (11 risks) | 2258 |
| 11 | Law Compliance Checklist (15 laws + §14 + §20) | 2274 |

### Agent Operating Pack (lines 2300–2897)

Phase prompts and agent instructions. Copy-paste into agent context per phase.

| Section | Line |
|---------|------|
| Global rules for every agent | 2302 |
| Agent role split (Explorer / Implementer / Reviewer) | 2352 |
| Full phase roadmap (Phase 0–9) | 2378 |
| Phase 0 — Freeze and classification | 2398 |
| Phase 0.5 — Hotfix: Unblock provisioning | 2436 |
| Phase 1A — Backend auth import migration | 2473 |
| Phase 1B — Session + auth middleware hardening | 2516 |
| Phase 2 — Access core | 2564 |
| Phase 3 — Scope and hierarchy | 2607 |
| Phase 4 — Delegation + SoD | 2647 |
| Phase 5 — Lifecycle auth | 2680 |
| Phase 6 — Frontend consumption | 2712 |
| Phase 7 — Onboarding/bootstrap | 2747 |
| Phase 8 — AI / agent auth | 2781 |
| Phase 9 — Hard delete of legacy | 2808 |
| Module-check prompt | 2844 |
| Review prompt | 2878 |

### Enterprise Rebuild Playbook §A–§AQ (lines 2898–4980)

Full production runbook. Reference during implementation and operations.

| § | Section | Line |
|---|---------|------|
| A | Purpose | 2900 |
| B | Locked Naming System | 2927 |
| C | System Ownership Model | 2986 |
| D | Enterprise Architecture Laws (mirrors Patch 0 §4) | 3037 |
| E | Enterprise Quality Bar | 3090 |
| F | Canonical Domain Model | 3117 |
| G | Canonical Runtime Tables and Buckets | 3197 |
| H | Canonical Service Boundaries (DAuth + DOS + Product) | 3371 |
| I | Canonical Request and Decision Flow (17 steps) | 3446 |
| J | Module Registration Contract | 3472 |
| K | Backend Package Layout Standard | 3509 |
| L | Frontend Package Layout Standard | 3552 |
| M | UI Shell and Experience Standards | 3603 |
| N | Security Standards | 3654 |
| O | API and Contract Standards | 3699 |
| P | Testing Standards | 3743 |
| Q | Observability and Audit Standards | 3794 |
| R | Review Gates and Acceptance Rules | 3838 |
| S | Full Delivery Phases (Phase 0–9 with completion criteria) | 3875 |
| T | Component Audit Template | 4006 |
| U | A-to-Z Platform Review Checklist | 4062 |
| V | Final Non-Negotiables | 4118 |
| W | Completion Condition | 4133 |
| X | Database Migration Standards | 4148 |
| Y | Environment & Deployment Standards | 4187 |
| Z | Error Handling & Recovery Model | 4241 |
| AA | Multi-Tenancy Standards | 4296 |
| AB | Inter-Service Communication Contract | 4340 |
| AC | Configuration & Secrets Management | 4376 |
| AD | Structured Logging Standard | 4420 |
| AE | Performance & Scaling Standards | 4465 |
| AF | Release & Versioning Standards | 4508 |
| AG | Incident Response Runbook | 4547 |
| AH | API Versioning & Deprecation | 4603 |
| AI | Internationalization Standards | 4631 |
| AJ | Data Integrity & Backup Standards | 4670 |
| AK | Compliance & Regulatory Standards | 4715 |
| AL | Disaster Recovery & Business Continuity | 4753 |
| AM | Capacity Planning & Limits | 4786 |
| AN | Dependency Management Standards | 4825 |
| AO | Code Style & Lint Standards | 4856 |
| AP | Documentation Standards | 4902 |
| AQ | Monitoring & Alerting Standards | 4932 |

### Patch 1 — Platform Full-Stack Core (lines 4981–6217)

DOS platform target model. What DOS must provide as first-class runtime.

| § | Section | Line |
|---|---------|------|
| 0 | Patch Identity | 4983 |
| 1 | Scope and Object Types | 5034 |
| 2 | Canonical Target Blueprint (2.1–2.11: tenancy, modules, provisioning, events, lifecycle, shell, config, observability, handover) | 5079 |
| 3 | Current-State Audit Method (3.1–3.8) | 5618 |
| 4 | Gap Classification | 5719 |
| 5 | Required Artifact Matrix | 5787 |
| 6 | Exact Build Instructions (6.1–6.8) | 5809 |
| 7 | Example Skeletons (7.1–7.5) | 5990 |
| 8 | Tests Required | 6065 |
| 9 | Review Checklist | 6102 |
| 10 | Acceptance Criteria | 6121 |
| 11 | Fail Conditions | 6152 |
| 12 | As-Built Update | 6167 |
| 13 | Agent Output Format | 6183 |
| 14 | Next: Patch 2 | 6204 |

### Patch 2 — Data / Schema / Contracts Stack (lines 6218–7433)

Five-bucket model, table ownership, contract families, migration rules.

| § | Section | Line |
|---|---------|------|
| 0 | Patch Identity | 6220 |
| 1 | Scope and Object Types | 6282 |
| 2 | Canonical Data Model Principles (2.1–2.7: schema boundary, five buckets, runtime/registry/presentation/provisioning/legacy laws) | 6326 |
| 3 | Canonical Ownership by Data Domain (3.1 DOS, 3.2 DAuth, 3.3 Product, 3.4 Shared) | 6452 |
| 4 | Canonical Bucket Definitions with Examples (4.1–4.5) | 6520 |
| 5 | Public Schema vs Tenant Schema Rules | 6722 |
| 6 | Required Contract Families (6.1 API, 6.2 Event, 6.3 Manifest, 6.4 Lifecycle, 6.5 UI) | 6763 |
| 7 | Required Type and Schema Standards | 6886 |
| 8 | Current-State Audit Method (8.1–8.6) | 6913 |
| 9 | Gap Classification | 7001 |
| 10 | Required Artifact Matrix | 7066 |
| 11 | Exact Build Instructions (11.1–11.6) | 7088 |
| 12 | Example Skeletons (12.1–12.5) | 7214 |
| 13 | Tests Required | 7292 |
| 14 | Review Checklist | 7324 |
| 15 | Acceptance Criteria | 7342 |
| 16 | Fail Conditions | 7372 |
| 17 | As-Built Update | 7386 |
| 18 | Agent Output Format | 7400 |
| 19 | Next: Patch 3 (DAuth / Security / Control Spine) | 7421 |
| 20 | One-Line Use Instruction | 7431 |

### Patch 3 — DAuth / Security / Control Spine (lines 7657–9257)

Full DAuth target model. Identity, sessions, access, scope, authority, delegation, SoD, lifecycle auth, middleware, frontend contracts, audit.

| § | Section | Line |
|---|---------|------|
| 0 | Patch Identity | 7659 |
| 1 | Scope and Object Types (1.1–1.4) | 7713 |
| 2 | Canonical DAuth Target Blueprint | 7773 |
| 2.1–2.2 | DAuth responsibilities (A–K: identity, auth, MFA, access, scope, authority, delegation, SoD, lifecycle, middleware, audit) + ownership boundaries | 7775 |
| 2.3–2.4 | Required backend + frontend package layout | 7935 |
| 2.5 | Required DAuth tables (identity, access, scope, authority, delegation, SoD, review/audit) | 8062 |
| 2.6 | Required DAuth services (identity, sessions, MFA, access, scope, authority, delegation, SoD, lifecycle, middleware, audit) | 8136 |
| 2.7 | Required APIs and contracts (API families, contract categories, canonical auth error model) | 8217 |
| 2.8 | Required access model (access profiles, functional roles, permissions, authorities, scope, experience) | 8268 |
| 2.9 | Required scope model (hierarchy, resolution law, adapters) | 8347 |
| 2.10 | Required authority model (concepts, artifacts, law) | 8370 |
| 2.11 | Required delegation model (support, law, decision outputs) | 8393 |
| 2.12 | Required SoD model (support, law, minimum decisions) | 8425 |
| 2.13 | Required lifecycle authorization model (purpose, outputs, law) | 8453 |
| 2.14 | Required backend middleware (canonical set, behavior rules) | 8484 |
| 2.15 | Required frontend consumption contracts (core, law, access snapshot) | 8512 |
| 2.16 | Required audit architecture (minimums, law) | 8536 |
| 3 | Current-State Audit Method (3.1–3.11: namespace, tables, identity, access, scope, authority, delegation, SoD, lifecycle, frontend, audit) | 8570 |
| 4 | Gap Classification (4.1–4.9) | 8688 |
| 5 | Required Artifact Matrix | 8763 |
| 6 | Exact Build Instructions (6.1–6.11: session, identity, access, scope, authority, delegation, SoD, lifecycle, middleware, frontend, audit) | 8785 |
| 7 | Example Skeletons (7.1–7.5) | 9017 |
| 8 | Tests Required (8.1–8.4) | 9103 |
| 9 | Review Checklist | 9165 |
| 10 | Acceptance Criteria (10.1–10.4) | 9169 |
| 11 | Fail Conditions | 9193 |
| 12 | As-Built Update | 9209 |
| 13 | Agent Output Format | 9225 |
| 14 | Next: Patch 4 (Product Stack) | 9245 |
| 15 | One-Line Use Instruction | 9255 |

### Patch 4 — Product Stack (lines 10484–11468)

Product target model. How products consume DOS + DAuth without redefining them.

| § | Section | Line |
|---|---------|------|
| 0 | Patch Identity | 10486 |
| 1 | Scope and Object Types | 10530 |
| 2 | Canonical Product Target Blueprint (2.1–2.12: responsibilities, ownership, layout, manifest, contracts, defaults, data, events, provisioning, admin, observability) | 10570 |
| 3–13 | Audit, gaps, build, examples, tests, review, acceptance, fail, as-built, agent format | 10900+ |
| 14 | Next: Patch 5 (Product Server Stack) | 11454 |
| 15 | One-Line Use Instruction | 11464 |

### Patch 5 — Product Server Stack (lines 11469–11670)

Product server internals: routes, controllers, services, repositories, event integration, jobs.

| Key Sections | Line |
|--------------|------|
| Purpose + Scope | 11471 |
| Product server definition + ownership | 11485 |
| Backend layout + contracts + routes + controllers + services + repos | 11510 |
| Event + workflow + provisioning integration | 11570 |
| Admin, diagnostics, jobs | 11600 |
| Audit, build, tests, acceptance, fail | 11630 |

### Patch 6 — Module Stack (lines 11671–11920)

Module internals: manifest, data ownership, APIs, services, events, lifecycle, admin, tests.

| Key Sections | Line |
|--------------|------|
| Purpose + Scope | 11673 |
| Module definition + ownership | 11690 |
| Backend + frontend package layout | 11720 |
| Manifest, data, routes, services, repos, events, workflow, admin, tests | 11750 |
| Audit, build, tests, acceptance, fail | 11870 |

### Patch 7 — Workflow Stack (lines 11921–12849)

Workflow engine target model: definitions, states, transitions, assignments, approvals, SLA, events, recovery, UI.

| § | Section | Line |
|---|---------|------|
| 0 | Patch Identity | 11923 |
| 1 | Scope and Object Types | 11967 |
| 2 | Canonical Workflow Target Blueprint (2.1–2.13: responsibilities, ownership, layout, definitions, states, transitions, assignments, approvals, SLA, events, recovery, UI) | 12010 |
| 3–13 | Audit, gaps, build, examples, tests, review, acceptance, fail, as-built, agent format | 12400+ |
| 14 | Next: Patch 8 (AI Agent Stack) | 12835 |
| 15 | One-Line Use Instruction | 12845 |

---

# Patch 0 — Common Enforcement Standard

## 0. Patch Identity

### 0.1 Patch name

**Patch 0 — Common Enforcement Standard**

### 0.2 Patch class

This is a **Reusable Enforcement Patch**.

It is not only a design note.
It is simultaneously:

* target-state specification
* audit specification
* implementation specification
* review specification
* handover specification

### 0.3 Patch purpose

This patch defines the shared rules, object model, naming, ownership, document method, comparison method, gap method, implementation method, acceptance method, and handover method that every later patch must inherit.

No later patch may contradict this patch.
If a later patch needs an exception, that exception must be explicit, justified, and approved.

### 0.4 Patch role in the patch library

Every later patch depends on this patch.
This patch exists to stop:

* repetition
* ambiguity
* architecture drift
* inconsistent build instructions
* agents inventing missing content
* audit disagreements
* low-quality “good enough” interpretation

---

## 1. Locked System Identity

### 1.1 Canonical names

* **Platform Operating System:** Dogan-AI-OS
* **Platform short name:** DOS
* **Authentication and Authorization System:** Dogan-Auth
* **Auth short name:** DAuth
* **Product reference example:** Shahin-AI

### 1.2 Naming law

* DOS is the reusable platform core.
* DAuth is the only platform auth, access, control, authority, delegation, and SoD spine.
* Shahin-AI is a product that runs on DOS and consumes DAuth.

### 1.3 Ownership naming rule

Anything platform-generic belongs to DOS.
Anything identity/access/control/security belongs to DAuth.
Anything product-specific belongs to a product namespace such as Shahin-AI.

### 1.4 Package namespace rule

#### Backend allowed roots

* `backend/src/platform/dos/`
* `backend/src/platform/dauth/`
* `backend/src/products/shahin-ai/`

#### Frontend allowed roots

* `frontend/src/app/core/dos/`
* `frontend/src/app/core/dauth/`
* `frontend/src/app/products/shahin-ai/`

### 1.5 Class naming rule

Within a properly namespaced package, class names must be clean and technical.

Allowed examples:

* `TokenService`
* `SessionService`
* `AccessResolver`
* `AccessSnapshotService`
* `ScopeResolver`
* `DelegationService`
* `SodEngine`
* `LifecycleAuthService`
* `AuthGuard`
* `ModuleGuard`

Forbidden examples:

* `GrcAuthService`
* `EnterpriseAuthzService`
* `FallbackPerms`
* `LegacyPermissionResolver`
* `RBACv2Engine`
* `WorkspacePermissionGuard`

---

## 2. Core Intent of the Entire Documentation System

This patch library exists so that any agent, reviewer, architect, or implementation team can take a target object and determine:

1. what the object should be
2. what the object currently is
3. what is missing or wrong
4. what exactly must be added or changed
5. what proves completion

This patch library is not meant to inspire design.
It is meant to **control design, implementation, review, and handover**.

---

## 3. Maximum-Target Rule

### 3.1 Permanent rule

The target state is always **maximum-featured, enterprise-grade, future-complete, and decade-ahead**.

### 3.2 Forbidden framing

Do not frame any patch as:

* MVP
* minimal
* lightweight
* basic version
* placeholder version
* temporary architecture
* good enough for now

### 3.3 Allowed framing

Design must always describe the full final target, including:

* multi-tenant support
* multi-product support
* multi-module support
* multilingual/RTL support
* workflow and lifecycle depth
* auditability
* event-driven integration
* AI/agent compatibility
* settings/admin depth
* operability and handover quality
* enterprise-grade UI/admin/operator surfaces

### 3.4 Delivery rule

Phasing is allowed only to control rollout quality.
Phasing is never allowed to reduce design ambition.

---

## 4. Shared Architecture Laws

### Law 1 — One canonical engine per concern

No runtime twins. No fallback duplicates. No “v2 beside v1” runtime truth.

### Law 2 — One canonical owner per concern

Every cross-cutting concern must have one owner.
Examples:

* auth = DAuth
* org hierarchy = DOS foundation
* product defaults = product layer
* workflow transition auth = DAuth lifecycle auth

### Law 3 — Data-driven security

Permissions, roles, actions, approval rules, ownership rules, and SoD rules must come from canonical registries or typed module registration contracts.

### Law 4 — No frontend-invented truth

Frontend may render or cache truth. Frontend may not define auth truth, permission truth, role truth, or scope truth.

### Law 5 — Generic lifecycle engine

Lifecycle/state transition rules must use a shared engine with module/domain definitions, not copy-pasted services per domain.

### Law 6 — Real scope only

Scope must resolve from DOS structure and ownership models, not fake workspace shortcuts or UI-only grouping.

### Law 7 — No stubs in runtime tree

No empty files, fake placeholders, dead shells, or skeleton modules in production trees.

### Law 8 — Deprecation requires death date

Any deprecated item must include removal date, removal version, owner, and replacement.

### Law 9 — Organize by concern, not pattern

No junk-drawer `middleware/`, `services/`, or `utils/` directories that mix unrelated concerns.

### Law 10 — No permanent migration mode

No permanent shadow mode, dual mode, legacy+new mode, or compare-only mode.

### Law 11 — Deny by default

If access, authority, scope, or lifecycle cannot be resolved safely, the system denies.

### Law 12 — Audit by default

Every sensitive action or decision must be reconstructable.

### Law 13 — No scope widening in execution

An execution pass must not broaden itself without explicit approval.

### Law 14 — No PASS with missing required items

If required items are incomplete, final decision is FAIL.

### Law 15 — Product removable principle

Products must be removable without breaking DOS or DAuth.

---

## 5. Ownership Model

### 5.1 DOS owns

* tenancy
* products and modules as platform constructs
* provisioning infrastructure
* organization/foundation hierarchy
* team/position/people structure ownership at platform level
* generic lifecycle/state-machine framework
* event backbone
* shell/navigation/layout core
* observability infrastructure
* platform settings and admin core

### 5.2 DAuth owns

* identity
* sessions
* tokens
* MFA
* actor model
* memberships
* access profiles
* functional roles
* permissions
* permission resolution
* scope resolution
* authorities
* delegation
* separation of duties
* lifecycle authorization
* access snapshot
* auth middleware and auth-facing frontend consumption contracts
* auth decision audit

### 5.3 Product layer owns

* product defaults
* product-owned modules
* product dashboards
* product workflows
* product policies
* product feature composition
* product-specific AI behavior

### 5.4 Module layer owns

* module manifest
* module domain model
* module APIs
* module events
* module lifecycle definitions
* module UX and views
* module registration metadata

### 5.5 AI/agent layer owns

* agent registry
* agent runtime
* acting-on-behalf-of chains
* tool orchestration
* agent control surfaces
* agent-specific workflow participation

### 5.6 Ownership violation types

Every patch must detect if a concern is:

* correct owner
* wrong owner
* split owner without approval
* duplicated owner
* ownerless

---

## 6. Common Object Types

Every later patch must explicitly state which object types it governs.

### Standard object types

* platform core object
* product object
* product server object
* module object
* workflow object
* lifecycle object
* event contract object
* API contract object
* data/schema object
* foundation/org object
* team/staffing object
* profile/experience object
* AI/agent object
* UI feature object
* UI component object
* dynamic UI object
* settings/admin object
* provisioning/bootstrap object
* operations/handover object

For each patch, object types must be explicit.

---

## 7. Mandatory Patch Structure for Every Future Patch

Every patch must follow this structure exactly.

### 7.1 Patch identity

* patch number
* patch name
* patch class
* patch objective

### 7.2 Scope and object types

* what this patch governs
* what objects it applies to
* what is explicitly out of scope

### 7.3 Canonical target blueprint

For object X, define:

* ownership
* boundaries
* required files/folders
* required services
* required contracts
* required tables
* required APIs
* required events
* required workflows/lifecycle
* required UI/admin surfaces
* required logs/audit
* required tests

### 7.4 Audit method

Tell the agent exactly how to inspect object X:

* where to look
* what to verify
* what evidence counts
* what indicates drift

### 7.5 Gap classification

Every gap must be labeled using the shared taxonomy in Section 10.

### 7.6 Build instructions

For each gap type, define exactly:

* what to create
* what to update
* what to migrate
* what to merge
* what to archive later
* what not to touch

### 7.7 Example skeletons

Every patch must include examples of:

* file layout
* service shape
* contract shape
* API shape
* event payload
* lifecycle/state transition if relevant
* test shape

### 7.8 Acceptance criteria

Define exact pass requirements.

### 7.9 Fail conditions

Define exact reject conditions.

### 7.10 As-built update instructions

Explain what must be recorded into the as-built handover ledger.

---

## 8. Shared Comparison-and-Build Model

Every patch must let an agent do three things:

### 8.1 Compare

Compare current object X against canonical target X.

### 8.2 Classify

Classify all differences.

### 8.3 Close the gap

Implement or specify bounded changes to reach target X.

This is the core patch behavior.

---

## 9. Shared Artifact Matrix

Every later patch must describe its target objects using this artifact matrix.

### Required artifact categories

* files and folders
* services
* repositories or data access layer if relevant
* contracts and schemas
* database tables
* APIs/routes/endpoints
* events/payloads/subscriptions
* workflows/lifecycle definitions
* UI features/components/admin surfaces
* logs/audit entries
* tests
* documentation/as-built updates

If a patch does not map its objects against this matrix, it is incomplete.

---

## 10. Shared Gap Classification Taxonomy

All later patches must use this same taxonomy.

### 10.1 Gap types

* **Missing** — required artifact does not exist
* **Incomplete** — artifact exists but required behavior is missing
* **Duplicate** — more than one artifact/engine owns the same runtime concern
* **Wrong Owner** — concern implemented under the wrong layer/namespace
* **Wrong Layer** — concern exists in product/module/UI when it belongs in DOS/DAuth or vice versa
* **Legacy Carryover** — artifact comes from old architecture and should not remain runtime truth
* **Forbidden Pattern** — artifact violates architecture laws
* **Production Blocker** — artifact gap blocks stable runtime or safe production behavior
* **Handover Blocker** — artifact gap prevents clean support/operations/audit handover
* **Drift** — implementation deviates from canonical target model without approval

### 10.2 Severity levels

* **P0** — runtime or production-blocking
* **P1** — security, control, or architectural critical
* **P2** — major quality/completeness issue
* **P3** — moderate improvement needed
* **P4** — minor or future housekeeping item

### 10.3 Mandatory reporting rule

Every gap must include:

* gap type
* severity
* owner
* patch that should close it
* evidence

---

## 11. Shared Acceptance Model

Every patch must define completion using the same evaluation categories.

### 11.1 Required acceptance categories

* ownership correct
* architecture laws satisfied
* required artifacts present
* runtime behavior correct
* auditability present
* tests added/run where required
* no forbidden patterns introduced
* as-built update completed

### 11.2 Result classes

* **PASS** — all required items satisfied
* **PASS WITH DEFERRED ITEMS** — only if deferred items are explicitly allowed by patch scope and do not violate required items
* **FAIL** — any required item missing, wrong, unsafe, or scope-drifted

### 11.3 PASS restriction

A patch may never pass if:

* required items are missing
* forbidden patterns were reintroduced
* scope widened without approval
* runtime truth remains duplicated in the area governed by the patch

---

## 12. Shared Agent Output Format

All agents must return the same output structure, regardless of patch.

### Required output format

1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files Inspected
5. Files Changed
6. Tables / Contracts / Events Affected
7. What Was Built / Fixed
8. What Was Explicitly Not Changed
9. Gap Classification
10. Tests / Validation Run
11. Remaining Risks
12. Final Decision
13. Recommended Next Part
14. As-Built Update Required

Any later patch must enforce this format.

---

## 13. Shared Review Checklist

Every reviewer must check:

* Did the agent stay within patch scope?
* Did the agent implement against the patch blueprint rather than inventing alternatives?
* Are all required artifact classes covered?
* Are all gaps correctly classified?
* Were any forbidden patterns introduced?
* Was the acceptance model applied strictly?
* Was the as-built update identified?

If any answer is no, decision is FAIL.

---

## 14. Shared File and Folder Standards

### 14.1 File-count budget

* soft cap for flat directory: 12 files
* hard cap for flat directory: 15 files
* above 15 requires sub-ownership split
* above 25 requires redesign approval

### 14.2 Folder design rules

Folders must be grouped by concern, not by accidental implementation pattern.

### 14.3 File rules

* no empty stubs
* no dead exports
* no unowned barrels
* no vague `misc`/`helper` dumping for core logic
* no product logic in DOS or DAuth core without contract justification

---

## 15. Shared Data Bucket Rules

Every patch that references tables must classify them using the shared bucket model.

### Bucket 1 — Canonical runtime truth

Allowed to participate directly in runtime decisions.

### Bucket 2 — Registry metadata

Defines metadata/registration inputs, not direct runtime truth.

### Bucket 3 — Presentation/runtime config

Controls UI/runtime experience, not security or ownership truth.

### Bucket 4 — Provisioning/seed input

Used to create or activate runtime state.

### Bucket 5 — Legacy/archive-only

Must not participate in the new runtime.

No patch may blur these buckets.

---

## 16. Shared Event Contract Rules

Any later patch that uses events must enforce:

* event namespace ownership
* event payload schema
* actor/tenant/module correlation fields
* idempotency expectations
* sequencing expectations where needed
* retry/dead-letter behavior where needed
* publish vs subscribe ownership
* audit relevance of sensitive events

Events must be explicitly classified as:

* domain event
* platform event
* control/security event
* lifecycle event
* operational event
* integration event

---

## 17. Shared Workflow and Lifecycle Rules

Any later patch dealing with workflows or state transitions must define:

* states
* actions
* transitions
* permission requirements
* authority requirements
* self-approval rule
* SoD rule
* delegation rule
* audit rule
* event emission rule
* failure/recovery rule

No workflow patch may rely on vague “status update” logic without explicit state model.

---

## 18. Shared UI and UX Rules

Any later patch dealing with UI must define:

* component hierarchy
* feature/page structure
* loading/empty/error states
* access-aware rendering rules
* accessibility requirements
* bilingual/RTL requirements
* shell integration rules
* audit/status disclosure rules

UI may consume truth.
UI may not define truth.

---

## 19. Shared Security and Control Rules

Every later patch must assume:

* deny by default
* audit by default
* no hidden privileged paths
* no auth logic hidden in UI
* no state-changing action without lifecycle/authority consideration where relevant
* no delegation bypass
* no agent bypass
* no product-specific reimplementation of DAuth concerns

---

## 20. Shared Testing Rules

Every later patch must declare required tests.

### Test classes

* unit tests
* contract tests
* integration tests
* E2E tests where critical path requires
* property/state-machine tests where appropriate

### Test ownership rule

Tests must live beside the concern or in a clearly owned concern-level test location.

### Minimum test declaration

Each patch must state:

* what must be unit-tested
* what must be contract-tested
* what must be integration-tested
* what must be smoke-validated

---

## 21. Shared As-Built Update Rule

Every later patch must update the as-built handover ledger with:

* what target object was addressed
* what files were created/changed
* what tables/contracts/events were added/changed
* what runtime behavior is now live
* what remains missing
* what deviations exist
* what handover implications exist

No patch is complete without explicit as-built update instruction.

---

## 22. Shared “Build This / Do Not Build This” Pattern

Every later patch must contain two explicit sections.

### 22.1 Build This

List exact items to build or add:

* file paths
* service names
* contract names
* table expectations
* event payloads
* APIs
* UI components
* tests

### 22.2 Do Not Build This

List exact forbidden alternatives:

* duplicate engines
* frontend permission truth
* local role maps as authority
* broad compatibility shims
* hidden bypasses
* placeholder services
* dead shells
* product code inside platform core

---

## 23. Shared Example Requirement

Every later patch must include examples for at least:

* file/folder layout
* one service skeleton
* one contract/schema example
* one API example if relevant
* one event example if relevant
* one workflow/lifecycle example if relevant
* one test example

Examples must be concrete enough that an agent can mirror them.

---

## 24. Common Patch Ordering Rule

Later patch order must reduce dependency drift.
Shared rules and canonical contracts must appear before dependent implementation patches.

This patch does not itself lock final patch numbering, but any patch order must ensure that:

* shared rules are defined before dependent domains
* data/contracts are defined before consumers
* DAuth is defined before consumers of auth truth
* product/module/UI/admin patches consume the already-frozen shared standards

---

## 25. Patch-Level Fail Conditions

A later patch automatically fails if it:

* omits the required patch structure
* omits the artifact matrix
* omits gap taxonomy
* omits build instructions
* omits examples
* omits acceptance criteria
* omits fail conditions
* omits as-built update instructions
* reintroduces forbidden patterns
* mixes runtime truth with display/registry/legacy surfaces without explicit classification

---

## 26. Common Execution Instruction for Agents

When using any later patch, the agent must operate in this order:

1. read Patch 0
2. read the target patch
3. identify the target object(s)
4. inspect current implementation for those object(s)
5. classify gaps using shared taxonomy
6. implement or recommend changes only within the target patch scope
7. validate using target patch acceptance criteria
8. prepare required as-built update

No other order is acceptable.

---

## 27. Common Audit Instruction for Reviewers

When reviewing any later patch execution, the reviewer must verify:

* correct target patch used
* Patch 0 rules applied
* gaps properly classified
* all required artifacts addressed
* no scope widening
* no substitute architecture invented
* acceptance criteria truly met
* fail conditions respected
* as-built update identified

---

## 28. Shared Platform-Wide Non-Negotiables

1. DOS is the only platform operating system
2. DAuth is the only auth/control spine
3. Products consume DOS and DAuth
4. No duplicate runtime truth
5. No fallback permission chain
6. No frontend auth truth
7. No stub files
8. No permanent dual migration modes
9. No PASS with missing required items
10. No design shrinkage to “minimum”
11. Final target is maximum-featured and future-complete
12. Every patch must support compare → classify → build → review → handover

---

## 29. What This Patch Enables

Because of this patch, every future patch must be able to do the following in practice:

* take platform core object X and compare current vs target
* take product object X and compare current vs target
* take product server object X and compare current vs target
* take module object X and compare current vs target
* take workflow object X and compare current vs target
* take UI feature object X and compare current vs target
* take AI agent object X and compare current vs target
* take settings/admin object X and compare current vs target

Then for each object X, the patch must let the agent:

* see what is missing
* know what to add
* know what to update
* know what to leave alone
* know what tests to add
* know what makes it pass or fail

This is the core success condition of the patch library.

---

## 30. Acceptance Criteria for Patch 0

Patch 0 passes only if:

* naming is locked
* ownership is locked
* architecture laws are explicit
* patch structure is frozen
* gap taxonomy is frozen
* output format is frozen
* acceptance model is frozen
* as-built update rule is frozen
* maximum-target rule is explicit
* later patches can inherit this patch without ambiguity

---

## 31. Fail Conditions for Patch 0

Patch 0 fails if:

* it remains descriptive only
* it does not define comparison-and-build usage
* it does not define shared structure for later patches
* it allows ambiguity on ownership
* it allows ambiguity on gap types
* it allows ambiguity on pass/fail
* it allows “minimum” target thinking
* it does not support reusable standalone patch behavior

---

## 32. As-Built Update Rule for Patch 0

The as-built handover ledger must record that:

* Common Enforcement Standard is established
* all future patches must follow its structure
* all future audits and implementations must use its gap taxonomy and acceptance model
* any exception must be documented as an architecture exception

---

## 33. Recommended Next Patch

After Patch 0, the next patch should be:

**Patch 1 — Platform Full-Stack Core**

It must inherit all rules in Patch 0 and apply them to the platform core object model.

---

## 34. One-Line Use Instruction

Use Patch 0 first, then use the target patch, then compare target object X against the patch blueprint, classify the gap, implement the bounded fix, validate against pass/fail rules, and update the as-built ledger.
# DAuth / DOS Rebuild Design Freeze

## 0. Status

Draft v0.1
Scope: Greenfield rebuild of platform identity, access, scope, authority, delegation, SoD, lifecycle authorization, and activation contracts after large-scale deletion of legacy auth / RBAC / role / foundation / team / profile surfaces.

---

## 1. System Naming and Ownership

### 1.1 Canonical names

* **Platform operating system:** Dogan-AI-OS
* **Platform short name:** DOS
* **Authentication and authorization system:** Dogan-Auth
* **Auth short name:** DAuth
* **Product example:** Shahin-AI

### 1.2 Ownership split

#### DOS owns

* tenancy and workspace/platform operating context
* organization/foundation structure
* product and module enablement
* shared lifecycle framework
* shared eventing and observability
* onboarding/provisioning infrastructure
* shell/navigation/layout runtime

#### DAuth owns

* identity and authentication
* sessions, refresh, revocation, MFA
* actor registry
* tenant membership evaluation
* access profiles
* functional roles
* permissions
* role-permission mappings
* scope resolution
* decision authorities
* delegation
* SoD
* lifecycle authorization
* access snapshot resolver
* auth decision audit

#### Shahin-AI owns

* product modules and product defaults
* product action catalogs
* product approval policies
* product-specific dashboards and role displays
* product-specific onboarding presets
* product-specific agent behaviors

### 1.3 Non-negotiable boundary rule

Shahin-AI must remain removable tomorrow without breaking DOS or DAuth.

---

## 2. Rebuild Laws

Authoritative numbering is Patch 0 §4. This section mirrors it exactly.

### Law 1 — One canonical engine per concern
### Law 2 — One canonical owner per concern
### Law 3 — Data-driven security
### Law 4 — No frontend-invented truth
### Law 5 — Generic lifecycle engine
### Law 6 — Real scope only
### Law 7 — No stubs in runtime tree
### Law 8 — Deprecation requires death date
### Law 9 — Organize by concern, not pattern
### Law 10 — No permanent migration mode
### Law 11 — Deny by default
### Law 12 — Audit by default
### Law 13 — No scope widening in execution
### Law 14 — No PASS with missing required items
### Law 15 — Product removable principle

File-count budgets and test co-location are enforced in Patch 0 §14 and §20 respectively.

---

## 3. Canonical Domain Model

### 3.1 Identity

Identity answers: who is the principal?

#### Principal types

* human user
* agent
* service account
* external actor

#### Canonical entities

* user
* actor
* session
* identity provider link
* MFA method
* refresh token family
* revoked token entry
* email verification token
* password reset token

### 3.2 Profile

Profile answers: what human/business metadata enriches the actor?

#### Profile includes

* full name
* job title
* reports-to chain
* competencies
* preferences
* availability
* profile completeness
* dashboard and workspace preferences

#### Profile does not include

* permission truth
* direct effective permission grants
* lifecycle authority truth

### 3.3 Access

Access answers: what can the actor do?

#### Split access into four concepts

1. **Access profile** — broad platform posture
2. **Functional role** — scoped module/domain role
3. **Decision authority** — approve/override/publish/close/etc.
4. **Experience metadata** — landing/dashboard/widget defaults

### 3.4 Scope

Scope answers: where can the actor act?

#### Canonical scope hierarchy

Tenant → Organization → Business Unit / Division → Department → Section → Team → Position → Actor/User

### 3.5 Lifecycle authorization

Lifecycle authorization answers: can the actor perform this transition in this state?

### 3.6 Delegation

Delegation answers: may the actor temporarily act on behalf of another principal in bounded scope/time/action?

### 3.7 SoD

SoD answers: does the current combination of roles/authorities violate separation-of-duties policy?

---

## 4. Canonical Ownership Matrix

| Concern                  | Runtime Owner                       | Inputs Allowed                                                      | Not Allowed                              |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| Identity                 | DAuth                               | DOS tenant context, external IdP adapters                           | Product-specific auth logic              |
| Sessions                 | DAuth                               | identity service, DOS tenant context                                | frontend token truth                     |
| Profile                  | DOS profile layer                   | user metadata, org metadata, experience settings                    | permission truth                         |
| Org hierarchy            | DOS foundation                      | org/team/position structure                                         | workspace-only fake scope                |
| Access evaluation        | DAuth                               | access profiles, functional roles, permissions, scopes, authorities | frontend maps, fallback perms            |
| SoD                      | DAuth                               | module SoD definitions, foundation org context                      | independent module SoD engines           |
| Delegation               | DAuth                               | delegation policies, availability, team/foundation data             | hidden agent-only delegation paths       |
| Lifecycle auth           | DAuth                               | module lifecycle definitions, approval matrix inputs                | ad hoc route-level logic                 |
| Module security metadata | Module                              | actions, permissions, roles, approval rules, ownership defaults     | module-local effective permission engine |
| Onboarding seed          | DOS onboarding/provisioning + DAuth | tenant/user/org bootstrap data                                      | separate temporary auth model            |
| Frontend visibility      | frontend core via AccessStore       | access snapshot                                                     | hardcoded grants                         |

---

## 5. Canonical Runtime Tables

### 5.1 Identity & actor

* `users`
* `tenant_user_memberships`
* `actor_registry`
* `user_profiles_extended`
* `user_preferences` (rename from `user_preferences_v2` after legacy archived — Law 11)
* `user_competencies`
* `user_availability`
* `sessions` (create in Phase 1 if not exists)
* `refresh_tokens` (create in Phase 1 if not exists)
* `token_blacklist` (create in Phase 1 if not exists)
* `identity_provider_links` (create in Phase 1 if not exists)
* `email_verification_tokens`
* `password_reset_tokens`
* `user_mfa_methods`
* `login_attempts` (keep — DAuth rate/security)
* `tenant_sso_config` (keep — DAuth identity)

### 5.2 Foundation scope

* `organizations`
* `business_units`
* `departments`
* `sections`
* `locations` (keep — DOS foundation)
* `teams`
* `team_members`
* `positions`
* `org_hierarchy_nodes`
* `org_hierarchy_edges`
* `org_dimensions` (keep — multi-dimensional org)
* `org_dimension_values` (keep — dimension values)
* `governance_bodies`
* `governance_committees` (keep separate from governance_bodies — subtype)
* `governance_committee_members` (keep — committee membership)
* `governance_reporting_lines`
* `governance_responsibility_assignments`
* `governance_raci_assignments`
* `legal_entities` (keep — DOS foundation)
* `person_profiles` (DOS profile layer)
* `member_profiles` (DOS profile layer)
* `member_lifecycle_events` (DOS foundation lifecycle)

### 5.3 Access core

* `access_profiles`
* `functional_roles`
* `permissions`
* `role_permissions`
* `actor_access_assignments`
* `actor_role_assignments`
* `decision_authorities`
* `delegation_chains`
* `delegation_policies`
* `sod_rules`
* `product_user_entitlements`
* `org_unit_role_assignments`
* `authz_decision_log` (consolidate `authorization_decision_log` + `guard_decision_log` into this — Law 1)
* `mv_user_effective_permissions` or equivalent generated resolver source

### 5.4 Lifecycle auth

* lifecycle definition table(s)
* lifecycle states
* lifecycle transitions
* lifecycle transition permission/authority rules
* approval matrix registry

### 5.5 Presentation/runtime config (not access truth)

* dashboard layouts
* widget registry
* role profiles / role experience
* workspace profile UX settings
* dashboard bindings

---

## 6. Table Classification Rules

Every existing table must be classified into one of five buckets before implementation:

1. **Canonical runtime truth**
2. **Registry metadata source**
3. **Presentation / experience runtime**
4. **Provisioning / seed input**
5. **Legacy / archive-only**

### 6.1 Runtime truth candidates

* `tenant_user_memberships`
* `actor_registry`
* `access_profiles`
* `functional_roles`
* `actor_access_assignments`
* `actor_role_assignments`
* `decision_authorities`
* `sod_rules`
* `user_profiles_extended`
* `product_user_entitlements`
* org scope tables

### 6.2 Registry metadata candidates

* `module_role_definitions`
* `module_permissions`
* `module_actions`
* `module_approval_matrices`
* `module_ownership_rules`
* `module_sod_rules`
* `module_activation_rules`

### 6.3 Presentation/runtime candidates

* `role_experience_profiles`
* `role_profiles` (presentation, not access truth)
* `dashboard_registry`
* `dashboard_layout_registry`
* `dashboard_role_bindings` (rename from `dashboard_role_bindings_v2` after legacy archived — §20)
* `widget_registry`
* `dashboard_layouts`
* `drawer_templates`

### 6.4 Provisioning/seed candidates

* workspace seed tables/services
* onboarding answers used only during activation
* plan template tables
* quick-start templates

### 6.5 Archive-only candidates

* superseded legacy role/function tables once cutover is complete
* stale duplicated dashboard/widget registry generations
* legacy permission compatibility structures

### 6.6 Current → Target Table Migration Map (DAuth Bucket 1B)

These 18 current tables need disposition before Phase 2 completes:

| Current Table | Disposition | Target | Phase |
|---------------|------------|--------|-------|
| `user_role_assignments` | **Rename** | `actor_role_assignments` | Phase 2 |
| `user_access_profiles` | **Rename** | `actor_access_assignments` | Phase 2 |
| `enterprise_user_role_assignments` | **Merge** into `actor_role_assignments` | — | Phase 2 |
| `role_assignment_history` | **Keep** as audit trail | `role_assignment_history` | — |
| `roles` (tenant) | **Rename** | `functional_roles` | Phase 2 |
| `role_functions` (tenant) | **Archive** | — | Phase 9 |
| `role_function_map` (tenant) | **Rename** | `role_permissions` | Phase 2 |
| `role_function_scope_map` | **Archive** — absorbed by scope model | — | Phase 9 |
| `role_defense_line_mappings` | **Archive** | — | Phase 9 |
| `role_team_mapping` | **Archive** — absorbed by `org_unit_role_assignments` | — | Phase 9 |
| `authority_levels` | **Merge** into `decision_authorities` | — | Phase 2 |
| `authority_matrix` (tenant) | **Merge** into `decision_authorities` | — | Phase 2 |
| `authorization_decision_log` | **Merge** into `authz_decision_log` — Law 1 | — | Phase 2 |
| `guard_decision_log` | **Merge** into `authz_decision_log` — Law 1 | — | Phase 2 |
| `delegated_authorities` | **Merge** into `delegation_chains` | — | Phase 4 |
| `delegation_rules` | **Rename** | `delegation_policies` | Phase 4 |
| `delegations` | **Merge** into `delegation_chains` | — | Phase 4 |
| `sign_off_authority_matrix` | **Merge** into `decision_authorities` | — | Phase 2 |

### 6.7 Current → Target Table Migration Map (DOS Bucket 1C extras)

These 2 current tables need Law 1 resolution:

| Current Table | Disposition | Target | Phase |
|---------------|------------|--------|-------|
| `raci_assignments` | **Merge** into `governance_raci_assignments` — Law 1 | — | Phase 3 |
| `raci_matrices` | **Merge** into `governance_raci_assignments` — Law 1 | — | Phase 3 |

### 6.8 Bucket Math Reconciliation

| Bucket | Count |
|--------|-------|
| 1 — Runtime truth | ~820 (14 DAuth public + 32 DAuth tenant + 25 DOS foundation + 15 DOS platform + ~700 Shahin-AI + ~34 uncounted platform/shared) |
| 2 — Registry metadata | ~90 |
| 3 — Presentation | ~37 |
| 4 — Provisioning/seed | ~54 |
| 5 — Legacy/archive | 28 |
| **Classified total** | **~1,029** |
| **Stated total** | **1,066** |
| **Gap** | **~37** — these are Shahin-AI domain tables included in the ~700 estimate but not individually listed; the ~700 is approximate |

The ~37 gap is within the Shahin-AI ~700 approximation. No tables are structurally unclassified.

---

## 7. Canonical Access Model

### 7.1 Access profiles

Access profiles define broad operating posture.

Examples:

* `platform_super_admin`
* `tenant_admin`
* `module_admin`
* `standard_user`
* `viewer`
* `external_auditor`
* `service_account`

### 7.2 Functional roles

Functional roles are module/domain-scoped job roles.

Examples:

* `risk_owner`
* `policy_author`
* `policy_approver`
* `auditor`
* `evidence_reviewer`
* `team_lead`
* `committee_secretary`
* `ai_governance_reviewer`

### 7.3 Permissions

Use one standard only:

`module.resource.action`

Examples:

* `risk.record.read`
* `risk.record.submit`
* `risk.record.approve`
* `policy.document.publish`
* `evidence.item.verify`
* `audit.finding.close`
* `team.member.delegate`

### 7.4 Decision authorities

Examples:

* `approve_low`
* `approve_high`
* `publish_policy`
* `close_finding`
* `override`
* `accept_risk`
* `escalate`

### 7.5 Effective decision formula

A sensitive action is allowed only if all of the following pass:

* actor authenticated
* session valid
* tenant membership valid
* tenant active
* product enabled
* module enabled
* access profile allows shell posture
* functional role grants permission
* scope matches
* authority level sufficient
* SoD passes
* lifecycle transition allowed
* delegation/ownership rules pass
* decision logged

---

## 8. Canonical Scope Model

### 8.1 Scope types

* tenant
* organization
* business_unit
* department
* section
* team
* position
* resource

### 8.2 Assignment shape

Every role assignment must contain:

* actor id
* role code
* scope type
* scope id
* valid from
* valid to
* primary yes/no
* inherited yes/no
* delegable yes/no
* source

### 8.3 Scope inheritance rules

* tenant scope flows downward to all org levels
* organization scope flows to BU/department/section/team/position
* BU scope flows to department/section/team/position
* department scope flows to section/team/position
* section scope flows to team/position
* team scope flows to team members for explicitly allowed actions only
* no hidden frontend inheritance

### 8.4 Scope providers

* Foundation provides canonical structure
* Team provides membership and staffing overlays
* DAuth resolves effective scope from canonical sources only

---

## 9. Delegation Model

### 9.1 Requirements

Delegation must be:

* time-bounded
* scope-bounded
* action-bounded
* role-bounded
* authority-aware
* SoD-checked
* auditable

### 9.2 Delegation sources

* user availability
* team delegate actions
* delegation chains
* delegation policies
* agent delegation flows

### 9.3 Rules

* no implicit infinite delegation
* no delegation that expands beyond delegator rights
* no delegation bypassing approval matrices
* no agent-only special path
* delegation resolution runs inside DAuth, not in feature pages

---

## 10. SoD Model

### 10.1 Canonical owner

DAuth owns runtime SoD evaluation.

### 10.2 Allowed inputs

* module SoD definitions
* org hierarchy context
* team membership context
* delegation context
* lifecycle action context

### 10.3 SoD outcomes

* block
* warn
* escalate
* allow with audit reason

### 10.4 Forbidden

* duplicate SoD detector services acting as independent truth
* UI-layer SoD decisions
* module-local independent SoD engines

---

## 11. Lifecycle Authorization Model

### 11.1 Principle

Permission is necessary but not sufficient for state transitions.

### 11.2 Transition decision inputs

* current state
* target state
* module/entity type
* permission
* decision authority
* ownership rules
* approval matrix rule
* SoD status
* delegation status
* escalation status

### 11.3 Implementation direction

Build one generic lifecycle auth engine that reads registered lifecycle definitions and approval matrices.

---

## 12. Module Registration Contract

Each module may define metadata for:

* roles
* permissions
* actions
* approval matrix entries
* ownership rules
* SoD rules
* lifecycle definitions
* experience metadata

### 12.1 Module registration output

DAuth ingests module metadata into canonical registries.

### 12.2 Modules may not

* compute effective permissions independently
* expose separate runtime permission engines
* ship independent role-priority auth logic
* define frontend-only access truth

---

## 13. Foundation Scope Contract

Foundation is the canonical provider for:

* organizations
* business units
* departments
* sections
* teams
* positions
* committees
* governance responsibilities
* RACI templates/assignments
* ownership mappings

### 13.1 Foundation does not own

* token/session auth
* permission truth
* lifecycle authorization truth
* agent auth truth

### 13.2 DAuth dependency on Foundation

DAuth resolves scope against Foundation entities and structural relationships.

---

## 14. Profile Contract

### 14.1 Profile owners

DOS profile layer owns enrichment, not permission truth.

### 14.2 Profile can contribute to

* role recommendation
* experience/layout selection
* completeness enforcement
* onboarding progress
* staffing and delegation hints
* competency-based suggestion systems

### 14.3 Profile cannot directly decide

* effective permission grant
* lifecycle transition rights
* SoD overrides
* module entitlement

---

## 15. Onboarding / Bootstrap Contract

### 15.1 Bootstrap sequence

1. create tenant
2. create first user
3. create actor record
4. create tenant membership
5. create base org / org pack seed
6. create base profile/workspace settings
7. assign initial access profile
8. assign initial functional role(s)
9. enable default product/modules
10. issue initial access snapshot

### 15.2 Bootstrap restrictions

Bootstrap must not:

* invent a temporary second auth system
* permanently bypass SoD
* create fake workspace-admin semantics disconnected from org scope
* depend on legacy role maps or frontend permission truth

---

## 16. AI / Agent Auth Contract

### 16.1 Principle

Agents are actors under DAuth, not special superusers.

### 16.2 Required checks for agent actions

* agent actor exists
* initiating principal trace exists
* acting-on-behalf-of chain valid
* permission exists
* scope valid
* authority valid
* human approval requirement satisfied if needed
* decision logged

### 16.3 Forbidden

* direct tool execution without access evaluation
* hidden agent-wide bypass roles
* separate agent-only permission engine

---

## 17. Frontend Consumption Contract

### 17.1 Canonical frontend surfaces

All live under `core/dauth/`. Class names use neutral names per §18.3. Frontend uses `SessionService` (not `AuthSessionService`) — the `core/dauth/` package path provides the auth namespace.

* `SessionService` (session state, login/logout, token refresh)
* `AccessStore` (access snapshot, permission checks)
* `AuthInterceptor` (attach token to HTTP requests)
* `CsrfInterceptor` (CSRF token handling)
* `AuthGuard` (route-level identity check)
* `OnboardingGuard` (bootstrap readiness check)
* `ModuleGuard` (module entitlement check)
* `AdminGuard` (admin-only route check)
* optional action visibility helper consuming `AccessStore`

### 17.2 Frontend may keep

* labels
* badges
* role displays
* staffing views
* widgets and dashboard hints

### 17.3 Frontend may not keep as truth

* hardcoded permission grants
* role-priority access shortcuts
* full-access role shortcuts
* duplicated permission maps
* alternate module visibility truth

---

## 18. Package and Naming Structure

### 18.1 Backend

```text
backend/src/platform/dos/
backend/src/platform/dauth/
backend/src/products/shahin-ai/
```

### 18.2 Frontend

```text
frontend/src/app/core/dos/
frontend/src/app/core/dauth/
frontend/src/app/products/shahin-ai/
```

### 18.3 Class naming rule

Use neutral class names inside namespaced packages.

Examples:

* `SessionService`
* `AccessResolver`
* `ScopeResolver`
* `DelegationService`
* `SodEngine`
* `LifecycleAuthService`

Do not recreate brand-leaking class names like `GrcAuthService` or `EnterpriseAuthzService`.

---

## 19. Forbidden Patterns

* `v2` runtime twins
* fallback permission chains
* frontend hardcoded permission maps as truth
* role-priority full-access shortcuts
* route-level raw role comparisons
* module-local effective permission engines
* duplicate SoD engines
* duplicate lifecycle engines per module when generic engine suffices
* stub guards / empty files / placeholder services
* giant flat `middleware/` or `services/` junk drawers
* permanent shadow/dual migration modes
* product-specific auth logic in DOS or DAuth core

---

## 20. File and Directory Budgets

### 20.1 Hard budgets

* flat directory soft cap: 12 files
* flat directory hard cap: 15 files
* over 15 requires sub-ownership split
* over 25 requires redesign approval

### 20.2 Test organization

* co-locate service/unit tests with source
* contract/integration tests grouped by concern, not dumped flat

### 20.3 No empty shells

Delete empty directories and shells during every cutover pass.

---

## 21. Implementation Order

### Phase 0 — Classification and freeze

* classify all remaining relevant tables/files
* confirm canonical runtime truth set
* confirm archive set
* freeze contracts

### Phase 0.5 — Hotfix: Unblock provisioning (before Phase 1)

* Rewrite `seed_org_structure` step — inline org-pack-seeding logic or create minimal `platform/dos/foundation/org-pack-seeding.service.ts` (Law 9)
* Fix `server-routes.ts` — remove deleted foundation/team route mounts (§20)
* Fix `agrc-route-manifest.ts` — remove deleted foundation/team route refs (§20)
* Delete hollow `modules/foundation/` directory — §20 (§22 #12)
* This is P0 — no tenant can provision until fixed. Must not wait for Phase 3.

### Phase 1 — Identity/session spine (DAuth)

* `dauth/identity/`: login, refresh, revoke, MFA, actor registry — Law 1, Law 9
* `dauth/session/`: `SessionService`, `TokenService` — Law 1
* Create/verify session tables: `sessions`, `refresh_tokens`, `token_blacklist`, `identity_provider_links` — (§22 #9)
* Auth middleware inside `dauth/` — Law 9 (not flat `middleware/`)
* Fix 505 broken auth middleware imports + 2 `config/jwt.ts` imports — §20
* Co-locate tests: `SessionService.test.ts` beside `SessionService.ts` — §20

### Phase 2 — Access core (DAuth)

* `dauth/access/`: `AccessResolver`, permissions, role-permission mappings, snapshot resolver — Law 1
* Consolidate 5 permission services → 1 `AccessResolver` — Law 1, Law 3 (§5C)
* Consolidate 3 event bus services → 1 canonical DOS event bus — Law 1 (§5C)
* Consolidate 3 audit log tables → 1 `authz_decision_log` — Law 1 (§22 #11)
* Absorb `permission-inheritance.service.ts` into `AccessResolver` — Law 3
* Move `module-security-seeder.service.ts` to `platform/dauth/` — Law 9 (§22 #13)
* Execute DAuth table renames/merges per §6.6 migration map (18 tables)
* Fix 4 broken `platform/rbac/` imports — §20
* Runtime truth reads from DB registry tables — Law 3
* Remove RBAC v2 migration file — §20 (§5D)

### Phase 3 — Scope and hierarchy (DOS + DAuth)

* `dos/foundation/`: organization/team/position scope, ownership rules — Law 9
* Move `actor-identity.service.ts` to `dos/profile/` — Law 9
* Expand org-pack-seeding from Phase 0.5 hotfix into full DOS foundation service — Law 1
* Fix 31 broken foundation + 9 broken team imports — §20
* Create `sections` table if missing (Design Freeze §8.1)
* Resolve duplicate staffing/lifecycle UI components → one generic lifecycle + one staffing tab — Law 5 (§22 #4)
* Merge `raci_assignments` + `raci_matrices` into `governance_raci_assignments` — Law 1 (§6.7)
* Remove operation mode v2 migration file — §20 (§5D)
* No directory above 15 files — §14

### Phase 4 — Delegation and SoD (DAuth)

* `dauth/delegation/`: `DelegationService` — Law 1
* Consolidate 7 delegation services → 1 canonical — Law 1, Law 3 (§5C)
* Execute delegation table merges per §6.6: `delegated_authorities` + `delegations` → `delegation_chains`, `delegation_rules` → `delegation_policies`
* `dauth/sod/`: `SodEngine` — built from scratch, critical gap — Law 1
* Time/scope/action-bounded, SoD-checked delegation — Design Freeze §9
* **All broken imports must be resolved by end of Phase 5** — §20

### Phase 5 — Lifecycle auth (DAuth)

* `dauth/lifecycle/`: `LifecycleAuthService` — Law 1
* Reads registered lifecycle definitions from DOS generic FSM — Law 5
* One engine, parameterized by entity/module — not per-module copies — Law 5

### Phase 6 — Frontend consumption

* `core/dauth/`: `AccessStore`, `AuthGuard`, `OnboardingGuard`, `ModuleGuard`, `AdminGuard` — §14
* `AuthInterceptor`, `CsrfInterceptor` — Law 1
* Frontend reads access snapshot only — no hardcoded permission maps — §14
* Remove V2 dashboard migration — §20 (§5D)

### Phase 7 — Onboarding/bootstrap (DOS + DAuth)

* 10-step canonical bootstrap sequence — Design Freeze §15
* No temporary second auth system — Design Freeze §15.2
* Remove V2 onboarding migration — §20 (§5D)

### Phase 8 — AI integration (DAuth)

* Agent actors under DAuth, not special superusers — Design Freeze §16
* acting-on-behalf-of chain validation, scope/approval checks
* No hidden agent-wide bypass roles — Design Freeze §16.3

### Phase 9 — Hard delete of legacy compatibility

* DROP 28 legacy DB tables — §20 (§5D)
* DROP archived tables from §6.6: `role_functions` (tenant), `role_function_scope_map`, `role_defense_line_mappings`, `role_team_mapping` — §20
* Rename `user_preferences_v2` → `user_preferences` — §20 (§22 #14)
* Rename `dashboard_role_bindings_v2` → `dashboard_role_bindings` — §20 (§22 #14)
* Remove remaining V2 migration files — Law 8, §20
* Delete all duplicate service files marked for deletion in §5C
* Remove any remaining broken imports, dead exports, hollow shells — §20
* Final directory budget audit — §14

---

## 22. Immediate Pre-Implementation Checks

| # | Check | Owner | Law | Status |
|---|-------|-------|-----|--------|
| 1 | Classify all 1,066 tables into five buckets | DOS + DAuth | — | **DONE** (§3) |
| 2 | Identify one canonical source for permissions, profiles, lifecycle, SoD, delegation, events | DAuth + DOS | Law 3 | **DONE** (§4) |
| 3 | Resolve duplicated dashboard/widget registries → keep `dashboard_registry` + `dashboard_widget_registry`, archive rest | DOS | Law 1 | Phase 6 |
| 4 | Resolve duplicate staffing/lifecycle UI components → generic lifecycle engine + one staffing tab | DOS | Law 5 | Phase 3 |
| 5 | Remove 3 empty style stubs (`icon-3d.css`, `premium-pages.css`, `landing-template.scss`) | DOS | §20 | Phase 6 |
| 6 | Consolidate 3 event + 7 delegation + 5 permission services → per §5C plan | DAuth + DOS | Law 1, Law 3 | Phase 2–4 |
| 7 | Freeze module registration schema (`ModuleManifest`) | DOS | Law 3 | **DONE** (§6) |
| 8 | Freeze onboarding bootstrap seed path (10 steps) | DOS + DAuth | — | **DONE** (§7/§15) |
| 9 | Create/verify 4 session tables (`sessions`, `refresh_tokens`, `token_blacklist`, `identity_provider_links`) | DAuth | Law 1 | Phase 1 |
| 10 | Complete current→target table migration map (18 DAuth + 2 DOS tables) | DAuth + DOS | Law 1 | **DONE** (§6.6/§6.7) |
| 11 | Consolidate 3 audit log tables → 1 `authz_decision_log` | DAuth | Law 1 | Phase 2 |
| 12 | Delete hollow `modules/foundation/` directory | DOS | §20 | Phase 0.5 |
| 13 | Move `module-security-seeder.service.ts` to `platform/dauth/` | DAuth | Law 9 | Phase 2 |
| 14 | Rename `user_preferences_v2` → `user_preferences`, `dashboard_role_bindings_v2` → `dashboard_role_bindings` | DOS + DAuth | §20 | Phase 9 |

---

## 23. Exit Criteria for Design Freeze

This freeze is complete when:

* ownership matrix is accepted
* canonical hierarchy is accepted
* canonical identity/access/scope/authority split is accepted
* module registration contract is accepted
* onboarding/bootstrap contract is accepted
* frontend consumption contract is accepted
* forbidden patterns are accepted
* implementation order is accepted

Only after that should code, migrations, or rebuild work begin.

---

# Phase 0 — Complete Audit Report

**Date:** 2026-03-29
**Scope:** Post-deletion baseline audit of DOS/DAuth/Shahin-AI rebuild
**Commits covered:** `b38c23a11` (auth), `df9166e44` (roles/RBAC/lifecycle/profile/org/team), `d3e2523bc` (cleanup)

## 1. Deletion Summary

| Round | What | Files | Lines |
|-------|------|-------|-------|
| 1 | Auth system (middleware, guards, interceptors, services) | 102 | 15,758 |
| 2 | Roles, RBAC, Lifecycle, Profile, Org Structure, Team | 619 | 112,680 |
| 3 | Phase 0 cleanup (shims, barrel exports, empty dirs) | 3 + 41 exports | ~60 |
| **Total** | | **724 files** | **128,498 lines** |

## 2. Post-Deletion Codebase State

| Metric | Count |
|--------|-------|
| Backend .ts files remaining | 3,702 |
| Frontend .ts files remaining | 2,206 |
| Backend modules remaining | 49 (foundation hollow, team removed) |
| Frontend features remaining | 51 (foundation removed, team removed) |
| Empty directories (cleaned) | 34 removed, 0 remain |
| Database tables (public) | 307 (21 retired, 1 backup) |
| Database tables (tenant) | 759 (1 retired, 6 legacy) |
| **Total database tables** | **1,066** |

## 3. Database Table Classification (1,066 tables → 5 buckets)

### Bucket 1: Canonical Runtime Truth (~820 tables)

#### 1A — DAuth Identity & Auth (Public Schema)

| Table | Owner | Note |
|-------|-------|------|
| `users` | DAuth | |
| `tenant_user_memberships` | DAuth | |
| `email_verification_tokens` | DAuth | |
| `password_reset_tokens` | DAuth | |
| `user_mfa` | DAuth | Rename to `user_mfa_methods` in target (§5.1) |
| `login_attempts` | DAuth | Added to target §5.1 |
| `roles` | DAuth | Public schema copy — evaluate merge with tenant `functional_roles` in Phase 2 |
| `role_functions` | DAuth | |
| `role_function_map` | DAuth | |
| `function_authorities` | DAuth | |
| `authority_matrix` | DAuth | Merge into `decision_authorities` in Phase 2 (§6.6) |
| `sessions` | DAuth | **Create in Phase 1 if not exists** |
| `refresh_tokens` | DAuth | **Create in Phase 1 if not exists** |
| `token_blacklist` | DAuth | **Create in Phase 1 if not exists** |
| `identity_provider_links` | DAuth | **Create in Phase 1 if not exists** |
| `tenant_sso_config` | DAuth | Added to target §5.1 |
| `user_function_overrides` | DAuth |
| `rate_limit_hits` | DAuth |
| `tenant_sso_config` | DAuth |

#### 1B — DAuth Access & Authorization (Tenant Schema)

| Table | Owner |
|-------|-------|
| `access_profiles` | DAuth |
| `functional_roles` | DAuth |
| `permissions` | DAuth |
| `role_permissions` | DAuth |
| `user_role_assignments` | DAuth |
| `user_access_profiles` | DAuth |
| `enterprise_user_role_assignments` | DAuth |
| `role_assignment_history` | DAuth |
| `roles` | DAuth |
| `role_profiles` | DAuth |
| `role_functions` | DAuth |
| `role_function_map` | DAuth |
| `role_function_scope_map` | DAuth |
| `role_defense_line_mappings` | DAuth |
| `role_team_mapping` | DAuth |
| `authority_levels` | DAuth |
| `authority_matrix` | DAuth |
| `authorization_decision_log` | DAuth |
| `authz_decision_log` | DAuth |
| `guard_decision_log` | DAuth |
| `delegated_authorities` | DAuth |
| `delegation_rules` | DAuth |
| `delegations` | DAuth |
| `sod_rules` | DAuth |
| `sod_conflict_log` | DAuth |
| `sod_conflict_matrix` | DAuth |
| `sign_off_authority_matrix` | DAuth |
| `access_review_campaigns` | DAuth |
| `access_review_items` | DAuth |
| `invitations` | DAuth |
| `external_user_scopes` | DAuth |
| `tenant_security_config` | DAuth |

#### 1C — DOS Foundation/Scope (Tenant Schema)

| Table | Owner |
|-------|-------|
| `organizations` | DOS |
| `business_units` | DOS |
| `departments` | DOS |
| `sections` | DOS |
| `locations` | DOS |
| `teams` | DOS |
| `team_members` | DOS |
| `positions` | DOS |
| `org_hierarchy_nodes` | DOS |
| `org_hierarchy_edges` | DOS |
| `org_dimensions` | DOS |
| `org_dimension_values` | DOS |
| `governance_bodies` | DOS |
| `governance_committees` | DOS |
| `governance_committee_members` | DOS |
| `governance_reporting_lines` | DOS |
| `governance_responsibilities` | DOS |
| `governance_responsibility_assignments` | DOS |
| `governance_raci_assignments` | DOS |
| `raci_assignments` | DOS |
| `raci_matrices` | DOS |
| `person_profiles` | DOS |
| `member_profiles` | DOS |
| `member_lifecycle_events` | DOS |
| `legal_entities` | DOS |

#### 1D — DOS Platform (Public + Tenant)

| Table | Owner |
|-------|-------|
| `tenants` | DOS |
| `platform_products` | DOS |
| `product_modules` | DOS |
| `tenant_module_entitlements` | DOS |
| `tenant_settings` | DOS |
| `subscriptions` | DOS |
| `tier_definitions` | DOS |
| `workspaces` | DOS |
| `workspace_profile` | DOS |
| `modules` | DOS |
| `module_workflow_registry` | DOS |
| `module_lifecycle_definitions` | DOS |
| `module_lifecycle_transitions` | DOS |
| `feature_flags` | DOS |
| `settings` | DOS |

#### 1E — Shahin-AI Product Domain (~700 tables)

Risk (~25), Controls (~30), Evidence (~25), Audit (~25), Policy (~15), Compliance (~15), Incident (~15), Vendor (~25), BCP (~10), Workflow (~35), AI/Agent (~50), Qiyas (~50), Governance (~40), Integration (~20), Reporting (~10), Privacy (~10), Training (~10), Process/Task (~10), other operational tables.

### Bucket 2: Registry Metadata (~90 tables)

* 30 regulatory framework/control tables (public)
* 47 `lookup_*` reference data tables (public)
* 10 ontology/taxonomy tables (public)
* Module registration tables (tenant)

### Bucket 3: Presentation/Experience (~37 tables)

* Dashboard: `dashboard_configs`, `dashboard_layouts`, `dashboard_registry`, `dashboard_role_bindings`, `dashboard_widget_registry`, `widget_registry`
* Navigation: `navigation_registry`, `navigation_overrides`, `navigation_role_bindings`
* Activity: `activity_feed`, `activity_notifications`, `activity_stream`, `comments`, `messages`
* Preferences: `user_preferences`, `notification_preferences`, `notification_queue`
* UI: `drawer_templates`, `saved_views`, `command_palette_history`, `contextual_suggestions`

### Bucket 4: Provisioning/Seed (~54 tables)

* 24 `onboarding_*` tables (public)
* 5 `provisioning_*` tables (public)
* Seed: `startup_checklists`, `seed_history`, `seeding_depth_config`, `tenant_blueprints`
* Tenant: `workspace_seeds`, `pack_installations`, `ninety_day_plans`, `plan_item_instances`

### Bucket 5: Legacy/Archive (28 tables — DELETE)

| # | Table | Schema |
|---|-------|--------|
| 1–21 | `_retired_*` (20) + `_backup_*` (1) | public |
| 22 | `_retired_dashboard_overrides_v1` | tenant |
| 23 | `action_items_legacy` | tenant |
| 24 | `automation_rules_legacy` | tenant |
| 25 | `dashboard_configs_legacy` | tenant |
| 26 | `notification_preferences_legacy` | tenant |
| 27 | `permissions_legacy` | tenant |
| 28 | `role_permissions_legacy` | tenant |

## 4. Canonical Source Map (6 Cross-Cutting Concerns)

| Concern | Canonical Owner | Current Survivor | Lines | Status | Rebuild Action |
|---------|----------------|-----------------|-------|--------|----------------|
| **Permissions** | DAuth | `platform/services/permission-inheritance.service.ts` | 113 | Intact | Absorb into `AccessResolver` (Phase 2) — Law 1 |
| **Profiles** | DOS | `platform/services/actor-identity.service.ts` | 396 | Intact | Move to `platform/dos/profile/` (Phase 3) — Law 9 |
| **Lifecycle** | DOS | `platform/state-machine/entity-state-machine.ts` | 146 | Intact | Keep as generic FSM — Law 5 |
| **SoD** | DAuth | — | 0 | **CRITICAL GAP** | Build `SodEngine` from scratch (Phase 4) — Law 1 |
| **Delegation** | DAuth | `governance/services/governance-delegations.service.ts` | 285 | Intact | Migrate logic into DAuth `DelegationService`, delete 6 duplicates (Phase 4) — Law 1, §5C |
| **Events** | DOS | `platform/events/event-catalog.ts` + `event-bus-publisher.ts` | ~120 | Intact | Consolidate 3 event services → 1 (Phase 2) — Law 1, §5C |

### SoD Gap Detail

* All SoD shim files deleted
* DB tables exist: `sod_rules`, `sod_conflict_log`, `sod_conflict_matrix`
* No runtime evaluation logic survives
* Must be rebuilt from scratch in DAuth

## 5. Duplicate & Broken Service Audit

### 5A — Fixed in Phase 0

| Issue | Action |
|-------|--------|
| 2 broken SoD re-export shims | Deleted |
| 41 broken foundation/team exports in barrel file | Removed |
| 34 empty directories | Removed |

### 5B — Known Broken Imports — Remediation Schedule (§20)

No broken import may persist past Phase 5.

| Category | Files Affected | Fix Phase | Replacement |
|----------|---------------|-----------|-------------|
| Importing deleted auth middleware | **505 files** | Phase 1–2 | DAuth `authenticate()` middleware |
| Importing deleted `middleware/` (all) | **1,669 references** | Phase 1–3 | DAuth + DOS concern-based middleware |
| Importing deleted `foundation/` module | **31 files** | Phase 3 | DOS `platform/dos/foundation/` |
| Importing deleted `team/` module | **9 files** | Phase 3 | DOS `platform/dos/foundation/` |
| Importing deleted `platform/rbac/` | **4 files** | Phase 2 | DAuth `AccessResolver` |
| Importing deleted `config/jwt.ts` | **2 files** | Phase 1 | DAuth `TokenService` |

### 5C — Remaining Duplicates — Consolidation Plan (Law 1, Law 3)

Each concern below must collapse to **one canonical service** by its listed deadline phase.

| Concern | Keep (canonical) | Merge into canonical | Delete | Owner | Deadline |
|---------|-----------------|---------------------|--------|-------|----------|
| **Event bus** | `event-bus.service.ts` (DOS) | `grc-event-bus.service.ts` → merge product events into canonical | `event-bus-publisher.ts` → inline into canonical | DOS | Phase 2 |
| **Delegation** | `DelegationService` (DAuth, new) | `governance-delegations` → migrate logic to DAuth | `delegation-engine`, `delegation-automation`, `delegation-rules`, `agent-delegation`, `agent-to-agent-delegation`, `seed-delegations` → delete after migration | DAuth | Phase 4 |
| **Permissions** | `AccessResolver` (DAuth, new) | `permission-inheritance` → absorb into DAuth resolver | `permission-analytics` → Shahin-AI analytics module, `playbook-permissions` → delete, `widget-permission` → delete (§14), `ai-permission-recommender` → Shahin-AI AI module | DAuth | Phase 2 |

### 5D — Remaining V2 / Legacy — Death Dates (Law 8, §20)

| Item | Type | Removal Owner | Removal Date | Replacement |
|------|------|--------------|--------------|-------------|
| Dashboard v2 migration | V2 migration | DOS | Phase 6 (frontend) | Canonical dashboard_registry |
| Operation mode v2 migration | V2 migration | DOS | Phase 3 (scope) | Canonical workspace_profile |
| Onboarding v2 migration | V2 migration | DOS | Phase 7 (bootstrap) | Canonical provisioning pipeline |
| RBAC v2 migration | V2 migration | DAuth | Phase 2 (access core) | Canonical DAuth access tables |
| 28 legacy DB tables | Legacy tables | DOS | Phase 9 (cleanup) | Already superseded — DROP |

## 6. Module Registration Contract (Frozen)

### 6.1 Existing Contract: `ModuleManifest`

**Location:** `backend/src/modules/_shared/module-manifest.types.ts`
**Registry:** `backend/src/modules/_shared/module-registry.ts`

Key fields: `code`, `version`, `tier`, `routeBase`, `eventNamespace`, `tablePrefix`, `ownedTables`, `publishedEvents`, `consumedEvents`, `hardDeps`, `softDeps`, `provisioningOrder`

### 6.2 Freeze Decision

The existing `ModuleManifest` contract is sufficient. DAuth will read manifests at startup, ingest security metadata into canonical registries, and resolve permissions/roles/SoD at runtime from registry tables.

## 7. Provisioning Pipeline Status

### 7.1 Critical Break: Step `seed_org_structure`

**BROKEN** — imports from deleted foundation module:

```
import { seedTenantFromPack, recommendPack }
  from '../../../foundation/services/org-pack-seeding.service';
```

No tenant can be provisioned until this is fixed.

### 7.2 Bootstrap Sequence Status

| # | Design Freeze Step | Status |
|---|-------------------|--------|
| 1 | Create tenant | OK |
| 2 | Create first user | OK |
| 3 | Create actor record | OK |
| 4 | Create tenant membership | OK |
| 5 | Create base org / org pack | **BROKEN** |
| 6 | Create base profile/workspace | OK |
| 7 | Assign initial access profile | OK |
| 8 | Assign initial functional roles | OK |
| 9 | Enable default products/modules | OK |
| 10 | Issue initial access snapshot | OK |

## 8. Critical Path Broken Imports

| File | Imports From | Impact |
|------|-------------|--------|
| `seed-core-steps.ts` | `foundation/services/org-pack-seeding.service` | **Provisioning blocked** |
| `server-routes.ts` | `foundation/routes/bulk-invite.routes`, `foundation/routes/org-structure-admin.routes` | **Server startup route mounting** |
| `agrc-route-manifest.ts` | `foundation/routes/*`, `team/routes/*` | Product route manifest |

## 9. Immediate Action Items

### Priority 0: Unblock Provisioning

* Rewrite `seed_org_structure` step under `backend/src/platform/dos/foundation/` (Law 9 — organize by concern)
* Fix `server-routes.ts` broken imports — remove deleted foundation/team route mounts (§20 — delete hollow shells)
* Fix `agrc-route-manifest.ts` broken imports

### Priority 1: Delete Legacy Tables (28) + V2 Files (7)

* DROP 21 `_retired_*` + 1 `_backup_*` public tables (§20)
* DROP 1 `_retired_*` + 6 `*_legacy` tenant tables (§20)
* Assign death dates to all 7 V2 migration files (Law 8, §20 — see §5D)

### Priority 2: Begin DAuth Phase 1 (Identity/Session)

* Create `backend/src/platform/dauth/identity/` and `backend/src/platform/dauth/session/` (Law 9)
* Build `SessionService` — one canonical session engine (Law 1)
* Build `TokenService` — one canonical token engine (Law 1)
* Build auth middleware inside `dauth/` — NOT in a flat `middleware/` directory (Law 9)
* Co-locate `SessionService.test.ts` beside `SessionService.ts` (§20)

### Priority 3: Begin DAuth Phase 2 (Access Core)

* Build `AccessResolver` inside `backend/src/platform/dauth/access/` (Law 9)
* Consolidate 5 permission services → 1 canonical `AccessResolver` (Law 1, Law 3 — see §5C)
* Ensure runtime truth reads from DB registry tables, not from TypeScript constants (Law 3)

### Priority 4: Begin DOS Foundation Rebuild

* Create `backend/src/platform/dos/foundation/` (Law 9)
* Rebuild org-pack-seeding under DOS ownership — one service (Law 1)
* Rebuild route catalogs for foundation scope
* No re-creation of 48-file foundation/services/ directory (§14 — max 15 files per directory)

### Priority 5: Consolidate Delegation → DAuth (Phase 4)

* Collapse 7 delegation services into 1 canonical `DelegationService` (Law 1, Law 3 — see §5C)
* Must be time-bounded, scope-bounded, SoD-checked (Design Freeze §9)

### Priority 6: Broken Import Remediation Schedule

* ~505 auth middleware imports → resolve during DAuth Phase 1–2 as new middleware is built
* ~31 foundation imports → resolve during DOS Foundation rebuild (Priority 4)
* ~9 team imports → resolve during DOS Foundation rebuild
* ~4 platform/rbac imports → resolve during DAuth Phase 2
* **No broken import may persist past Phase 5** (§20)

## 10. Risk Assessment

| Risk | Severity | Mitigation | Law |
|------|----------|------------|-----|
| No new tenant can be provisioned | **P0** | Fix `seed_org_structure` immediately | — |
| No API route is authenticated | **P0** | Build DAuth auth middleware (Phase 1) | Law 1 |
| 505+ route files have broken auth imports | **P1** | Resolve as each phase builds replacement services | §20 |
| SoD evaluation is missing | **P1** | Build `SodEngine` in DAuth (Phase 4) | Law 1, Law 3 |
| 7 delegation services violate Law 1 | **P1** | Consolidate to 1 canonical service (Phase 4) | Law 1 |
| 5 permission services violate Law 1 | **P1** | Consolidate to `AccessResolver` (Phase 2) | Law 1, Law 3 |
| 3 event bus services violate Law 1 | **P2** | Consolidate to 1 canonical event bus (Phase 2) | Law 1 |
| 7 V2 files — death dates assigned, removal pending | **P2** | Dates in §5D; removal: RBAC→P2, opmode→P3, dashboard→P6, onboarding→P7, tables→P9 | Law 8, §20 |
| Frontend has no guards/interceptors | **P2** | Build after DAuth backend (Phase 6) | §14 |
| 28 legacy tables consuming space | **P3** | Migration cleanup (Phase 9) | §20 |
| `sections` table in design freeze but may not exist in DB | **P3** | Verify in Phase 3; create if missing | — |

## 11. Law Compliance Checklist

| Law (Patch 0 §4) | Status | Resolution |
|-----|--------|------------|
| Law 1 — One canonical engine | **PLANNED** | 15 duplicate services → §5C; 3 audit log tables → Phase 2 (§22 #11); 2 RACI tables → Phase 3 (§6.7) |
| Law 2 — One canonical owner | **PLANNED** | Delegation (7→1, Phase 4), permissions (5→1, Phase 2), events (3→1, Phase 2) per §5C; 18 DAuth table migration map §6.6; 2 DOS table merges §6.7 |
| Law 3 — Data-driven security | **OK** | Module manifests register security; DB tables are runtime truth via seeder → moves to `dauth/` Phase 2 (§22 #13) |
| Law 4 — No frontend truth | **OK** | All 26 role maps deleted; `AccessStore` is canonical consumer |
| Law 5 — Generic lifecycle | **OK** | `entity-state-machine.ts` is the generic FSM; duplicate UI resolved Phase 3 (§22 #4) |
| Law 6 — Real scope only | **OK** | Scope resolves from DOS hierarchy; no fake workspace shortcuts |
| Law 7 — No stubs | **OK** | 34 empty dirs cleaned; 3 style stubs → Phase 6 (§22 #5); hollow `modules/foundation/` deleted Phase 0.5 (§22 #12) |
| Law 8 — Deprecation death dates | **FIXED** | All 7 V2 files have removal owner + phase + replacement in §5D |
| Law 9 — Organize by concern | **ENFORCED** | All new paths: `dauth/identity/`, `dauth/access/`, `dos/foundation/`, `dos/profile/`; seeder → `dauth/` (§22 #13) |
| Law 10 — Migration modes expire | **FIXED** | V2 death dates in §5D; v2 table renames Phase 9 (§22 #14). `@app/services/*` tsconfig alias removed 2026-04-03 (all imports → `@app/core/services/*`; MIGRATION-MANIFEST.md deleted) |
| Law 11 — Deny by default | **OK** | DAuth denies if unresolvable |
| Law 12 — Audit by default | **OK** | Auth decision audit in DAuth scope |
| Law 13 — No scope widening | **ENFORCED** | All phases bounded |
| Law 14 — No PASS with gaps | **ENFORCED** | Phase review gates |
| Law 15 — Product removable | **OK** | Shahin-AI removable without breaking DOS/DAuth |
| §14 — File-count budgets | **OK** | Enforced in all phase action items; no directory above 15 |
| §20 — Tests with source | **ENFORCED** | Co-location required for all new services (Phase 1+) |

*Phase 0 — Classification & Freeze complete. Next: Phase 0.5 Hotfix → DAuth Phase 1 — Identity/Session Spine*

---

# Agent Operating Pack

## 1) Global rules for every agent

Use this before every phase.

```text
DOS / DAuth / Shahin-AI — Global Agent Rules

System names are locked:
- Platform OS = Dogan-AI-OS (DOS)
- Auth system = Dogan-Auth (DAuth)
- Product example = Shahin-AI

Architecture rules:
1. DOS is platform-neutral core
2. DAuth is the only auth/access engine
3. Shahin-AI is a product that consumes DOS + DAuth
4. No fallback permission chains
5. No frontend-invented permission truth
6. No v2 twins
7. No stubs
8. No deprecated code without removal date
9. No drift from the approved bounded pass
10. One canonical owner per concern

Ownership rules:
- DOS owns tenancy, org/foundation structure, platform lifecycle framework, provisioning infrastructure, product/module enablement
- DAuth owns identity, session, actor registry, memberships, access profiles, functional roles, permissions, scope resolution, authorities, delegation, SoD, lifecycle authorization, access snapshot, auth audit
- Shahin-AI owns product modules, product actions, product policies, product dashboards, product defaults

Execution rules:
- Do not widen scope
- Do not redesign outside the phase
- Do not substitute a nearby implementation
- Do not call PASS with missing required items
- If a required item is incomplete, Final Decision must be FAIL

Required response format for all phases:
1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files Inspected
5. Files Changed
6. What Was Fixed / Built
7. What Was Explicitly Not Changed
8. Tests / Validation Run
9. Remaining Risks
10. Final Decision
11. Recommended Next Part
```

# 2) Agent role split

Use this when you have multiple agents.

```text
Agent Role Split

Explorer agent:
- read-only
- maps files, tables, dependencies, conflicts, broken imports, collision zones
- does not implement
- does not delete
- does not redesign beyond the prompt

Implementer agent:
- executes one bounded phase only
- does not rescope
- does not do unrelated cleanup
- returns exact changed files and validation results

Reviewer agent:
- checks drift against the approved phase
- rejects partial completion
- checks architecture compliance, runtime safety, and missing items
```

## 3) Full phase roadmap

Master sequence — must match §21 Implementation Order.

1. Phase 0 — Freeze and classification (DONE)
2. Phase 0.5 — Hotfix: unblock provisioning (P0 — before Phase 1)
3. Phase 1 — Identity/session spine (DAuth)
4. Phase 2 — Access core (DAuth) + permission/event consolidation + table renames
5. Phase 3 — Scope and hierarchy (DOS + DAuth) + foundation rebuild
6. Phase 4 — Delegation + SoD (DAuth) + delegation consolidation
7. Phase 5 — Lifecycle auth (DAuth) — all broken imports resolved by end
8. Phase 6 — Frontend consumption + style stub cleanup + dashboard v2 removal
9. Phase 7 — Onboarding/bootstrap integration + onboarding v2 removal
10. Phase 8 — AI/agent auth integration
11. Phase 9 — Hard delete: legacy tables, archived tables, v2 renames, final cleanup

---

# 4) Exact phase prompts

## Phase 0 — Freeze and classification

```text
Phase 0 — Freeze and Classification

This is a read-only architecture pass.
Do not write code.
Do not write migrations.
Do not delete files.
Do not refactor.

Mission:
Freeze the DOS / DAuth / Shahin-AI rebuild architecture so implementation starts from a clean canonical model.

In scope:
1. ownership matrix
2. system naming freeze
3. canonical hierarchy freeze
4. canonical identity/profile/access/scope split
5. canonical table classification
6. canonical file classification
7. collision zones
8. bootstrap contract
9. frontend consumption contract
10. forbidden patterns
11. phase order

Required outputs:
- canonical runtime truth tables
- registry metadata tables
- presentation/runtime config tables
- provisioning/seed tables
- legacy/archive-only tables
- canonical logic files
- legacy/delete-later files
- go/no-go for implementation
```

## Phase 0.5 — Hotfix: Unblock provisioning

```text
Phase 0.5 — Hotfix: Unblock Provisioning

This is P0 — execute before Phase 1.
Do not widen scope.
Do not rebuild full DAuth yet.

Mission:
Unblock server boot, route mounting, and tenant provisioning so the rebuild proceeds on a stable runtime baseline.

In scope only:
1. Rewrite seed_org_structure so it no longer depends on deleted foundation services
   - Create minimal platform/dos/foundation/org-pack-seeding.service.ts (Law 9)
2. Fix startup-critical imports:
   - server-routes.ts — remove deleted foundation/team route mounts (§20)
   - agrc-route-manifest.ts — remove deleted foundation/team route refs (§20)
3. Delete hollow modules/foundation/ directory (§20, §22 #12)
4. Create minimal namespace roots:
   - backend/src/platform/dauth/
   - backend/src/platform/dos/
5. Add only the minimum contracts/interfaces required for compile stability on the critical path

Strict non-goals:
- no full AccessResolver redesign
- no frontend rebuild
- no full RBAC rebuild
- no broad route-by-route migration

Success criteria:
- provisioning is unblocked (bootstrap step 5 works)
- startup-critical files no longer import deleted foundation/team/auth surfaces
- server boot path is stable
- hollow modules/foundation/ directory deleted
```

## Phase 1 (part A) — Backend auth import migration

```text
Phase 1 (part A) — Backend Auth Import Migration Pass

This is part of Phase 1 (Identity/Session spine).
Do not widen scope.
Do not rebuild frontend yet.
Do not start full access-core redesign yet.

Mission:
Migrate ~1,715 backend imports from deleted auth/middleware paths to the new canonical DAuth import surface.

Canonical import target:
- backend/src/platform/dauth/index.ts

In scope only:
1. Replace imports from deleted paths:
   - middleware/auth → dauth/session (505 files)
   - middleware/* (all) → dauth/ + dos/ concern-based (1,669 references)
   - config/jwt → dauth/session/token.service (2 files)
   - platform/rbac/* → dauth/access (4 files — Phase 2)
2. Point them to platform/dauth
3. Fix startup-critical files first
4. Then migrate route files using:
   - authenticate
   - optionalAuthenticate
   - requirePermission
   - requireRole
   - requireAnyPermission

Strict non-goals:
- no frontend guard rebuild
- no SoD rebuild yet
- no lifecycle auth rebuild yet
- no broad behavior redesign

Success criteria:
- all auth middleware imports point to dauth/
- no import references deleted middleware/ paths
- §20 deadline: no broken imports past Phase 5
```

## Phase 1 (part B) — Session + auth middleware hardening

```text
DAuth Phase 1 (part B) — Session + Auth Middleware Hardening

This is the current bounded pass only.
Execute only this part.
Do not widen scope.

Mission:
Harden the new DAuth identity/session spine so backend authentication is production-safe.

Current canonical surfaces:
- token.service.ts
- session.middleware.ts
- access.resolver.ts
- index.ts

In scope only:
1. Harden TokenService
   - access vs refresh separation
   - verification
   - expiry handling
   - secret/config handling
2. Harden SessionMiddleware
   - authenticate()
   - optionalAuthenticate()
   - canonical request auth context
   - invalid/expired token handling
3. Define canonical auth error model
4. Define refresh/revoke contract
5. Add session audit hooks
6. Clean request typing

Strict non-goals:
- no full access-core redesign
- no SoD rebuild yet
- no delegation engine yet
- no frontend rebuild yet

Success criteria:
- one hardened TokenService
- one hardened SessionMiddleware
- one canonical auth error shape
- one refresh/revoke contract
- stable typed auth context on request
```

## Phase 2 — Access core

```text
DAuth Phase 2 — Access Core

This is the current bounded pass only.
Execute only this part.
Do not widen scope.

Mission:
Build the canonical DAuth access core for permissions, profiles, roles, assignments, and effective access resolution.

In scope only:
1. Define canonical access tables/services:
   - access profiles, functional roles, permissions, role_permissions
   - actor_access_assignments, actor_role_assignments
2. Build AccessResolver / AccessSnapshotService — Law 1
3. Consolidate 5 permission services → 1 AccessResolver — Law 1, Law 3 (§5C)
4. Consolidate 3 event bus services → 1 canonical DOS event bus — Law 1 (§5C)
5. Consolidate 3 audit log tables → 1 authz_decision_log — Law 1 (§22 #11)
6. Move module-security-seeder.service.ts to platform/dauth/ — Law 9 (§22 #13)
7. Execute DAuth table renames/merges per §6.6 migration map (18 tables)
8. Remove RBAC v2 migration file — §20 (§5D)
9. Define canonical permission format: module.resource.action
10. Define effective access computation (deny-by-default)
11. Define cache/invalidation rules
12. Runtime truth reads from DB registry tables — Law 3

Strict non-goals:
- no frontend guards yet
- no SoD engine yet
- no delegation engine yet
- no lifecycle auth yet

Success criteria:
- one access resolver
- one access snapshot contract
- no fallback permission chain
- no frontend-invented permission truth
- 18 DAuth table dispositions complete per §6.6
- RBAC v2 migration removed
```

## Phase 3 — Scope and hierarchy

```text
DOS / DAuth Phase 3 — Scope and Hierarchy

This is the current bounded pass only.

Mission:
Bind DAuth access decisions to the canonical DOS hierarchy. Rebuild DOS foundation services.

Canonical hierarchy:
Tenant → Organization → Business Unit/Division → Department → Section → Team → Position → Actor/User

In scope only:
1. Build dos/foundation/: organization/team/position scope, ownership rules — Law 9
2. Expand org-pack-seeding from Phase 0.5 hotfix into full DOS foundation service — Law 1
3. Move actor-identity.service.ts to dos/profile/ — Law 9
4. Rebuild / confirm scope adapters (org, team, position)
5. Define scope inheritance rules per §8.3
6. Bind role assignments to explicit scope types
7. Create sections table if missing (Design Freeze §8.1)
8. Merge raci_assignments + raci_matrices into governance_raci_assignments — Law 1 (§6.7)
9. Resolve duplicate staffing/lifecycle UI → one generic lifecycle + one staffing tab — Law 5 (§22 #4)
10. Fix 31 broken foundation + 9 broken team imports — §20
11. Remove operation mode v2 migration file — §20 (§5D)
12. No directory above 15 files — §14

Strict non-goals:
- no lifecycle auth yet
- no frontend rebuild yet
- no SoD/delegation engine yet

Success criteria:
- one canonical scope model
- one inheritance model
- no hidden frontend scope logic
- foundation + team broken imports resolved
- dos/foundation/ directory under 15 files
```

## Phase 4 — Delegation + SoD

```text
DAuth Phase 4 — Delegation and SoD

This is the current bounded pass only.

Mission:
Centralize delegation and separation-of-duties into one DAuth decision layer. Build the SoD engine from scratch (critical gap).

In scope only:
1. Build dauth/delegation/DelegationService — Law 1
2. Consolidate 7 delegation services → 1 canonical — Law 1, Law 3 (§5C)
3. Execute delegation table merges per §6.6:
   - delegated_authorities + delegations → delegation_chains
   - delegation_rules → delegation_policies
4. Build dauth/sod/SodEngine from scratch — Law 1 (zero runtime logic exists)
5. Define SoD outcomes: block / warn / escalate / allow-with-audit — §10.3
6. Enforce time/scope/action-bounded delegation — Design Freeze §9
7. Add audit logs for SoD blocks and delegated decisions
8. **All broken imports must be resolved by end of Phase 5** — §20

Strict non-goals:
- no frontend rebuild yet
- no broad governance/business logic cleanup

Success criteria:
- one delegation engine
- one SoD engine
- no duplicate SoD or delegation truth
- delegation table merges complete per §6.6
```

## Phase 5 — Lifecycle auth

```text
DAuth Phase 5 — Lifecycle Authorization

This is the current bounded pass only.

Mission:
Build the generic lifecycle authorization engine so state-changing actions are governed by permission + authority + lifecycle state.

In scope only:
1. Build dauth/lifecycle/LifecycleAuthService — Law 1
2. Reads registered lifecycle definitions from DOS generic FSM (entity-state-machine.ts) — Law 5
3. One engine parameterized by entity/module — not per-module copies — Law 5
4. Define lifecycle transition auth contract
5. Bind module approval matrices into the engine
6. Enforce self-approval prevention
7. Enforce maker-checker separation where required
8. Log lifecycle auth decisions
9. Verify all broken imports resolved — §20 hard deadline

Strict non-goals:
- no frontend rebuild yet
- no new per-module lifecycle services (Law 5)

Success criteria:
- permission alone is no longer enough for state-changing actions
- one generic lifecycle auth engine
- per-module lifecycle rules register into it
- zero broken imports remaining in backend
```

## Phase 6 — Frontend consumption

```text
DAuth Phase 6 — Frontend Consumption Layer

This is the current bounded pass only.

Mission:
Rebuild frontend auth consumption so the UI reads DAuth truth only.

In scope only:
1. Build core/dauth/SessionService (session state, login/logout, token refresh) — §14
2. Build core/dauth/AccessStore (access snapshot, permission checks) — §14
3. Build AuthInterceptor, CsrfInterceptor — Law 1
4. Build AuthGuard, OnboardingGuard, ModuleGuard, AdminGuard — §14
5. Reconnect action visibility and nav visibility to AccessStore
6. Remove V2 dashboard migration — §20 (§5D)
7. Remove 3 empty style stubs (icon-3d.css, premium-pages.css, landing-template.scss) — §20 (§22 #5)
8. Resolve duplicated dashboard/widget registries → keep dashboard_registry + dashboard_widget_registry — Law 1 (§22 #3)

Naming rule: use SessionService, not AuthSessionService — package path core/dauth/ provides namespace (§17.1)

Strict non-goals:
- no product-specific dashboard redesign
- no frontend-invented access logic
- no hardcoded permission maps

Success criteria:
- frontend consumes access snapshot only
- no role-priority shortcuts
- no static permission maps as truth
- style stubs removed
- dashboard v2 migration removed
```

## Phase 7 — Onboarding/bootstrap integration

```text
DOS / DAuth Phase 7 — Onboarding and Bootstrap Integration

This is the current bounded pass only.

Mission:
Make onboarding/provisioning seed the canonical DOS/DAuth model only.

In scope only (10-step bootstrap per Design Freeze §15):
1. Create tenant
2. Create first user
3. Create actor record
4. Create tenant membership
5. Seed base org structure (uses DOS foundation from Phase 0.5/3)
6. Seed workspace/profile defaults
7. Assign initial access profile (DAuth)
8. Assign initial functional roles (DAuth)
9. Enable default products/modules
10. Emit initial access snapshot
11. Remove V2 onboarding migration — §20 (§5D)

Strict non-goals:
- no temporary auth model (Design Freeze §15.2)
- no fake workspace-admin shortcut
- no legacy fallback seed logic
- no dependency on frontend permission truth

Success criteria:
- bootstrap path maps exactly to DOS + DAuth contracts
- no provisioning step depends on deleted legacy auth/foundation logic
```

## Phase 8 — AI / agent auth integration

```text
DAuth Phase 8 — AI and Agent Auth Integration

This is the current bounded pass only.

Mission:
Integrate human, agent, and acting-on-behalf-of flows into the same DAuth spine.

In scope only:
1. Define agent actor model
2. Bind agents to actor registry
3. Enforce acting-on-behalf-of chain
4. Enforce agent scope checks
5. Enforce authority / approval requirements for agent actions
6. Audit all agent decisions and delegations

Strict non-goals:
- no hidden agent superuser path
- no separate AI-only permission engine

Success criteria:
- agents are first-class actors under DAuth
- no alternate agent bypass path exists
```

## Phase 9 — Hard delete of legacy compatibility

```text
Phase 9 — Cutover and Hard Delete

This is the current bounded pass only.

Mission:
Complete cutover to DOS + DAuth and remove remaining legacy/compatibility surfaces.

In scope only:
1. DROP 28 legacy DB tables — §20 (§5D)
2. DROP archived tables from §6.6: role_functions (tenant), role_function_scope_map, role_defense_line_mappings, role_team_mapping — §20
3. Rename user_preferences_v2 → user_preferences — §20 (§22 #14)
4. Rename dashboard_role_bindings_v2 → dashboard_role_bindings — §20 (§22 #14)
5. Remove remaining V2 migration files — Law 8, §20
6. Delete all duplicate service files marked for deletion in §5C
7. Remove any remaining broken imports, dead exports, hollow shells — §20
8. Final directory budget audit — §14

Strict non-goals:
- no new architecture
- no new parallel systems
- no new fallback path

Success criteria:
- one canonical DOS/DAuth runtime
- no legacy permission chain
- no duplicate engines
- no hollow modules left behind
- no v2-suffixed tables
- all directories under 15 files
```

---

# 5) Module-check prompt for agents

Use this when you want an agent to inspect a module against the rebuild.

```text
Module Compliance Audit Prompt

Audit this module against DOS / DAuth rebuild rules.

Check:
1. Does the module invent auth truth locally?
2. Does it hardcode permissions/roles in frontend or backend?
3. Does it depend on deleted legacy auth/foundation/team paths?
4. Does it define module security metadata correctly for registration?
5. Does it bypass lifecycle/authority checks?
6. Does it bypass SoD/delegation/clearance rules?
7. Does it misuse workspace/profile/experience data as access truth?
8. Does it create duplicate services for cross-cutting concerns?
9. Does it violate DOS/DAuth/Shahin-AI ownership boundaries?
10. Does it require rebuild, migration, demotion, or deletion?

Required output:
1. Module Summary
2. Ownership Compliance
3. Auth Compliance
4. Lifecycle Compliance
5. Scope Compliance
6. Duplicate / Drift Findings
7. Rebuild Recommendation
8. Go / No-Go
```

---

# 6) Review prompt for any finished phase

```text
Phase Review Prompt

Review the completed phase strictly against the approved bounded scope.

Check:
1. Was every required item completed?
2. Was anything substituted with a nearby alternative?
3. Was any scope widened without approval?
4. Were any forbidden patterns reintroduced?
5. Is the runtime more canonical after this pass?
6. What remains incomplete?

Rules:
- If a required item is missing, Final Decision must be FAIL
- If a forbidden pattern is reintroduced, Final Decision must be FAIL
- Do not reward partial completion with PASS
```
# DOS / DAuth Enterprise Rebuild Playbook

## A. Purpose

This document is the master operating playbook for rebuilding the platform as an enterprise-grade production system.

It defines:

* system naming
* ownership boundaries
* architecture laws
* component model
* canonical data and service design
* UI shell standards
* security and compliance requirements
* review gates
* delivery phases
* acceptance criteria
* audit checklists
* rules for all future agents and contributors

This is the governing document for:

* **Dogan-AI-OS (DOS)**
* **Dogan-Auth (DAuth)**
* **Shahin-AI** and any future product built on DOS

---

## B. Locked Naming System

### B.1 System names

* **Platform Operating System:** Dogan-AI-OS
* **Short name:** DOS
* **Authentication and Authorization System:** Dogan-Auth
* **Short name:** DAuth
* **Product example:** Shahin-AI

### B.2 Naming law

* DOS is the reusable platform core.
* DAuth is the only platform auth system.
* Shahin-AI is a product built on DOS and protected by DAuth.

### B.3 Naming rules

#### Allowed package roots

* `backend/src/platform/dos/`
* `backend/src/platform/dauth/`
* `backend/src/products/shahin-ai/`
* `frontend/src/app/core/dos/`
* `frontend/src/app/core/dauth/`
* `frontend/src/app/products/shahin-ai/`

#### Allowed class style

Use neutral technical names inside namespaced packages.

Examples:

* `SessionService`
* `TokenService`
* `AccessResolver`
* `AccessSnapshotService`
* `ScopeResolver`
* `DelegationService`
* `SodEngine`
* `LifecycleAuthService`
* `ModuleEntitlementService`
* `AuthGuard`

#### Forbidden names

Do not recreate names like:

* `GrcAuthService`
* `EnterpriseAuthzService`
* `FallbackPerms`
* `PermissionMapService`
* `RolePriorityService`
* `WorkspacePermissionGuard`
* `RBACv2*`
* `Legacy*`

---

## C. System Ownership Model

### C.1 DOS owns

* tenancy
* organization and foundation structure
* product/module enablement
* shared lifecycle framework
* event infrastructure
* onboarding/provisioning infrastructure
* shared shell, navigation, layout, platform UI runtime
* generic platform state machines
* platform-wide configuration and observability

### C.2 DAuth owns

* authentication
* identity and actor model
* sessions and token lifecycle
* MFA
* tenant membership evaluation
* access profiles
* functional roles
* permissions
* permission resolution
* scope resolution
* authorities and approval power
* delegation
* separation of duties
* lifecycle authorization
* access snapshot generation
* auth decision audit
* auth security policy enforcement

### C.3 Shahin-AI owns

* product domain modules
* product defaults
* product workflows
* product dashboards
* product-specific views and defaults
* product action catalogs
* product policy configuration
* product-specific AI behavior

### C.4 Ownership law

A product must be removable without breaking DOS or DAuth.

---

## D. Enterprise Architecture Laws

Authoritative numbering is Patch 0 §4. This section mirrors it exactly.

### Law 1 — One canonical engine per concern
No runtime twins. No fallback engines. No v2 beside v1.

### Law 2 — One canonical owner per concern
Every cross-cutting concern has one owner.

### Law 3 — Data-driven security
Permissions, roles, actions, approval rules, SoD rules come from canonical registries or typed module contracts.

### Law 4 — No frontend-invented truth
Frontend may render or cache truth. Frontend may not define it.

### Law 5 — Generic lifecycle engine
Shared and parameterized, not copied per module.

### Law 6 — Real scope only
Scope resolves from DOS structure, not fake shortcuts.

### Law 7 — No stubs in runtime tree
No empty files, placeholders, dead shells, skeleton modules.

### Law 8 — Deprecation requires death date
Every deprecated item needs removal date, version, owner, replacement.

### Law 9 — Organize by concern, not pattern
No junk-drawer directories mixing unrelated concerns.

### Law 10 — No permanent migration mode
No permanent shadow/dual/compare-only mode.

### Law 11 — Deny by default
If access cannot be resolved safely, deny.

### Law 12 — Audit by default
Every sensitive action must be reconstructable.

### Law 13 — No scope widening in execution
Execution must not broaden without explicit approval.

### Law 14 — No PASS with missing required items
Incomplete bounded phase is FAIL.

### Law 15 — Product removable principle
Products must be removable without breaking DOS or DAuth.

File-count budgets and test co-location are enforced in Patch 0 §14 and §20.

---

## E. Enterprise Quality Bar

Every system component in DOS / DAuth / Shahin-AI must satisfy:

* deterministic ownership
* documented runtime purpose
* typed interfaces
* bounded dependencies
* auditability
* operational observability
* migration traceability
* testability
* explicit acceptance criteria
* no duplicate runtime truth

A component is not enterprise-grade if it:

* duplicates another concern
* hides rules in UI only
* depends on implicit fallback behavior
* cannot explain why access was granted or denied
* mixes display metadata with auth truth
* uses unbounded scope logic
* bypasses lifecycle or authority checks

---

## F. Canonical Domain Model

### F.1 Identity

Identity answers: who is the principal?

#### Principal types

* human user
* agent
* service account
* external actor

#### Canonical concepts

* user
* actor
* session
* credential
* MFA method
* identity provider link
* email verification token
* password reset token
* refresh token family
* revocation entry

### F.2 Profile

Profile answers: what business/human metadata describes the actor?

#### Profile includes

* full name
* job title
* manager/reports-to chain
* competencies
* preferences
* availability
* profile completeness
* dashboard/workspace preferences

#### Profile does not include

* effective permissions
* lifecycle authority
* SoD overrides

### F.3 Access

Access answers: what may the actor do?

#### Split into 4 concepts

1. **Access profiles** — broad posture
2. **Functional roles** — scoped business roles
3. **Decision authorities** — powers such as approve/override/publish
4. **Experience metadata** — dashboards, widgets, landing defaults

### F.4 Scope

Scope answers: where may the actor act?

#### Canonical hierarchy

Tenant → Organization → Business Unit / Division → Department → Section → Team → Position → Actor/User

### F.5 Lifecycle authorization

Lifecycle authorization answers: may the actor perform this transition in this state under this authority?

### F.6 Delegation

Delegation answers: may the actor act on behalf of another principal in bounded scope/time/action?

### F.7 SoD

SoD answers: does the current assignment or action violate separation-of-duties policy?

---

## G. Canonical Runtime Tables and Buckets

All tables must be classified into exactly one bucket. Tables listed here reflect current state. For rename/merge/archive dispositions, see §6.6 (DAuth) and §6.7 (DOS) migration maps.

### G.1 Bucket 1 — Canonical runtime truth

These are allowed to participate directly in runtime decisions.

#### Identity and membership

* `users`
* `tenant_user_memberships`
* `email_verification_tokens`
* `password_reset_tokens`
* `user_mfa`
* `login_attempts`
* session and refresh-token tables
* token revocation tables
* actor tables

#### Access core

* `access_profiles`
* `functional_roles`
* `permissions`
* `role_permissions`
* `user_access_profiles`
* `enterprise_user_role_assignments`
* `user_role_assignments`
* `actor_access_assignments`
* `actor_role_assignments`
* `authority_levels`
* `authority_matrix`
* `decision_authorities`
* `delegations`
* `delegation_rules`
* `delegated_authorities`
* `sod_rules`
* `sod_conflict_log`
* `sod_conflict_matrix`
* `sign_off_authority_matrix`
* `authorization_decision_log`
* `authz_decision_log`
* `guard_decision_log`
* `access_review_campaigns`
* `access_review_items`
* `invitations`
* `external_user_scopes`
* `tenant_security_config`

#### DOS scope source

* `organizations`
* `business_units`
* `departments`
* `sections`
* `teams`
* `team_members`
* `positions`
* `org_hierarchy_nodes`
* `org_hierarchy_edges`
* `org_dimensions`
* `org_dimension_values`
* `governance_bodies`
* `governance_committees`
* `governance_committee_members`
* `governance_reporting_lines`
* `governance_responsibilities`
* `governance_responsibility_assignments`
* `governance_raci_assignments`
* `raci_assignments`
* `raci_matrices`
* `person_profiles`
* `member_profiles`
* `member_lifecycle_events`
* `legal_entities`

#### DOS platform truth

* `tenants`
* `platform_products`
* `product_modules`
* `tenant_module_entitlements`
* `tenant_settings`
* `subscriptions`
* `tier_definitions`
* `workspaces`
* `modules`
* `module_workflow_registry`
* `module_lifecycle_definitions`
* `module_lifecycle_transitions`
* `feature_flags`
* `settings`

### G.2 Bucket 2 — Registry metadata

These are registration and metadata inputs, not direct effective access truth.

Examples:

* module registration tables
* `module_role_definitions`
* `module_permissions`
* `module_actions`
* `module_approval_matrices`
* `module_ownership_rules`
* `module_sod_rules`
* `module_activation_rules`
* framework registries
* ontology tables
* lookup tables
* manifest-derived registry tables

### G.3 Bucket 3 — Presentation / runtime config

These affect UI/runtime experience, not access truth.

Examples:

* `dashboard_configs`
* `dashboard_layouts`
* `dashboard_registry`
* `dashboard_role_bindings`
* `dashboard_widget_registry`
* `widget_registry`
* `navigation_registry`
* `navigation_overrides`
* `navigation_role_bindings`
* `activity_feed`
* `activity_notifications`
* `activity_stream`
* `comments`
* `messages`
* `user_preferences`
* `notification_preferences`
* `notification_queue`
* `drawer_templates`
* `saved_views`
* `command_palette_history`
* `contextual_suggestions`
* `workspace_profile`
* role experience and dashboard preference tables

### G.4 Bucket 4 — Provisioning / seed input

These are activation/bootstrap and planning inputs.

Examples:

* `onboarding_*`
* `provisioning_*`
* `startup_checklists`
* `seed_history`
* `seeding_depth_config`
* `tenant_blueprints`
* `workspace_seeds`
* `pack_installations`
* `ninety_day_plans`
* `plan_item_instances`

### G.5 Bucket 5 — Legacy / archive-only

Must not participate in rebuild runtime.

Examples:

* `_retired_*`
* `_backup_*`
* `*_legacy`
* duplicate prior registry generations
* obsolete compatibility-era tables

---

## H. Canonical Service Boundaries

## H.1 DAuth services

### Identity

* `IdentityService`
* `TokenService`
* `SessionService`
* `MfaService`
* `RevocationService`

### Access

* `AccessResolver`
* `AccessSnapshotService`
* `PermissionService`
* `RoleAssignmentService`
* `AccessProfileService`
* `FunctionalRoleService`

### Scope

* `ScopeResolver`
* `OrgScopeAdapter`
* `TeamScopeAdapter`
* `OwnershipResolver`

### Authority

* `AuthorityService`
* `LifecycleAuthService`
* `ApprovalMatrixService`
* `SelfApprovalGuard`

### Delegation and SoD

* `DelegationService`
* `DelegationPolicyService`
* `SodEngine`
* `ClearanceFilterService`

### Audit

* `AuthDecisionAuditService`
* `AuthSecurityAuditService`

## H.2 DOS services

### Foundation

* `OrganizationService`
* `HierarchyService`
* `TeamStructureService`
* `PositionService`
* `CommitteeService`
* `OrgPackSeedingService`
* `AssignmentService`
* `ResponsibilityService`

### Platform runtime

* `ProductEntitlementService`
* `ModuleEnablementService`
* `WorkspaceProvisioningService`
* `LifecycleDefinitionService`
* `EventBus`
* `PlatformSettingsService`

## H.3 Product services

Shahin-AI services may define product behavior, but must consume DOS and DAuth rather than recreate them.

---

## I. Canonical Request and Decision Flow

This is the authoritative 17-step decision pipeline. §7.5 is the condensed 14-step version — both are valid, this one is the full enterprise specification. Every sensitive action must evaluate in this order:

1. principal authenticated
2. session valid
3. actor resolved
4. tenant membership valid
5. tenant active
6. product enabled
7. module enabled
8. access profile posture valid
9. functional role grants permission
10. scope matches
11. authority sufficient
12. self-approval prevention passes
13. SoD passes
14. clearance passes if applicable
15. lifecycle transition allowed
16. delegation/ownership rules pass
17. decision logged

No alternate path. No role-name shortcut. No frontend override.

---

## J. Module Registration Contract

### J.1 Canonical registration contract

Every module registers:

* module code
* version
* route base
* event namespace
* owned tables
* published events
* consumed events
* hard dependencies
* soft dependencies
* provisioning order
* permissions
* roles
* actions
* approval matrix entries
* ownership rules
* SoD rules
* lifecycle definitions
* experience metadata

### J.2 Module rules

Modules may define metadata.
Modules may not compute final effective access independently.
Modules may not ship their own separate auth engine.

### J.3 Security registration rule

The deleted per-module security files must be replaced by module-barrel manifest exports and registry ingestion, not recreated as copy-paste source files.

---

## K. Backend Package Layout Standard

```text
backend/src/platform/dos/
  foundation/
  lifecycle/
  events/
  provisioning/
  products/
  modules/
  settings/
  observability/

backend/src/platform/dauth/
  identity/
  session/
  actor/
  access/
  scope/
  authority/
  delegation/
  sod/
  audit/
  middleware/
  contracts/

backend/src/products/shahin-ai/
  modules/
  defaults/
  dashboards/
  workflows/
  integrations/
```

### K.1 Backend layout laws

* no flat `middleware/` bag
* no flat `services/` bag above the budget
* no product code inside DOS or DAuth unless contract-bound
* no markdown design docs inside runtime source directories unless explicitly allowed

---

## L. Frontend Package Layout Standard

```text
frontend/src/app/core/dos/
  shell/
  navigation/
  workspace/
  lifecycle/

frontend/src/app/core/dauth/
  session/
  access/
  interceptors/
  guards/
  directives/
  contracts/

frontend/src/app/products/shahin-ai/
  features/
  dashboards/
  widgets/
  pages/
```

### L.1 Canonical frontend auth surfaces

All live under `core/dauth/`. Use `SessionService` not `AuthSessionService` — package path provides namespace (§17.1).

* `SessionService`
* `AccessStore`
* `AuthInterceptor`
* `CsrfInterceptor`
* `AuthGuard`
* `ModuleGuard`
* `AdminGuard`
* `OnboardingGuard`
* optional action visibility helper reading `AccessStore`

### L.2 Frontend laws

Frontend may display and consume access truth.
Frontend may not invent access truth.

### L.3 Frontend role/display maps

Role maps are display-only.
They may define labels, badges, grouping, and dashboards.
They may not define effective permission grants.

---

## M. UI Shell and Experience Standards

### M.1 Shell ownership

DOS owns the platform shell.
Products plug into the shell.
DAuth controls shell access posture.

### M.2 Shell requirements

The shell must support:

* authenticated/unathenticated states
* tenant-aware navigation
* product-aware navigation
* module visibility
* role-aware widget surfacing
* lifecycle/status banners
* action visibility hints from AccessStore
* accessibility and RTL
* audit-safe status disclosure

### M.3 UI shell principles

* minimal surface area for permission logic
* no hidden navigation truth outside AccessStore
* no product-specific shell logic in DOS core
* responsive, accessible, and bilingual
* deterministic loading/error/empty states

### M.4 Design-system standards

* one token source for color, spacing, motion, radius, elevation
* no imported empty style stubs
* no unused shell files in production tree
* role/authority/lifecycle UI badges must be standardized
* audit and approval states must have consistent visual language
* critical auth errors must have consistent UX treatment

### M.5 Accessibility standards

* keyboard-first interaction
* screen-reader labels for auth and approval components
* aria-live for session/auth state changes
* high contrast compatibility
* explicit required/error state binding
* reduced motion support
* bilingual/RTL safe layouts

---

## N. Security Standards

### N.1 Authentication standards

* strong access/refresh token separation
* refresh rotation
* revocation support
* device/session traceability
* MFA for privileged paths
* brute-force and login-rate limiting
* email verification support
* password reset flow with expiry and audit

### N.2 Authorization standards

* deny by default
* one canonical access resolver
* permission naming standard
* one SoD engine
* one delegation engine
* one lifecycle auth engine
* one ownership resolution contract

### N.3 Request security

* auth middleware
* CSRF protection where applicable
* input validation
* security headers
* request correlation id
* tenant isolation enforcement
* sensitive action audit logging

### N.4 Data classification and clearance

If clearance filtering exists, it must be a DAuth-owned decision filter and must be auditable.

### N.5 No hidden privileged paths

No hidden super-admin bypasses in random routes.
No hidden AI bypasses.
No hidden service account shortcuts.

---

## O. API and Contract Standards

### O.1 API design rules

* stable typed request/response contracts
* one canonical auth error model
* no duplicated response shapes for the same concern
* explicit unauthorized vs forbidden vs inactive vs expired errors
* correlation id included where needed
* no route-level raw role comparisons

### O.2 Canonical auth error set

* unauthenticated
* invalid token
* expired token
* forbidden
* tenant membership missing
* tenant inactive
* user inactive
* session revoked
* SoD blocked
* self-approval blocked
* lifecycle transition denied
* clearance denied

### O.3 Access snapshot contract

`GET /api/auth/access` must return one canonical access snapshot containing:

* identity posture
* actor info
* tenant membership
* access profiles
* functional roles
* effective permissions
* scope bindings
* decision authorities
* allowed modules/products
* allowed dashboards/landing hints
* audit trace metadata where appropriate

---

## P. Testing Standards

### P.1 Test layers

* unit tests for services/utilities
* contract tests for snapshot/auth errors/module registration
* integration tests for auth flows
* end-to-end tests for onboarding/auth/access-critical journeys
* property tests where state machines and permission normalization benefit from them

### P.2 Co-location rule

Tests live next to the source or inside a concern-owned test folder.

### P.3 Required critical-path tests

#### DAuth

* token issue/verify/revoke
* refresh rotation
* session middleware behavior
* access resolver behavior
* deny-by-default behavior
* SoD conflicts
* self-approval prevention
* delegation resolution
* lifecycle transition auth

#### DOS

* org pack seeding
* org scope inheritance
* foundation structure activation
* module enablement
* provisioning sequence

#### Shahin-AI

* protected domain route checks
* product dashboard visibility
* product action authorization

### P.4 Forbidden testing patterns

* giant flat graveyard test directory
* test names with no owner or concern
* UI-only tests for security logic
* no tests for migration-critical engines

---

## Q. Observability and Audit Standards

### Q.1 Every sensitive decision logs

* actor
* acting principal
* tenant
* product
* module
* permission
* scope
* authority
* lifecycle state
* outcome
* reason
* correlation id
* timestamp

### Q.2 Critical audit streams

* login success/failure
* refresh success/failure
* logout/revoke
* MFA challenge/result
* access denied
* sensitive access granted
* SoD block/warn
* delegated action used
* self-approval prevention trigger
* lifecycle transition decision
* admin role/profile assignment
* bootstrap provisioning auth seed

### Q.3 Observability minimums

* health checks
* structured logs
* metrics
* error dashboards
* event tracing on critical auth paths
* provisioning traceability

---

## R. Review Gates and Acceptance Rules

### R.1 Every phase must define

* objective
* in scope
* out of scope
* required files/tables/components
* rules
* acceptance criteria
* fail conditions
* validation requirements

### R.2 Mandatory output format for all agents

1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files Inspected
5. Files Changed
6. What Was Fixed / Built
7. What Was Explicitly Not Changed
8. Tests / Validation Run
9. Remaining Risks
10. Final Decision
11. Recommended Next Part

### R.3 Review laws

* no PASS with missing required items
* no substitution with a nearby alternative
* no scope widening without approval
* no reintroduction of forbidden patterns
* no runtime truth duplication

---

## S. Full Delivery Phases

Phases must match §21 Implementation Order exactly.

### Phase 0 — Freeze and classification (DONE)

**Objective:** Freeze architecture, ownership, tables, files, collision zones, contracts, and phase order.

**Completion criteria:**
* canonical ownership matrix approved
* table buckets approved
* file buckets approved
* naming approved
* bootstrap contract approved

### Phase 0.5 — Runtime unblock (P0 hotfix)

**Objective:** Restore server boot, route mounting, and provisioning critical path.

**Completion criteria:**
* provisioning boot path restored (seed_org_structure fixed)
* deleted import blockers removed from startup path
* DOS/DAuth roots exist
* hollow modules/foundation/ deleted (§20)

### Phase 1 — Identity and session spine

**Objective:** Build production-safe token, session, auth middleware, error model. Migrate auth imports.

**Completion criteria:**
* one TokenService
* one SessionMiddleware
* refresh/revoke contract
* session tables created/verified (sessions, refresh_tokens, token_blacklist, identity_provider_links)
* 505+ auth imports migrated to dauth/
* auth audit coverage
* tests co-located (§20)

### Phase 2 — Access core

**Objective:** Build access profiles, functional roles, permissions, assignments, and access snapshot. Consolidate duplicates.

**Completion criteria:**
* one AccessResolver
* one AccessSnapshotService
* 5 permission services → 1 (§5C)
* 3 event bus services → 1 (§5C)
* 3 audit log tables → 1 authz_decision_log (§22 #11)
* module-security-seeder moved to dauth/ (§22 #13)
* 18 DAuth table dispositions per §6.6
* RBAC v2 migration removed (§5D)
* no fallback permission chain

### Phase 3 — Scope and hierarchy

**Objective:** Bind access to DOS hierarchy and team scope. Rebuild DOS foundation.

**Completion criteria:**
* canonical scope adapters
* inheritance rules implemented
* sections table exists
* RACI tables merged (§6.7)
* staffing/lifecycle UI deduplicated (§22 #4)
* 40 foundation/team imports resolved
* operation mode v2 migration removed (§5D)
* no directory above 15 files (§14)

### Phase 4 — Delegation and SoD

**Objective:** Centralize delegation and separation-of-duties.

**Completion criteria:**
* one DelegationService (7→1 per §5C)
* one SodEngine (from scratch)
* delegation table merges per §6.6
* all broken imports resolved by end of Phase 5

### Phase 5 — Lifecycle authorization

**Objective:** Enforce approval, authority, and state-change checks through one generic engine.

**Completion criteria:**
* permission + authority + lifecycle all required
* self-approval prevention active
* zero broken imports remaining (§20 hard deadline)

### Phase 6 — Frontend consumption

**Objective:** Rebuild frontend auth/session/access consumption using AccessStore.

**Completion criteria:**
* frontend reads access snapshot only
* no static permission maps as truth
* 3 style stubs removed (§22 #5)
* dashboard v2 migration removed (§5D)
* dashboard/widget registries deduplicated (§22 #3)

### Phase 7 — Onboarding and bootstrap integration

**Objective:** Make provisioning seed the canonical DOS/DAuth model only.

**Completion criteria:**
* 10-step bootstrap maps to DOS + DAuth contracts
* onboarding v2 migration removed (§5D)
* no provisioning step depends on deleted legacy logic

### Phase 8 — AI and agent auth integration

**Objective:** Bring agents into DAuth actor, scope, authority, and audit model.

**Completion criteria:**
* no hidden agent bypass path
* acting-on-behalf-of enforced

### Phase 9 — Cutover and hard delete

**Objective:** Remove legacy readers, compatibility bridges, duplicate registries, and archive-only tables/files.

**Completion criteria:**
* 28 legacy tables dropped
* 4 archived DAuth tables dropped (§6.6)
* user_preferences_v2 → user_preferences renamed (§22 #14)
* dashboard_role_bindings_v2 → dashboard_role_bindings renamed (§22 #14)
* all duplicate service files deleted per §5C
* final directory budget audit passed (§14)
* one canonical DOS/DAuth runtime remains
* no duplicate engines
* no hollow modules

---

## T. Component Audit Template

Use this for every component, module, or subsystem.

### T.1 Identity

* Does it create or consume auth truth?
* Does it bypass DAuth?
* Does it use deleted legacy imports?

### T.2 Scope

* What scope level does it require?
* Where does that scope come from?
* Is it DOS structure or a fake shortcut?

### T.3 Access

* Does it use AccessResolver/AccessSnapshot?
* Does it invent permissions locally?
* Does it depend on display-only maps?

### T.4 Lifecycle

* Does it perform state-changing actions?
* Does it use lifecycle auth checks?
* Can it self-approve?

### T.5 Delegation and SoD

* Can it be delegated?
* Can it violate SoD?
* Are those checks centralized?

### T.6 UI

* Is visibility driven from AccessStore?
* Is the component accessible and bilingual-safe?
* Are loading/error/empty states defined?

### T.7 Audit

* Is the critical action logged?
* Can an auditor reconstruct who acted, where, and why?

### T.8 Final classification

* keep
* migrate
* merge
* rebuild
* archive
* delete-later

---

## U. A-to-Z Platform Review Checklist

### A — Actor model

### B — Bootstrap path

### C — Clearance rules

### D — Delegation

### E — Eventing

### F — Foundation scope

### G — Guards and access consumers

### H — Hierarchy

### I — Identity and MFA

### J — JWT/session/token model

### K — Key system naming and ownership

### L — Lifecycle authorization

### M — Module registration

### N — Navigation and shell consumption

### O — Ownership mapping

### P — Permissions and profiles split

### Q — Quality bar and test coverage

### R — Roles vs authorities vs experience

### S — SoD

### T — Team scope and staffing boundaries

### U — UI shell and accessibility

### V — Visibility rules and widgets

### W — Workflow/state transitions

### X — Cross-cutting concern ownership

### Y — Yield/exit criteria per phase

### Z — Zero fallback and zero duplicate runtime truth

---

## V. Final Non-Negotiables

1. One auth system only: DAuth
2. One platform core only: DOS
3. Products consume the platform, not redefine it
4. No fallback permission chains
5. No frontend auth truth
6. No duplicated engines
7. No stubs
8. No permanent dual modes
9. No PASS with missing scope items
10. No code before the phase gate is approved

---

## W. Completion Condition for This Playbook

This playbook is considered authoritative when it is used as the reference for:

* design review
* implementation review
* phase planning
* module compliance audits
* cutover approval
* final hard-delete approval

All new work in DOS / DAuth / Shahin-AI must follow this playbook unless an explicit architecture exception is approved and documented.

---

## X. Database Migration Standards

### X.1 Schema ownership

* **Public schema** — shared across all tenants: users, tenants, platform products, regulatory data, lookup tables, onboarding
* **Tenant schema** — per-tenant isolated: `tenant_<tenantId>` created by provisioning; all domain + auth + foundation tables
* Never mix public and tenant concerns in the same migration file

### X.2 Migration file conventions

* Location: `backend/src/migrations/tenant/NNN_description.sql` or `backend/src/migrations/master/NNN_description.sql`
* Version: `NNN` is a unique integer primary key — no duplicate prefixes
* Naming: `NNN_snake_case_description.sql` — description reflects what it does, not what it replaces
* Every migration must be **idempotent** — safe to re-run (use `IF NOT EXISTS`, `DO $$ ... END $$` guards)
* No `DROP TABLE` without explicit approval and a migration that archives data first
* No `ALTER TABLE ... DROP COLUMN` in production without a 2-phase deprecation: mark unused → verify no reads → drop

### X.3 Migration testing

* Every migration must be tested against a clean tenant schema AND an existing populated schema
* Destructive migrations (DROP, rename, alter type) require a rollback migration file
* Migration runner uses `version INTEGER PRIMARY KEY` — test that version numbers don't collide

### X.4 Migration review gate

* Every migration that touches DAuth tables must be reviewed against §6.6 migration map
* Every migration that creates new tables must classify them into one of the 5 buckets (§6)
* No migration may create a table that duplicates an existing concern (Law 1)
* No migration may create `_v2` suffixed tables (§20)

### X.5 Rollback strategy

* Additive migrations (CREATE TABLE, ADD COLUMN) are forward-only — no rollback needed
* Destructive migrations must have a paired rollback file: `NNN_description_rollback.sql`
* Data migrations must be reversible or must archive original data before transformation
* If a migration fails mid-flight, the tenant schema must remain usable — use transactions

---

## Y. Environment & Deployment Standards

### Y.1 Environment tiers

| Tier | Purpose | Data | Auth mode |
|------|---------|------|-----------|
| `local` | Developer machine | seeded fixtures | bypass or local JWT |
| `staging` | Pre-production validation | anonymized clone or seeded | full DAuth |
| `production` | Live customers | real | full DAuth + MFA for admins |

### Y.2 Environment variables

* All config via environment variables — no hardcoded secrets in source
* Required env vars must be validated at startup — fail fast if missing
* Env var naming: `DOS_*` for platform, `DAUTH_*` for auth, `SHAHIN_*` for product, `DB_*` for database
* Secrets: `*_SECRET`, `*_KEY`, `*_TOKEN` must never appear in logs or error responses
* `.env.example` must exist with all required vars documented (no actual secrets)

### Y.3 PM2 deployment

* Always `pm2 delete all` before `pm2 start` — never `pm2 restart all` (prevents stale worker contamination)
* Check for orphaned node processes before deployment: `ps aux | grep 'node.*server' | grep -v pm2`
* PM2 ecosystem config must specify cluster mode, max memory restart, log paths
* Zero-downtime deployment: use PM2 reload with readiness checks

### Y.4 Nginx standards

* All API traffic proxied through Nginx
* `proxy_set_header X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` on all locations
* Rate limiting at Nginx level for public endpoints (login, register, password reset)
* Static frontend served from dist with cache headers
* Health check endpoint (`/api/health`) must bypass auth

### Y.5 Deployment checklist

1. Run all migrations (master first, then tenant)
2. Kill orphaned processes
3. `pm2 delete all && pm2 start ecosystem.config.js`
4. Verify health endpoint responds
5. Verify auth flow (login → token → refresh)
6. Verify provisioning path (if changes touch onboarding)
7. Check PM2 logs for startup errors
8. Confirm zero 5xx errors in first 5 minutes

### Y.6 Rollback procedure

1. Revert to previous deployment artifact
2. Run rollback migrations if any were destructive
3. `pm2 delete all && pm2 start`
4. Verify health + auth + critical paths
5. Post-mortem within 24 hours

---

## Z. Error Handling & Recovery Model

### Z.1 Error hierarchy

```text
AppError (base)
├── AuthError (DAuth)
│   ├── UnauthenticatedError
│   ├── ForbiddenError
│   ├── TokenExpiredError
│   ├── SessionRevokedError
│   ├── TenantInactiveError
│   ├── SoDBlockedError
│   ├── SelfApprovalBlockedError
│   ├── LifecycleTransitionDeniedError
│   └── ClearanceDeniedError
├── ValidationError
├── NotFoundError
├── ConflictError
├── RateLimitError
└── InternalError
```

### Z.2 Error response contract

Every error response must include:

* `status` — HTTP status code
* `code` — machine-readable error code (e.g., `AUTH_TOKEN_EXPIRED`)
* `message` — human-readable description (i18n-safe)
* `correlationId` — request trace ID
* `timestamp` — ISO 8601

### Z.3 Retry policies

* Database connection failures: retry 3x with exponential backoff (100ms, 500ms, 2s)
* External service calls: retry 2x with 1s timeout
* Auth token refresh: retry 1x then force re-login
* No retry on: validation errors, auth denied, SoD blocked, business rule violations

### Z.4 Circuit breaker rules

* External integrations must use circuit breakers
* Trip after 5 consecutive failures within 60 seconds
* Half-open after 30 seconds
* Agent actions must use per-agent circuit breakers (already exists: `per-agent-circuit-breaker.service.ts`)

### Z.5 Dead letter handling

* Failed event bus messages go to dead letter queue
* Failed provisioning steps are logged with retry metadata
* No silent swallow of errors — every caught error must be logged or re-thrown

---

## AA. Multi-Tenancy Standards

### AA.1 Tenant isolation model

* Every tenant gets an isolated PostgreSQL schema: `tenant_<tenantId>`
* All tenant queries must use `tenantSchema(tenantId)` — never query tenant tables without schema qualification
* No cross-tenant JOINs — ever
* Public schema is read-only for tenant-scoped code except for explicitly allowed writes (user registration, tenant creation)

### AA.2 Tenant context propagation

* Tenant ID must be extracted from JWT claims in DAuth middleware
* Tenant ID must be propagated through all service calls via `req.tenantId`
* Background jobs must explicitly set tenant context before any database operation
* Event handlers must carry tenant ID in the event payload
* Agent actions must carry tenant ID from the initiating principal

### AA.3 Tenant-aware connection pooling

* Connection pool per tenant schema is recommended for isolation
* Pool size per tenant must be bounded (max 5 connections per tenant per worker)
* Idle connections must be released after 30 seconds
* Connection leaks must be detectable via health monitoring

### AA.4 Tenant lifecycle states

| State | Meaning | Access |
|-------|---------|--------|
| `provisioning` | Being set up | No user access, provisioning system only |
| `active` | Normal operation | Full access per DAuth |
| `trial` | Time-limited | Full access with trial expiry check |
| `suspended` | Payment/compliance issue | Read-only for admins, no user access |
| `quarantined` | Security concern | No access, admin-only investigation |
| `deactivated` | Permanently off | No access, data retained per policy |

### AA.5 Storage key scoping

* All browser storage keys must include `tenantId` as suffix
* Use `StorageService` — never call `localStorage` directly
* Session storage for ephemeral state, local storage for preferences
* Clear tenant-scoped storage on tenant switch

---

## AB. Inter-Service Communication Contract

### AB.1 Dependency direction

```text
Shahin-AI → DOS → DAuth
```

* Shahin-AI may call DOS and DAuth
* DOS may call DAuth
* DAuth may NOT call DOS or Shahin-AI (no reverse dependency)
* Exception: DAuth may query DOS foundation tables for scope resolution via a read-only adapter

### AB.2 Synchronous communication

* Internal service calls within the same process use direct function imports
* All inter-module calls must go through typed interfaces, not concrete implementations
* No circular dependencies between DOS/DAuth/Shahin-AI packages
* Timeout: 10 seconds for internal calls, 30 seconds for external

### AB.3 Asynchronous communication

* Use the canonical DOS event bus for async communication
* Event naming: `{namespace}.{entity}.{action}` (e.g., `dauth.session.created`, `dos.org.updated`)
* Events must be fire-and-forget — no request-response over events
* Event consumers must be idempotent
* Event payloads must include: `tenantId`, `actorId`, `entityType`, `entityId`, `action`, `timestamp`, `correlationId`

### AB.4 Contract versioning

* Service contracts must be typed TypeScript interfaces
* Breaking changes require a new interface version + migration path
* No implicit JSON-based contracts between DOS/DAuth/Shahin-AI

---

## AC. Configuration & Secrets Management

### AC.1 Configuration hierarchy

```text
defaults (code) → environment variables → tenant settings (DB) → feature flags (DB)
```

* Code defaults are fallback only
* Env vars override code defaults
* Tenant-specific settings override env vars for tenant-scoped config
* Feature flags can override behavior at any level

### AC.2 Secrets handling

* Secrets stored in environment variables — never in code, config files, or database
* Secrets must not appear in: logs, error messages, API responses, event payloads, audit entries
* JWT signing key must be rotatable without downtime (support key ID rotation)
* Database credentials must use connection-string-based config, not individual host/port/user/pass vars
* Secrets in staging must differ from production — no shared credentials across environments

### AC.3 Feature flag lifecycle (§20 enforcement)

Every feature flag must have:

* `flag_key` — unique identifier
* `description` — what it controls
* `created_at` — when introduced
* `kill_date` — when it must be removed or made permanent
* `owner` — who is responsible
* `replacement` — what replaces it when killed

Feature flags without a kill date are rejected in code review.

### AC.4 Startup validation

* All required env vars validated at process start — fail fast with clear error message
* Database connectivity validated at start
* DAuth signing key availability validated at start
* Feature flag table existence validated at start
* Missing critical config = process refuses to start

---

## AD. Structured Logging Standard

### AD.1 Log format

JSON structured logs with these required fields:

```json
{
  "timestamp": "ISO 8601",
  "level": "info|warn|error|debug",
  "service": "dauth|dos|shahin-ai",
  "module": "identity|access|foundation|...",
  "correlationId": "uuid",
  "tenantId": "string or null",
  "actorId": "string or null",
  "message": "human-readable",
  "data": {}
}
```

### AD.2 Log levels

| Level | Use |
|-------|-----|
| `error` | Unexpected failure, requires investigation |
| `warn` | Degraded behavior, recoverable, monitor |
| `info` | Significant business event (login, provisioning step, access granted/denied) |
| `debug` | Developer diagnostics, never in production unless temporarily enabled |

### AD.3 PII rules

* Never log: passwords, tokens, secrets, full email addresses, SSN equivalents
* Allowed to log: user ID, tenant ID, actor ID, role codes, permission codes
* Email logging: mask as `u***@domain.com` if needed for debugging
* IP addresses: allowed in auth audit logs, not in general application logs

### AD.4 Correlation ID propagation

* Generate `correlationId` at request entry (DAuth middleware)
* Propagate through all service calls, events, background jobs
* Include in all log entries and error responses
* Include in audit entries

---

## AE. Performance & Scaling Standards

### AE.1 Database query rules

* No `SELECT *` in production code — explicit column lists only
* All queries touching user-facing endpoints must complete in < 200ms at p95
* Queries joining more than 3 tables must be reviewed for optimization
* All tenant-schema queries must use the schema-qualified table name
* Index strategy: every FK column indexed, every frequent filter column indexed

### AE.2 Connection pooling

* Pool per PM2 worker: max 10 connections
* Idle timeout: 30 seconds
* Connection acquisition timeout: 5 seconds
* Monitor pool exhaustion — alert if > 80% utilization sustained for > 5 minutes

### AE.3 Caching strategy

* DAuth access snapshots: cache per actor per tenant, invalidate on role/assignment change
* DOS org hierarchy: cache per tenant, invalidate on structure change
* Module manifests: cache at startup, refresh on module registration change
* No cache for: auth decisions (always resolve fresh), audit entries, session validation
* Cache TTL: max 5 minutes for access data, max 1 hour for structural data

### AE.4 Pagination

* All list endpoints must support pagination
* Default page size: 25
* Max page size: 100
* Cursor-based pagination for large datasets (> 10K rows)
* Offset-based pagination acceptable for small datasets

### AE.5 Rate limiting

* Auth endpoints (login, register, reset): 10 requests/minute per IP
* API endpoints: 600 requests/minute per tenant
* Webhook/integration endpoints: 100 requests/minute per source
* Agent actions: per-agent circuit breaker + 30 actions/minute cap
* Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## AF. Release & Versioning Standards

### AF.1 Semantic versioning

* Platform version: `MAJOR.MINOR.PATCH` (e.g., `1.0.0`)
* MAJOR: breaking changes to DOS/DAuth contracts
* MINOR: new features, new modules, non-breaking additions
* PATCH: bug fixes, security patches, performance improvements

### AF.2 Changelog requirements

Every release must have a changelog entry with:

* version number
* date
* summary of changes (features, fixes, breaking changes)
* migration notes if any
* deprecation notices with death dates (§14)

### AF.3 Release process

1. All tests pass (unit + contract + integration)
2. All migrations tested against staging
3. Changelog updated
4. Version bumped
5. Tagged in git
6. Deployed to staging → smoke test
7. Deployed to production → deployment checklist (§Y.5)

### AF.4 Hotfix process

1. Branch from production tag
2. Minimal fix only — no scope widening (Law 15)
3. Tests for the specific fix
4. Deploy to staging → verify → deploy to production
5. Backport to main branch

---

## AG. Incident Response Runbook

### AG.1 Severity levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|---------|
| **SEV-1** | Complete system down | < 15 minutes | Auth system crash, database unreachable, all tenants affected |
| **SEV-2** | Major feature broken | < 1 hour | Provisioning fails, SoD engine crash, specific tenant locked |
| **SEV-3** | Minor feature degraded | < 4 hours | Dashboard slow, non-critical background job failing |
| **SEV-4** | Cosmetic/low impact | Next business day | UI alignment issue, non-blocking warning |

### AG.2 Auth system down

1. Check PM2 status: `pm2 status`
2. Check for orphaned processes: `ps aux | grep node`
3. Check database connectivity
4. Check DAuth signing key availability
5. Check Nginx proxy status
6. If stale workers: `pm2 delete all && pm2 start`
7. If DB issue: check connection pool, check max connections
8. Verify auth flow after recovery

### AG.3 Provisioning failure

1. Check which step failed: query `provisioning_steps` table
2. Check broken imports in seed steps
3. Verify tenant schema was created
4. If step 5 (org structure): check DOS foundation service
5. Retry from failed step (step runner supports resume)
6. If unrecoverable: archive failed tenant, provision fresh

### AG.4 Tenant locked / quarantined

1. Verify quarantine reason in `tenant_security_config`
2. If accidental: update tenant state to `active`
3. If security: investigate before unlocking
4. Log all state changes in audit

### AG.5 SoD engine crash

1. SoD engine is deny-by-default — users see "access denied" (safe)
2. Check DAuth SoD engine logs
3. Restart affected worker
4. Verify SoD rules table is intact
5. Run SoD validation test suite

### AG.6 Session storm (mass token refresh)

1. Check refresh token table for volume spike
2. Check if token signing key was rotated (causes mass refresh)
3. Scale up PM2 workers temporarily
4. If DDoS: enable Nginx rate limiting on `/api/auth/refresh`
5. Monitor until stable

---

## AH. API Versioning & Deprecation

### AH.1 API version strategy

* Version via URL prefix: `/api/v1/...`
* Current version: `v1` (rebuild baseline)
* New major version only when breaking contract changes are required
* Minor additions (new fields, new endpoints) do not require new version

### AH.2 Endpoint deprecation rules (§14)

Every deprecated endpoint must include:

* `Sunset` HTTP header with removal date
* `Deprecation` HTTP header with deprecation date
* Documentation update with replacement endpoint
* Owner assigned
* Removal date enforced — no permanent deprecation

### AH.3 Breaking change policy

* Breaking changes require MAJOR version bump
* Minimum 90 days notice before removal
* Migration guide must be provided
* Old version must remain functional during notice period

---

## AI. Internationalization Standards

### AI.1 Language support

* Primary: English (en)
* Secondary: Arabic (ar) — full RTL support
* All user-facing text must be i18n-keyed — no hardcoded strings in templates
* Auth error messages must be i18n-safe (return keys, not pre-formatted strings)

### AI.2 Bilingual data model

* All entity names must support `name_en` + `name_ar` columns
* All descriptions must support `description_en` + `description_ar`
* UI must render based on user locale preference
* Fallback: if Arabic translation missing, show English

### AI.3 RTL rules

* All layouts must support `dir="rtl"` switching
* Use logical CSS properties (`inline-start`/`inline-end`, not `left`/`right`)
* All styles in `rtl-depth.css` apply automatically via theme
* Icons that imply direction (arrows, chevrons) must flip in RTL

### AI.4 Date / number formatting

* Dates: user locale preference (ISO 8601 in API, formatted in UI)
* Numbers: respect locale for thousand/decimal separators
* Currency: tenant-configured
* Time zones: per-tenant + per-user override

### AI.5 Auth flow localization

* Login page: bilingual
* Error messages: i18n-keyed
* MFA prompts: bilingual
* Email templates (verification, reset): bilingual with tenant language preference

---

## AJ. Data Integrity & Backup Standards

### AJ.1 Backup strategy

* Full database backup: daily at 02:00 UTC
* WAL archiving: continuous (point-in-time recovery)
* Backup retention: 30 days for daily, 7 days for WAL
* Backup location: separate storage from primary database
* Backup encryption: AES-256 at rest

### AJ.2 Point-in-time recovery (PITR)

* Must be able to restore any tenant to any point within last 7 days
* PITR tested monthly — documented test results
* Recovery time target: < 1 hour for single tenant, < 4 hours for full database

### AJ.3 Data retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Auth audit logs | 2 years | Compliance |
| Access decision logs | 1 year | Investigation |
| Session data | 90 days after expiry | Security review |
| Provisioning logs | 1 year | Troubleshooting |
| User data (active) | Indefinite while active | Business |
| User data (deactivated) | 90 days then anonymize | Privacy/PDPL |
| Tenant data (deactivated) | 180 days then archive | Contract |

### AJ.4 PII classification

| Classification | Examples | Handling |
|---------------|----------|----------|
| **High** | Passwords, tokens, secrets | Never stored in plaintext, never logged |
| **Medium** | Email, phone, full name | Encrypted at rest, masked in logs |
| **Low** | Role codes, tenant ID, timestamps | Standard handling |

### AJ.5 Data integrity checks

* Foreign key constraints enforced at database level
* Application-level referential integrity for cross-schema references
* Orphan record detection: scheduled job (weekly) checks for FK violations
* Data consistency validation: provisioning post-seed validation step

---

## AK. Compliance & Regulatory Standards

### AK.1 Platform self-compliance

The platform itself must comply with:

| Standard | Scope | Status |
|----------|-------|--------|
| **Saudi PDPL** | Personal data protection for Saudi users/tenants | Required |
| **NCA ECC** | Essential Cybersecurity Controls (Saudi) | Required |
| **ISO 27001** | Information security management | Target |
| **SOC 2 Type II** | Security, availability, processing integrity | Target |
| **OWASP Top 10** | Application security | Enforced in code review |

### AK.2 Auth compliance requirements

* Password policy: minimum 12 characters, complexity requirements
* MFA: required for admin/privileged roles
* Session timeout: configurable per tenant, max 24 hours
* Brute force protection: account lockout after 5 failures
* Token expiry: access token ≤ 15 minutes, refresh token ≤ 7 days
* Revocation: immediate effect, no grace period

### AK.3 Audit trail requirements

* Every auth decision must be traceable to actor + principal + time + reason
* Audit logs must be immutable (append-only table, no UPDATE/DELETE)
* Audit logs must be retained per §AJ.3 retention policy
* Audit log access must itself be logged (meta-audit)

### AK.4 Data residency

* All data stored in tenant-configured region
* No cross-region data transfer without explicit tenant consent
* Backup storage in same region as primary

---

## AL. Disaster Recovery & Business Continuity

### AL.1 Recovery targets

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | < 4 hours for full platform |
| **RPO** (Recovery Point Objective) | < 1 hour (WAL archiving) |
| **Single tenant recovery** | < 1 hour |
| **Auth system recovery** | < 30 minutes |

### AL.2 Failover procedures

1. Database failover: automatic via managed PostgreSQL if available, manual promotion otherwise
2. Application failover: PM2 auto-restart on crash, Nginx health check routing
3. DNS failover: manual — update if primary server unrecoverable

### AL.3 DR testing

* DR drill: quarterly
* Single-tenant restore test: monthly
* Auth system restart test: weekly (part of deployment checklist)
* Results documented and reviewed

### AL.4 Business continuity

* Platform must degrade gracefully — read-only mode if write path fails
* Auth must be the last system to go down and first to recover
* Provisioning failures must not affect existing tenants
* Tenant isolation must prevent one tenant's issues from affecting others

---

## AM. Capacity Planning & Limits

### AM.1 System targets

| Metric | Target |
|--------|--------|
| Tenants | 500 |
| Users per tenant | 1,000 |
| Concurrent sessions per tenant | 200 |
| Total concurrent sessions | 10,000 |
| API requests per second (platform) | 1,000 |
| Database connections (total) | 200 |
| Database size per tenant | 5 GB average |
| Total database size | 2.5 TB |

### AM.2 Connection pool sizing

* PM2 workers: 4 (production)
* Connections per worker: 10
* Total pool: 40 connections
* Reserve: 10 connections for migrations/maintenance
* Max database connections: 50

### AM.3 Storage growth

* Audit logs: ~10 MB/tenant/month
* Domain data: ~50 MB/tenant/month
* Evidence/attachments: ~200 MB/tenant/month (external storage)
* Monitor: alert if any tenant exceeds 2x average

### AM.4 Scaling triggers

* CPU sustained > 80% for 10 minutes → scale up workers
* Memory sustained > 85% → investigate leaks, scale if needed
* Connection pool > 80% → scale connections or optimize queries
* Response time p95 > 500ms → investigate and optimize

---

## AN. Dependency Management Standards

### AN.1 Package policies

* Lock file (`package-lock.json`) must be committed — no `npm install` without lock update
* No duplicate packages for the same concern (e.g., two HTTP clients)
* Prefer established packages with active maintenance
* No packages with known critical vulnerabilities — `npm audit` must pass

### AN.2 Security scanning

* `npm audit` run on every CI build
* Critical/high vulnerabilities block merge
* Dependabot or equivalent enabled for automated PR updates
* Monthly manual review of dependency health

### AN.3 Version pinning

* Direct dependencies: pin exact versions (`"express": "4.18.2"`, not `"^4.18.2"`)
* Dev dependencies: allow minor range (`"vitest": "^1.0.0"`)
* No `*` or `latest` version specifiers

### AN.4 Banned packages

* No `moment.js` (use `date-fns` or native `Intl`)
* No `lodash` full import (use `lodash-es` or native)
* No `request` (deprecated — use `fetch` or `undici`)
* No ORM that hides SQL (use raw SQL with typed query builders)

---

## AO. Code Style & Lint Standards

### AO.1 TypeScript strictness

* `strict: true` in all tsconfig files
* `noImplicitAny: true`
* `strictNullChecks: true`
* `noUnusedLocals: true`
* `noUnusedParameters: true`

### AO.2 File naming

* Services: `kebab-case.service.ts` (e.g., `access-resolver.service.ts`)
* Types: `kebab-case.types.ts`
* Tests: `kebab-case.service.test.ts` (beside source)
* Routes: `kebab-case.routes.ts`
* Middleware: `kebab-case.middleware.ts`
* Constants: `kebab-case.constants.ts`

### AO.3 Import ordering

1. Node built-ins (`path`, `fs`, `crypto`)
2. External packages (`express`, `jsonwebtoken`)
3. Platform imports (`@platform/dauth`, `@platform/dos`)
4. Product imports (`@products/shahin-ai`)
5. Relative imports (`./`, `../`)

### AO.4 Code rules

* No `any` type in production code — use `unknown` + type guards
* No `console.log` in production — use structured logger
* No magic numbers — use named constants
* No nested callbacks beyond 2 levels — use async/await
* Max function length: 50 lines (guideline, not hard block)
* Max file length: 400 lines (split if exceeded)

### AO.5 SQL style

* Keywords in UPPERCASE: `SELECT`, `FROM`, `WHERE`, `JOIN`
* Table names in `snake_case`
* Column names in `snake_case`
* All queries parameterized — no string interpolation for values
* No `SELECT *` in production queries

---

## AP. Documentation Standards

### AP.1 What must be documented

| Artifact | Where | Owner |
|----------|-------|-------|
| Architecture decisions | `AGENTS.md` (this file) | Platform team |
| API contracts | OpenAPI/Swagger auto-generated from route definitions | Route owner |
| Module registration | Module barrel + manifest | Module owner |
| Migration notes | Changelog per release | Releaser |
| Runbook/incident response | `AGENTS.md` §AG | Platform team |
| Onboarding guide | `docs/onboarding.md` | Platform team |

### AP.2 Where docs live

* `AGENTS.md` — master architecture + runbook (this file)
* `CLAUDE.md` — code review rules and design laws
* `docs/` — product documentation, API docs, onboarding guide
* No markdown files inside `backend/src/` or `frontend/src/` unless they are intentionally product documentation
* No `IMPLEMENTATION-STATUS.md` or `ENTERPRISE-RBAC-ENHANCEMENTS.md` style docs inside source tree (§20 extension)

### AP.3 API documentation

* Every route group must have an OpenAPI-compatible description
* Request/response types must be inferred from TypeScript types where possible
* Auth requirements must be documented per endpoint
* Error responses must reference the canonical error set (§O.2)

---

## AQ. Monitoring & Alerting Standards

### AQ.1 Required metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time p95 | Application | > 500ms for 5 minutes |
| API error rate (5xx) | Application | > 1% for 5 minutes |
| Auth failure rate | DAuth | > 10 failures/minute per tenant |
| Database connection pool usage | Database | > 80% for 5 minutes |
| PM2 worker restarts | PM2 | > 3 restarts in 10 minutes |
| Disk usage | System | > 85% |
| Memory usage per worker | PM2 | > 512MB sustained |
| Provisioning failure rate | DOS | Any failure (immediate alert) |
| SoD block rate | DAuth | Spike > 3x baseline |

### AQ.2 Health check endpoints

| Endpoint | Checks | Auth |
|----------|--------|------|
| `GET /api/health` | Server alive | None |
| `GET /api/health/ready` | DB connected + DAuth key loaded | None |
| `GET /api/health/deep` | Full dependency check | Admin only |

### AQ.3 Dashboard requirements

* **Operations dashboard**: request rate, error rate, response time, active workers
* **Auth dashboard**: login rate, failure rate, token refresh rate, active sessions
* **Provisioning dashboard**: active provisions, step success rates, failure log
* **Tenant dashboard**: tenant count by state, storage per tenant, user counts

### AQ.4 Alert escalation

| Level | Channel | Response |
|-------|---------|----------|
| **Warning** | Slack/email | Monitor, investigate within 4 hours |
| **Critical** | Slack + SMS | Investigate within 30 minutes |
| **Emergency** | Slack + SMS + phone | Immediate response, SEV-1 incident |

### AQ.5 SLA targets

| Metric | Target |
|--------|--------|
| Platform availability | 99.9% monthly |
| Auth system availability | 99.95% monthly |
| API response time (p95) | < 300ms |
| Provisioning success rate | > 99% |
| Planned maintenance window | < 1 hour/month |

# Patch 1 — Platform Full-Stack Core

## 0. Patch Identity

### 0.1 Patch name

**Patch 1 — Platform Full-Stack Core**

### 0.2 Patch class

This is a **Reusable Enforcement Patch**.

It is simultaneously:

* target-state specification
* comparison specification
* implementation specification
* review specification
* handover specification

### 0.3 Patch purpose

This patch defines the complete **platform-core target model** for Dogan-AI-OS.

It tells an agent exactly how to:

* inspect the platform core
* compare current implementation against the target platform standard
* classify the platform-core gaps
* know what files, services, contracts, tables, APIs, events, workflows, admin surfaces, tests, and handover records must exist
* know what must never be built in the platform layer

### 0.4 Patch role in the patch library

This patch defines the platform base that all later patches consume.

Everything later depends on the platform core being correct:

* DAuth
* products
* product server stack
* modules
* workflows
* agents
* UI shell
* dynamic UI
* settings/admin
* operations/handover

No later patch may redefine platform-core ownership.

---

## 1. Scope and Object Types

### 1.1 What this patch governs

This patch governs the **platform core object model** of DOS.

### 1.2 Target object types

This patch applies to:

* platform core object
* tenant object
* workspace object
* product registry object
* module registry object
* platform lifecycle object
* platform event-backbone object
* platform provisioning-backbone object
* platform configuration object
* platform observability object
* platform shell-core contract object
* platform route-mount object
* platform runtime composition object

### 1.3 Explicitly out of scope

This patch does **not** define in full detail:

* DAuth internal auth logic
* product-specific behaviors
* product server internals
* deep module blueprint
* deep workflow blueprint
* AI/agent blueprint
* full UI component blueprint
* settings/admin deep blueprint

Those are handled in later patches.

### 1.4 Platform-core definition

The platform core is the set of reusable, product-neutral runtime capabilities that allow products and modules to exist, load, run, integrate, provision, observe, and hand over safely.

---

## 2. Canonical Target Blueprint

## 2.1 Platform-core responsibilities

DOS platform core must provide these capabilities as first-class runtime services:

### A. Tenancy and workspace runtime

* tenant identity
* tenant activation state
* tenant boundaries
* workspace identity and workspace runtime state
* tenant/product/module enablement
* tenant configuration
* tenant-level observability and lifecycle anchors

### B. Product and module composition

* platform product registry
* platform module registry
* module dependency resolution
* module lifecycle definition registration
* module provisioning order
* module health registration
* module ownership boundaries

### C. Provisioning backbone

* tenant bootstrap orchestration
* workspace creation
* product/module activation orchestration
* org-pack and runtime-seed orchestration
* step sequencing and retry model
* provisioning audit trail
* provisioning health and recovery

### D. Event backbone

* platform event catalog
* event namespace ownership
* publish/subscribe registration
* idempotency expectations
* correlation and tracing requirements
* dead-letter and retry expectations
* event contract versioning rule

### E. Lifecycle backbone

* generic state-machine engine
* generic lifecycle definition registry
* transition definitions
* lifecycle checkpoints
* lifecycle event coupling
* lifecycle audit and recovery entry points

### F. Platform shell contract

* platform navigation contract
* product/module surfacing rules
* workspace state contract
* layout/shell integration contract
* runtime loading state contract
* lifecycle/status banner contract
* handover-safe shell behavior

### G. Platform configuration and feature control

* feature flags
* platform settings
* module operating state
* product enablement state
* tenant settings baseline
* runtime-safe configuration loading

### H. Platform observability and operations

* health contract
* metrics contract
* logs contract
* structured event tracing
* provisioning observability
* module health aggregation
* product runtime health aggregation
* deployment/runtime config awareness

### I. Platform handover surface

* explicit as-built update points
* platform change ledger
* runtime topology visibility
* deployment and cutover record expectations

---

## 2.2 Platform-core ownership boundaries

### DOS owns directly

* tenants
* workspaces
* platform products
* product modules
* tenant module entitlements
* module registry
* event catalog and event backbone
* provisioning backbone
* generic lifecycle framework
* platform settings and feature control
* shell/navigation/runtime composition contracts
* platform health and observability

### DOS consumes but does not own

* DAuth access/auth decisions
* product domain tables
* module-specific business rules
* product-specific dashboards and widgets
* agent-specific control logic

### DOS must not implement

* full auth decision logic
* permission truth
* SoD engine
* delegation engine
* product-specific role logic
* module-local business workflow logic except generic lifecycle support

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/
  core/
  tenancy/
  workspace/
  products/
  modules/
  provisioning/
  lifecycle/
  events/
  settings/
  observability/
  shell/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split

#### `core/`

Reusable platform composition services only.

#### `tenancy/`

Tenant runtime identity, tenant configuration loading, tenant activation state, tenant boundaries.

#### `workspace/`

Workspace runtime model, workspace lifecycle anchors, workspace provisioning state.

#### `products/`

Product registration, product enablement, product metadata, product composition services.

#### `modules/`

Module registry, dependency resolution, module operating states, module activation ordering, module runtime composition.

#### `provisioning/`

Provisioning orchestrators, provisioning steps, seed engines, org-pack runtime seeding, provisioning recovery.

#### `lifecycle/`

Generic lifecycle/state-machine engine and lifecycle definition registry.

#### `events/`

Event bus, event catalog, event publisher interfaces, event subscription registry, event tracing hooks.

#### `settings/`

Feature flags, platform config, tenant settings loaders, runtime config contracts.

#### `observability/`

Health, metrics, logs, runtime platform diagnostics, provisioning telemetry.

#### `shell/`

Platform shell runtime contracts only, not frontend components.

#### `contracts/`

Platform-wide shared backend contracts used by DOS consumers.

#### `types/`

DOS-owned types only. No dead generic dumping ground.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/dos/
  shell/
  workspace/
  navigation/
  lifecycle/
  products/
  modules/
  settings/
  observability/
  contracts/
  index.ts
```

### 2.4.1 DOS frontend ownership

DOS frontend core must provide:

* shell runtime composition
* navigation composition
* workspace context
* product/module surfacing
* lifecycle/status presentation hooks
* shell-level loading/error states
* platform settings/runtime state consumption

It must not embed product-specific business logic.

---

## 2.5 Required platform tables

### 2.5.1 Canonical runtime truth tables owned by DOS

These must be treated as platform-core runtime truth where applicable:

* `tenants`
* `workspaces`
* `platform_products`
* `product_modules`
* `tenant_module_entitlements`
* `tenant_settings`
* `subscriptions`
* `tier_definitions`
* `modules`
* `module_workflow_registry`
* `module_lifecycle_definitions`
* `module_lifecycle_transitions`
* `feature_flags`
* `settings`

### 2.5.2 Registry metadata tables DOS may own or consume

* module registration/metadata tables
* event-type registry tables
* module activation rule tables
* lookup and ontology surfaces that are platform-owned metadata, not auth truth

### 2.5.3 Provisioning/seed tables DOS owns

* `onboarding_*`
* `provisioning_*`
* `workspace_seeds`
* `pack_installations`
* `seed_history`
* `seeding_depth_config`
* `startup_checklists`
* `tenant_blueprints`
* `ninety_day_plans`
* `plan_item_instances`

### 2.5.4 Presentation/runtime config tables DOS may own

* `workspace_profile`
* dashboard and navigation registry/config tables
* presentation/runtime config tables that define experience, not auth truth

### 2.5.5 Legacy/archive platform tables

Must be explicitly identified, classified, and removed from runtime dependence.

---

## 2.6 Required DOS services

### Tenancy

* `TenantService`
* `TenantConfigService`
* `TenantStatusService`
* `TenantBoundaryService`

### Workspace

* `WorkspaceService`
* `WorkspaceStateService`
* `WorkspaceProvisioningStateService`
* `WorkspaceProfileRuntimeService`

### Products

* `ProductRegistryService`
* `ProductEnablementService`
* `ProductCompositionService`

### Modules

* `ModuleRegistryService`
* `ModuleDependencyService`
* `ModuleOperatingStateService`
* `ModuleLifecycleDefinitionService`
* `ModuleActivationService`
* `ModuleHealthService`

### Provisioning

* `ProvisioningOrchestratorService`
* `ProvisioningStepRunnerService`
* `OrgPackSeedingService`
* `WorkspaceSeedService`
* `ProvisioningRecoveryService`
* `ProvisioningAuditService`

### Lifecycle

* `StateMachineEngine`
* `LifecycleDefinitionService`
* `LifecycleCheckpointService`
* `LifecycleTransitionRegistryService`

### Events

* `EventBus`
* `EventCatalogService`
* `EventPublisherService`
* `EventSubscriptionRegistryService`
* `EventTracingService`
* `DeadLetterPolicyService`

### Settings and config

* `FeatureFlagService`
* `PlatformSettingsService`
* `RuntimeConfigService`
* `TenantSettingsService`

### Observability

* `PlatformHealthService`
* `RuntimeMetricsService`
* `ProvisioningTelemetryService`
* `SystemDiagnosticsService`

### Shell/runtime composition

* `ShellContractService`
* `NavigationContractService`
* `ModuleVisibilityContractService`

---

## 2.7 Required APIs and contracts

### 2.7.1 Required backend API classes

The platform core must expose contracts for:

* tenant resolution
* workspace runtime state
* product and module discovery
* provisioning status
* feature flags/settings retrieval
* module lifecycle/state retrieval
* platform health/diagnostics endpoints where appropriate

### 2.7.2 Required contract types

DOS must define contract types for:

* tenant runtime context
* workspace runtime context
* product registration
* module registration summary
* provisioning step status
* lifecycle status summary
* shell composition
* navigation composition
* dashboard/layout composition references
* module enablement and operating state

### 2.7.3 Required API behavior

Any platform-core API must:

* be typed
* be product-neutral unless explicitly product-scoped
* carry tenant/workspace context where relevant
* be auditable when state-changing
* expose stable response shapes
* not embed auth truth that belongs to DAuth

---

## 2.8 Required event architecture

### 2.8.1 Event backbone requirements

DOS must provide:

* one canonical event bus
* one canonical event catalog
* stable namespace rules
* module/product publish/consume registration
* tracing/correlation expectations
* lifecycle and provisioning event coupling

### 2.8.2 Event categories

The event catalog must classify events at least as:

* platform events
* provisioning events
* lifecycle events
* module events
* product events
* observability events
* control/security events passed through from DAuth where needed
* integration events

### 2.8.3 Event payload minimums

Every runtime event that matters must include where applicable:

* event id
* namespace
* event name
* timestamp
* actor or initiating principal if relevant
* tenant id
* workspace id if relevant
* product code if relevant
* module code if relevant
* correlation id
* causation id where relevant
* idempotency or replay handling key if relevant

### 2.8.4 Event anti-patterns

Forbidden:

* second event bus implementing parallel truth
* event emitter logic hidden in random modules without registration
* event contracts without correlation context
* event-driven side effects with no audit/trace contract

---

## 2.9 Required lifecycle architecture

### 2.9.1 Generic lifecycle backbone

DOS must provide one reusable lifecycle/state-machine engine.

### 2.9.2 Platform lifecycle role

DOS lifecycle backbone must:

* define generic state machine behavior
* register module lifecycle definitions
* register module transition maps
* emit lifecycle events
* allow DAuth lifecycle authorization to gate transitions
* expose checkpoint and status contract surfaces

### 2.9.3 DOS must not do

* product-specific lifecycle permission logic
* lifecycle authority evaluation that belongs to DAuth
* module-local duplicated lifecycle engines

---

## 2.10 Required shell/runtime composition contract

### 2.10.1 DOS shell contract must define

* tenant/workspace context readiness
* product discovery readiness
* module visibility composition inputs
* lifecycle/status banner inputs
* navigation registry inputs
* runtime loading/error model
* route composition hooks

### 2.10.2 DOS shell must not define

* auth truth
* product-specific business rules
* module-local hidden navigation truth
* frontend-only access shortcuts

---

## 2.11 Required observability architecture

### 2.11.1 Observability minimums

DOS platform core must expose:

* health endpoints or health contracts
* structured logs
* runtime metrics
* provisioning telemetry
* event-bus telemetry
* module readiness/health aggregation
* workspace and tenant runtime diagnostics where appropriate

### 2.11.2 Operational logging minimums

For platform-critical actions DOS must log:

* provisioning step execution
* product/module activation changes
* lifecycle engine state changes
* event bus failures
* startup route composition failures
* configuration load failures
* tenant/workspace runtime failures

---

## 3. Current-State Audit Method

An agent auditing the platform core must perform the following checks.

## 3.1 Package audit

Inspect whether the codebase has:

* DOS namespace roots in backend and frontend
* concern-based package split
* no fallback to old deleted flat structures
* no product logic misplaced into platform core

### Evidence to collect

* folder tree under backend DOS namespace
* folder tree under frontend DOS namespace
* imports pointing to deleted legacy areas
* imports incorrectly pointing from platform core into product or auth truth internals

## 3.2 Table audit

Inspect DOS table ownership and classify each relevant table into the five shared buckets.

### Evidence to collect

* runtime truth tables used by platform services
* registry tables used for manifests/events/modules
* presentation/runtime config tables
* provisioning/seed tables
* legacy/archive tables still referenced

## 3.3 Service audit

Inspect whether required DOS services exist and whether they are:

* canonical
* duplicated
* missing
* incomplete
* wrong-owner

### Evidence to collect

* service file paths
* runtime responsibility of each service
* service dependencies
* overlap with later-patch concerns

## 3.4 Event audit

Inspect:

* event bus implementation
* event catalog implementation
* publish/subscribe registrations
* duplicate event buses or hidden emitters
* correlation/idempotency fields in important events

## 3.5 Provisioning audit

Inspect:

* provisioning orchestrator
* provisioning step runner
* seed services
* org-pack seeding status
* broken imports on provisioning path
* missing explicit bootstrap steps

## 3.6 Lifecycle audit

Inspect:

* generic state-machine engine
* lifecycle definition registry
* transition registry
* per-module lifecycle duplication on platform layer

## 3.7 Shell/runtime composition audit

Inspect:

* shell contracts
* navigation contracts
* module visibility composition inputs
* workspace readiness flow
* route composition surfaces

## 3.8 Observability audit

Inspect:

* health services
* metrics services
* telemetry services
* runtime diagnostics
* logs around provisioning/event bus/module activation

---

## 4. Gap Classification for Platform Core

When comparing current platform object X against this patch, use the shared taxonomy with platform-specific meaning.

### 4.1 Missing

Required DOS service, table usage, contract, event contract, shell contract, or provisioning component does not exist.

### 4.2 Incomplete

The artifact exists but lacks required runtime behavior, tracing, lifecycle binding, registry integration, or validation.

### 4.3 Duplicate

Two or more platform-core components own the same concern, such as:

* two event buses
* multiple registries for the same thing
* competing product/module discovery surfaces
* duplicate provisioning engines

### 4.4 Wrong Owner

A platform concern is implemented in:

* DAuth
* product code
* module code
* frontend-only code
  when DOS should own it.

### 4.5 Wrong Layer

A product-specific concern is embedded in DOS core, or DOS core is trying to own auth truth.

### 4.6 Legacy Carryover

Current platform implementation still relies on deleted or obsolete structures.

### 4.7 Forbidden Pattern

Examples:

* reintroducing old flat middleware style under DOS
* placeholder DOS services
* shadow event bus
* routing around canonical registries

### 4.8 Production Blocker

Examples:

* provisioning broken
* startup route mounting broken
* event bus nonfunctional
* product/module registry broken
* runtime config not resolvable

### 4.9 Handover Blocker

Examples:

* no operational traceability
* no clear platform ownership documentation
* no as-built updates

---

## 5. Required Artifact Matrix for Platform Core

Every platform-core object audit and build pass must use this matrix.

| Artifact Class      | Required in Patch 1 | Examples                                                            |
| ------------------- | ------------------- | ------------------------------------------------------------------- |
| Files/Folders       | Yes                 | DOS namespace packages, provisioning, lifecycle, events             |
| Services            | Yes                 | TenantService, ModuleRegistryService, EventBus                      |
| Contracts/Schemas   | Yes                 | tenant runtime context, module registration summary                 |
| Tables/Data         | Yes                 | tenants, platform_products, modules, module_lifecycle_definitions   |
| APIs                | Yes                 | tenant/workspace/module/provisioning/platform settings endpoints    |
| Events              | Yes                 | platform, provisioning, lifecycle, module registration events       |
| Workflows/Lifecycle | Yes                 | generic lifecycle engine, provisioning state flow                   |
| UI/Admin Surfaces   | Yes                 | shell/navigation/workspace runtime composition inputs               |
| Audit/Logs          | Yes                 | provisioning logs, activation logs, lifecycle logs                  |
| Tests               | Yes                 | provisioning, module registry, event bus, lifecycle, config loading |
| As-Built Updates    | Yes                 | platform-core changes logged                                        |

If any artifact class is skipped in a platform-core pass, that pass is incomplete.

---

## 6. Exact Build Instructions

This section tells the agent what to build or repair when platform-core gaps are found.

## 6.1 If DOS namespace roots are missing or incomplete

### Build this

Create or normalize:

* backend DOS namespace root
* frontend DOS namespace root
* concern-based subfolders for tenancy, products, modules, provisioning, lifecycle, events, settings, observability, shell, contracts

### Do not build this

* no flat revival of deleted generic `middleware/`-style bags
* no placeholder empty folders without owned services

## 6.2 If product/module registry is fragmented

### Build this

Create or stabilize:

* `ProductRegistryService`
* `ModuleRegistryService`
* `ModuleDependencyService`
* `ModuleOperatingStateService`
* `ProductEnablementService`
* `ModuleActivationService`

Add or normalize contracts for:

* product registration
* module registration
* dependency metadata
* lifecycle metadata
* provisioning order

### Do not build this

* module-local hidden registries
* duplicated registry trees in product namespaces

## 6.3 If provisioning is blocked or coupled to deleted code

### Build this

Create or repair:

* `ProvisioningOrchestratorService`
* `ProvisioningStepRunnerService`
* `OrgPackSeedingService`
* `WorkspaceSeedService`
* `ProvisioningRecoveryService`

Provisioning path must explicitly support:

1. tenant creation
2. first user creation
3. actor creation
4. membership creation
5. base org seeding
6. workspace/profile baseline
7. initial access binding handoff to DAuth
8. module/product enablement
9. initial platform readiness state
10. initial snapshot emission handoff

### Do not build this

* provisioning steps that import hollow deleted modules
* product-specific hardcoding in generic provisioning backbone
* silent bootstrap shortcuts that skip actor/membership/org readiness

## 6.4 If eventing is fragmented

### Build this

Create or stabilize:

* `EventBus`
* `EventCatalogService`
* `EventPublisherService`
* `EventSubscriptionRegistryService`
* `EventTracingService`
* `DeadLetterPolicyService`

Every important event must define:

* namespace
* payload shape
* correlation rules
* idempotency/retry expectations
* producer owner
* subscriber owner

### Do not build this

* second parallel event bus
* event emissions without registry/catalog entry
* event payloads with no correlation context

## 6.5 If lifecycle backbone is weak or duplicated

### Build this

Create or stabilize:

* `StateMachineEngine`
* `LifecycleDefinitionService`
* `LifecycleTransitionRegistryService`
* `LifecycleCheckpointService`

Ensure module lifecycle definitions register into DOS and are gated later by DAuth.

### Do not build this

* platform-local copies of product/module lifecycle engines
* lifecycle logic hidden in route handlers

## 6.6 If platform config/settings are fragmented

### Build this

Create or stabilize:

* `RuntimeConfigService`
* `FeatureFlagService`
* `PlatformSettingsService`
* `TenantSettingsService`

Define loading behavior for:

* platform startup
* tenant-aware runtime
* workspace-aware runtime
* product/module visibility inputs

### Do not build this

* ad hoc config reads spread across random modules
* product-level override logic inside DOS core without contract

## 6.7 If shell/runtime composition is vague

### Build this

Create or stabilize contracts for:

* shell readiness
* workspace context
* navigation composition
* product/module surfacing
* lifecycle/status banners
* runtime loading/error states

### Do not build this

* frontend-only hidden module visibility truth
* DOS shell owning product business decisions

## 6.8 If observability is insufficient

### Build this

Create or stabilize:

* `PlatformHealthService`
* `RuntimeMetricsService`
* `ProvisioningTelemetryService`
* `SystemDiagnosticsService`

### Do not build this

* silent failures in provisioning/event bus/module activation
* no structured logs for core platform actions

---

## 7. Example Skeletons

## 7.1 Example backend folder layout

```text
backend/src/platform/dos/
  tenancy/tenant.service.ts
  workspace/workspace.service.ts
  products/product-registry.service.ts
  modules/module-registry.service.ts
  modules/module-dependency.service.ts
  provisioning/provisioning-orchestrator.service.ts
  provisioning/org-pack-seeding.service.ts
  lifecycle/state-machine.engine.ts
  events/event-bus.service.ts
  events/event-catalog.service.ts
  settings/runtime-config.service.ts
  observability/platform-health.service.ts
  contracts/platform-runtime.types.ts
  index.ts
```

## 7.2 Example service shape

```ts
export class ModuleRegistryService {
  registerModule(manifest: ModuleManifest): void {}
  getModule(code: string): ModuleRuntimeDefinition | null { return null; }
  listModules(): ModuleRuntimeDefinition[] { return []; }
  validateDependencies(code: string): DependencyValidationResult { return { ok: true, missing: [] }; }
}
```

## 7.3 Example platform contract

```ts
export interface PlatformRuntimeContext {
  tenantId: string;
  workspaceId?: string;
  activeProducts: string[];
  activeModules: string[];
  featureFlags: Record<string, boolean>;
  shellReady: boolean;
}
```

## 7.4 Example event payload

```ts
export interface ProvisioningStepCompletedEvent {
  eventId: string;
  namespace: 'dos.provisioning';
  eventName: 'step.completed';
  tenantId: string;
  workspaceId?: string;
  stepCode: string;
  correlationId: string;
  occurredAt: string;
}
```

## 7.5 Example test expectations

```ts
it('registers module dependencies and rejects missing hard dependencies', () => {
  // module registry validation example
});

it('marks provisioning as blocked when org-pack seeding fails', () => {
  // provisioning backbone example
});
```

---

## 8. Tests Required for Platform Core

### 8.1 Unit tests required

* tenant service behavior
* product registry registration and retrieval
* module registry and dependency validation
* event catalog validation
* lifecycle definition validation
* runtime config load/merge logic

### 8.2 Integration tests required

* provisioning orchestration path
* org-pack seeding path
* module activation path
* event bus publish/subscribe path
* startup route/runtime composition path
* tenant/workspace runtime context loading path

### 8.3 Contract tests required

* platform runtime context contract
* module registration contract ingestion
* provisioning status contract
* shell composition contract
* lifecycle registry contract

### 8.4 Operational smoke tests required

* server boots without deleted critical-path imports
* provisioning unblocks new tenant bootstrap
* module registry loads expected modules
* event bus starts and traces properly

---

## 9. Review Checklist for Platform Core

The reviewer must confirm:

* DOS owns only platform-generic concerns
* platform-core services are not scattered across wrong layers
* required DOS folders and services exist or are correctly classified missing
* provisioning backbone is explicit and stable
* one canonical event backbone exists
* generic lifecycle backbone exists and is not duplicated
* product/module registry is centralized
* shell/runtime composition contracts are explicit
* observability is present for core runtime paths
* no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 1 passes for target object X only if all required classes below are satisfied.

### 10.1 Ownership correctness

* platform concerns live under DOS
* DAuth concerns are not reimplemented here
* product concerns are not embedded in DOS core

### 10.2 Artifact completeness

* required DOS folders/files/services/contracts exist or are explicitly classified missing for build follow-up
* required tables and registry usage are correctly classified
* required APIs/events/lifecycle contracts are defined

### 10.3 Runtime viability

* provisioning backbone is complete and not blocked by deleted imports
* product/module registry path is operationally coherent
* event backbone is singular and coherent
* lifecycle backbone is singular and coherent

### 10.4 Quality and handover readiness

* observability expectations are defined
* tests are declared
* as-built update instructions are explicit

---

## 11. Fail Conditions

Patch 1 fails if any of the following are true:

* DOS still depends on deleted critical-path imports for provisioning/startup
* product/module registry remains fragmented with no canonical owner
* more than one event bus remains runtime truth
* lifecycle backbone is absent or hidden in scattered implementations
* DOS tries to own auth truth
* product-specific logic is embedded in DOS core without contract justification
* required artifact classes were skipped
* the implementation or audit widened outside platform core without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 1 must update the as-built ledger with:

* DOS platform-core folders created or normalized
* DOS platform-core services created or normalized
* tables/contracts/events affected
* provisioning/runtime boot blockers removed
* event backbone status
* lifecycle backbone status
* product/module registry status
* remaining gaps and blockers
* handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with platform-specific clarity:

1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files Inspected
5. Files Changed
6. Tables / Contracts / Events Affected
7. What Was Built / Fixed
8. What Was Explicitly Not Changed
9. Gap Classification
10. Tests / Validation Run
11. Remaining Risks
12. Final Decision
13. Recommended Next Part
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 1, the next patch should be:

**Patch 2 — Data / Schema / Contracts Stack**

because the platform core, product stack, DAuth stack, module stack, workflow stack, and dynamic UI stack all depend on frozen data and contract rules.

---

## 15. One-Line Use Instruction

Use Patch 1 to compare the current DOS platform core against the full platform-core target, classify every platform gap, build only the missing platform-core artifacts, validate against platform-core pass/fail rules, and update the as-built ledger.

# Patch 2 — Data / Schema / Contracts Stack

## 0. Patch Identity

### 0.1 Patch name

**Patch 2 — Data / Schema / Contracts Stack**

### 0.2 Patch class

This is a **Reusable Enforcement Patch**.

It is simultaneously:

* target-state specification
* data classification specification
* contract specification
* comparison specification
* implementation specification
* review specification
* handover specification

### 0.3 Patch purpose

This patch defines the full target model for:

* platform data ownership
* public schema vs tenant schema boundaries
* canonical runtime truth tables
* registry metadata tables
* presentation/runtime config tables
* provisioning/seed tables
* legacy/archive-only tables
* contract shapes
* manifest schemas
* event payload rules
* API request/response contract rules
* migration and versioning rules

This patch tells an agent exactly how to:

* inspect the current data and contract stack
* classify all tables and schemas correctly
* detect duplicates, wrong ownership, wrong-layer usage, and legacy carryover
* know exactly what data/contract artifacts must exist for any layer/module/product/workflow/object
* know what must never be treated as runtime truth
* know what must be migrated, merged, archived, or deleted later

### 0.4 Patch role in the patch library

All later patches consume this patch.

Without this patch, every later patch drifts on:

* table ownership
* runtime truth
* API contracts
* event payload shape
* manifest registration
* lifecycle/state transition contracts
* UI metadata vs auth truth boundaries

---

## 1. Scope and Object Types

### 1.1 What this patch governs

This patch governs the **data / schema / contracts object model** across DOS, DAuth, products, modules, workflows, UI runtime config, and operations/handover.

### 1.2 Target object types

This patch applies to:

* public schema object
* tenant schema object
* runtime-truth table object
* registry-metadata table object
* presentation/runtime-config table object
* provisioning/seed table object
* legacy/archive table object
* API contract object
* event contract object
* manifest contract object
* type/schema object
* migration object
* contract-versioning object

### 1.3 Explicitly out of scope

This patch does **not** fully define:

* DAuth service internals
* product service internals
* module business logic internals
* workflow engine internals
* UI component behavior

Those are handled in later patches.

### 1.4 Core data law

No later patch may blur data buckets.
No table may play multiple runtime roles without explicit classification and justification.
No contract may mix access truth, display truth, and seed truth without separation.

---

## 2. Canonical Data Model Principles

## 2.1 Schema boundary principle

### Public schema

Public schema holds platform-wide, tenant-independent, master, registry, bootstrap, or cross-tenant data that is intentionally centralized.

### Tenant schema

Tenant schema holds tenant-runtime state, tenant-owned operational state, tenant-scoped registry instances, tenant-scoped product state, tenant-scoped UI/runtime config, and tenant-scoped audits.

### Rule

A table must live in public or tenant schema because of runtime role, not because of convenience.

---

## 2.2 Shared five-bucket model

Every table must be classified into exactly one of these buckets.

### Bucket 1 — Canonical runtime truth

Allowed to participate directly in runtime decisions or runtime state execution.

### Bucket 2 — Registry metadata

Defines registration/configuration metadata or typed module/platform descriptors, but is not the direct effective runtime truth for sensitive decisions unless explicitly materialized into runtime truth.

### Bucket 3 — Presentation / runtime config

Defines dashboards, widgets, layouts, navigation, preferences, experience, visibility composition, and UX/runtime assembly metadata.
It must not become auth or ownership truth.

### Bucket 4 — Provisioning / seed input

Used to create, initialize, or activate runtime state.
May shape runtime initialization.
Must not be treated as the live runtime truth after seeding unless explicitly copied into runtime tables.

### Bucket 5 — Legacy / archive-only

Must not participate in the new runtime.
May remain for reference until hard-delete.

---

## 2.3 Runtime truth law

Only Bucket 1 tables may be used directly to:

* decide access
* decide scope
* decide authority
* decide lifecycle transition execution
* decide delegation/SoD
* define live tenant/platform state
* define live module/product enablement

Everything else must be consumed through the correct translation layer.

---

## 2.4 Registry law

Bucket 2 metadata may define:

* what can exist
* how something is registered
* what is allowed structurally
* module/product/workflow/event/manifest metadata

Bucket 2 metadata may not be assumed to equal effective runtime truth unless a runtime projection/materialization/resolution step says so explicitly.

---

## 2.5 Presentation law

Bucket 3 tables may affect:

* shell composition
* dashboard composition
* navigation
* widget selection
* user preferences
* runtime layout and experience

Bucket 3 tables may not define:

* effective permissions
* scope truth
* approval authority
* SoD outcomes
* tenant entitlement truth

---

## 2.6 Provisioning law

Bucket 4 tables may define:

* bootstrap defaults
* seed templates
* onboarding answers and activation plans
* org packs
* role packs
* provisioning jobs/steps

Bucket 4 tables may not be used as substitute runtime truth after provisioning unless explicitly promoted into Bucket 1 runtime state.

---

## 2.7 Legacy law

Bucket 5 tables must be:

* classified
* isolated
* made non-authoritative
* scheduled for archive or delete

No new runtime dependency may be introduced on a Bucket 5 table.

---

## 3. Canonical Ownership by Data Domain

## 3.1 DOS-owned canonical runtime truth domains

DOS owns runtime truth for:

* tenants
* workspaces
* platform products
* product modules
* tenant module entitlements
* platform settings/configuration runtime state
* feature flags
* module operating states
* module lifecycle definitions and transitions
* organization/foundation structure
* team/position/people platform structure
* provisioning runtime state
* platform event catalog/registry runtime state where applicable

## 3.2 DAuth-owned canonical runtime truth domains

DAuth owns runtime truth for:

* identity-linked user state relevant to auth/control
* sessions and tokens
* tenant memberships
* actor access assignments
* functional roles
* access profiles
* permissions
* role permissions
* permission inheritance/projection
* authorities
* delegation runtime state
* SoD runtime state
* auth/security configuration runtime state
* invitation and external user scope control
* access review runtime state
* auth/security audit logs

## 3.3 Product-owned canonical runtime truth domains

Products own runtime truth for:

* product business objects
* product-specific workflow state
* product domain decisions and artifacts
* product-specific analytics/runtime state
* product-specific configurable policy state where not DOS/DAuth-owned

### Important rule

Product business tables are **protected domain runtime**, not DAuth core truth.
DAuth governs access to them; it does not own them as its own runtime truth.

## 3.4 Shared but separated domains

Some domains interact heavily but must stay distinct:

* profile vs access vs experience
* lifecycle definitions vs lifecycle authorization
* product/module manifests vs effective runtime enablement
* UI visibility metadata vs actual access truth
* seed templates vs live runtime state

---

## 4. Canonical Bucket Definitions with Examples

## 4.1 Bucket 1 — Canonical runtime truth

### DOS examples

* `tenants`
* `workspaces`
* `platform_products`
* `product_modules`
* `tenant_module_entitlements`
* `tenant_settings`
* `subscriptions`
* `tier_definitions`
* `modules`
* `module_workflow_registry`
* `module_lifecycle_definitions`
* `module_lifecycle_transitions`
* `feature_flags`
* `settings`
* `organizations`
* `business_units`
* `departments`
* `sections`
* `teams`
* `team_members`
* `positions`
* `org_hierarchy_nodes`
* `org_hierarchy_edges`
* `org_dimensions`
* `org_dimension_values`
* `governance_bodies`
* `governance_committees`
* `governance_committee_members`
* `governance_reporting_lines`
* `governance_responsibilities`
* `governance_responsibility_assignments`
* `governance_raci_assignments`
* `raci_assignments`
* `raci_matrices`
* `person_profiles`
* `member_profiles`
* `member_lifecycle_events`
* `legal_entities`

### DAuth examples

* `users`
* `tenant_user_memberships`
* `email_verification_tokens`
* `password_reset_tokens`
* `user_mfa`
* `login_attempts`
* session and refresh-token tables
* token revocation tables
* actor tables
* `access_profiles`
* `functional_roles`
* `permissions`
* `role_permissions`
* `user_access_profiles`
* `enterprise_user_role_assignments`
* `user_role_assignments`
* `actor_access_assignments`
* `actor_role_assignments`
* `authority_levels`
* `authority_matrix`
* `decision_authorities`
* `delegations`
* `delegation_rules`
* `delegated_authorities`
* `sod_rules`
* `sod_conflict_log`
* `sod_conflict_matrix`
* `sign_off_authority_matrix`
* `access_review_campaigns`
* `access_review_items`
* `invitations`
* `external_user_scopes`
* `tenant_security_config`
* `authorization_decision_log`
* `authz_decision_log`
* `guard_decision_log`

### Product examples

* risk domain tables
* controls domain tables
* evidence domain tables
* audit domain tables
* policy domain tables
* compliance domain tables
* incident domain tables
* vendor domain tables
* workflow domain tables
* product AI domain runtime tables

---

## 4.2 Bucket 2 — Registry metadata

### Platform/module metadata examples

* `module_role_definitions`
* `module_permissions`
* `module_actions`
* `module_approval_matrices`
* `module_ownership_rules`
* `module_sod_rules`
* `module_activation_rules`
* event type registry tables
* lookup reference data tables
* ontology/taxonomy tables
* framework registries and scoring metadata where they are not live business runtime truth
* manifest-ingestion tables or registry projections

### Registry rule examples

A module permission definition registry is Bucket 2.
A runtime effective permission assignment is Bucket 1.
A module lifecycle definition registry may be Bucket 1 if actively used to execute runtime transitions. If only static metadata, it remains Bucket 2 until promoted.

---

## 4.3 Bucket 3 — Presentation / runtime config

Examples:

* `workspace_profile`
* `dashboard_configs`
* `dashboard_layouts`
* `dashboard_registry`
* `dashboard_role_bindings`
* `dashboard_widget_registry`
* `widget_registry`
* `navigation_registry`
* `navigation_overrides`
* `navigation_role_bindings`
* `activity_feed`
* `activity_notifications`
* `activity_stream`
* `comments`
* `messages`
* `user_preferences`
* `notification_preferences`
* `notification_queue`
* `drawer_templates`
* `saved_views`
* `command_palette_history`
* `contextual_suggestions`
* role-experience and dashboard-persona tables

### Presentation law examples

A dashboard role binding may influence what a user sees in the shell.
It must never be interpreted as the source of access permission.

---

## 4.4 Bucket 4 — Provisioning / seed input

Examples:

* all `onboarding_*`
* all `provisioning_*`
* `startup_checklists`
* `seed_history`
* `seeding_depth_config`
* `tenant_blueprints`
* `workspace_seeds`
* `pack_installations`
* `ninety_day_plans`
* `plan_item_instances`
* org pack templates
* role pack templates
* seed profiles
* activation templates

### Provisioning law examples

A role-pack template does not equal live runtime assignment.
An onboarding answer does not equal live runtime configuration unless explicitly promoted.

---

## 4.5 Bucket 5 — Legacy / archive-only

Examples:

* `_retired_*`
* `_backup_*`
* `*_legacy`
* superseded older registry generations
* obsolete v1 dashboard/permission config tables

### Legacy law examples

A legacy permission table may be used only for migration comparison or archive.
It must not feed the new AccessResolver runtime path.

---

## 5. Public Schema vs Tenant Schema Rules

## 5.1 Public schema rules

A table belongs in public schema if it is:

* globally shared platform metadata
* cross-tenant registry/master data
* master onboarding/provisioning template source
* platform-wide lookup/taxonomy source
* centralized identity master state where public ownership is correct
* platform-global event or module registry source

## 5.2 Tenant schema rules

A table belongs in tenant schema if it is:

* tenant runtime truth
* tenant-scoped access/control state
* tenant-scoped business runtime state
* tenant-scoped runtime config
* tenant-scoped workflow state
* tenant-scoped audit/runtime execution state
* tenant-scoped UI/runtime experience state

## 5.3 Wrong-placement examples

### Wrong

Putting live tenant-specific auth decisions in public schema.

### Wrong

Putting globally shared module registry source of truth separately in every tenant schema unless explicitly projected.

### Allowed with explanation

Public master templates projected into tenant runtime state during provisioning.

---

## 6. Required Contract Families

Every platform/product/module/workflow/UI layer must use typed contracts belonging to one of these families.

## 6.1 API contracts

These define request/response shapes.

### Required API contract categories

* auth/session contracts
* tenant/workspace runtime contracts
* product/module discovery contracts
* access snapshot contracts
* provisioning contracts
* lifecycle/status contracts
* admin/settings contracts
* workflow contracts
* audit/reporting contracts

### API contract rules

* typed and version-aware
* no duplicated shapes for the same concern without explicit versioning
* explicit error model
* explicit context requirements
* no auth truth hidden in display-only contracts

---

## 6.2 Event contracts

These define event payload shapes.

### Required event fields where applicable

* eventId
* namespace
* eventName
* occurredAt
* correlationId
* causationId if relevant
* actor or initiator if relevant
* tenantId if relevant
* workspaceId if relevant
* productCode if relevant
* moduleCode if relevant
* replay/idempotency handling field if relevant
* payload object

### Event contract rules

* owned by one namespace owner
* documented producer and consumer classes
* idempotency/retry expectations explicit
* must not embed opaque untyped blobs for critical runtime events

---

## 6.3 Manifest contracts

These define module/product registration.

### Required manifest contract categories

* platform manifest contracts
* product manifest contracts
* module manifest contracts
* workflow registration contracts
* lifecycle registration contracts
* security registration contracts
* UI/runtime composition metadata contracts

### Manifest rules

* typed
* versioned
* registrable
* auditable for drift
* must not become a hand-maintained duplicate source if a canonical registry already exists

---

## 6.4 State/lifecycle contracts

These define state models and transitions.

### Required fields

* state code
* action code
* from state
* to state
* transition type
* permission requirement
* authority requirement
* self-approval rule
* SoD rule
* audit rule
* event rule

---

## 6.5 UI/runtime composition contracts

These define shell/navigation/dashboard/layout/runtime composition.

### Required categories

* shell readiness contract
* workspace context contract
* navigation composition contract
* dashboard composition contract
* widget composition contract
* module visibility contract
* lifecycle/status banner contract

### UI contract rule

UI/runtime composition contracts must consume DAuth truth and DOS runtime truth, not replace them.

---

## 7. Required Type and Schema Standards

## 7.1 Type ownership rule

Types belong with the concern that owns them.
No dead giant type dumping ground.

## 7.2 Schema rules

Contracts must be defined in one canonical place per concern.
Validation schemas and runtime types must stay aligned.

## 7.3 Versioning rule

If a contract changes incompatibly, versioning must be explicit.
No silent shape drift.

## 7.4 Migration rule

If a legacy contract still exists, it must be:

* classified
* marked migration-only or archive-only
* excluded from final runtime truth unless explicitly allowed

---

## 8. Current-State Audit Method

An agent auditing the data/schema/contracts stack must perform these checks.

## 8.1 Table inventory audit

Build a complete table inventory grouped by:

* schema
* owner
* bucket
* layer
* usage class

### Evidence to collect

* table name
* schema
* owner
* bucket
* primary runtime use
* key readers/writers
* whether used in runtime decisions
* whether legacy references remain

## 8.2 Bucket audit

For every table, determine whether current usage matches the correct bucket.

### Audit questions

* Is this table being used as runtime truth?
* Should it really be registry metadata?
* Is it display/runtime config only?
* Is it seed-only?
* Is it legacy/archive-only?

## 8.3 Ownership audit

Determine whether the table or contract is owned by:

* DOS
* DAuth
* product
* module
* workflow layer
* UI/runtime config layer
* operations/handover layer

## 8.4 Contract audit

Inspect:

* API contracts
* event contracts
* manifest contracts
* lifecycle contracts
* UI/runtime contracts

### Audit questions

* Is there one canonical shape?
* Is the shape duplicated elsewhere?
* Is the shape versioned?
* Is the shape typed and validated?
* Does the contract mix concerns improperly?

## 8.5 Legacy audit

Inspect all `*_legacy`, `_retired_*`, `_backup_*`, or superseded structures.

### Audit questions

* Are any runtime readers still using them?
* Are they documented archive-only?
* Are delete-later actions recorded?

## 8.6 Wrong-layer audit

Inspect whether:

* presentation tables are treated as auth truth
* registry metadata is treated as runtime truth without projection
* seed data is treated as live runtime state
* product tables are incorrectly classified as DAuth core truth

---

## 9. Gap Classification for Data/Schema/Contracts

Use the shared taxonomy from Patch 0, with these meanings.

### 9.1 Missing

Required table, registry, contract family, versioned schema, or bucket classification does not exist.

### 9.2 Incomplete

A table/contract exists but lacks required ownership, versioning, schema, typing, validation, or bucket classification.

### 9.3 Duplicate

Two or more tables/contracts represent the same truth surface without an approved canonical split.
Examples:

* duplicated dashboard config generations
* duplicated permission registries
* duplicated event contract definitions

### 9.4 Wrong Owner

A table/contract is owned by DOS, DAuth, product, or module incorrectly.

### 9.5 Wrong Layer

Examples:

* UI config treated as access truth
* registry metadata treated as runtime truth with no runtime projection layer
* seed templates treated as live runtime state

### 9.6 Legacy Carryover

Legacy tables or contract generations still participate in runtime or confuse ownership.

### 9.7 Forbidden Pattern

Examples:

* untyped payloads for critical runtime events
* duplicate contract families with no canonical owner
* product-specific auth truth embedded in shared contracts
* presentation config driving actual authorization

### 9.8 Production Blocker

Examples:

* provisioning cannot resolve seed/runtime boundaries
* AccessResolver depends on legacy or wrong-bucket tables
* startup/runtime contracts are inconsistent or missing

### 9.9 Handover Blocker

Examples:

* no contract catalog
* no bucket ownership map
* no legacy/archive plan
* no versioning record

---

## 10. Required Artifact Matrix

Every data/schema/contracts pass must address all artifact classes below.

| Artifact Class          | Required in Patch 2 | Examples                                                |
| ----------------------- | ------------------- | ------------------------------------------------------- |
| Table Inventory         | Yes                 | public + tenant table maps                              |
| Bucket Classification   | Yes                 | runtime truth / registry / presentation / seed / legacy |
| Ownership Map           | Yes                 | DOS / DAuth / product / module                          |
| Contract Families       | Yes                 | API / event / manifest / lifecycle / UI runtime         |
| Type/Schema Definitions | Yes                 | typed interfaces + validators                           |
| Migration Rules         | Yes                 | versioning, archive, delete-later                       |
| API Contracts           | Yes                 | typed request/response shapes                           |
| Event Contracts         | Yes                 | payloads, namespace, correlation                        |
| Manifest Contracts      | Yes                 | module/product/workflow registration                    |
| Tests                   | Yes                 | contract tests, migration tests, drift tests            |
| As-Built Updates        | Yes                 | actual table/contract changes logged                    |

If any artifact class is skipped, the pass is incomplete.

---

## 11. Exact Build Instructions

This section tells the agent what to build or repair when data/schema/contract gaps are found.

## 11.1 If table bucket classification is missing or inconsistent

### Build this

Create or update a canonical table classification map including for each table:

* table name
* schema
* owner
* bucket
* primary runtime role
* direct readers/writers
* legacy status
* delete-later status if relevant

### Do not build this

* vague “mixed use” labels with no decision
* ambiguous table ownership
* runtime use of unclassified tables

## 11.2 If runtime truth is spread across wrong buckets

### Build this

Move the design and runtime usage toward:

* Bucket 1 for real runtime truth
* Bucket 2 for registries only
* Bucket 3 for presentation/runtime config only
* Bucket 4 for seed/provisioning only
* Bucket 5 for archive-only

Where needed, define:

* projection/materialization service
* snapshot service
* migration path

### Do not build this

* direct AccessResolver use of display tables
* direct lifecycle/authority use of dashboard or preference tables
* direct runtime use of seed templates as if they are live state

## 11.3 If contracts are duplicated or scattered

### Build this

Create canonical contract catalogs for:

* API contracts
* event contracts
* manifest contracts
* lifecycle contracts
* UI/runtime composition contracts

Each contract must include:

* owner
* version
* schema/type
* readers/writers or producers/consumers
* validation rule

### Do not build this

* multiple incompatible shapes for the same concern without versioning
* hidden inline payload shapes in random services for critical events

## 11.4 If legacy tables/contracts still influence runtime

### Build this

Create legacy isolation actions:

* classify as Bucket 5
* identify all runtime readers
* mark migration source or archive-only
* define delete-later or drop migration plan

### Do not build this

* new dependencies on legacy tables
* compatibility shims that preserve legacy as runtime truth indefinitely

## 11.5 If manifest or event payload standards are weak

### Build this

Define canonical schemas for:

* module manifest
* product manifest
* workflow/lifecycle registration
* event payload families
* access snapshot contract
* provisioning status contract
* shell composition contract

### Do not build this

* untyped manifest extensions with no validation
* event payloads without correlation/tenant/module context where relevant

## 11.6 If API contracts mix concerns

### Build this

Split contract families so that:

* access contracts carry access/runtime security truth only
* UI contracts carry display/runtime composition only
* provisioning contracts carry seed/activation state only
* product contracts carry product business/runtime state only

### Do not build this

* single response objects mixing access truth, seed truth, and display-only hints with no boundaries

---

## 12. Example Skeletons

## 12.1 Example table-classification row

```ts
export interface TableClassificationRow {
  schema: 'public' | 'tenant';
  tableName: string;
  owner: 'DOS' | 'DAuth' | 'Product' | 'Module';
  bucket: 1 | 2 | 3 | 4 | 5;
  runtimeRole: string;
  readers: string[];
  writers: string[];
  legacyStatus?: 'none' | 'archive-only' | 'delete-later';
}
```

## 12.2 Example API contract

```ts
export interface WorkspaceRuntimeResponse {
  tenantId: string;
  workspaceId: string;
  activeProducts: string[];
  activeModules: string[];
  lifecycleStatus: string;
  shellReady: boolean;
}
```

## 12.3 Example event contract

```ts
export interface LifecycleTransitionEvent {
  eventId: string;
  namespace: 'dos.lifecycle';
  eventName: 'transition.completed';
  tenantId: string;
  moduleCode: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  correlationId: string;
  occurredAt: string;
}
```

## 12.4 Example manifest contract

```ts
export interface ModuleManifest {
  code: string;
  version: string;
  routeBase: string;
  tablePrefix: string;
  ownedTables: string[];
  publishedEvents: string[];
  consumedEvents: string[];
  provisioningOrder: number;
}
```

## 12.5 Example contract-catalog row

```ts
export interface ContractCatalogRow {
  family: 'api' | 'event' | 'manifest' | 'lifecycle' | 'ui-runtime';
  contractName: string;
  owner: string;
  version: string;
  sourcePath: string;
  validationSchemaPath?: string;
}
```

---

## 13. Tests Required

## 13.1 Contract tests required

* API contract shape validation
* event payload shape validation
* manifest contract validation
* lifecycle transition contract validation
* shell/runtime composition contract validation

## 13.2 Drift tests required

* table bucket drift tests
* ownership drift tests
* legacy-table reference drift tests
* duplicate-contract drift tests
* event namespace drift tests

## 13.3 Migration tests required

* legacy isolation tests
* runtime truth projection tests
* provisioning seed-to-runtime promotion tests where applicable

## 13.4 Smoke validations required

* critical runtime services use Bucket 1 sources only where required
* UI composition does not query auth truth from Bucket 3 display tables
* provisioning path resolves seed/runtime boundaries correctly

---

## 14. Review Checklist

The reviewer must confirm:

* every in-scope table is classified
* bucket usage is explicit and correct
* ownership is explicit and correct
* contract families have canonical owners
* contract versioning and validation are explicit
* legacy/archive surfaces are isolated
* no runtime truth depends on presentation or seed tables improperly
* no product business tables are mislabeled as DAuth core truth
* required examples/tests/as-built updates are present

If any required item is missing, final decision is FAIL.

---

## 15. Acceptance Criteria

Patch 2 passes for target object X only if all below are true.

### 15.1 Table and bucket correctness

* tables are classified into one of five buckets
* public vs tenant placement is justified
* owners are explicit
* runtime truth is isolated to Bucket 1 or explicitly projected

### 15.2 Contract correctness

* API, event, manifest, lifecycle, and UI/runtime contracts are cataloged
* canonical shapes are clear
* versioning is clear where needed
* validation/type ownership is clear

### 15.3 Legacy control

* legacy tables/contracts are identified and removed from final runtime truth
* delete-later/archival status is explicit

### 15.4 Platform-wide usability

* later patches can consume this patch without ambiguity
* data and contract drift is reduced, not increased

---

## 16. Fail Conditions

Patch 2 fails if any of the following are true:

* key tables remain unclassified
* registry/presentation/seed tables are still treated as runtime truth with no correction
* contract families remain duplicated without canonical owner
* legacy tables remain hidden runtime dependencies
* product business tables are mislabeled as DAuth core runtime truth
* API or event contracts remain untyped or unversioned in critical paths
* scope widened beyond data/schema/contracts without approval

---

## 17. As-Built Update Instructions

Any pass or implementation based on Patch 2 must update the as-built ledger with:

* finalized table classification changes
* contract catalogs created/updated
* ownership corrections made
* legacy/archive isolations made
* contract versioning decisions
* migration/delete-later decisions
* remaining bucket/contract blockers

---

## 18. Required Agent Output Format

Use the shared format from Patch 0, with data/contract specificity:

1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files / Schemas / Tables Inspected
5. Files / Schemas / Tables Changed
6. Contracts / Tables / Events Affected
7. What Was Built / Fixed / Classified
8. What Was Explicitly Not Changed
9. Gap Classification
10. Tests / Validation Run
11. Remaining Risks
12. Final Decision
13. Recommended Next Part
14. As-Built Update Required

---

## 19. Recommended Next Patch

After Patch 2, the next patch should be:

**Patch 3 — DAuth / Security / Control Spine**

because DAuth depends on correct runtime truth, correct contract ownership, and correct distinction between registry/display/seed/runtime data.

---

## 20. One-Line Use Instruction

Use Patch 2 to compare the current platform/product/module data and contract stack against the full classified target model, identify every wrong bucket or wrong contract family, repair the classification and contract ownership, validate against pass/fail rules, and update the as-built ledger.

# Patch 3 — DAuth / Security / Control Spine

## 0. Patch Identity

### 0.1 Patch name

**Patch 3 — DAuth / Security / Control Spine**

### 0.2 Patch class

This is a **Reusable Enforcement Patch**.

It is simultaneously:

* target-state specification
* comparison specification
* implementation specification
* review specification
* handover specification

### 0.3 Patch purpose

This patch defines the full target model for **Dogan-Auth (DAuth)** as the one and only platform security and control spine.

It tells an agent exactly how to:

* inspect the current auth/security/control stack
* compare current implementation against the canonical DAuth target
* classify all auth/control gaps
* know exactly what identity, session, access, scope, authority, delegation, SoD, lifecycle authorization, middleware, frontend consumption contracts, audit surfaces, and tests must exist
* know exactly what must never be reintroduced

### 0.4 Patch role in the patch library

This patch is the canonical enforcement patch for:

* identity
* authentication
* session control
* actor model
* tenant membership evaluation
* access profiles and functional roles
* permission resolution
* scope resolution
* authority and sign-off power
* delegation
* separation of duties
* lifecycle authorization
* access snapshot generation
* auth-facing middleware, guards, interceptors, and UI consumption contracts
* auth decision audit

No later patch may redefine these concerns away from DAuth.

---

## 1. Scope and Object Types

### 1.1 What this patch governs

This patch governs the **full DAuth object model**.

### 1.2 Target object types

This patch applies to:

* identity object
* session object
* token object
* MFA object
* actor object
* membership object
* access profile object
* functional role object
* permission object
* role-permission mapping object
* scope binding object
* authority object
* delegation object
* SoD object
* lifecycle authorization object
* access snapshot object
* auth middleware object
* frontend auth consumption object
* auth audit object
* auth security policy object

### 1.3 Explicitly out of scope

This patch does **not** define in full detail:

* DOS platform provisioning internals except DAuth handoff points
* product-specific business rules
* deep module business logic
* deep workflow business logic
* full UI component library
* dynamic UI engine
* settings/admin UX depth

Those are handled in later patches.

### 1.4 Core security law

DAuth is the only platform auth/control spine.
There must never be a second runtime engine for:

* authn
* authz
* SoD
* delegation
* authority
* lifecycle authorization
* access snapshot

---

## 2. Canonical DAuth Target Blueprint

## 2.1 DAuth responsibilities

DAuth must provide these capabilities as first-class runtime services.

### A. Identity and principal model

* human identity
* agent identity
* service account identity if supported
* external actor identity if supported
* canonical actor registry and actor typing
* user-to-actor linkage
* principal status and activation posture

### B. Authentication and session control

* access token issuance
* refresh token issuance and rotation
* token verification
* revocation handling
* session creation
* session validation
* logout/revoke behavior
* inactive/locked user handling
* tenant membership validation during auth resolution

### C. MFA and credential controls

* MFA enrollment state
* MFA challenge and verification flows
* privileged-path MFA enforcement
* credential reset/verification contracts
* brute-force/login-attempt tracking

### D. Access model

* access profiles
* functional roles
* permissions
* role_permissions
* access assignment and revocation
* effective access resolution
* access snapshot generation
* permission inheritance or projection rules where explicitly supported

### E. Scope model

* tenant scope
* organization scope
* business unit/division scope
* department scope
* section scope
* team scope
* position scope
* entity/resource scope where allowed
* ownership-linked scope enforcement

### F. Authority model

* decision authorities
* sign-off authorities
* approval authorities
* override authorities where explicitly allowed
* authority levels and thresholds
* authority binding to actors/roles/scopes

### G. Delegation model

* temporary delegation
* scoped delegation
* action-bounded delegation
* delegated authority materialization
* acting-on-behalf-of enforcement
* delegation validity windows
* delegation audit trail

### H. SoD model

* static conflict detection
* runtime action conflict detection
* assignment-time conflict detection
* soft vs hard conflict modes
* warn / block / escalate outcomes
* SoD audit trail

### I. Lifecycle authorization model

* permission checks for transitions
* authority checks for transitions
* self-approval prevention
* maker-checker separation
* delegation-aware transition auth
* SoD-aware transition auth
* audit logging for transition decisions

### J. Middleware and consumption contracts

* backend auth middleware
* backend access middleware
* backend optional-auth middleware
* frontend session/auth service contract
* frontend access snapshot contract
* frontend guard contract
* frontend interceptor contract
* frontend action visibility contract

### K. Audit and security policy

* auth decision log
* guard decision log
* token/session audit
* access review state
* invitation/external scope control
* tenant security policy runtime config
* security event emission for major auth actions

---

## 2.2 DAuth ownership boundaries

### DAuth owns directly

* users as auth principals where relevant to control
* tenant_user_memberships for auth evaluation
* actor registry and actor auth linkage
* token/session/revocation/MFA state
* access profiles
* functional roles
* permissions and role-permission mappings
* actor/user access assignments
* role assignments
* authorities and sign-off matrices
* delegation runtime state
* SoD runtime state
* access review and invitation control state
* auth/security configuration runtime state
* access snapshots
* auth and access middleware contracts
* auth-facing frontend consumption contracts
* auth audit trails

### DAuth consumes but does not own

* DOS org/team/position structure as scope source
* DOS product/module enablement as entitlement source
* product business objects as protected runtime targets
* DOS lifecycle definitions as transition definitions
* DOS provisioning backbone as upstream bootstrap orchestrator

### DAuth must not implement

* product business logic
* DOS foundation structure ownership
* product dashboard/layout truth
* shell composition truth that belongs to DOS
* duplicate workflow engines

---

## 2.3 Required backend package layout

```text
backend/src/platform/dauth/
  identity/
  session/
  actor/
  mfa/
  access/
  scope/
  authority/
  delegation/
  sod/
  lifecycle-auth/
  middleware/
  frontend-contracts/
  audit/
  policies/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split

#### `identity/`

Identity resolution, principal state, user-to-actor linkage.

#### `session/`

Token issuance, token verification, refresh rotation, revocation, session lifecycle.

#### `actor/`

Actor registry, actor types, acting principal model.

#### `mfa/`

MFA enrollment, challenge, validation, privileged-path enforcement.

#### `access/`

Access profiles, functional roles, permissions, assignments, access resolver, access snapshot.

#### `scope/`

Scope adapters, scope bindings, effective scope resolution, ownership-linked scope resolution.

#### `authority/`

Authority levels, sign-off, decision authority, override rules.

#### `delegation/`

Delegation policies, delegations, delegated authorities, acting-on-behalf-of enforcement.

#### `sod/`

SoD rules, conflict detection, decision outcomes, conflict logs.

#### `lifecycle-auth/`

Lifecycle transition authorization using permission + scope + authority + delegation + SoD.

#### `middleware/`

Canonical backend middleware only.
No recreation of old flat middleware bag.

#### `frontend-contracts/`

Canonical contracts for frontend session/access consumption.

#### `audit/`

Auth decision logging, security events, review and trace support.

#### `policies/`

Runtime security policy evaluation where DAuth owns it.

#### `contracts/`

Shared DAuth backend contracts.

#### `types/`

DAuth-owned types only.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/dauth/
  session/
  access/
  guards/
  interceptors/
  directives/
  contracts/
  audit/
  index.ts
```

### 2.4.1 Required frontend DAuth ownership

Frontend DAuth core must provide:

* session state consumption
* access snapshot consumption
* auth/session service
* auth interceptor
* CSRF/security interceptor if applicable
* guard contracts
* action visibility directives/helpers
* auth-aware route entry contracts

### 2.4.2 Frontend DAuth must not provide

* hardcoded permission truth
* role-priority truth as access engine
* local duplicate access engine
* hidden admin bypass logic

---

## 2.5 Required DAuth tables

## 2.5.1 Canonical identity and auth runtime truth

* `users`
* `tenant_user_memberships`
* `email_verification_tokens`
* `password_reset_tokens`
* `user_mfa`
* `login_attempts`
* session tables
* refresh token tables
* token family / revocation tables
* actor registry tables

## 2.5.2 Canonical access runtime truth

* `access_profiles`
* `functional_roles`
* `permissions`
* `role_permissions`
* `user_access_profiles`
* `user_role_assignments`
* `enterprise_user_role_assignments`
* `actor_access_assignments`
* `actor_role_assignments`
* `role_assignment_history`
* `permission inheritance/projection tables` where explicitly used

## 2.5.3 Canonical scope/auth control runtime truth

* `external_user_scopes`
* `tenant_security_config`
* scope binding tables where DAuth owns them
* ownership-linked access binding tables where DAuth owns them

## 2.5.4 Canonical authority runtime truth

* `authority_levels`
* `authority_matrix`
* `decision_authorities`
* `sign_off_authority_matrix`

## 2.5.5 Canonical delegation runtime truth

* `delegations`
* `delegation_rules`
* `delegated_authorities`
* delegated audit/runtime state tables

## 2.5.6 Canonical SoD runtime truth

* `sod_rules`
* `sod_conflict_log`
* `sod_conflict_matrix`

## 2.5.7 Canonical review and audit runtime truth

* `access_review_campaigns`
* `access_review_items`
* `invitations`
* `authorization_decision_log`
* `authz_decision_log`
* `guard_decision_log`
* other DAuth-owned audit tables

### Important rule

Product business tables are not DAuth core truth.
DAuth may evaluate access **to** them, but must not absorb them into its own canonical runtime set.

---

## 2.6 Required DAuth services

### Identity and actor

* `IdentityService`
* `ActorService`
* `PrincipalResolutionService`

### Sessions and tokens

* `TokenService`
* `SessionService`
* `RefreshService`
* `RevocationService`
* `SessionContextService`

### MFA and credential control

* `MfaService`
* `CredentialRecoveryService`
* `LoginProtectionService`

### Access core

* `PermissionService`
* `FunctionalRoleService`
* `AccessProfileService`
* `RoleAssignmentService`
* `AccessResolver`
* `AccessSnapshotService`

### Scope

* `ScopeResolver`
* `OrgScopeAdapter`
* `TeamScopeAdapter`
* `PositionScopeAdapter`
* `OwnershipScopeAdapter`

### Authority

* `AuthorityService`
* `DecisionAuthorityService`
* `SignOffAuthorityService`

### Delegation

* `DelegationService`
* `DelegationPolicyService`
* `ActingOnBehalfOfService`

### SoD

* `SodEngine`
* `SodPolicyService`
* `SodConflictAuditService`

### Lifecycle authorization

* `LifecycleAuthService`
* `SelfApprovalGuard`
* `MakerCheckerPolicyService`

### Middleware / frontend contracts

* `SessionMiddleware`
* `OptionalSessionMiddleware`
* `AccessMiddleware`
* `FrontendAccessContractService`

### Audit and security policy

* `AuthDecisionAuditService`
* `SecurityEventService`
* `AccessReviewService`
* `InvitationControlService`
* `TenantSecurityPolicyService`

---

## 2.7 Required APIs and contracts

### 2.7.1 Required backend API contract families

DAuth must expose typed contracts for:

* login
* logout
* refresh
* revoke
* MFA challenge/result
* access snapshot retrieval
* access review operations
* invitation and external scope operations
* security-status retrieval if needed

### 2.7.2 Required DAuth contract categories

* principal/auth context contract
* session contract
* token contract
* access snapshot contract
* scope resolution contract
* authority decision contract
* delegation decision contract
* SoD decision contract
* lifecycle auth decision contract
* auth error contract
* frontend session/access contract

### 2.7.3 Canonical auth error model

DAuth must define explicit error classes/shapes for at least:

* unauthenticated
* invalid token
* expired token
* revoked session
* inactive user
* missing tenant membership
* inactive tenant
* forbidden
* SoD blocked
* self-approval blocked
* authority insufficient
* delegation invalid
* lifecycle transition denied
* clearance denied if applicable

---

## 2.8 Required access model

## 2.8.1 Access layers

DAuth access must separate these concepts:

### Access profile

Broad platform/user posture.
Examples:

* tenant admin
* operator
* reviewer
* external actor posture

### Functional role

Business/runtime role assignment for actions and scope.
Examples:

* risk owner
* compliance analyst
* policy approver
* vendor reviewer

### Permission

Atomic or patterned capability string.
Recommended naming standard:
`module.resource.action`

### Authority

Special power beyond plain permission.
Examples:

* approve high-criticality change
* override exception
* sign off policy publish

### Scope

Where the role/permission applies.

### Experience metadata

Dashboards, widgets, landing pages, badges, and role display hints.
This is not access truth.

## 2.8.2 Access resolution law

Effective access must be computed by one canonical `AccessResolver` and surfaced via one canonical `AccessSnapshotService`.

### AccessResolver inputs must include

* actor/principal
* tenant membership
* access profiles
* functional roles
* role-permission mappings
* scope bindings
* product/module entitlements from DOS
* authority bindings
* delegation state
* SoD state where applicable

### AccessResolver outputs must include

* principal posture
* access profiles
* functional roles
* effective permissions
* effective scopes
* effective authorities
* allowed products/modules
* access audit trace metadata where appropriate

---

## 2.9 Required scope model

### 2.9.1 Canonical scope hierarchy

Tenant → Organization → Business Unit / Division → Department → Section → Team → Position → Entity/Resource where supported

### 2.9.2 Scope resolution law

Scope must be resolved from DOS structure and DAuth scope bindings.
No UI-only scope shortcuts.
No fake workspace-only auth scope.

### 2.9.3 Required scope adapters

* org structure adapter
* team adapter
* position adapter
* ownership adapter
* external scope adapter

---

## 2.10 Required authority model

### 2.10.1 Authority concepts

DAuth must distinguish:

* permission to act
* authority to approve/sign-off/override

### 2.10.2 Required authority artifacts

* authority levels
* decision authorities
* sign-off matrix
* threshold rules
* authority scope bindings

### 2.10.3 Authority law

Permission alone is insufficient for high-impact transitions where authority is required.

---

## 2.11 Required delegation model

### 2.11.1 Delegation support

DAuth must support:

* time-bounded delegation
* scope-bounded delegation
* action-bounded delegation
* delegated authority
* acting-on-behalf-of traceability
* invalid/expired delegation rejection

### 2.11.2 Delegation law

Delegation must be centralized in DAuth.
No governance-local or agent-local duplicate delegation engines.

### 2.11.3 Delegation decision outputs

Must include:

* is delegated
* delegator
* delegate
* scope validity
* action validity
* expiration validity
* audit trace reference

---

## 2.12 Required SoD model

### 2.12.1 SoD support

DAuth must support:

* static assignment conflict detection
* dynamic action conflict detection
* hard conflict vs soft conflict
* block / warn / escalate outcomes
* conflict logging
* reviewable conflict state

### 2.12.2 SoD law

SoD must be one engine only.
No second runtime SoD detector anywhere else.

### 2.12.3 SoD minimum decisions

At least:

* assignment-time check
* approval-time check
* lifecycle-transition check where relevant
* delegated-action check where relevant

---

## 2.13 Required lifecycle authorization model

### 2.13.1 Lifecycle auth purpose

DAuth must decide whether a requested transition is allowed using:

* permission
* scope
* authority
* self-approval rule
* maker-checker rule
* delegation rule
* SoD rule

### 2.13.2 Required lifecycle auth outputs

* allow or deny
* denial reason class
* authority reason
* self-approval result
* SoD result
* delegated decision details if used
* audit trace reference

### 2.13.3 Lifecycle auth law

No state-changing action may bypass lifecycle authorization where applicable.

---

## 2.14 Required backend middleware

### 2.14.1 Canonical middleware set

DAuth backend must provide at minimum:

* `authenticate()`
* `optionalAuthenticate()`
* `requirePermission()`
* `requireRole()` only if role checks remain explicitly allowed at the correct layer
* `requireAnyPermission()`
* middleware or wrappers for lifecycle authorization where needed

### 2.14.2 Middleware law

These must live under DAuth namespaces.
Do not recreate the deleted flat middleware architecture.

### 2.14.3 Middleware behavior rules

* typed request auth context
* consistent auth error model
* consistent expired/revoked handling
* no hidden super-admin shortcuts in random routes
* explicit audit where needed

---

## 2.15 Required frontend consumption contracts

### 2.15.1 Frontend DAuth core must provide

* `AuthSessionService`
* `AccessStore`
* `AuthInterceptor`
* `CsrfInterceptor` if applicable
* `AuthGuard`
* `ModuleGuard`
* admin/entry guards only if they consume access snapshot truth
* action visibility helpers/directives reading access snapshot truth

### 2.15.2 Frontend law

No static role maps may be treated as actual access truth.
No permission engine may live in the frontend.

### 2.15.3 Access snapshot contract

Frontend must consume one canonical access snapshot, not rebuild access from scattered endpoints.

---

## 2.16 Required audit architecture

### 2.16.1 Audit minimums

DAuth must log at least:

* login success/failure
* refresh success/failure
* logout/revoke
* MFA challenge/result
* access denied and high-risk access granted
* lifecycle authorization decisions
* SoD conflict outcomes
* delegated actions
* self-approval prevention triggers
* role/profile assignment changes
* invitation and external scope operations

### 2.16.2 Audit law

Every sensitive auth/control decision must be reconstructable with:

* principal
* actor if distinct
* tenant
* module/product if relevant
* requested action
* scope
* authority
* decision result
* reason
* timestamp
* correlation id

---

## 3. Current-State Audit Method

An agent auditing DAuth must perform the following checks.

## 3.1 Namespace and package audit

Inspect whether:

* DAuth namespace roots exist on backend and frontend
* auth/control concerns are grouped by DAuth concern rather than old flat folders
* old deleted auth structures are not recreated indirectly

### Evidence to collect

* backend DAuth folder tree
* frontend DAuth folder tree
* legacy import usage
* duplicated auth/control concerns in wrong layers

## 3.2 Table audit

Inspect all DAuth-relevant tables and verify:

* correct owner
* correct bucket
* correct public vs tenant placement
* no legacy tables still treated as runtime truth

## 3.3 Identity/session audit

Inspect:

* token issuance
* token verification
* refresh handling
* revocation handling
* session context
* MFA state
* credential reset/verification contracts

## 3.4 Access core audit

Inspect:

* access profiles
* functional roles
* permissions
* role permissions
* assignment tables and services
* access resolver
* access snapshot generation

## 3.5 Scope audit

Inspect:

* scope adapters
* DOS org/team/position integration
* ownership-linked scope logic
* no fake UI-only scope logic

## 3.6 Authority audit

Inspect:

* authority levels
* decision authority tables/services
* sign-off matrices
* threshold logic

## 3.7 Delegation audit

Inspect:

* centralized delegation engine
* duplication across governance/AI/platform layers
* delegated authority materialization
* acting-on-behalf-of enforcement

## 3.8 SoD audit

Inspect:

* presence of a real SoD engine
* use of `sod_rules`, `sod_conflict_log`, `sod_conflict_matrix`
* assignment-time and action-time use
* absence of duplicates

## 3.9 Lifecycle authorization audit

Inspect:

* lifecycle auth service existence
* self-approval prevention
* maker-checker support
* authority + SoD integration into transition authorization

## 3.10 Frontend consumption audit

Inspect:

* auth/session services
* access snapshot usage
* guards and interceptors
* absence of static role/permission truth
* action visibility reading DAuth truth

## 3.11 Audit/logging audit

Inspect:

* auth decision logs
* session/token logs
* SoD/delegation/lifecycle decision logs
* security event emission

---

## 4. Gap Classification for DAuth

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing

Required DAuth service, table usage, contract, middleware, guard, snapshot, or audit surface does not exist.

### 4.2 Incomplete

Artifact exists but lacks required behavior such as:

* refresh rotation
* scope resolution
* authority checks
* SoD checks
* lifecycle authorization
* audit logging

### 4.3 Duplicate

Two or more auth/control engines exist for the same concern.
Examples:

* multiple access resolvers
* multiple delegation engines
* multiple SoD engines
* frontend and backend both acting as truth

### 4.4 Wrong Owner

Auth/control concern implemented under DOS, product, module, AI, or UI when DAuth should own it.

### 4.5 Wrong Layer

Examples:

* product domain tables mislabeled as DAuth core truth
* UI role maps treated as real permission engine
* DOS lifecycle definitions mistaken for DAuth lifecycle authorization

### 4.6 Legacy Carryover

Old auth/rbac structures or legacy tables/contracts still influence runtime.

### 4.7 Forbidden Pattern

Examples:

* fallback permission chains
* route-level raw role comparisons as main auth model
* hidden super-admin shortcuts
* SoD duplicates
* local module auth engines

### 4.8 Production Blocker

Examples:

* no auth middleware
* no valid session path
* no access snapshot
* no SoD engine where required
* lifecycle transitions can bypass authorization

### 4.9 Handover Blocker

Examples:

* no auth audit traceability
* no security control documentation in as-built state
* ambiguous ownership over critical auth/control services

---

## 5. Required Artifact Matrix

Every DAuth pass must use this artifact matrix.

| Artifact Class      | Required in Patch 3 | Examples                                             |
| ------------------- | ------------------- | ---------------------------------------------------- |
| Files/Folders       | Yes                 | DAuth namespaces, concern packages                   |
| Services            | Yes                 | TokenService, AccessResolver, SodEngine              |
| Contracts/Schemas   | Yes                 | access snapshot, auth error, lifecycle auth decision |
| Tables/Data         | Yes                 | access_profiles, role_permissions, delegations       |
| APIs                | Yes                 | login, refresh, access snapshot                      |
| Events              | Yes                 | auth/security events                                 |
| Workflows/Lifecycle | Yes                 | lifecycle auth gating                                |
| UI/Admin Surfaces   | Yes                 | guards, access store, action visibility consumption  |
| Audit/Logs          | Yes                 | authz_decision_log, guard_decision_log               |
| Tests               | Yes                 | token/session/access/SoD/delegation/lifecycle        |
| As-Built Updates    | Yes                 | DAuth build state and remaining blockers             |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

This section tells the agent what to build or repair when DAuth gaps are found.

## 6.1 If session/token spine is weak or missing

### Build this

Create or stabilize:

* `TokenService`
* `SessionService`
* `RefreshService`
* `RevocationService`
* `SessionContextService`

Define explicitly:

* access token generation
* refresh token generation
* token verification
* refresh rotation
* revocation/logout behavior
* auth error model
* session audit hooks

### Do not build this

* configless token handling
* mixed access/refresh token semantics
* hidden auth logic inside routes
* old flat auth middleware recreation

## 6.2 If identity/actor model is weak

### Build this

Create or stabilize:

* `IdentityService`
* `ActorService`
* `PrincipalResolutionService`

Ensure actors support at least:

* human actors
* agent actors
* external actors where supported

### Do not build this

* hardcoded assumptions that all principals are plain users with no actor model
* agent bypass paths outside actor resolution

## 6.3 If access core is fragmented

### Build this

Create or stabilize:

* `PermissionService`
* `FunctionalRoleService`
* `AccessProfileService`
* `RoleAssignmentService`
* `AccessResolver`
* `AccessSnapshotService`

Define permission naming standard:

* `module.resource.action`

Define access snapshot contents clearly.

### Do not build this

* fallback permission chains
* module-local permission engines
* frontend permission reconstruction logic

## 6.4 If scope resolution is weak or fake

### Build this

Create or stabilize:

* `ScopeResolver`
* `OrgScopeAdapter`
* `TeamScopeAdapter`
* `PositionScopeAdapter`
* `OwnershipScopeAdapter`

### Do not build this

* UI-only scope logic
* fake workspace-only scope as substitute for real DOS structure

## 6.5 If authority is underspecified

### Build this

Create or stabilize:

* `AuthorityService`
* `DecisionAuthorityService`
* `SignOffAuthorityService`

Ensure distinction between permission and authority is explicit.

### Do not build this

* approval power hidden in raw role names
* transition power implied only from permissions when authority is required

## 6.6 If delegation is fragmented

### Build this

Create or stabilize:

* `DelegationService`
* `DelegationPolicyService`
* `ActingOnBehalfOfService`

Centralize all delegation here.

### Do not build this

* governance-local delegation engine
* AI-local delegation engine
* product-specific duplicate delegation logic

## 6.7 If SoD is absent or duplicated

### Build this

Create or stabilize:

* `SodEngine`
* `SodPolicyService`
* `SodConflictAuditService`

Support:

* assignment-time conflicts
* action-time conflicts
* warn/block/escalate outcome modes

### Do not build this

* second SoD engine
* UI-only conflict checks
* soft “advisory-only” handling without explicit policy

## 6.8 If lifecycle authorization is weak

### Build this

Create or stabilize:

* `LifecycleAuthService`
* `SelfApprovalGuard`
* `MakerCheckerPolicyService`

Lifecycle auth must combine:

* permission
* scope
* authority
* self-approval rule
* delegation state
* SoD state

### Do not build this

* state-changing routes that only check permission and skip authority/SoD/self-approval

## 6.9 If backend middleware is weak or missing

### Build this

Create or stabilize:

* `authenticate()`
* `optionalAuthenticate()`
* `requirePermission()`
* `requireAnyPermission()`
* other narrow wrappers only if still justified under DAuth

### Do not build this

* giant flat middleware bag
* direct route-level role string comparisons as canonical control model

## 6.10 If frontend auth consumption is weak

### Build this

Create or stabilize:

* `AuthSessionService`
* `AccessStore`
* `AuthInterceptor`
* `CsrfInterceptor` if applicable
* `AuthGuard`
* `ModuleGuard`
* access-aware directives/helpers

### Do not build this

* static permission maps as truth
* role-priority engines in frontend as substitute for access snapshot

## 6.11 If audit coverage is weak

### Build this

Create or stabilize:

* `AuthDecisionAuditService`
* `SecurityEventService`
* auth/security event emission
* access review logging

### Do not build this

* sensitive control decisions with no audit record
* silent delegation or SoD denials

---

## 7. Example Skeletons

## 7.1 Example backend folder layout

```text
backend/src/platform/dauth/
  identity/identity.service.ts
  actor/actor.service.ts
  session/token.service.ts
  session/session.service.ts
  session/refresh.service.ts
  access/access-resolver.service.ts
  access/access-snapshot.service.ts
  scope/scope-resolver.service.ts
  authority/authority.service.ts
  delegation/delegation.service.ts
  sod/sod.engine.ts
  lifecycle-auth/lifecycle-auth.service.ts
  middleware/session.middleware.ts
  contracts/access-snapshot.types.ts
  audit/auth-decision-audit.service.ts
  index.ts
```

## 7.2 Example access snapshot contract

```ts
export interface AccessSnapshot {
  principalId: string;
  actorId?: string;
  tenantId: string;
  accessProfiles: string[];
  functionalRoles: string[];
  permissions: string[];
  scopes: Array<{ type: string; id: string }>;
  authorities: string[];
  allowedProducts: string[];
  allowedModules: string[];
}
```

## 7.3 Example auth decision contract

```ts
export interface AuthDecision {
  allowed: boolean;
  reasonCode?: string;
  permission?: string;
  authority?: string;
  scopeMatched?: boolean;
  delegated?: boolean;
  sodOutcome?: 'clear' | 'warn' | 'blocked';
  correlationId?: string;
}
```

## 7.4 Example lifecycle auth decision contract

```ts
export interface LifecycleAuthDecision {
  allowed: boolean;
  reasonCode?: string;
  selfApprovalBlocked?: boolean;
  makerCheckerBlocked?: boolean;
  authoritySatisfied?: boolean;
  sodOutcome?: 'clear' | 'warn' | 'blocked';
  delegated?: boolean;
}
```

## 7.5 Example test expectations

```ts
it('denies access when no effective permission exists', () => {
  // AccessResolver deny-by-default example
});

it('blocks self-approval on protected transition', () => {
  // Lifecycle auth example
});

it('blocks hard SoD conflicts during approval', () => {
  // SoD example
});
```

---

## 8. Tests Required for DAuth

### 8.1 Unit tests required

* token generation/verification
* refresh rotation
* session context building
* access resolver outputs
* scope resolution
* authority evaluation
* delegation validity
* SoD outcomes
* lifecycle auth decisions

### 8.2 Integration tests required

* login/refresh/logout flows
* access snapshot retrieval
* route middleware enforcement
* lifecycle transition enforcement
* delegation in real route flow
* SoD block in real route flow
* external user scope/invitation flows where supported

### 8.3 Contract tests required

* auth error contracts
* access snapshot contract
* auth decision contract
* lifecycle auth decision contract
* frontend access/session contract

### 8.4 Operational smoke tests required

* protected route denied without valid session
* valid session resolves auth context
* revoked/expired session rejected consistently
* access snapshot returns coherent products/modules/scopes
* SoD and self-approval blocks trigger as expected

---

## 9. Review Checklist for DAuth

The reviewer must confirm:

* DAuth owns all auth/control concerns in scope
* session/token spine is singular and complete
* access core is singular and complete
* scope is derived from DOS structure, not invented locally
* authority is distinct from permission
* delegation is centralized
* SoD is centralized
* lifecycle authorization exists and is not bypassed
* frontend consumes access snapshot truth and does not invent access truth
* audit/logging exists for sensitive decisions
* no forbidden patterns were reintroduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 3 passes for target object X only if all below are true.

### 10.1 Ownership correctness

* auth/control concerns live in DAuth
* DOS and product layers do not reimplement DAuth runtime truth

### 10.2 Artifact completeness

* required DAuth folders/files/services/contracts exist or are explicitly classified missing for follow-up build
* required tables and contract families are correctly classified and used

### 10.3 Runtime viability

* session/token/auth path is coherent
* access snapshot path is coherent
* scope/authority/delegation/SoD/lifecycle auth are not hidden or duplicated

### 10.4 Audit and handover readiness

* key auth/control decisions are auditable
* tests are declared
* as-built updates are explicit

---

## 11. Fail Conditions

Patch 3 fails if any of the following are true:

* more than one auth/control engine remains runtime truth
* access resolution still depends on fallback chains or frontend truth
* SoD is absent or duplicated
* delegation is absent or duplicated
* lifecycle transitions can bypass DAuth lifecycle authorization where applicable
* scope is not grounded in DOS structure
* authority is conflated with permission where distinction is required
* required artifact classes were skipped
* the implementation or audit widened outside DAuth scope without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 3 must update the as-built ledger with:

* DAuth package structure created or normalized
* DAuth services created or stabilized
* tables/contracts/events affected
* session/token/auth middleware status
* access snapshot status
* scope/authority/delegation/SoD/lifecycle-auth status
* frontend auth consumption status
* remaining blockers and handover impacts

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with DAuth-specific clarity:

1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files / Schemas / Tables Inspected
5. Files / Schemas / Tables Changed
6. Contracts / Tables / Events Affected
7. What Was Built / Fixed
8. What Was Explicitly Not Changed
9. Gap Classification
10. Tests / Validation Run
11. Remaining Risks
12. Final Decision
13. Recommended Next Part
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 3, the next patch should be:

**Patch 4 — Product Stack**

because products must consume DOS and DAuth correctly without reintroducing platform or auth drift.

---

## 15. One-Line Use Instruction

Use Patch 3 to compare the current auth/security/control stack against the full DAuth target, classify every auth/control gap, build only the missing DAuth artifacts, validate against DAuth pass/fail rules, and update the as-built ledger.

Patch 3 — DAuth / Security / Control Spine
0. Patch Identity
0.1 Patch name
Patch 3 — DAuth / Security / Control Spine

0.2 Patch class
This is a Reusable Enforcement Patch.

It is simultaneously:

target-state specification
comparison specification
implementation specification
review specification
handover specification
0.3 Patch purpose
This patch defines the full target model for Dogan-Auth (DAuth) as the one and only platform security and control spine.

It tells an agent exactly how to:

inspect the current auth/security/control stack
compare current implementation against the canonical DAuth target
classify all auth/control gaps
know exactly what identity, session, access, scope, authority, delegation, SoD, lifecycle authorization, middleware, frontend consumption contracts, audit surfaces, and tests must exist
know exactly what must never be reintroduced
0.4 Patch role in the patch library
This patch is the canonical enforcement patch for:

identity
authentication
session control
actor model
tenant membership evaluation
access profiles and functional roles
permission resolution
scope resolution
authority and sign-off power
delegation
separation of duties
lifecycle authorization
access snapshot generation
auth-facing middleware, guards, interceptors, and UI consumption contracts
auth decision audit
No later patch may redefine these concerns away from DAuth.

1. Scope and Object Types
1.1 What this patch governs
This patch governs the full DAuth object model.

1.2 Target object types
This patch applies to:

identity object
session object
token object
MFA object
actor object
membership object
access profile object
functional role object
permission object
role-permission mapping object
scope binding object
authority object
delegation object
SoD object
lifecycle authorization object
access snapshot object
auth middleware object
frontend auth consumption object
auth audit object
auth security policy object
1.3 Explicitly out of scope
This patch does not define in full detail:

DOS platform provisioning internals except DAuth handoff points
product-specific business rules
deep module business logic
deep workflow business logic
full UI component library
dynamic UI engine
settings/admin UX depth
Those are handled in later patches.

1.4 Core security law
DAuth is the only platform auth/control spine. There must never be a second runtime engine for:

authn
authz
SoD
delegation
authority
lifecycle authorization
access snapshot
2. Canonical DAuth Target Blueprint
2.1 DAuth responsibilities
DAuth must provide these capabilities as first-class runtime services.

A. Identity and principal model
human identity
agent identity
service account identity if supported
external actor identity if supported
canonical actor registry and actor typing
user-to-actor linkage
principal status and activation posture
B. Authentication and session control
access token issuance
refresh token issuance and rotation
token verification
revocation handling
session creation
session validation
logout/revoke behavior
inactive/locked user handling
tenant membership validation during auth resolution
C. MFA and credential controls
MFA enrollment state
MFA challenge and verification flows
privileged-path MFA enforcement
credential reset/verification contracts
brute-force/login-attempt tracking
D. Access model
access profiles
functional roles
permissions
role_permissions
access assignment and revocation
effective access resolution
access snapshot generation
permission inheritance or projection rules where explicitly supported
E. Scope model
tenant scope
organization scope
business unit/division scope
department scope
section scope
team scope
position scope
entity/resource scope where allowed
ownership-linked scope enforcement
F. Authority model
decision authorities
sign-off authorities
approval authorities
override authorities where explicitly allowed
authority levels and thresholds
authority binding to actors/roles/scopes
G. Delegation model
temporary delegation
scoped delegation
action-bounded delegation
delegated authority materialization
acting-on-behalf-of enforcement
delegation validity windows
delegation audit trail
H. SoD model
static conflict detection
runtime action conflict detection
assignment-time conflict detection
soft vs hard conflict modes
warn / block / escalate outcomes
SoD audit trail
I. Lifecycle authorization model
permission checks for transitions
authority checks for transitions
self-approval prevention
maker-checker separation
delegation-aware transition auth
SoD-aware transition auth
audit logging for transition decisions
J. Middleware and consumption contracts
backend auth middleware
backend access middleware
backend optional-auth middleware
frontend session/auth service contract
frontend access snapshot contract
frontend guard contract
frontend interceptor contract
frontend action visibility contract
K. Audit and security policy
auth decision log
guard decision log
token/session audit
access review state
invitation/external scope control
tenant security policy runtime config
security event emission for major auth actions
2.2 DAuth ownership boundaries
DAuth owns directly
users as auth principals where relevant to control
tenant_user_memberships for auth evaluation
actor registry and actor auth linkage
token/session/revocation/MFA state
access profiles
functional roles
permissions and role-permission mappings
actor/user access assignments
role assignments
authorities and sign-off matrices
delegation runtime state
SoD runtime state
access review and invitation control state
auth/security configuration runtime state
access snapshots
auth and access middleware contracts
auth-facing frontend consumption contracts
auth audit trails
DAuth consumes but does not own
DOS org/team/position structure as scope source
DOS product/module enablement as entitlement source
product business objects as protected runtime targets
DOS lifecycle definitions as transition definitions
DOS provisioning backbone as upstream bootstrap orchestrator
DAuth must not implement
product business logic
DOS foundation structure ownership
product dashboard/layout truth
shell composition truth that belongs to DOS
duplicate workflow engines
2.3 Required backend package layout
backend/src/platform/dauth/
  identity/
  session/
  actor/
  mfa/
  access/
  scope/
  authority/
  delegation/
  sod/
  lifecycle-auth/
  middleware/
  frontend-contracts/
  audit/
  policies/
  contracts/
  types/
  index.ts
2.3.1 Required concern split
identity/
Identity resolution, principal state, user-to-actor linkage.

session/
Token issuance, token verification, refresh rotation, revocation, session lifecycle.

actor/
Actor registry, actor types, acting principal model.

mfa/
MFA enrollment, challenge, validation, privileged-path enforcement.

access/
Access profiles, functional roles, permissions, assignments, access resolver, access snapshot.

scope/
Scope adapters, scope bindings, effective scope resolution, ownership-linked scope resolution.

authority/
Authority levels, sign-off, decision authority, override rules.

delegation/
Delegation policies, delegations, delegated authorities, acting-on-behalf-of enforcement.

sod/
SoD rules, conflict detection, decision outcomes, conflict logs.

lifecycle-auth/
Lifecycle transition authorization using permission + scope + authority + delegation + SoD.

middleware/
Canonical backend middleware only. No recreation of old flat middleware bag.

frontend-contracts/
Canonical contracts for frontend session/access consumption.

audit/
Auth decision logging, security events, review and trace support.

policies/
Runtime security policy evaluation where DAuth owns it.

contracts/
Shared DAuth backend contracts.

types/
DAuth-owned types only.

2.4 Required frontend package layout
frontend/src/app/core/dauth/
  session/
  access/
  guards/
  interceptors/
  directives/
  contracts/
  audit/
  index.ts
2.4.1 Required frontend DAuth ownership
Frontend DAuth core must provide:

session state consumption
access snapshot consumption
auth/session service
auth interceptor
CSRF/security interceptor if applicable
guard contracts
action visibility directives/helpers
auth-aware route entry contracts
2.4.2 Frontend DAuth must not provide
hardcoded permission truth
role-priority truth as access engine
local duplicate access engine
hidden admin bypass logic
2.5 Required DAuth tables
2.5.1 Canonical identity and auth runtime truth
users
tenant_user_memberships
email_verification_tokens
password_reset_tokens
user_mfa
login_attempts
session tables
refresh token tables
token family / revocation tables
actor registry tables
2.5.2 Canonical access runtime truth
access_profiles
functional_roles
permissions
role_permissions
user_access_profiles
user_role_assignments
enterprise_user_role_assignments
actor_access_assignments
actor_role_assignments
role_assignment_history
permission inheritance/projection tables where explicitly used
2.5.3 Canonical scope/auth control runtime truth
external_user_scopes
tenant_security_config
scope binding tables where DAuth owns them
ownership-linked access binding tables where DAuth owns them
2.5.4 Canonical authority runtime truth
authority_levels
authority_matrix
decision_authorities
sign_off_authority_matrix
2.5.5 Canonical delegation runtime truth
delegations
delegation_rules
delegated_authorities
delegated audit/runtime state tables
2.5.6 Canonical SoD runtime truth
sod_rules
sod_conflict_log
sod_conflict_matrix
2.5.7 Canonical review and audit runtime truth
access_review_campaigns
access_review_items
invitations
authorization_decision_log
authz_decision_log
guard_decision_log
other DAuth-owned audit tables
Important rule
Product business tables are not DAuth core truth. DAuth may evaluate access to them, but must not absorb them into its own canonical runtime set.

2.6 Required DAuth services
Identity and actor
IdentityService
ActorService
PrincipalResolutionService
Sessions and tokens
TokenService
SessionService
RefreshService
RevocationService
SessionContextService
MFA and credential control
MfaService
CredentialRecoveryService
LoginProtectionService
Access core
PermissionService
FunctionalRoleService
AccessProfileService
RoleAssignmentService
AccessResolver
AccessSnapshotService
Scope
ScopeResolver
OrgScopeAdapter
TeamScopeAdapter
PositionScopeAdapter
OwnershipScopeAdapter
Authority
AuthorityService
DecisionAuthorityService
SignOffAuthorityService
Delegation
DelegationService
DelegationPolicyService
ActingOnBehalfOfService
SoD
SodEngine
SodPolicyService
SodConflictAuditService
Lifecycle authorization
LifecycleAuthService
SelfApprovalGuard
MakerCheckerPolicyService
Middleware / frontend contracts
SessionMiddleware
OptionalSessionMiddleware
AccessMiddleware
FrontendAccessContractService
Audit and security policy
AuthDecisionAuditService
SecurityEventService
AccessReviewService
InvitationControlService
TenantSecurityPolicyService
2.7 Required APIs and contracts
2.7.1 Required backend API contract families
DAuth must expose typed contracts for:

login
logout
refresh
revoke
MFA challenge/result
access snapshot retrieval
access review operations
invitation and external scope operations
security-status retrieval if needed
2.7.2 Required DAuth contract categories
principal/auth context contract
session contract
token contract
access snapshot contract
scope resolution contract
authority decision contract
delegation decision contract
SoD decision contract
lifecycle auth decision contract
auth error contract
frontend session/access contract
2.7.3 Canonical auth error model
DAuth must define explicit error classes/shapes for at least:

unauthenticated
invalid token
expired token
revoked session
inactive user
missing tenant membership
inactive tenant
forbidden
SoD blocked
self-approval blocked
authority insufficient
delegation invalid
lifecycle transition denied
clearance denied if applicable
2.8 Required access model
2.8.1 Access layers
DAuth access must separate these concepts:

Access profile
Broad platform/user posture. Examples:

tenant admin
operator
reviewer
external actor posture
Functional role
Business/runtime role assignment for actions and scope. Examples:

risk owner
compliance analyst
policy approver
vendor reviewer
Permission
Atomic or patterned capability string. Recommended naming standard: module.resource.action

Authority
Special power beyond plain permission. Examples:

approve high-criticality change
override exception
sign off policy publish
Scope
Where the role/permission applies.

Experience metadata
Dashboards, widgets, landing pages, badges, and role display hints. This is not access truth.

2.8.2 Access resolution law
Effective access must be computed by one canonical AccessResolver and surfaced via one canonical AccessSnapshotService.

AccessResolver inputs must include
actor/principal
tenant membership
access profiles
functional roles
role-permission mappings
scope bindings
product/module entitlements from DOS
authority bindings
delegation state
SoD state where applicable
AccessResolver outputs must include
principal posture
access profiles
functional roles
effective permissions
effective scopes
effective authorities
allowed products/modules
access audit trace metadata where appropriate
2.9 Required scope model
2.9.1 Canonical scope hierarchy
Tenant → Organization → Business Unit / Division → Department → Section → Team → Position → Entity/Resource where supported

2.9.2 Scope resolution law
Scope must be resolved from DOS structure and DAuth scope bindings. No UI-only scope shortcuts. No fake workspace-only auth scope.

2.9.3 Required scope adapters
org structure adapter
team adapter
position adapter
ownership adapter
external scope adapter
2.10 Required authority model
2.10.1 Authority concepts
DAuth must distinguish:

permission to act
authority to approve/sign-off/override
2.10.2 Required authority artifacts
authority levels
decision authorities
sign-off matrix
threshold rules
authority scope bindings
2.10.3 Authority law
Permission alone is insufficient for high-impact transitions where authority is required.

2.11 Required delegation model
2.11.1 Delegation support
DAuth must support:

time-bounded delegation
scope-bounded delegation
action-bounded delegation
delegated authority
acting-on-behalf-of traceability
invalid/expired delegation rejection
2.11.2 Delegation law
Delegation must be centralized in DAuth. No governance-local or agent-local duplicate delegation engines.

2.11.3 Delegation decision outputs
Must include:

is delegated
delegator
delegate
scope validity
action validity
expiration validity
audit trace reference
2.12 Required SoD model
2.12.1 SoD support
DAuth must support:

static assignment conflict detection
dynamic action conflict detection
hard conflict vs soft conflict
block / warn / escalate outcomes
conflict logging
reviewable conflict state
2.12.2 SoD law
SoD must be one engine only. No second runtime SoD detector anywhere else.

2.12.3 SoD minimum decisions
At least:

assignment-time check
approval-time check
lifecycle-transition check where relevant
delegated-action check where relevant
2.13 Required lifecycle authorization model
2.13.1 Lifecycle auth purpose
DAuth must decide whether a requested transition is allowed using:

permission
scope
authority
self-approval rule
maker-checker rule
delegation rule
SoD rule
2.13.2 Required lifecycle auth outputs
allow or deny
denial reason class
authority reason
self-approval result
SoD result
delegated decision details if used
audit trace reference
2.13.3 Lifecycle auth law
No state-changing action may bypass lifecycle authorization where applicable.

2.14 Required backend middleware
2.14.1 Canonical middleware set
DAuth backend must provide at minimum:

authenticate()
optionalAuthenticate()
requirePermission()
requireRole() only if role checks remain explicitly allowed at the correct layer
requireAnyPermission()
middleware or wrappers for lifecycle authorization where needed
2.14.2 Middleware law
These must live under DAuth namespaces. Do not recreate the deleted flat middleware architecture.

2.14.3 Middleware behavior rules
typed request auth context
consistent auth error model
consistent expired/revoked handling
no hidden super-admin shortcuts in random routes
explicit audit where needed
2.15 Required frontend consumption contracts
2.15.1 Frontend DAuth core must provide
AuthSessionService
AccessStore
AuthInterceptor
CsrfInterceptor if applicable
AuthGuard
ModuleGuard
admin/entry guards only if they consume access snapshot truth
action visibility helpers/directives reading access snapshot truth
2.15.2 Frontend law
No static role maps may be treated as actual access truth. No permission engine may live in the frontend.

2.15.3 Access snapshot contract
Frontend must consume one canonical access snapshot, not rebuild access from scattered endpoints.

2.16 Required audit architecture
2.16.1 Audit minimums
DAuth must log at least:

login success/failure
refresh success/failure
logout/revoke
MFA challenge/result
access denied and high-risk access granted
lifecycle authorization decisions
SoD conflict outcomes
delegated actions
self-approval prevention triggers
role/profile assignment changes
invitation and external scope operations
2.16.2 Audit law
Every sensitive auth/control decision must be reconstructable with:

principal
actor if distinct
tenant
module/product if relevant
requested action
scope
authority
decision result
reason
timestamp
correlation id
3. Current-State Audit Method
An agent auditing DAuth must perform the following checks.

3.1 Namespace and package audit
Inspect whether:

DAuth namespace roots exist on backend and frontend
auth/control concerns are grouped by DAuth concern rather than old flat folders
old deleted auth structures are not recreated indirectly
Evidence to collect
backend DAuth folder tree
frontend DAuth folder tree
legacy import usage
duplicated auth/control concerns in wrong layers
3.2 Table audit
Inspect all DAuth-relevant tables and verify:

correct owner
correct bucket
correct public vs tenant placement
no legacy tables still treated as runtime truth
3.3 Identity/session audit
Inspect:

token issuance
token verification
refresh handling
revocation handling
session context
MFA state
credential reset/verification contracts
3.4 Access core audit
Inspect:

access profiles
functional roles
permissions
role permissions
assignment tables and services
access resolver
access snapshot generation
3.5 Scope audit
Inspect:

scope adapters
DOS org/team/position integration
ownership-linked scope logic
no fake UI-only scope logic
3.6 Authority audit
Inspect:

authority levels
decision authority tables/services
sign-off matrices
threshold logic
3.7 Delegation audit
Inspect:

centralized delegation engine
duplication across governance/AI/platform layers
delegated authority materialization
acting-on-behalf-of enforcement
3.8 SoD audit
Inspect:

presence of a real SoD engine
use of sod_rules, sod_conflict_log, sod_conflict_matrix
assignment-time and action-time use
absence of duplicates
3.9 Lifecycle authorization audit
Inspect:

lifecycle auth service existence
self-approval prevention
maker-checker support
authority + SoD integration into transition authorization
3.10 Frontend consumption audit
Inspect:

auth/session services
access snapshot usage
guards and interceptors
absence of static role/permission truth
action visibility reading DAuth truth
3.11 Audit/logging audit
Inspect:

auth decision logs
session/token logs
SoD/delegation/lifecycle decision logs
security event emission
4. Gap Classification for DAuth
Use the shared taxonomy from Patch 0 with these meanings.

4.1 Missing
Required DAuth service, table usage, contract, middleware, guard, snapshot, or audit surface does not exist.

4.2 Incomplete
Artifact exists but lacks required behavior such as:

refresh rotation
scope resolution
authority checks
SoD checks
lifecycle authorization
audit logging
4.3 Duplicate
Two or more auth/control engines exist for the same concern. Examples:

multiple access resolvers
multiple delegation engines
multiple SoD engines
frontend and backend both acting as truth
4.4 Wrong Owner
Auth/control concern implemented under DOS, product, module, AI, or UI when DAuth should own it.

4.5 Wrong Layer
Examples:

product domain tables mislabeled as DAuth core truth
UI role maps treated as real permission engine
DOS lifecycle definitions mistaken for DAuth lifecycle authorization
4.6 Legacy Carryover
Old auth/rbac structures or legacy tables/contracts still influence runtime.

4.7 Forbidden Pattern
Examples:

fallback permission chains
route-level raw role comparisons as main auth model
hidden super-admin shortcuts
SoD duplicates
local module auth engines
4.8 Production Blocker
Examples:

no auth middleware
no valid session path
no access snapshot
no SoD engine where required
lifecycle transitions can bypass authorization
4.9 Handover Blocker
Examples:

no auth audit traceability
no security control documentation in as-built state
ambiguous ownership over critical auth/control services
5. Required Artifact Matrix
Every DAuth pass must use this artifact matrix.

Artifact Class	Required in Patch 3	Examples
Files/Folders	Yes	DAuth namespaces, concern packages
Services	Yes	TokenService, AccessResolver, SodEngine
Contracts/Schemas	Yes	access snapshot, auth error, lifecycle auth decision
Tables/Data	Yes	access_profiles, role_permissions, delegations
APIs	Yes	login, refresh, access snapshot
Events	Yes	auth/security events
Workflows/Lifecycle	Yes	lifecycle auth gating
UI/Admin Surfaces	Yes	guards, access store, action visibility consumption
Audit/Logs	Yes	authz_decision_log, guard_decision_log
Tests	Yes	token/session/access/SoD/delegation/lifecycle
As-Built Updates	Yes	DAuth build state and remaining blockers
If any artifact class is skipped, the pass is incomplete.

6. Exact Build Instructions
This section tells the agent what to build or repair when DAuth gaps are found.

6.1 If session/token spine is weak or missing
Build this
Create or stabilize:

TokenService
SessionService
RefreshService
RevocationService
SessionContextService
Define explicitly:

access token generation
refresh token generation
token verification
refresh rotation
revocation/logout behavior
auth error model
session audit hooks
Do not build this
configless token handling
mixed access/refresh token semantics
hidden auth logic inside routes
old flat auth middleware recreation
6.2 If identity/actor model is weak
Build this
Create or stabilize:

IdentityService
ActorService
PrincipalResolutionService
Ensure actors support at least:

human actors
agent actors
external actors where supported
Do not build this
hardcoded assumptions that all principals are plain users with no actor model
agent bypass paths outside actor resolution
6.3 If access core is fragmented
Build this
Create or stabilize:

PermissionService
FunctionalRoleService
AccessProfileService
RoleAssignmentService
AccessResolver
AccessSnapshotService
Define permission naming standard:

module.resource.action
Define access snapshot contents clearly.

Do not build this
fallback permission chains
module-local permission engines
frontend permission reconstruction logic
6.4 If scope resolution is weak or fake
Build this
Create or stabilize:

ScopeResolver
OrgScopeAdapter
TeamScopeAdapter
PositionScopeAdapter
OwnershipScopeAdapter
Do not build this
UI-only scope logic
fake workspace-only scope as substitute for real DOS structure
6.5 If authority is underspecified
Build this
Create or stabilize:

AuthorityService
DecisionAuthorityService
SignOffAuthorityService
Ensure distinction between permission and authority is explicit.

Do not build this
approval power hidden in raw role names
transition power implied only from permissions when authority is required
6.6 If delegation is fragmented
Build this
Create or stabilize:

DelegationService
DelegationPolicyService
ActingOnBehalfOfService
Centralize all delegation here.

Do not build this
governance-local delegation engine
AI-local delegation engine
product-specific duplicate delegation logic
6.7 If SoD is absent or duplicated
Build this
Create or stabilize:

SodEngine
SodPolicyService
SodConflictAuditService
Support:

assignment-time conflicts
action-time conflicts
warn/block/escalate outcome modes
Do not build this
second SoD engine
UI-only conflict checks
soft “advisory-only” handling without explicit policy
6.8 If lifecycle authorization is weak
Build this
Create or stabilize:

LifecycleAuthService
SelfApprovalGuard
MakerCheckerPolicyService
Lifecycle auth must combine:

permission
scope
authority
self-approval rule
delegation state
SoD state
Do not build this
state-changing routes that only check permission and skip authority/SoD/self-approval
6.9 If backend middleware is weak or missing
Build this
Create or stabilize:

authenticate()
optionalAuthenticate()
requirePermission()
requireAnyPermission()
other narrow wrappers only if still justified under DAuth
Do not build this
giant flat middleware bag
direct route-level role string comparisons as canonical control model
6.10 If frontend auth consumption is weak
Build this
Create or stabilize:

AuthSessionService
AccessStore
AuthInterceptor
CsrfInterceptor if applicable
AuthGuard
ModuleGuard
access-aware directives/helpers
Do not build this
static permission maps as truth
role-priority engines in frontend as substitute for access snapshot
6.11 If audit coverage is weak
Build this
Create or stabilize:

AuthDecisionAuditService
SecurityEventService
auth/security event emission
access review logging
Do not build this
sensitive control decisions with no audit record
silent delegation or SoD denials
7. Example Skeletons
7.1 Example backend folder layout
backend/src/platform/dauth/
  identity/identity.service.ts
  actor/actor.service.ts
  session/token.service.ts
  session/session.service.ts
  session/refresh.service.ts
  access/access-resolver.service.ts
  access/access-snapshot.service.ts
  scope/scope-resolver.service.ts
  authority/authority.service.ts
  delegation/delegation.service.ts
  sod/sod.engine.ts
  lifecycle-auth/lifecycle-auth.service.ts
  middleware/session.middleware.ts
  contracts/access-snapshot.types.ts
  audit/auth-decision-audit.service.ts
  index.ts
7.2 Example access snapshot contract
export interface AccessSnapshot {
  principalId: string;
  actorId?: string;
  tenantId: string;
  accessProfiles: string[];
  functionalRoles: string[];
  permissions: string[];
  scopes: Array<{ type: string; id: string }>;
  authorities: string[];
  allowedProducts: string[];
  allowedModules: string[];
}
7.3 Example auth decision contract
export interface AuthDecision {
  allowed: boolean;
  reasonCode?: string;
  permission?: string;
  authority?: string;
  scopeMatched?: boolean;
  delegated?: boolean;
  sodOutcome?: 'clear' | 'warn' | 'blocked';
  correlationId?: string;
}
7.4 Example lifecycle auth decision contract
export interface LifecycleAuthDecision {
  allowed: boolean;
  reasonCode?: string;
  selfApprovalBlocked?: boolean;
  makerCheckerBlocked?: boolean;
  authoritySatisfied?: boolean;
  sodOutcome?: 'clear' | 'warn' | 'blocked';
  delegated?: boolean;
}
7.5 Example test expectations
it('denies access when no effective permission exists', () => {
  // AccessResolver deny-by-default example
});

it('blocks self-approval on protected transition', () => {
  // Lifecycle auth example
});

it('blocks hard SoD conflicts during approval', () => {
  // SoD example
});
8. Tests Required for DAuth
8.1 Unit tests required
token generation/verification
refresh rotation
session context building
access resolver outputs
scope resolution
authority evaluation
delegation validity
SoD outcomes
lifecycle auth decisions
8.2 Integration tests required
login/refresh/logout flows
access snapshot retrieval
route middleware enforcement
lifecycle transition enforcement
delegation in real route flow
SoD block in real route flow
external user scope/invitation flows where supported
8.3 Contract tests required
auth error contracts
access snapshot contract
auth decision contract
lifecycle auth decision contract
frontend access/session contract
8.4 Operational smoke tests required
protected route denied without valid session
valid session resolves auth context
revoked/expired session rejected consistently
access snapshot returns coherent products/modules/scopes
SoD and self-approval blocks trigger as expected
9. Review Checklist for DAuth
The reviewer must confirm:

DAuth owns all auth/control concerns in scope
session/token spine is singular and complete
access core is singular and complete
scope is derived from DOS structure, not invented locally
authority is distinct from permission
delegation is centralized
SoD is centralized
lifecycle authorization exists and is not bypassed
frontend consumes access snapshot truth and does not invent access truth
audit/logging exists for sensitive decisions
no forbidden patterns were reintroduced
If any required item is missing, final decision is FAIL.

10. Acceptance Criteria
Patch 3 passes for target object X only if all below are true.

10.1 Ownership correctness
auth/control concerns live in DAuth
DOS and product layers do not reimplement DAuth runtime truth
10.2 Artifact completeness
required DAuth folders/files/services/contracts exist or are explicitly classified missing for follow-up build
required tables and contract families are correctly classified and used
10.3 Runtime viability
session/token/auth path is coherent
access snapshot path is coherent
scope/authority/delegation/SoD/lifecycle auth are not hidden or duplicated
10.4 Audit and handover readiness
key auth/control decisions are auditable
tests are declared
as-built updates are explicit
11. Fail Conditions
Patch 3 fails if any of the following are true:

more than one auth/control engine remains runtime truth
access resolution still depends on fallback chains or frontend truth
SoD is absent or duplicated
delegation is absent or duplicated
lifecycle transitions can bypass DAuth lifecycle authorization where applicable
scope is not grounded in DOS structure
authority is conflated with permission where distinction is required
required artifact classes were skipped
the implementation or audit widened outside DAuth scope without approval
12. As-Built Update Instructions
Any pass or implementation based on Patch 3 must update the as-built ledger with:

DAuth package structure created or normalized
DAuth services created or stabilized
tables/contracts/events affected
session/token/auth middleware status
access snapshot status
scope/authority/delegation/SoD/lifecycle-auth status
frontend auth consumption status
remaining blockers and handover impacts
13. Required Agent Output Format
Use the shared format from Patch 0, with DAuth-specific clarity:

Slice Summary
Approved Scope Checklist
Requirement-to-Implementation Mapping
Files / Schemas / Tables Inspected
Files / Schemas / Tables Changed
Contracts / Tables / Events Affected
What Was Built / Fixed
What Was Explicitly Not Changed
Gap Classification
Tests / Validation Run
Remaining Risks
Final Decision
Recommended Next Part
As-Built Update Required
14. Recommended Next Patch
After Patch 3, the next patch should be:

Patch 4 — Product Stack

because products must consume DOS and DAuth correctly without reintroducing platform or auth drift.

15. One-Line Use Instruction
Use Patch 3 to compare the current auth/security/control stack against the full DAuth target, classify every auth/control gap, build only the missing DAuth artifacts, validate against DAuth pass/fail rules, and update the as-built ledger.

# Patch 4 — Product Stack

## 0. Patch Identity

### 0.1 Patch name

**Patch 4 — Product Stack**

### 0.2 Patch class

This is a **Reusable Enforcement Patch**.

It is simultaneously:

* target-state specification
* comparison specification
* implementation specification
* review specification
* handover specification

### 0.3 Patch purpose

This patch defines the full target model for the **product layer** in the AI-OS platform.

It tells an agent exactly how to:

* inspect a product such as Shahin-AI
* compare the current product structure against the canonical product target
* classify all product-layer gaps
* know exactly what product boundaries, packages, contracts, defaults, events, dashboards, workflows, enablement hooks, admin surfaces, tests, and handover records must exist
* know exactly what a product may own, what it must consume from DOS, and what it must never reimplement from DAuth or DOS

### 0.4 Patch role in the patch library

This patch defines what a **product** is in the platform.

It is the canonical bridge between:

* DOS platform core
* DAuth control spine
* product domain modules
* product server implementation
* product shell/runtime surfaces
* product AI behavior
* product dashboards and defaults

No later patch may redefine the product layer in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs

This patch governs the **product object model**.

### 1.2 Target object types

This patch applies to:

* product object
* product manifest object
* product package object
* product runtime composition object
* product default configuration object
* product module bundle object
* product dashboard bundle object
* product navigation bundle object
* product lifecycle integration object
* product provisioning integration object
* product event integration object
* product admin surface object
* product observability/handover object

### 1.3 Explicitly out of scope

This patch does **not** fully define:

* detailed server-side product service implementation internals
* deep per-module implementation details
* detailed workflow engine internals
* detailed UI component library internals
* DAuth internal control logic

Those are handled in later patches.

### 1.4 Product definition

A product is a **cohesive, market-facing capability layer** built on DOS and protected by DAuth.

A product is not:

* a replacement platform core
* a replacement auth engine
* a random collection of modules with no bundle contract
* a dashboard theme only
* a route grouping only

A product is a structured, versioned, deployable, observable, provisionable operating surface composed from:

* platform contracts
* product-owned modules and policies
* product defaults
* product workflows
* product dashboards
* product runtime composition

---

## 2. Canonical Product Target Blueprint

## 2.1 Product responsibilities

A product must provide these capabilities.

### A. Product identity and registration

* product code
* product name
* version
* market classification
* tenant eligibility rules
* module bundle definition
* provisioning profile definition
* route bundle definition
* event namespace segment
* dashboard bundle definition
* admin surface definition

### B. Product composition

* explicit set of modules included in the product
* explicit set of optional modules supported by the product
* explicit dependency rules among product modules
* explicit defaults for provisioning, navigation, dashboards, widgets, settings, and workflows
* explicit ownership boundaries between product and platform

### C. Product runtime contract

* product runtime context
* product readiness state
* product active/inactive state per tenant/workspace
* product module enablement integration
* product access contract consumption from DAuth
* product shell integration consumption from DOS

### D. Product experience contract

* product home/landing surface
* product navigation grouping
* product dashboard model
* product widget model
* product runtime feature surfacing
* product operator/admin surfaces

### E. Product governance contract

* product lifecycle/version management
* product activation constraints
* product configuration ownership
* product observability expectations
* product audit expectations
* product handover expectations

### F. Product AI and workflow alignment

* product-specific workflow definitions or compositions
* product-specific AI behavior where allowed
* product-specific event subscription and emission boundaries
* product-specific automation boundaries

---

## 2.2 Product ownership boundaries

### Product owns directly

* product manifest
* product package structure
* product-owned defaults
* product-owned dashboards and navigation bundles
* product-owned module bundle declarations
* product-owned product policies and product-level configuration
* product-owned runtime surfaces and landing pages
* product-owned composition of workflows and AI capabilities
* product-specific admin surfaces
* product-specific operational rules that do not duplicate DOS/DAuth

### Product consumes but does not own

* DOS tenancy/workspace/platform runtime
* DOS shell runtime composition contracts
* DOS product/module enablement infrastructure
* DOS provisioning backbone
* DOS event backbone
* DOS lifecycle framework
* DAuth identity/access/scope/authority/delegation/SoD/lifecycle-auth decisions

### Product must not implement

* its own auth engine
* its own permission source of truth
* its own generic tenancy model
* its own platform shell core
* its own separate module registry model
* its own separate event bus
* its own generic lifecycle engine

---

## 2.3 Required backend package layout

```text
backend/src/products/<product-code>/
  manifest/
  composition/
  modules/
  workflows/
  dashboards/
  navigation/
  policies/
  defaults/
  provisioning/
  events/
  admin/
  ai/
  observability/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split

#### `manifest/`

Product registration contract and manifest logic.

#### `composition/`

Product bundle assembly and runtime composition logic.

#### `modules/`

Product-owned module registration surface and module bundle mapping.

#### `workflows/`

Product workflow composition and product workflow defaults.

#### `dashboards/`

Product dashboard bundle metadata.

#### `navigation/`

Product navigation grouping and shell composition metadata.

#### `policies/`

Product-level rules/configuration that do not replace DAuth or DOS.

#### `defaults/`

Product defaults for provisioning, module enablement, dashboards, workflows, experience.

#### `provisioning/`

Product hooks into the DOS provisioning pipeline.

#### `events/`

Product event registrations, producers, and subscribers.

#### `admin/`

Product admin/runtime management surfaces.

#### `ai/`

Product-specific AI behavior, within the rules of Patch 7 later.

#### `observability/`

Product-specific health and telemetry integration.

#### `contracts/`

Product runtime contracts.

#### `types/`

Product-owned types only.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/products/<product-code>/
  shell/
  pages/
  features/
  dashboards/
  widgets/
  navigation/
  admin/
  settings/
  workflows/
  ai/
  contracts/
  types/
  index.ts
```

### 2.4.1 Product frontend ownership

Product frontend must provide:

* product landing and home surfaces
* product pages and feature composition
* product dashboard and widget bundles
* product navigation configuration
* product admin and settings surfaces
* product workflow surfaces
* product AI interaction surfaces where allowed

### 2.4.2 Product frontend must not provide

* platform shell ownership
* auth truth
* module visibility truth separate from DOS/DAuth contracts
* role/permission engine logic

---

## 2.5 Required product manifest

Every product must expose a canonical manifest.

### 2.5.1 Required product manifest fields

* `code`
* `name`
* `version`
* `category`
* `routeBase`
* `eventNamespace`
* `ownedModules`
* `optionalModules`
* `requiredPlatformCapabilities`
* `requiredDauthCapabilities`
* `defaultDashboards`
* `defaultNavigationGroups`
* `defaultProvisioningProfile`
* `defaultAdminSurfaces`
* `productSettingsSchema`
* `productLifecyclePolicy`
* `observabilityProfile`

### 2.5.2 Product manifest law

The product manifest defines:

* what the product is
* what the product bundles
* what the product depends on
* what the product surfaces
* what the product expects from DOS and DAuth

The manifest must not encode effective permission truth.

---

## 2.6 Required product runtime contracts

Every product must define typed contracts for:

* product runtime context
* product readiness status
* product module bundle status
* product dashboard bundle
* product navigation bundle
* product provisioning defaults
* product admin capability exposure
* product observability surface

### 2.6.1 Product runtime context minimums

* tenant id
* workspace id if relevant
* product code
* version
* active modules
* readiness state
* active dashboards
* navigation groups
* required capabilities status

---

## 2.7 Required product defaults

Every product must define:

* default enabled modules
* optional module expansion set
* default landing page/home route
* default dashboard layout bundle
* default navigation grouping
* default workflow bundle
* default provisioning seed hooks
* default product settings
* default admin views

### Product defaults law

Defaults are product-owned configuration and experience, not runtime access truth.

---

## 2.8 Required product data ownership

### Product-owned runtime data categories

A product may own:

* business domain tables
* product policy tables
* product dashboard-specific runtime tables
* product workflow state tables
* product automation tables
* product AI/runtime coordination tables

### Product must not own as product truth

* platform tenant truth
* platform product/module registry truth
* DAuth permission truth
* DAuth authority truth
* DAuth SoD/delegation truth

---

## 2.9 Required product event model

Every product must define:

* product-owned emitted events
* product-consumed platform events
* product-consumed DAuth control events where relevant
* product event namespace segment
* event subscription ownership
* event idempotency expectations for product handlers

### Product event law

A product uses the DOS event backbone.
A product must not create a second event bus.

---

## 2.10 Required product provisioning model

Every product must define:

* product provisioning profile
* product module bundle activation profile
* product dashboard/navigation defaults during provisioning
* product-specific seed hooks
* product readiness validation rules

### Product provisioning law

Products plug into DOS provisioning.
Products do not own the global provisioning engine.

---

## 2.11 Required product admin surfaces

Every product must define admin/runtime surfaces for:

* product enablement status
* product module bundle status
* product settings
* product health and diagnostics
* product workflow oversight
* product AI/runtime controls where applicable

### Product admin law

Product admin surfaces are product-owned, but must obey DOS shell and DAuth control contracts.

---

## 2.12 Required product observability model

Every product must expose:

* product health signal
* product module health aggregation
* product event handler health if applicable
* product provisioning/readiness telemetry
* product admin/runtime diagnostics
* product handover notes and operational risks

---

## 3. Current-State Audit Method

An agent auditing product X must perform the following checks.

## 3.1 Product existence audit

Verify that product X has:

* explicit backend namespace
* explicit frontend namespace
* explicit manifest
* explicit composition logic
* explicit defaults
* explicit dashboards/navigation bundles
* explicit provisioning hooks

## 3.2 Boundary audit

Verify product X does not:

* reimplement DOS platform core
* reimplement DAuth auth/control logic
* hide module registry or event bus logic locally
* define access truth in product UI or product backend

## 3.3 Bundle audit

Verify product X explicitly defines:

* owned modules
* optional modules
* required dependencies
* default routes
* default dashboard bundles
* default navigation bundles
* admin surfaces
* provisioning profile

## 3.4 Contract audit

Inspect whether product X exposes:

* product manifest contract
* product runtime context contract
* dashboard/navigation composition contracts
* provisioning default contracts
* product readiness contract

## 3.5 Event audit

Verify:

* product event namespace
* explicit producers and subscribers
* no hidden side-channel eventing
* product uses DOS event backbone only

## 3.6 Provisioning audit

Verify product X has:

* clear DOS provisioning integration
* product defaults applied during bootstrap
* no ad hoc post-bootstrap product initialization outside contract

## 3.7 Admin/ops audit

Verify product X has:

* admin and diagnostic surfaces
* health/telemetry surfaces
* handover notes or hooks

---

## 4. Gap Classification for Product Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing

A required product manifest, package, default set, dashboard bundle, navigation bundle, provisioning hook, admin surface, or contract does not exist.

### 4.2 Incomplete

Artifact exists but is missing required fields or runtime behavior.
Examples:

* manifest missing optional modules
* dashboards exist but no product runtime contract
* product settings exist but no admin surface

### 4.3 Duplicate

Two or more product surfaces define the same concern.
Examples:

* multiple manifests
* duplicate dashboard bundle definitions
* product-local eventing separate from DOS event backbone

### 4.4 Wrong Owner

Concern is implemented under DOS, DAuth, module, or UI layer when it belongs to the product layer, or vice versa.

### 4.5 Wrong Layer

Examples:

* product defines auth truth
* DOS defines product-specific dashboard logic with no product contract
* module-level defaults are acting as product defaults

### 4.6 Legacy Carryover

Old product structures or dead product bundles still influence runtime.

### 4.7 Forbidden Pattern

Examples:

* product-specific auth engine
* product-local event bus
* product-local tenancy model
* hidden module enablement rules outside DOS registry

### 4.8 Production Blocker

Examples:

* product cannot be provisioned coherently
* product module bundle is ambiguous
* no manifest means product runtime cannot be composed safely

### 4.9 Handover Blocker

Examples:

* no product health/admin model
* no product defaults documentation
* no product readiness definition

---

## 5. Required Artifact Matrix

Every product pass must address all artifact classes below.

| Artifact Class       | Required in Patch 4 | Examples                                          |
| -------------------- | ------------------- | ------------------------------------------------- |
| Files/Folders        | Yes                 | product namespaces, dashboards, defaults, events  |
| Services/Composition | Yes                 | product registry/composition hooks                |
| Contracts/Schemas    | Yes                 | manifest, runtime context, readiness              |
| Tables/Data          | Yes                 | product-owned policy/runtime tables               |
| APIs                 | Yes                 | product runtime/admin contracts                   |
| Events               | Yes                 | product namespace producers/subscribers           |
| Workflows/Lifecycle  | Yes                 | product workflow bundle references                |
| UI/Admin Surfaces    | Yes                 | home, dashboards, admin, settings                 |
| Audit/Logs           | Yes                 | product readiness/ops visibility                  |
| Tests                | Yes                 | bundle, manifest, provisioning, runtime readiness |
| As-Built Updates     | Yes                 | product implementation state                      |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If product manifest is missing or weak

### Build this

Create or stabilize:

* canonical product manifest file
* typed manifest schema
* manifest validation rules
* manifest registry integration

### Do not build this

* multiple partial manifests
* ad hoc JSON scattered across product code
* manifest fields that embed access truth

## 6.2 If product bundle definition is unclear

### Build this

Create explicit bundle declarations for:

* owned modules
* optional modules
* default routes
* default dashboards
* default navigation groups
* default workflows
* default admin surfaces
* default settings profile

### Do not build this

* “implicit” product bundles inferred only from routes or folders
* module lists hidden in code with no manifest contract

## 6.3 If product defaults are scattered

### Build this

Create a dedicated defaults package with:

* dashboard defaults
* navigation defaults
* provisioning defaults
* feature defaults
* workflow defaults
* settings defaults

### Do not build this

* defaults hardcoded in random page/service files
* DOS-level defaults pretending to be product-specific

## 6.4 If product provisioning integration is weak

### Build this

Create explicit provisioning hook contracts for:

* product activation
* module bundle activation
* default dashboard/navigation installation
* product readiness validation

### Do not build this

* post-bootstrap hidden product setup scripts
* product setup steps outside DOS provisioning contract

## 6.5 If product events are vague or duplicated

### Build this

Create explicit product event catalog entries for:

* product emitted events
* product subscribed events
* namespace usage
* handler ownership

### Do not build this

* product-local event buses
* hidden event subscriptions inside random services with no registry entry

## 6.6 If product admin surfaces are missing

### Build this

Create explicit product admin/runtime surfaces for:

* product status
* module bundle status
* settings
* readiness
* diagnostics

### Do not build this

* forcing platform admin to manage product internals from DOS-only screens with no product contract

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/products/shahin-ai/
  manifest/product.manifest.ts
  composition/product-composition.service.ts
  defaults/product-defaults.ts
  modules/product-module-bundle.ts
  dashboards/product-dashboard-bundle.ts
  navigation/product-navigation-bundle.ts
  provisioning/product-provisioning.hooks.ts
  events/product-events.ts
  admin/product-admin.contracts.ts
  contracts/product-runtime.types.ts
  index.ts
```

## 7.2 Example product manifest

```ts
export interface ProductManifest {
  code: string;
  name: string;
  version: string;
  routeBase: string;
  eventNamespace: string;
  ownedModules: string[];
  optionalModules: string[];
  defaultDashboards: string[];
  defaultNavigationGroups: string[];
  defaultProvisioningProfile: string;
}
```

## 7.3 Example runtime contract

```ts
export interface ProductRuntimeContext {
  tenantId: string;
  workspaceId?: string;
  productCode: string;
  activeModules: string[];
  ready: boolean;
  dashboards: string[];
  navigationGroups: string[];
}
```

## 7.4 Example test expectations

```ts
it('registers a product with an explicit owned and optional module bundle', () => {
  // product manifest/bundle example
});

it('applies product defaults during provisioning', () => {
  // product provisioning integration example
});
```

---

## 8. Tests Required for Product Stack

### 8.1 Unit tests required

* product manifest validation
* product defaults resolution
* product bundle composition
* product readiness calculation

### 8.2 Integration tests required

* product provisioning integration
* product dashboard/navigation install path
* product module bundle activation
* product runtime context loading

### 8.3 Contract tests required

* product manifest contract
* product runtime context contract
* product readiness contract
* product provisioning contract

### 8.4 Operational smoke tests required

* product appears correctly in DOS product registry
* product can be activated with coherent defaults
* product dashboards and navigation surface correctly

---

## 9. Review Checklist for Product Stack

The reviewer must confirm:

* product boundaries are explicit
* product does not reimplement DOS or DAuth concerns
* manifest is explicit and typed
* defaults are explicit and centralized
* module bundle is explicit
* provisioning integration is explicit
* events are explicit and use DOS event backbone
* admin/readiness surfaces exist
* no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 4 passes for target product X only if all below are true.

### 10.1 Ownership correctness

* product concerns live in the product layer
* DOS and DAuth concerns are consumed, not duplicated

### 10.2 Artifact completeness

* required product folders/files/services/contracts exist or are explicitly classified missing for follow-up build
* required bundle/defaults/admin/runtime artifacts are defined

### 10.3 Runtime viability

* product can be registered, composed, provisioned, and surfaced coherently
* product module bundle is explicit
* product defaults are explicit

### 10.4 Handover readiness

* product admin/readiness/ops hooks are explicit
* tests are declared
* as-built update path is explicit

---

## 11. Fail Conditions

Patch 4 fails if any of the following are true:

* product layer still reimplements DOS or DAuth concerns
* product manifest is missing or incoherent
* product bundle/defaults are implicit and scattered
* product events do not use DOS event backbone
* provisioning integration is not explicit
* required artifact classes were skipped
* scope widened outside product layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 4 must update the as-built ledger with:

* product package structure created or normalized
* product manifest and contracts created or updated
* product defaults and bundles created or updated
* product provisioning and event integration status
* product admin/readiness status
* remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with product-specific clarity:

1. Slice Summary
2. Approved Scope Checklist
3. Requirement-to-Implementation Mapping
4. Files / Schemas / Tables Inspected
5. Files / Schemas / Tables Changed
6. Contracts / Tables / Events Affected
7. What Was Built / Fixed
8. What Was Explicitly Not Changed
9. Gap Classification
10. Tests / Validation Run
11. Remaining Risks
12. Final Decision
13. Recommended Next Part
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 4, the next patch should be:

**Patch 5 — Product Server Stack**

because the product object must next be translated into server-side execution and runtime composition rules.

---

## 15. One-Line Use Instruction

Use Patch 4 to compare the current product layer against the full product target, classify every product-layer gap, build only the missing product artifacts, validate against product pass/fail rules, and update the as-built ledger.

# Patch 5 — Product Server Stack

## Purpose
This patch defines the full target model for the **server-side implementation stack of a product**. It tells an agent how to inspect the backend/server stack of product X, compare it against the canonical target, classify all server-layer gaps, and know what routes, services, repositories, contracts, jobs, event handlers, workflow hooks, admin handlers, diagnostics, and tests must exist.

## Scope
Target object types:
- product route object
- product controller object
- product service object
- product repository/data-access object
- product contract/schema object
- product event handler object
- product workflow hook object
- product provisioning hook object
- product admin route object
- product diagnostics/health object
- product background job object
- product server composition object

## Product server definition
A product server stack is the backend execution layer that makes the product real in runtime. It must expose product-owned APIs, orchestrate product services, integrate with DOS/DAuth, consume product defaults/manifests, host event handlers and workflow hooks, and provide admin/runtime operations without breaking platform or auth ownership boundaries.

## Canonical product server target blueprint
A product server stack must provide:
- route and API layer
- controller/handler layer
- product service layer
- data access layer
- event integration layer
- workflow and lifecycle hook layer
- provisioning and activation hooks
- admin/ops/diagnostics layer
- server composition layer

## Product server ownership boundaries
### Product server owns directly
- product routes
- product controllers
- product services
- product repositories
- product jobs
- product event handlers
- product diagnostics/admin handlers
- product provisioning hooks
- product workflow hooks

### Product server consumes but does not own
- DOS platform routing/mount framework
- DOS event bus and event registry
- DOS module and lifecycle framework
- DOS provisioning backbone
- DAuth auth middleware, access contracts, and lifecycle authorization decisions

### Product server must not implement
- its own auth middleware engine
- its own access resolution logic
- DOS platform-core concerns
- its own event bus
- its own generic state machine engine

## Required backend package layout
```text
backend/src/products/<product-code>/
  routes/
  controllers/
  services/
  repositories/
  contracts/
  schemas/
  events/
  workflows/
  provisioning/
  admin/
  diagnostics/
  jobs/
  composition/
  index.ts
```

## Required product server contracts
A product server stack must define typed contracts for:
- route request/response families
- product runtime state responses
- admin responses
- provisioning hook inputs/outputs
- event handler inputs/outputs where relevant
- diagnostics/health responses
- product error classes aligned to platform standards

## Required product route architecture
Routes must:
- mount cleanly under product route base
- use DAuth middleware correctly
- validate inputs
- call typed controllers/services
- emit consistent error shapes

Routes must not contain hidden business logic, direct repository access for major flows, inline auth policy engines, or duplicated validation logic.

## Required controller architecture
Controllers must translate transport into typed service calls, remain thin, avoid duplicated orchestration logic, emit typed responses, and attach correlation/context information where needed.

## Required product service architecture
Required service categories:
- runtime/read model services
- command/orchestration services
- product defaults application services
- product readiness/health services
- product diagnostics services
- event reaction services
- workflow integration services
- provisioning/activation services

## Required repository architecture
Repositories must own product data access only, use typed query/result models where possible, and not become hidden business-logic engines.

## Required event integration architecture
Product server must define:
- product event publishers
- product event subscribers
- product event handler routing
- idempotency expectations
- retry/dead-letter expectations where relevant
- event-to-service mapping

Product event handlers must use DOS event backbone only.

## Required workflow and lifecycle integration
Product server must define:
- workflow hooks
- lifecycle callbacks/integration services
- product transition side effects
- required DAuth lifecycle-auth touchpoints
- event emission on major workflow/lifecycle transitions where applicable

Product server must not implement a second generic lifecycle engine.

## Required provisioning and activation integration
Product server must define:
- activation hooks
- default install hooks
- readiness validation after bootstrap
- post-install event emission where relevant
- product bundle installation steps

## Required admin and diagnostics layer
Product server must define:
- product admin routes
- diagnostics services
- readiness/health endpoints or contracts
- runtime status contracts
- operator-safe diagnostics outputs

## Required jobs/background tasks
If the product uses background jobs, it must define job identity, ownership, scheduling triggers, retry/failure policy, event emission and observability hooks, and admin/ops visibility.

## Audit method
Audit:
- route audit
- controller audit
- service audit
- repository audit
- event audit
- workflow/provisioning audit
- admin/diagnostics audit

## Gap examples
- routes exist but no schema validation
- product runtime context exists but no readiness diagnostics
- event handlers exist but no idempotency contract
- auth logic hidden in product services
- controller acting as workflow engine
- no provisioning hook for product activation

## Build instructions
If route layer is weak, create/stabilize product route package, route grouping by domain/admin/runtime, typed schemas, and DAuth middleware integration.

If controller layer is fat, create thin controllers with schema-validated inputs, typed outputs, and service orchestration only.

If product services are fragmented, create service categories for reads/runtime context, commands/orchestration, provisioning/activation, workflow integration, diagnostics/readiness, and event reactions.

If repository boundaries are weak, create repositories aligned to product-owned tables and document ownership.

If event integration is weak, create explicit product event publishers/subscribers and handler mapping with retry/idempotency behavior.

If workflow/provisioning hooks are weak, create explicit workflow hook services, activation/provisioning hooks, and readiness validators.

If admin/diagnostics are weak, create admin route package, runtime diagnostics services, health/readiness surfaces, and product job visibility.

## Tests required
- unit tests for controllers, orchestration, readiness/diagnostics, event handler mapping, provisioning hook behavior
- integration tests for protected route mounting, runtime context retrieval, provisioning hook execution, event handlers, workflow hooks
- contract tests for routes, diagnostics, provisioning hooks, event handler contracts
- smoke tests for route mount, readiness computation, diagnostics, and provisioning/activation hooks

## Acceptance criteria
Patch 5 passes only if route/controller/service/repository boundaries are clean, DOS and DAuth are consumed rather than reimplemented, event integration is explicit, workflow/provisioning hooks are explicit, admin/diagnostic surfaces exist, and required artifacts are present or explicitly classified missing for follow-up.

## Fail conditions
Patch 5 fails if product server reimplements DOS or DAuth truth, boundaries are collapsed, eventing is ad hoc or duplicated, provisioning/workflow hooks are not explicit, diagnostics/admin surfaces are absent, or required artifact classes were skipped.

# Patch 6 — Module Stack

## Purpose
This patch defines the full target model for the **module layer** across the platform. It tells an agent how to inspect module X, compare it against the canonical module standard, classify every module gap, and know exactly what files, manifests, routes, services, repositories, tables, contracts, events, workflows, admin surfaces, tests, and handover records must exist.

## Scope
Target object types:
- module object
- module manifest object
- module package object
- module route object
- module controller object
- module service object
- module repository object
- module table/data object
- module contract/schema object
- module event object
- module workflow/lifecycle object
- module UI/admin exposure object
- module diagnostics/health object
- module test object

## Module definition
A module is a bounded capability unit with:
- clear manifest registration
- clear data ownership
- clear service boundaries
- clear API/event/workflow behavior
- clear integration with DOS and DAuth
- clear admin/runtime surface

A module is not a random folder of pages, a dashboard only, a permissions file only, a route group only, a second product, or a second platform.

## Canonical module target blueprint
Every module must provide:
- identity and registration
- runtime package structure
- data ownership
- API surface
- event surface
- workflow and lifecycle surface
- admin and diagnostics surface
- test surface

## Module ownership boundaries
### Module owns directly
- module manifest
- module routes/controllers/services/repositories
- module-owned tables and business state
- module-owned event handlers and publishers
- module-owned business workflow hooks
- module-owned diagnostics/admin surfaces
- module-owned frontend feature surfaces if applicable

### Module consumes but does not own
- DOS tenancy/workspace/module registry
- DOS lifecycle framework
- DOS provisioning backbone
- DOS shell/navigation/runtime composition
- DAuth auth/access/scope/authority/delegation/SoD/lifecycle-auth decisions
- product bundle composition from product layer

### Module must not implement
- its own auth engine
- its own access snapshot engine
- its own generic lifecycle engine
- its own product registry
- its own event bus
- its own tenancy model

## Required backend module package layout
```text
backend/src/modules/<module-code>/
  manifest/
  routes/
  controllers/
  services/
  repositories/
  contracts/
  schemas/
  events/
  workflows/
  admin/
  diagnostics/
  jobs/
  data/
  index.ts
```

## Required frontend module package layout
```text
frontend/src/app/features/<module-code>/
  pages/
  components/
  services/
  state/
  contracts/
  admin/
  diagnostics/
  workflows/
  widgets/
  index.ts
```

## Required module manifest
Every module must expose a typed canonical manifest with at least:
- `code`
- `name`
- `version`
- `tier`
- `category`
- `routeBase`
- `eventNamespace`
- `tablePrefix`
- `ownedTables`
- `publishedEvents`
- `consumedEvents`
- `hardDeps`
- `softDeps`
- `provisioningOrder`
- `lifecycleParticipation`
- `uiSurfaces`
- `adminSurfaces`
- `healthSignals`

Security registration metadata must also define permissions, actions, ownership rules, approval matrix metadata, SoD rule metadata, lifecycle metadata, and experience/display metadata where applicable.

## Required module data ownership
Every module must define:
- owned tables
- read-only dependencies on other tables by contract
- write boundaries
- runtime bucket classification of all tables touched

A module may own its business tables and consume DOS/DAuth tables through contracts or bounded adapters. It must not absorb DOS/DAuth runtime truth into its own ownership model.

## Required module route and API surface
Every module must define:
- runtime routes
- admin routes if applicable
- typed request/response contracts
- validation schemas
- lifecycle-sensitive actions identified
- event-emitting actions identified
- DAuth middleware requirements identified

Routes must be thin, typed, and guarded through DAuth where applicable.

## Required module service architecture
Service categories as needed:
- runtime/read services
- command/orchestration services
- lifecycle/workflow services
- diagnostics/readiness services
- event reaction services
- provisioning hooks if the module needs them

Services may own module behavior. They must not reimplement DOS or DAuth concerns.

## Required module repository architecture
Repositories must align to owned tables, owned write paths, and query/read responsibilities. They may not become hidden workflow/auth engines.

## Required module event architecture
Every module must define:
- published events
- consumed events
- event payload contracts
- handler ownership
- idempotency and retry expectations

Modules use the DOS event backbone only.

## Required module workflow and lifecycle architecture
Every module must define:
- workflow/lifecycle states
- transition actions
- DOS lifecycle integration
- DAuth lifecycle-auth checks for protected transitions
- event emissions on meaningful transitions
- recovery/retry behavior where needed

A module may define business-specific workflow/lifecycle metadata. It must not build a second generic state-machine engine.

## Required module admin and diagnostics architecture
Every module must define:
- module status surface
- diagnostics or health service
- admin operations where needed
- settings surface where needed
- handover/ops visibility where needed

## Required module test architecture
Every module must define and maintain:
- unit tests for services
- contract tests for APIs/events/manifests where needed
- integration tests for main flows
- lifecycle/event tests where relevant
- readiness/diagnostics tests where relevant

## Audit method
Audit:
- manifest audit
- backend package audit
- frontend package audit if applicable
- data ownership audit
- API audit
- event audit
- workflow/lifecycle audit
- admin/diagnostics audit
- test audit

## Gap examples
- no canonical manifest
- manifest missing owned tables or events
- duplicated lifecycle definitions
- module defining auth truth
- product defaults hidden inside module
- no diagnostics/admin visibility for critical modules

## Build instructions
If module manifest is missing or weak, create/stabilize canonical manifest, typed schema, validation tests, and registration integration.

If backend package is incomplete, create/normalize routes, controllers, services, repositories, contracts, schemas, events, workflows, and diagnostics/admin packages where needed.

If frontend package is incomplete, create/normalize pages, components, services, state, contracts, widgets/admin surfaces, and DOS/DAuth consumption points.

If data ownership is unclear, create a module-owned table map with owned tables, read dependencies, write boundaries, and bucket classification.

If API surface is weak, create explicit runtime/admin APIs with typed request/response, validation, DAuth integration, and lifecycle-sensitive action identification.

If event surface is weak, create explicit event contracts and handler mapping. Document publishers/subscribers and idempotency rules.

If workflow/lifecycle is weak, create explicit state/transition definitions and integration hooks into DOS lifecycle and DAuth lifecycle-auth.

If diagnostics/admin are weak, create module health/readiness/admin surfaces and contracts.

If test coverage is weak, create tests covering manifest validation, route/service behavior, event behavior, lifecycle behavior, and diagnostics where relevant.

## Tests required
- unit tests for module services, manifest validation, repository behavior, and diagnostics calculations where applicable
- integration tests for route mounting, DAuth integration, main command/read flows, event publish/subscribe, and lifecycle transitions
- contract tests for APIs, manifests, event payloads, and lifecycle contracts
- smoke tests for clean registration, coherent health/readiness, and coherent admin/runtime surfaces

## Acceptance criteria
Patch 6 passes only if module ownership is correct, required manifest/backend/frontend/contracts/events/workflow/admin/test artifacts exist or are explicitly classified missing for follow-up, the module can register and run coherently, and health/admin/diagnostic visibility exists where needed.

## Fail conditions
Patch 6 fails if the module has no canonical manifest, duplicates DOS or DAuth concerns, has ambiguous data ownership, hides event or lifecycle logic, lacks diagnostics/admin visibility for a critical module, or skips required artifact classes.

# Patch 7 — Workflow Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 7 — Workflow Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **workflow stack** across DOS, DAuth, products, modules, human actors, AI agents, events, approvals, lifecycle transitions, and operational execution.

It tells an agent exactly how to:
- inspect workflow X
- compare current workflow implementation against the canonical workflow target
- classify every workflow-layer gap
- know exactly what definitions, stages, states, actions, transitions, assignments, approvals, authorities, SoD checks, delegation behavior, events, timers, retries, escalations, UI surfaces, admin controls, logs, and tests must exist
- know what belongs to DOS, what belongs to DAuth, what belongs to a product or module, and what must never be duplicated

### 0.4 Patch role in the patch library
This patch is the canonical workflow enforcement document for the whole platform.

It connects:
- Patch 1 — DOS platform core
- Patch 2 — data/schema/contracts
- Patch 3 — DAuth control spine
- Patch 4 — product stack
- Patch 5 — product server stack
- Patch 6 — module stack

No later patch may redefine workflow architecture in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **workflow object model**.

### 1.2 Target object types
This patch applies to:
- workflow definition object
- workflow instance object
- workflow state object
- workflow stage object
- workflow step object
- workflow transition object
- workflow action object
- workflow assignment object
- workflow approval object
- workflow escalation object
- workflow SLA/timer object
- workflow event object
- workflow automation object
- workflow audit object
- workflow admin/ops object
- workflow UI object
- workflow AI-agent participation object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- deep AI-agent runtime internals
- centralized UI engine internals
- product-specific module business rules outside workflow participation
- DAuth internal implementation details beyond required control hooks

### 1.4 Workflow definition
A workflow is a **formal executable orchestration model** for work moving through states, actors, approvals, controls, deadlines, events, and outcomes.

A workflow is not:
- a status field only
- a route sequence only
- a UI wizard only
- a job queue only
- a background task only
- a lifecycle table only

A workflow is a governed execution system with:
- explicit definitions
- explicit instances
- explicit state transitions
- explicit actor/role/authority rules
- explicit event coupling
- explicit timeout/escalation rules
- explicit audit trail
- explicit admin/recovery surfaces

---

## 2. Canonical Workflow Target Blueprint

## 2.1 Workflow responsibilities
Every workflow stack must provide these capabilities.

### A. Workflow definition
- workflow code
- workflow name
- workflow owner
- workflow category
- workflow version
- product/module ownership
- participating entity types
- start conditions
- end conditions
- terminal outcomes
- allowed actions
- stage and step model
- transition model
- event model
- timeout/escalation model
- retry/recovery model
- audit model

### B. Workflow execution
- instance creation
- instance state persistence
- stage/step advancement
- action execution
- transition evaluation
- actor assignment and reassignment
- human and AI participation boundaries
- suspension/resume behavior
- cancellation behavior
- failure handling
- replay/retry where allowed

### C. Workflow control integration
- DAuth permission checks
- DAuth scope checks
- DAuth authority checks
- DAuth delegation checks
- DAuth SoD checks
- DAuth lifecycle authorization where state change is protected
- self-approval prevention
- maker-checker enforcement

### D. Workflow timing and escalation
- due dates
- SLA clocks
- escalation thresholds
- reminders
- breach behavior
- escalation targets
- abandonment/recovery policy

### E. Workflow event integration
- workflow started
- step entered
- action executed
- approval requested
- approval decided
- transition completed
- escalation triggered
- deadline breached
- workflow completed
- workflow canceled
- workflow failed
- workflow recovered

### F. Workflow operations and admin
- workflow health/status
- stuck instance detection
- failed transition visibility
- dead-letter or retry visibility where applicable
- administrative intervention path
- replay/retry controls
- force-resolve / close / transfer controls where explicitly allowed

### G. Workflow UI/runtime participation
- worklist/task surfaces
- timeline/history surface
- current state surface
- pending actions surface
- approval/reject/escalate/reassign controls
- operator/admin surfaces
- diagnostics and audit visibility

---

## 2.2 Workflow ownership boundaries

### DOS owns directly
- generic workflow execution framework
- workflow registry model
- workflow orchestration primitives
- workflow timer/escalation engine primitives
- event coupling primitives
- operational health and recovery primitives
- cross-platform workflow contracts
- generic work queue/task routing primitives where platform-owned

### DAuth owns directly
- permission checks
- scope resolution
- authority/sign-off resolution
- delegation validity
- SoD decisions
- lifecycle authorization for protected state changes
- self-approval prevention
- maker-checker enforcement

### Product owns directly
- product-level workflow bundles
- product workflow defaults
- product-specific cross-module orchestration patterns
- product runtime workflow surfaces

### Module owns directly
- module-specific workflow definitions
- workflow business actions
- workflow business data model
- module-specific transition side effects
- module work item semantics

### Workflow layer must not implement
- a separate auth engine
- a separate authority engine
- a separate SoD engine
- a second event bus
- a second generic lifecycle engine
- hidden business rules only in UI or only in database triggers with no workflow contract

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/workflows/
  registry/
  engine/
  execution/
  timers/
  escalations/
  assignments/
  approvals/
  recovery/
  events/
  admin/
  diagnostics/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `registry/`
Workflow definitions, registration, lookup, versioning.

#### `engine/`
Core orchestration engine and transition coordination.

#### `execution/`
Instance runtime execution and state persistence coordination.

#### `timers/`
SLA clocks, due dates, reminder scheduling, breach evaluation.

#### `escalations/`
Escalation policies and escalation execution.

#### `assignments/`
Actor/role/queue assignment and reassignment.

#### `approvals/`
Approval orchestration and sign-off path handling.

#### `recovery/`
Retry, replay, recovery, stuck-instance handling.

#### `events/`
Workflow event definitions, publishers, subscribers, handler mapping.

#### `admin/`
Admin intervention APIs and workflow ops surfaces.

#### `diagnostics/`
Health, metrics, status, stuck/failure analysis.

#### `contracts/`
Typed workflow contracts.

#### `types/`
Workflow-owned types only.

---

## 2.4 Required module/product workflow package layout

```text
backend/src/modules/<module-code>/workflows/
backend/src/products/<product-code>/workflows/
frontend/src/app/features/<module-code>/workflows/
frontend/src/app/products/<product-code>/workflows/
```

### Rule
Platform owns the generic workflow engine.
Products and modules own workflow definitions and business participation.
Frontend owns workflow interaction surfaces only.

---

## 2.5 Required workflow definition contract

Every workflow must expose a typed definition contract.

### 2.5.1 Required fields
- `workflowCode`
- `name`
- `version`
- `ownerLayer`
- `ownerCode`
- `entityType`
- `category`
- `startConditions`
- `terminalStates`
- `states`
- `actions`
- `transitions`
- `assignmentRules`
- `approvalRules`
- `authorityRules`
- `delegationPolicy`
- `sodPolicy`
- `timerRules`
- `escalationRules`
- `eventRules`
- `recoveryPolicy`
- `uiPolicy`
- `auditPolicy`

### 2.5.2 Workflow definition law
A workflow may not be real in runtime without a formal definition.
No implicit workflow from routes, UI screens, or status enums alone.

---

## 2.6 Required workflow state model

Every workflow must define:
- initial state
- in-progress states
- waiting states
- approval states
- escalated states if used
- failed states if used
- canceled state if supported
- completed/terminal states
- invalid transition policy

### Workflow state law
State names must be semantically meaningful, finite, and auditable.
No unbounded hidden substate logic without contract definition.

---

## 2.7 Required transition model

Every transition must define:
- from state
- to state
- action code
- actor requirements
- permission requirements
- authority requirements
- self-approval rule
- maker-checker rule
- delegation support
- SoD policy
- side effects
- emitted events
- audit expectations

### Transition law
No protected transition may occur without a formal transition definition.

---

## 2.8 Required assignment model

Every workflow must define how work is assigned.

### Assignment categories
- direct user assignment
- role-based assignment
- queue-based assignment
- org-structure-based assignment
- ownership-based assignment
- escalation reassignment
- delegation-aware assignment
- AI-assisted suggestion, if allowed
- AI execution, if explicitly allowed

### Assignment law
Assignment resolution must consume DOS structure and DAuth access truth.
No UI-only assignment logic.
No hidden role shortcuts in controllers.

---

## 2.9 Required approval model

Every approval-capable workflow must define:
- when approval is required
- approval stage/state
- approver eligibility
- authority/sign-off requirement
- rejection path
- rework path
- escalation path
- self-approval block
- maker-checker block
- delegated approval policy
- SoD conflict handling

### Approval law
Approval is not just a boolean update.
It is a controlled workflow decision with DAuth integration and audit trace.

---

## 2.10 Required timing, SLA, and escalation model

Every workflow with deadlines must define:
- due date logic
- reminder schedule
- escalation threshold(s)
- breach action(s)
- escalation targets
- business calendar rule if relevant
- pause/resume behavior if relevant
- abandonment logic if relevant

### Timing law
Timing logic must not be buried in cron-only code with no workflow contract.

---

## 2.11 Required event model

Every workflow must publish and consume explicit events.

### Required event families
- `workflow.started`
- `workflow.state.entered`
- `workflow.action.executed`
- `workflow.assignment.changed`
- `workflow.approval.requested`
- `workflow.approval.decided`
- `workflow.escalated`
- `workflow.deadline.breached`
- `workflow.failed`
- `workflow.recovered`
- `workflow.completed`
- `workflow.canceled`

### Event law
Workflow events must use DOS event backbone only.
No hidden workflow event channels.

---

## 2.12 Required recovery and admin model

Every workflow stack must define:
- stuck-instance detection
- retry policy
- replay policy
- manual intervention contract
- cancellation contract
- reassignment contract
- force-progress or force-close policy where explicitly allowed
- audit on every admin intervention

### Recovery law
Admin recovery must be explicit, guarded, and audited.
No direct database edits as the “real” recovery model.

---

## 2.13 Required workflow UI/runtime participation model

Every user-facing workflow must define:
- worklist/task list surface
- workflow detail view
- current state indicator
- pending action set
- action guard state
- approval controls
- escalation visibility
- timeline/history visibility
- audit note / rationale collection where required
- loading/empty/error states
- admin intervention surface where allowed

### UI law
Workflow UI renders workflow truth.
Workflow UI does not create workflow truth.

---

## 3. Current-State Audit Method

An agent auditing workflow X must perform the following checks.

## 3.1 Definition audit
Verify workflow X has:
- formal definition contract
- version
- owner
- states
- actions
- transitions
- timing/escalation policy
- event rules
- audit rules

## 3.2 Execution audit
Verify workflow X has:
- instance creation
- state persistence
- transition coordination
- completion/cancel/failure handling
- recovery path

## 3.3 Control audit
Verify workflow X integrates with:
- DAuth permissions
- DAuth authority
- DAuth delegation
- DAuth SoD
- self-approval prevention
- maker-checker prevention
- lifecycle auth where applicable

## 3.4 Assignment audit
Verify workflow X has explicit assignment model and reassignment rules.

## 3.5 Timing/escalation audit
Verify workflow X has explicit timer and escalation definitions where deadlines exist.

## 3.6 Event audit
Verify workflow X has registered emitted and consumed events with typed payloads.

## 3.7 UI/admin audit
Verify workflow X has:
- runtime work surfaces
- history/timeline surface
- operator/admin recovery surface where needed

## 3.8 Test audit
Verify workflow X has tests for:
- transitions
- protected approvals
- timeouts/escalations
- recovery/admin interventions where relevant

---

## 4. Gap Classification for Workflow Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required workflow definition, transition model, assignment model, approval model, event contract, timer/escalation rule, admin recovery path, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required fields or behaviors.
Examples:
- workflow states exist but no transition guards
- approval path exists but no self-approval block
- timeout exists but no escalation contract

### 4.3 Duplicate
Two or more workflow implementations own the same process.
Examples:
- route/controller local status flow plus formal workflow engine
- duplicate approval engines
- duplicate escalators

### 4.4 Wrong Owner
Concern belongs to DOS workflow engine, DAuth, product, or module, but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- module business logic embedded in DOS engine
- DAuth control logic embedded in workflow UI
- workflow decisions embedded only in DB triggers

### 4.6 Legacy Carryover
Old status flow or pre-workflow mechanics still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- workflow without definition
- direct DB status edits as the main transition mechanism
- no audit on protected actions
- hidden timer logic
- hidden approval logic
- workflow UI inventing allowed actions locally

### 4.8 Production Blocker
Examples:
- protected workflow transitions can bypass DAuth
- no stuck-instance recovery
- no approval authority enforcement
- ambiguous instance state

### 4.9 Handover Blocker
Examples:
- no admin visibility
- no transition audit trail
- no timer/escalation visibility
- no recovery instructions

---

## 5. Required Artifact Matrix

Every workflow pass must address all artifact classes below.

| Artifact Class | Required in Patch 7 | Examples |
|---|---|---|
| Files/Folders | Yes | engine, execution, assignments, approvals, recovery |
| Services | Yes | workflow engine, assignment resolver, escalation service |
| Contracts/Schemas | Yes | workflow definition, transition decision, instance state |
| Tables/Data | Yes | workflow definitions, instances, executions, approvals, timers |
| APIs | Yes | admin/recovery/worklist/workflow detail surfaces |
| Events | Yes | workflow lifecycle events |
| Workflows/Lifecycle | Yes | states, actions, transitions, approvals, escalations |
| UI/Admin Surfaces | Yes | worklist, detail, timeline, admin recovery |
| Audit/Logs | Yes | decisions, approvals, escalations, interventions |
| Tests | Yes | transition, control, SLA, recovery, event tests |
| As-Built Updates | Yes | workflow build state and operational notes |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If workflow definition is missing or weak
### Build this
Create or stabilize:
- canonical workflow definition contract
- typed workflow schema
- workflow registry integration
- versioned definition ownership

### Do not build this
- implied workflows from status enums only
- undocumented hidden transitions in services/controllers

## 6.2 If workflow execution is fragmented
### Build this
Create or stabilize:
- instance creation path
- transition execution coordination
- action execution layer
- completion/failure/cancel path
- recovery hooks

### Do not build this
- controllers mutating status directly as the real engine
- multiple independent execution coordinators for one workflow

## 6.3 If assignment logic is weak
### Build this
Create explicit assignment resolver and reassignment policy surfaces.

### Do not build this
- UI-side actor selection as the actual truth
- hardcoded user/role shortcuts scattered across services

## 6.4 If approval logic is weak
### Build this
Create explicit approval orchestration with:
- approver resolution
- DAuth authority checks
- self-approval prevention
- maker-checker enforcement
- rejection/rework routes

### Do not build this
- boolean approval flags with no formal workflow decision structure

## 6.5 If timing and escalation are weak
### Build this
Create timer rules, reminder policies, breach policies, escalation services, and admin visibility.

### Do not build this
- hidden cron-based escalation with no workflow definition contract

## 6.6 If event integration is weak
### Build this
Create explicit workflow event contracts and handler mapping.

### Do not build this
- local event emitters with no catalog entry
- silent side effects for major workflow state changes

## 6.7 If recovery/admin is weak
### Build this
Create explicit admin contracts for:
- retry
- replay
- reassign
- cancel
- recover
- force-resolve where allowed

### Do not build this
- raw database edits as operational procedure
- hidden operator-only scripts as primary recovery model

## 6.8 If UI/work surfaces are weak
### Build this
Create:
- worklist/task surfaces
- workflow detail
- action surfaces
- timeline/history
- admin diagnostics and recovery surfaces where applicable

### Do not build this
- workflow hidden behind generic record screens with no task/action semantics

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/workflows/
  registry/workflow-registry.service.ts
  engine/workflow-engine.service.ts
  execution/workflow-execution.service.ts
  assignments/workflow-assignment.service.ts
  approvals/workflow-approval.service.ts
  timers/workflow-timer.service.ts
  escalations/workflow-escalation.service.ts
  recovery/workflow-recovery.service.ts
  events/workflow-events.ts
  admin/workflow-admin.controller.ts
  diagnostics/workflow-health.service.ts
  contracts/workflow.types.ts
  index.ts
```

## 7.2 Example workflow definition contract

```ts
export interface WorkflowDefinition {
  workflowCode: string;
  version: string;
  entityType: string;
  states: string[];
  actions: string[];
  terminalStates: string[];
}
```

## 7.3 Example transition decision contract

```ts
export interface WorkflowTransitionDecision {
  allowed: boolean;
  fromState: string;
  toState: string;
  actionCode: string;
  authoritySatisfied?: boolean;
  selfApprovalBlocked?: boolean;
  sodOutcome?: 'clear' | 'warn' | 'blocked';
}
```

## 7.4 Example test expectations

```ts
it('blocks approval when self-approval policy applies', () => {
  // approval control example
});

it('escalates a breached workflow task according to SLA policy', () => {
  // timer/escalation example
});
```

---

## 8. Tests Required for Workflow Stack

### 8.1 Unit tests required
- definition validation
- transition evaluation
- assignment resolution
- approval decision logic
- timer/escalation calculation
- recovery behavior

### 8.2 Integration tests required
- end-to-end workflow transition execution
- protected approval flow with DAuth
- escalation flow
- failure and recovery flow
- emitted/consumed event flow

### 8.3 Contract tests required
- workflow definition contract
- workflow instance contract
- transition decision contract
- workflow event payload contracts
- admin recovery contracts

### 8.4 Operational smoke tests required
- worklists load correctly
- workflow actions obey control rules
- stuck instances are visible
- admin recovery surfaces function correctly

---

## 9. Review Checklist for Workflow Stack

The reviewer must confirm:
- workflow has a formal definition
- execution path is singular and explicit
- DAuth control integration is explicit
- assignment/approval/escalation are explicit
- events are explicit and use DOS event backbone
- admin/recovery surfaces exist
- UI renders workflow truth and does not invent it
- tests are declared for critical behavior
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 7 passes for target workflow X only if all below are true.

### 10.1 Ownership correctness
- DOS owns generic workflow framework
- DAuth owns control decisions
- product/module own workflow business definitions and participation
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required definitions, execution services, contracts, events, recovery/admin surfaces, and tests exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- workflow can be defined, instantiated, advanced, controlled, timed, escalated, audited, and recovered coherently

### 10.4 Handover readiness
- admin/recovery and operational diagnostics are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 7 fails if any of the following are true:
- workflow has no formal definition
- protected transitions can bypass DAuth control integration
- approval/self-approval/SoD logic is implicit or absent
- timer/escalation behavior is implicit or hidden
- no admin recovery model exists for operational workflows
- required artifact classes were skipped
- scope widened outside workflow layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 7 must update the as-built ledger with:
- workflow framework folders/services created or normalized
- workflow definitions/contracts/events created or updated
- control integration status
- timer/escalation/recovery status
- admin/UI/runtime participation status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with workflow-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 7, the next patch should be:

**Patch 8 — AI Agent Stack**

because workflows next need the formal agent-participation blueprint, including platform agents, product agents, module agents, and safe preplacement/replacement boundaries.

---

## 15. One-Line Use Instruction

Use Patch 7 to compare the current workflow implementation against the full canonical workflow target, classify every workflow-layer gap, build only the missing workflow artifacts, validate against workflow pass/fail rules, and update the as-built ledger.

# Patch 7 — Workflow Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 7 — Workflow Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **workflow stack** across DOS, DAuth, products, modules, human actors, AI agents, events, approvals, lifecycle transitions, and operational execution.

It tells an agent exactly how to:
- inspect workflow X
- compare current workflow implementation against the canonical workflow target
- classify every workflow-layer gap
- know exactly what definitions, stages, states, actions, transitions, assignments, approvals, authorities, SoD checks, delegation behavior, events, timers, retries, escalations, UI surfaces, admin controls, logs, and tests must exist
- know what belongs to DOS, what belongs to DAuth, what belongs to a product or module, and what must never be duplicated

### 0.4 Patch role in the patch library
This patch is the canonical workflow enforcement document for the whole platform.

It connects:
- Patch 1 — DOS platform core
- Patch 2 — data/schema/contracts
- Patch 3 — DAuth control spine
- Patch 4 — product stack
- Patch 5 — product server stack
- Patch 6 — module stack

No later patch may redefine workflow architecture in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **workflow object model**.

### 1.2 Target object types
This patch applies to:
- workflow definition object
- workflow instance object
- workflow state object
- workflow stage object
- workflow step object
- workflow transition object
- workflow action object
- workflow assignment object
- workflow approval object
- workflow escalation object
- workflow SLA/timer object
- workflow event object
- workflow automation object
- workflow audit object
- workflow admin/ops object
- workflow UI object
- workflow AI-agent participation object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- deep AI-agent runtime internals
- centralized UI engine internals
- product-specific module business rules outside workflow participation
- DAuth internal implementation details beyond required control hooks

### 1.4 Workflow definition
A workflow is a **formal executable orchestration model** for work moving through states, actors, approvals, controls, deadlines, events, and outcomes.

A workflow is not:
- a status field only
- a route sequence only
- a UI wizard only
- a job queue only
- a background task only
- a lifecycle table only

A workflow is a governed execution system with:
- explicit definitions
- explicit instances
- explicit state transitions
- explicit actor/role/authority rules
- explicit event coupling
- explicit timeout/escalation rules
- explicit audit trail
- explicit admin/recovery surfaces

---

## 2. Canonical Workflow Target Blueprint

## 2.1 Workflow responsibilities
Every workflow stack must provide these capabilities.

### A. Workflow definition
- workflow code
- workflow name
- workflow owner
- workflow category
- workflow version
- product/module ownership
- participating entity types
- start conditions
- end conditions
- terminal outcomes
- allowed actions
- stage and step model
- transition model
- event model
- timeout/escalation model
- retry/recovery model
- audit model

### B. Workflow execution
- instance creation
- instance state persistence
- stage/step advancement
- action execution
- transition evaluation
- actor assignment and reassignment
- human and AI participation boundaries
- suspension/resume behavior
- cancellation behavior
- failure handling
- replay/retry where allowed

### C. Workflow control integration
- DAuth permission checks
- DAuth scope checks
- DAuth authority checks
- DAuth delegation checks
- DAuth SoD checks
- DAuth lifecycle authorization where state change is protected
- self-approval prevention
- maker-checker enforcement

### D. Workflow timing and escalation
- due dates
- SLA clocks
- escalation thresholds
- reminders
- breach behavior
- escalation targets
- abandonment/recovery policy

### E. Workflow event integration
- workflow started
- step entered
- action executed
- approval requested
- approval decided
- transition completed
- escalation triggered
- deadline breached
- workflow completed
- workflow canceled
- workflow failed
- workflow recovered

### F. Workflow operations and admin
- workflow health/status
- stuck instance detection
- failed transition visibility
- dead-letter or retry visibility where applicable
- administrative intervention path
- replay/retry controls
- force-resolve / close / transfer controls where explicitly allowed

### G. Workflow UI/runtime participation
- worklist/task surfaces
- timeline/history surface
- current state surface
- pending actions surface
- approval/reject/escalate/reassign controls
- operator/admin surfaces
- diagnostics and audit visibility

---

## 2.2 Workflow ownership boundaries

### DOS owns directly
- generic workflow execution framework
- workflow registry model
- workflow orchestration primitives
- workflow timer/escalation engine primitives
- event coupling primitives
- operational health and recovery primitives
- cross-platform workflow contracts
- generic work queue/task routing primitives where platform-owned

### DAuth owns directly
- permission checks
- scope resolution
- authority/sign-off resolution
- delegation validity
- SoD decisions
- lifecycle authorization for protected state changes
- self-approval prevention
- maker-checker enforcement

### Product owns directly
- product-level workflow bundles
- product workflow defaults
- product-specific cross-module orchestration patterns
- product runtime workflow surfaces

### Module owns directly
- module-specific workflow definitions
- workflow business actions
- workflow business data model
- module-specific transition side effects
- module work item semantics

### Workflow layer must not implement
- a separate auth engine
- a separate authority engine
- a separate SoD engine
- a second event bus
- a second generic lifecycle engine
- hidden business rules only in UI or only in database triggers with no workflow contract

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/workflows/
  registry/
  engine/
  execution/
  timers/
  escalations/
  assignments/
  approvals/
  recovery/
  events/
  admin/
  diagnostics/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `registry/`
Workflow definitions, registration, lookup, versioning.

#### `engine/`
Core orchestration engine and transition coordination.

#### `execution/`
Instance runtime execution and state persistence coordination.

#### `timers/`
SLA clocks, due dates, reminder scheduling, breach evaluation.

#### `escalations/`
Escalation policies and escalation execution.

#### `assignments/`
Actor/role/queue assignment and reassignment.

#### `approvals/`
Approval orchestration and sign-off path handling.

#### `recovery/`
Retry, replay, recovery, stuck-instance handling.

#### `events/`
Workflow event definitions, publishers, subscribers, handler mapping.

#### `admin/`
Admin intervention APIs and workflow ops surfaces.

#### `diagnostics/`
Health, metrics, status, stuck/failure analysis.

#### `contracts/`
Typed workflow contracts.

#### `types/`
Workflow-owned types only.

---

## 2.4 Required module/product workflow package layout

```text
backend/src/modules/<module-code>/workflows/
backend/src/products/<product-code>/workflows/
frontend/src/app/features/<module-code>/workflows/
frontend/src/app/products/<product-code>/workflows/
```

### Rule
Platform owns the generic workflow engine.
Products and modules own workflow definitions and business participation.
Frontend owns workflow interaction surfaces only.

---

## 2.5 Required workflow definition contract

Every workflow must expose a typed definition contract.

### 2.5.1 Required fields
- `workflowCode`
- `name`
- `version`
- `ownerLayer`
- `ownerCode`
- `entityType`
- `category`
- `startConditions`
- `terminalStates`
- `states`
- `actions`
- `transitions`
- `assignmentRules`
- `approvalRules`
- `authorityRules`
- `delegationPolicy`
- `sodPolicy`
- `timerRules`
- `escalationRules`
- `eventRules`
- `recoveryPolicy`
- `uiPolicy`
- `auditPolicy`

### 2.5.2 Workflow definition law
A workflow may not be real in runtime without a formal definition.
No implicit workflow from routes, UI screens, or status enums alone.

---

## 2.6 Required workflow state model

Every workflow must define:
- initial state
- in-progress states
- waiting states
- approval states
- escalated states if used
- failed states if used
- canceled state if supported
- completed/terminal states
- invalid transition policy

### Workflow state law
State names must be semantically meaningful, finite, and auditable.
No unbounded hidden substate logic without contract definition.

---

## 2.7 Required transition model

Every transition must define:
- from state
- to state
- action code
- actor requirements
- permission requirements
- authority requirements
- self-approval rule
- maker-checker rule
- delegation support
- SoD policy
- side effects
- emitted events
- audit expectations

### Transition law
No protected transition may occur without a formal transition definition.

---

## 2.8 Required assignment model

Every workflow must define how work is assigned.

### Assignment categories
- direct user assignment
- role-based assignment
- queue-based assignment
- org-structure-based assignment
- ownership-based assignment
- escalation reassignment
- delegation-aware assignment
- AI-assisted suggestion, if allowed
- AI execution, if explicitly allowed

### Assignment law
Assignment resolution must consume DOS structure and DAuth access truth.
No UI-only assignment logic.
No hidden role shortcuts in controllers.

---

## 2.9 Required approval model

Every approval-capable workflow must define:
- when approval is required
- approval stage/state
- approver eligibility
- authority/sign-off requirement
- rejection path
- rework path
- escalation path
- self-approval block
- maker-checker block
- delegated approval policy
- SoD conflict handling

### Approval law
Approval is not just a boolean update.
It is a controlled workflow decision with DAuth integration and audit trace.

---

## 2.10 Required timing, SLA, and escalation model

Every workflow with deadlines must define:
- due date logic
- reminder schedule
- escalation threshold(s)
- breach action(s)
- escalation targets
- business calendar rule if relevant
- pause/resume behavior if relevant
- abandonment logic if relevant

### Timing law
Timing logic must not be buried in cron-only code with no workflow contract.

---

## 2.11 Required event model

Every workflow must publish and consume explicit events.

### Required event families
- `workflow.started`
- `workflow.state.entered`
- `workflow.action.executed`
- `workflow.assignment.changed`
- `workflow.approval.requested`
- `workflow.approval.decided`
- `workflow.escalated`
- `workflow.deadline.breached`
- `workflow.failed`
- `workflow.recovered`
- `workflow.completed`
- `workflow.canceled`

### Event law
Workflow events must use DOS event backbone only.
No hidden workflow event channels.

---

## 2.12 Required recovery and admin model

Every workflow stack must define:
- stuck-instance detection
- retry policy
- replay policy
- manual intervention contract
- cancellation contract
- reassignment contract
- force-progress or force-close policy where explicitly allowed
- audit on every admin intervention

### Recovery law
Admin recovery must be explicit, guarded, and audited.
No direct database edits as the “real” recovery model.

---

## 2.13 Required workflow UI/runtime participation model

Every user-facing workflow must define:
- worklist/task list surface
- workflow detail view
- current state indicator
- pending action set
- action guard state
- approval controls
- escalation visibility
- timeline/history visibility
- audit note / rationale collection where required
- loading/empty/error states
- admin intervention surface where allowed

### UI law
Workflow UI renders workflow truth.
Workflow UI does not create workflow truth.

---

## 3. Current-State Audit Method

An agent auditing workflow X must perform the following checks.

## 3.1 Definition audit
Verify workflow X has:
- formal definition contract
- version
- owner
- states
- actions
- transitions
- timing/escalation policy
- event rules
- audit rules

## 3.2 Execution audit
Verify workflow X has:
- instance creation
- state persistence
- transition coordination
- completion/cancel/failure handling
- recovery path

## 3.3 Control audit
Verify workflow X integrates with:
- DAuth permissions
- DAuth authority
- DAuth delegation
- DAuth SoD
- self-approval prevention
- maker-checker prevention
- lifecycle auth where applicable

## 3.4 Assignment audit
Verify workflow X has explicit assignment model and reassignment rules.

## 3.5 Timing/escalation audit
Verify workflow X has explicit timer and escalation definitions where deadlines exist.

## 3.6 Event audit
Verify workflow X has registered emitted and consumed events with typed payloads.

## 3.7 UI/admin audit
Verify workflow X has:
- runtime work surfaces
- history/timeline surface
- operator/admin recovery surface where needed

## 3.8 Test audit
Verify workflow X has tests for:
- transitions
- protected approvals
- timeouts/escalations
- recovery/admin interventions where relevant

---

## 4. Gap Classification for Workflow Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required workflow definition, transition model, assignment model, approval model, event contract, timer/escalation rule, admin recovery path, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required fields or behaviors.
Examples:
- workflow states exist but no transition guards
- approval path exists but no self-approval block
- timeout exists but no escalation contract

### 4.3 Duplicate
Two or more workflow implementations own the same process.
Examples:
- route/controller local status flow plus formal workflow engine
- duplicate approval engines
- duplicate escalators

### 4.4 Wrong Owner
Concern belongs to DOS workflow engine, DAuth, product, or module, but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- module business logic embedded in DOS engine
- DAuth control logic embedded in workflow UI
- workflow decisions embedded only in DB triggers

### 4.6 Legacy Carryover
Old status flow or pre-workflow mechanics still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- workflow without definition
- direct DB status edits as the main transition mechanism
- no audit on protected actions
- hidden timer logic
- hidden approval logic
- workflow UI inventing allowed actions locally

### 4.8 Production Blocker
Examples:
- protected workflow transitions can bypass DAuth
- no stuck-instance recovery
- no approval authority enforcement
- ambiguous instance state

### 4.9 Handover Blocker
Examples:
- no admin visibility
- no transition audit trail
- no timer/escalation visibility
- no recovery instructions

---

## 5. Required Artifact Matrix

Every workflow pass must address all artifact classes below.

| Artifact Class | Required in Patch 7 | Examples |
|---|---|---|
| Files/Folders | Yes | engine, execution, assignments, approvals, recovery |
| Services | Yes | workflow engine, assignment resolver, escalation service |
| Contracts/Schemas | Yes | workflow definition, transition decision, instance state |
| Tables/Data | Yes | workflow definitions, instances, executions, approvals, timers |
| APIs | Yes | admin/recovery/worklist/workflow detail surfaces |
| Events | Yes | workflow lifecycle events |
| Workflows/Lifecycle | Yes | states, actions, transitions, approvals, escalations |
| UI/Admin Surfaces | Yes | worklist, detail, timeline, admin recovery |
| Audit/Logs | Yes | decisions, approvals, escalations, interventions |
| Tests | Yes | transition, control, SLA, recovery, event tests |
| As-Built Updates | Yes | workflow build state and operational notes |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If workflow definition is missing or weak
### Build this
Create or stabilize:
- canonical workflow definition contract
- typed workflow schema
- workflow registry integration
- versioned definition ownership

### Do not build this
- implied workflows from status enums only
- undocumented hidden transitions in services/controllers

## 6.2 If workflow execution is fragmented
### Build this
Create or stabilize:
- instance creation path
- transition execution coordination
- action execution layer
- completion/failure/cancel path
- recovery hooks

### Do not build this
- controllers mutating status directly as the real engine
- multiple independent execution coordinators for one workflow

## 6.3 If assignment logic is weak
### Build this
Create explicit assignment resolver and reassignment policy surfaces.

### Do not build this
- UI-side actor selection as the actual truth
- hardcoded user/role shortcuts scattered across services

## 6.4 If approval logic is weak
### Build this
Create explicit approval orchestration with:
- approver resolution
- DAuth authority checks
- self-approval prevention
- maker-checker enforcement
- rejection/rework routes

### Do not build this
- boolean approval flags with no formal workflow decision structure

## 6.5 If timing and escalation are weak
### Build this
Create timer rules, reminder policies, breach policies, escalation services, and admin visibility.

### Do not build this
- hidden cron-based escalation with no workflow definition contract

## 6.6 If event integration is weak
### Build this
Create explicit workflow event contracts and handler mapping.

### Do not build this
- local event emitters with no catalog entry
- silent side effects for major workflow state changes

## 6.7 If recovery/admin is weak
### Build this
Create explicit admin contracts for:
- retry
- replay
- reassign
- cancel
- recover
- force-resolve where allowed

### Do not build this
- raw database edits as operational procedure
- hidden operator-only scripts as primary recovery model

## 6.8 If UI/work surfaces are weak
### Build this
Create:
- worklist/task surfaces
- workflow detail
- action surfaces
- timeline/history
- admin diagnostics and recovery surfaces where applicable

### Do not build this
- workflow hidden behind generic record screens with no task/action semantics

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/workflows/
  registry/workflow-registry.service.ts
  engine/workflow-engine.service.ts
  execution/workflow-execution.service.ts
  assignments/workflow-assignment.service.ts
  approvals/workflow-approval.service.ts
  timers/workflow-timer.service.ts
  escalations/workflow-escalation.service.ts
  recovery/workflow-recovery.service.ts
  events/workflow-events.ts
  admin/workflow-admin.controller.ts
  diagnostics/workflow-health.service.ts
  contracts/workflow.types.ts
  index.ts
```

## 7.2 Example workflow definition contract

```ts
export interface WorkflowDefinition {
  workflowCode: string;
  version: string;
  entityType: string;
  states: string[];
  actions: string[];
  terminalStates: string[];
}
```

## 7.3 Example transition decision contract

```ts
export interface WorkflowTransitionDecision {
  allowed: boolean;
  fromState: string;
  toState: string;
  actionCode: string;
  authoritySatisfied?: boolean;
  selfApprovalBlocked?: boolean;
  sodOutcome?: 'clear' | 'warn' | 'blocked';
}
```

## 7.4 Example test expectations

```ts
it('blocks approval when self-approval policy applies', () => {
  // approval control example
});

it('escalates a breached workflow task according to SLA policy', () => {
  // timer/escalation example
});
```

---

## 8. Tests Required for Workflow Stack

### 8.1 Unit tests required
- definition validation
- transition evaluation
- assignment resolution
- approval decision logic
- timer/escalation calculation
- recovery behavior

### 8.2 Integration tests required
- end-to-end workflow transition execution
- protected approval flow with DAuth
- escalation flow
- failure and recovery flow
- emitted/consumed event flow

### 8.3 Contract tests required
- workflow definition contract
- workflow instance contract
- transition decision contract
- workflow event payload contracts
- admin recovery contracts

### 8.4 Operational smoke tests required
- worklists load correctly
- workflow actions obey control rules
- stuck instances are visible
- admin recovery surfaces function correctly

---

## 9. Review Checklist for Workflow Stack

The reviewer must confirm:
- workflow has a formal definition
- execution path is singular and explicit
- DAuth control integration is explicit
- assignment/approval/escalation are explicit
- events are explicit and use DOS event backbone
- admin/recovery surfaces exist
- UI renders workflow truth and does not invent it
- tests are declared for critical behavior
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 7 passes for target workflow X only if all below are true.

### 10.1 Ownership correctness
- DOS owns generic workflow framework
- DAuth owns control decisions
- product/module own workflow business definitions and participation
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required definitions, execution services, contracts, events, recovery/admin surfaces, and tests exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- workflow can be defined, instantiated, advanced, controlled, timed, escalated, audited, and recovered coherently

### 10.4 Handover readiness
- admin/recovery and operational diagnostics are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 7 fails if any of the following are true:
- workflow has no formal definition
- protected transitions can bypass DAuth control integration
- approval/self-approval/SoD logic is implicit or absent
- timer/escalation behavior is implicit or hidden
- no admin recovery model exists for operational workflows
- required artifact classes were skipped
- scope widened outside workflow layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 7 must update the as-built ledger with:
- workflow framework folders/services created or normalized
- workflow definitions/contracts/events created or updated
- control integration status
- timer/escalation/recovery status
- admin/UI/runtime participation status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with workflow-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 7, the next patch should be:

**Patch 8 — AI Agent Stack**

because workflows next need the formal agent-participation blueprint, including platform agents, product agents, module agents, and safe preplacement/replacement boundaries.

---

## 15. One-Line Use Instruction

Use Patch 7 to compare the current workflow implementation against the full canonical workflow target, classify every workflow-layer gap, build only the missing workflow artifacts, validate against workflow pass/fail rules, and update the as-built ledger.

# Patch 8 — AI Agent Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 8 — AI Agent Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **AI agent stack** across DOS, DAuth, products, modules, workflows, runtime execution, observability, and controlled delegation.

It tells an agent exactly how to:
- inspect agent system X
- compare current implementation against the canonical AI-agent target
- classify every agent-layer gap
- know exactly what registries, runtime services, contracts, policies, execution modes, memory surfaces, tool integrations, approval gates, acting-on-behalf-of controls, replacement/preplacement rules, audits, admin surfaces, and tests must exist
- know what belongs to DOS, what belongs to DAuth, what belongs to products/modules, and what must never be duplicated

### 0.4 Patch role in the patch library
This patch is the canonical AI-agent enforcement document for the whole platform.

It connects:
- DOS platform runtime and orchestration
- DAuth control spine
- workflow execution
- product intelligence surfaces
- module automation and task execution
- human oversight and replacement boundaries

No later patch may redefine AI-agent architecture in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **AI-agent object model**.

### 1.2 Target object types
This patch applies to:
- agent registry object
- agent identity object
- agent runtime object
- agent role/capability object
- agent policy object
- agent instruction object
- agent tool contract object
- agent memory object
- agent context object
- agent execution request object
- agent task object
- agent approval object
- agent delegation/acting-on-behalf-of object
- agent telemetry/audit object
- agent health object
- agent admin/ops object
- agent UI/control surface object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- general LLM model-serving infrastructure outside platform ownership
- deep centralized UI engine mechanics
- full workflow blueprint beyond agent participation contracts
- DAuth internals beyond required agent-control touchpoints

### 1.4 Agent definition
An agent is a **governed execution actor** that may observe, recommend, draft, route, coordinate, or execute bounded actions inside the platform.

An agent is not:
- a raw model call
- an ungoverned chatbot
- a hidden backend script
- a silent rule engine
- a direct auth bypass
- an always-autonomous executor

An agent is a controlled actor with:
- identity
- role and capability profile
- execution mode
- policy envelope
- tool boundaries
- context boundaries
- auditability
- approval gates
- replacement boundaries

---

## 2. Canonical AI Agent Target Blueprint

## 2.1 Agent responsibilities
The AI-agent stack must provide these capabilities.

### A. Agent identity and registration
- agent code
- agent name
- agent type
- owner layer
- owning product/module
- runtime state
- capability set
- allowed tools
- allowed contexts
- instruction source
- event subscriptions
- execution mode
- escalation rules
- approval rules
- health profile

### B. Agent runtime modes
Every agent must declare one of the following bounded execution modes:
- **observe-only**
- **advisory**
- **drafting**
- **co-pilot**
- **delegated executor**
- **bounded autonomous executor**

### C. Agent placement and replacement policy
The stack must explicitly distinguish:
- **preplacement** — agent augments work before any human replacement decision
- **assisted execution** — agent accelerates a human-owned task
- **delegated execution** — a human or role delegates a bounded task
- **replacement candidate** — agent is being evaluated as a sustainable substitute for part of a human workload
- **replacement prohibited** — tasks that may never be replaced without explicit governance approval

### D. Agent control integration
- DAuth actor identity linkage
- acting-on-behalf-of enforcement
- permission/scope/authority validation
- delegation validation
- SoD validation
- lifecycle authorization where state changes occur
- self-approval prevention
- maker-checker protection

### E. Agent task and orchestration model
- task creation
- task assignment
- task execution envelope
- task completion/failure state
- tool invocation boundaries
- multi-step orchestration boundaries
- escalation to human
- transfer to workflow
- transfer to module service
- transfer to product orchestration service

### F. Agent memory and context model
- ephemeral context
- scoped runtime memory
- shared memory where allowed
- tenant isolation
- product/module context boundaries
- access-aware retrieval rules
- retention and deletion rules
- prompt/instruction provenance

### G. Agent approval and guardrails model
- explicit approval-gated actions
- high-risk action review
- human-in-the-loop requirements
- confidence threshold handling
- fallback behaviors
- unsafe or unauthorized action rejection
- output validation
- policy compliance checks

### H. Agent observability model
- agent run logs
- tool invocation logs
- decision logs
- approval logs
- failure logs
- health metrics
- safety incidents
- replacement-evaluation metrics
- adoption and utilization metrics

### I. Agent UI and admin surfaces
- registry view
- capability view
- task and run history
- approvals queue
- health and diagnostics
- policy controls
- execution mode controls
- enable/disable controls
- replacement/preplacement governance view

---

## 2.2 Agent ownership boundaries

### DOS owns directly
- generic agent registry framework
- generic agent runtime orchestration framework
- agent event integration backbone
- agent health and diagnostics backbone
- generic agent task/routing primitives
- agent observability framework
- platform-level agent configuration contracts

### DAuth owns directly
- agent actor identity linkage
- agent acting-on-behalf-of validation
- access checks
- authority checks
- delegation checks
- SoD checks
- lifecycle authorization checks for protected actions
- approval and self-approval control integration

### Product owns directly
- product-level agents
- product-level agent defaults
- product-level agent dashboards and controls
- product-level orchestration policies
- product-specific context bundles

### Module owns directly
- module-level agents
- module-level tools and action mappings
- module-local bounded task semantics
- module-specific validation or fallback behavior

### AI-agent stack must not implement
- a second auth engine
- a second delegation engine
- a second SoD engine
- hidden permission bypasses
- unsupervised autonomous write paths outside declared policy
- opaque hidden agents with no registry entry

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/agents/
  registry/
  runtime/
  tasks/
  policies/
  tools/
  memory/
  context/
  approvals/
  validation/
  health/
  events/
  admin/
  diagnostics/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `registry/`
Agent definitions, identity, ownership, and capability metadata.

#### `runtime/`
Run coordination, agent execution state, execution envelopes.

#### `tasks/`
Task creation, routing, transfer, and completion handling.

#### `policies/`
Execution mode, replacement/preplacement rules, safety and operation policies.

#### `tools/`
Tool registry, tool contracts, tool execution boundaries.

#### `memory/`
Memory models, retention, isolation, deletion, and access-aware retrieval rules.

#### `context/`
Context builders, bounded context packages, scope-aware context resolution.

#### `approvals/`
Approval-gated agent actions and human-in-the-loop enforcement.

#### `validation/`
Output validation, policy validation, tool/result validation.

#### `health/`
Health monitoring and runtime safety posture.

#### `events/`
Agent events and event subscriptions.

#### `admin/`
Admin routes and admin orchestration surfaces.

#### `diagnostics/`
Telemetry, traces, failures, replacement metrics, and ops visibility.

---

## 2.4 Required product/module agent package layout

```text
backend/src/products/<product-code>/ai/
backend/src/modules/<module-code>/ai/
frontend/src/app/products/<product-code>/ai/
frontend/src/app/features/<module-code>/ai/
```

### Rule
DOS owns the generic agent framework.
Products and modules own their agents, policies, tools, and UI surfaces within DOS/DAuth rules.

---

## 2.5 Required agent registry contract

Every agent must expose a typed canonical registry contract.

### 2.5.1 Required fields
- `agentCode`
- `name`
- `version`
- `agentType`
- `ownerLayer`
- `ownerCode`
- `executionMode`
- `defaultState`
- `allowedTools`
- `allowedContexts`
- `requiredCapabilities`
- `approvalPolicy`
- `replacementPolicy`
- `eventSubscriptions`
- `healthPolicy`
- `observabilityProfile`
- `uiExposurePolicy`

### 2.5.2 Agent type categories
- platform agent
- product agent
- module agent
- personal/user-facing agent if supported
- service agent if supported
- orchestration agent if supported

### 2.5.3 Registry law
No agent may run in production unless it is explicitly registered, typed, bounded, and governed.

---

## 2.6 Required execution model

Every agent must define:
- trigger source
- allowed runtime contexts
- allowed task types
- action envelope
- tool call boundaries
- write path boundaries
- approval-gated actions
- escalation conditions
- failure behavior
- retry behavior
- completion signals

### Execution law
Agent execution must always be bounded and inspectable.
No silent background execution without run identity and audit.

---

## 2.7 Required tool model

Every agent tool must define:
- tool code
- owner
- allowed agent classes
- input contract
- output contract
- risk level
- read/write classification
- approval requirement
- DAuth control touchpoints
- audit expectations

### Tool law
Tools are not private shortcuts.
Every production tool must be registered and bounded.

---

## 2.8 Required memory and context model

Every agent must define:
- what context it may read
- what memory it may persist
- what memory is ephemeral
- what memory is shared
- what memory is tenant-bound
- deletion/retention policy
- auditability of retrieval if sensitive

### Memory law
Agent memory is not a shadow database.
It must be bounded, typed, and governed.

---

## 2.9 Required approval and guardrail model

Every agent with any write or decision effect must define:
- required approval gates
- required human review gates
- confidence/risk thresholds
- blocked action categories
- fallback response policy
- safe refusal behavior
- retry/escalation behavior
- output validation policy

### Guardrail law
No agent may act beyond its declared mode, tool set, and approval policy.

---

## 2.10 Required acting-on-behalf-of and delegation model

Every agent action that affects state must define whether it is:
- direct system action
- acting on behalf of a user
- acting on behalf of a role/queue
- acting via delegation
- prohibited if delegation is absent

### Acting-on-behalf-of law
All acting-on-behalf-of execution must resolve through DAuth.
No agent may impersonate or simulate authority without explicit validated control context.

---

## 2.11 Required replacement/preplacement model

Every agent used in human-work substitution analysis must define:
- target human role/process area
- preplacement vs replacement posture
- allowed automation depth
- prohibited replacement zones
- required governance approval
- measurement criteria
- rollback criteria
- supervision requirement
- safety and accountability owner

### Replacement law
Replacement is never implicit.
An agent must not silently evolve from assistant to substitute without explicit governance state and audit trail.

---

## 2.12 Required event model

Every agent stack must publish and/or consume explicit events.

### Required event families
- `agent.registered`
- `agent.enabled`
- `agent.disabled`
- `agent.task.created`
- `agent.run.started`
- `agent.tool.called`
- `agent.tool.completed`
- `agent.approval.requested`
- `agent.approval.granted`
- `agent.approval.denied`
- `agent.run.failed`
- `agent.run.escalated`
- `agent.run.completed`
- `agent.policy.blocked`
- `agent.replacement.status.changed`

### Event law
Agent events must use DOS event backbone only.
No hidden side-channel agent telemetry is allowed as the authoritative source.

---

## 2.13 Required admin and diagnostics model

Every production agent must expose:
- enabled/disabled state
- mode
- tool inventory
- policy inventory
- run history
- failure history
- health posture
- approval history
- replacement/preplacement posture
- admin override path where allowed
- incident and rollback visibility

---

## 3. Current-State Audit Method

An agent auditing AI-agent system X must perform the following checks.

## 3.1 Registry audit
Verify the system has:
- canonical agent registry
- explicit agent codes/types
- ownership and runtime mode metadata
- tool, context, approval, replacement policies

## 3.2 Runtime audit
Verify:
- execution runs are explicit
- tasks are explicit
- failures are explicit
- state-changing actions are bounded
- run history is auditable

## 3.3 Control audit
Verify:
- DAuth integration for access
- acting-on-behalf-of validation
- delegation validation
- SoD validation
- lifecycle authorization on protected state changes
- approval and self-approval controls

## 3.4 Tool audit
Verify:
- tool registry exists
- tools are typed and bounded
- tool risk classification exists
- no hidden tool shortcuts exist

## 3.5 Memory/context audit
Verify:
- context boundaries are explicit
- memory retention and deletion are explicit
- tenant isolation is explicit
- access-aware retrieval rules exist

## 3.6 Guardrail audit
Verify:
- high-risk actions require approvals
- blocked behaviors are explicit
- fallback/refusal behaviors exist
- output validation exists

## 3.7 Replacement/preplacement audit
Verify:
- posture is explicit
- governance approval rules exist
- prohibited replacement zones exist
- measurements and rollback policy exist

## 3.8 Admin/diagnostics audit
Verify:
- run history exists
- approval history exists
- health and failure surfaces exist
- operators can disable or constrain agents safely

## 3.9 Test audit
Verify:
- tools, guardrails, approvals, failures, acting-on-behalf-of, and replacement rules are tested

---

## 4. Gap Classification for AI Agent Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required registry, runtime service, tool contract, memory policy, approval rule, replacement policy, diagnostics surface, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required fields or runtime behavior.
Examples:
- agent exists but no execution mode
- tool exists but no risk classification
- replacement policy exists but no rollback criteria

### 4.3 Duplicate
Two or more agent systems own the same concern.
Examples:
- duplicate registries
- duplicate tool execution engines
- shadow agent memory systems

### 4.4 Wrong Owner
Concern belongs to DOS, DAuth, product, or module, but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- DAuth logic hidden in agent runtime
- replacement policy hidden only in UI
- product agent trying to define platform-wide agent policy

### 4.6 Legacy Carryover
Old assistant/chatbot logic or orphaned agent runners still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- unregistered agents
- hidden tools
- silent background runs
- direct state changes without approval policy
- agent impersonation without DAuth validation
- replacement behavior with no explicit governance state

### 4.8 Production Blocker
Examples:
- state-changing agents with no control integration
- no disable switch
- no run audit
- no approval enforcement on high-risk actions

### 4.9 Handover Blocker
Examples:
- no diagnostics
- no run history
- no replacement posture record
- no policy inventory

---

## 5. Required Artifact Matrix

Every AI-agent pass must address all artifact classes below.

| Artifact Class | Required in Patch 8 | Examples |
|---|---|---|
| Files/Folders | Yes | registry, runtime, tools, memory, approvals, diagnostics |
| Services | Yes | agent runtime, tool executor, policy validator, run audit |
| Contracts/Schemas | Yes | agent registry, tool I/O, run result, approval request |
| Tables/Data | Yes | registry, tasks, runs, approvals, memory, health, incidents |
| APIs | Yes | admin, runs, approvals, diagnostics, controls |
| Events | Yes | run, tool, approval, failure, replacement events |
| Workflows/Lifecycle | Yes | agent task participation and approval hooks |
| UI/Admin Surfaces | Yes | registry, controls, run history, health, replacement posture |
| Audit/Logs | Yes | run logs, tool logs, denial logs, replacement decision logs |
| Tests | Yes | control, safety, tool, memory, approval, replacement tests |
| As-Built Updates | Yes | agent build state and operational notes |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If agent registry is weak or missing
### Build this
Create or stabilize:
- canonical registry contract
- registry service
- typed agent classes
- execution mode model
- replacement/preplacement policy fields

### Do not build this
- agents that only exist in code folders with no registry entry
- agents with no explicit mode or owner

## 6.2 If runtime execution is weak
### Build this
Create:
- run identity
- execution envelope
- run state persistence
- task routing
- failure handling
- explicit escalation path

### Do not build this
- silent async agents with no run record
- hidden retries or tool loops with no audit

## 6.3 If tool model is weak
### Build this
Create:
- tool registry
- typed I/O contracts
- risk classification
- approval hooks
- audit hooks

### Do not build this
- private, undocumented tool paths
- write-capable tools with no control policy

## 6.4 If memory/context is weak
### Build this
Create:
- context builders
- memory classes
- retention policy
- deletion rules
- access-aware retrieval checks

### Do not build this
- agent memory as a shadow truth source with no controls
- cross-tenant memory leakage

## 6.5 If approvals/guardrails are weak
### Build this
Create:
- approval gate service
- risk thresholds
- block/refuse/fallback behaviors
- output validation service
- human escalation path

### Do not build this
- agent autonomy with no approval structure
- “trust the model” bypasses

## 6.6 If acting-on-behalf-of is weak
### Build this
Create:
- acting-on-behalf-of contract
- DAuth validation path
- delegated execution trace
- denial audit

### Do not build this
- implicit impersonation
- user-context simulation with no validated control chain

## 6.7 If replacement policy is weak
### Build this
Create:
- preplacement/replacement policy contract
- prohibited replacement zones
- governance approval path
- metrics and rollback rules

### Do not build this
- agent substitution without formal governance posture
- silent movement from advisory to autonomous substitute

## 6.8 If admin and diagnostics are weak
### Build this
Create:
- admin controls
- run and failure history
- health surfaces
- disable/rollback switches
- incident visibility

### Do not build this
- unkillable or opaque agents
- zero operational visibility

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/agents/
  registry/agent-registry.service.ts
  runtime/agent-runtime.service.ts
  tasks/agent-task.service.ts
  tools/agent-tool-registry.service.ts
  memory/agent-memory.service.ts
  approvals/agent-approval.service.ts
  validation/agent-output-validator.service.ts
  diagnostics/agent-health.service.ts
  contracts/agent.types.ts
  index.ts
```

## 7.2 Example registry contract

```ts
export interface AgentDefinition {
  agentCode: string;
  name: string;
  version: string;
  ownerLayer: 'platform' | 'product' | 'module';
  ownerCode: string;
  executionMode: 'observe-only' | 'advisory' | 'drafting' | 'co-pilot' | 'delegated-executor' | 'bounded-autonomous';
  allowedTools: string[];
}
```

## 7.3 Example run contract

```ts
export interface AgentRunResult {
  runId: string;
  agentCode: string;
  status: 'completed' | 'failed' | 'blocked' | 'escalated';
  approvalsRequired?: boolean;
  correlationId: string;
}
```

## 7.4 Example test expectations

```ts
it('blocks a write-capable tool call when approval policy requires human review', () => {
  // approval gate example
});

it('rejects acting-on-behalf-of execution when DAuth delegation is invalid', () => {
  // delegation control example
});
```

---

## 8. Tests Required for AI Agent Stack

### 8.1 Unit tests required
- registry validation
- execution mode enforcement
- tool registry validation
- memory/context isolation
- approval policy logic
- output validation
- replacement policy evaluation

### 8.2 Integration tests required
- full run execution
- acting-on-behalf-of flow
- approval-gated tool call flow
- escalation and failure flow
- admin disable/enable flow

### 8.3 Contract tests required
- agent registry contract
- tool I/O contracts
- run result contract
- approval request/decision contracts
- replacement policy contract

### 8.4 Operational smoke tests required
- registered agents can be listed and controlled
- blocked agents do not execute
- run history is visible
- high-risk agent actions trigger approvals
- replacement posture is visible to operators

---

## 9. Review Checklist for AI Agent Stack

The reviewer must confirm:
- agent registry is explicit and complete
- agent modes are explicit
- tool boundaries are explicit
- DAuth control integration is explicit
- memory/context boundaries are explicit
- approvals and guardrails are explicit
- replacement/preplacement posture is explicit
- admin and diagnostics surfaces exist
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 8 passes for target agent system X only if all below are true.

### 10.1 Ownership correctness
- DOS owns generic agent framework
- DAuth owns control decisions
- products/modules own their bounded agents and policies
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required registry/runtime/tool/policy/memory/approval/diagnostic/test artifacts exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- agents can be registered, executed, controlled, audited, constrained, and rolled back coherently

### 10.4 Handover readiness
- admin/ops visibility is explicit
- replacement posture is explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 8 fails if any of the following are true:
- agents can run without registry entry
- state-changing agents can bypass DAuth controls
- tools are untyped or unbounded
- memory/context boundaries are undefined
- replacement behavior is implicit
- no disable/rollback/admin visibility exists
- required artifact classes were skipped
- scope widened outside AI-agent layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 8 must update the as-built ledger with:
- agent framework folders/services created or normalized
- registry/runtime/tool/memory/approval/replacement contracts created or updated
- control integration status
- diagnostics and admin status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with AI-agent-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 8, the next patch should be:

**Patch 9 — UI Feature and Component Stack**

because the platform next needs the full front-end implementation standard that turns platform/product/module/workflow/agent truth into production-grade UI behavior.

---

## 15. One-Line Use Instruction

Use Patch 8 to compare the current AI-agent implementation against the full canonical AI-agent target, classify every agent-layer gap, build only the missing AI-agent artifacts, validate against AI-agent pass/fail rules, and update the as-built ledger.

# Patch 9 — UI Feature and Component Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 9 — UI Feature and Component Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **UI feature and component stack** across DOS shell, DAuth consumption, products, modules, workflows, AI-agent surfaces, admin surfaces, and operational interfaces.

It tells an agent exactly how to:
- inspect UI feature or component X
- compare the current implementation against the canonical UI target
- classify every UI-layer gap
- know exactly what pages, layouts, features, components, states, contracts, access-aware rendering rules, UX states, accessibility rules, RTL rules, diagnostics surfaces, tests, and handover artifacts must exist
- know what belongs to DOS shell, what belongs to products/modules, and what must never be duplicated or invented in UI

### 0.4 Patch role in the patch library
This patch is the canonical UI feature and component enforcement document.

It connects:
- DOS shell/runtime composition
- DAuth access snapshot consumption
- products and modules
- workflow interaction surfaces
- AI-agent interaction surfaces
- settings/admin operations
- dynamic UI system interfaces

No later patch may redefine UI architecture in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **UI feature and component object model**.

### 1.2 Target object types
This patch applies to:
- shell surface object
- page object
- feature object
- component object
- layout object
- state/view-model object
- form object
- table/list object
- dashboard/widget object
- timeline/history object
- admin surface object
- diagnostics surface object
- action visibility object
- interaction state object
- accessibility object
- localization/RTL object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- centralized dynamic UI engine internals
- backend contract ownership
- DAuth internal logic
- product/module business semantics beyond UI participation rules

### 1.4 UI definition
A UI feature/component stack is the **production-grade presentation and interaction layer** that renders platform truth, product truth, module truth, workflow truth, and agent truth safely and coherently.

UI is not:
- the source of authorization truth
- the source of workflow truth
- the source of lifecycle truth
- a collection of random pages and controls
- a theme only

UI is a structured system with:
- shell integration
- feature boundaries
- component boundaries
- state boundaries
- access-aware rendering
- explicit loading/empty/error/success states
- accessibility and localization rules
- operational visibility surfaces

---

## 2. Canonical UI Target Blueprint

## 2.1 UI responsibilities

### A. Shell and runtime composition
- shell layout
- route entry model
- workspace/product/module context display
- navigation surfaces
- lifecycle/status banners
- global notifications
- loading and degraded-mode behavior
- page chrome and layout consistency

### B. Feature/page composition
- page ownership
- feature grouping
- route-to-feature mapping
- feature state ownership
- contract-driven rendering
- explicit interaction flows

### C. Component model
- reusable UI primitives
- domain components
- feature components
- admin components
- diagnostics components
- workflow components
- agent control components
- accessibility-safe interaction patterns

### D. Access-aware rendering
- consume DAuth access snapshot truth
- show/hide/disable behavior
- stateful action visibility
- guarded action feedback
- denied-action UX
- no local permission engines

### E. State and interaction model
- loading states
- refreshing states
- empty states
- partial data states
- optimistic states where explicitly allowed
- failure states
- degraded mode states
- retry paths
- validation states
- unsaved-change states where relevant

### F. UX quality model
- enterprise information density
- clarity and auditability
- visible status and rationale where required
- high-signal controls
- deep-table/list usability
- advanced filtering, sorting, and search patterns
- task/action clarity
- admin clarity
- operator clarity

### G. Accessibility and localization model
- keyboard navigation
- screen reader semantics
- focus behavior
- live-region/status behavior where needed
- color contrast and non-color cues
- RTL support
- bilingual content behavior
- semantic form labeling
- disabled-state explanation

### H. Diagnostics and operational model
- health/status surfaces where relevant
- admin diagnostics where relevant
- action history/timeline surfaces where relevant
- failure visibility
- retry and escalation visibility
- operator-safe telemetry displays

---

## 2.2 UI ownership boundaries

### DOS owns directly
- shell
- global layout contracts
- navigation composition contract
- workspace context surfaces
- global lifecycle/status banner patterns
- shared design primitives and UI governance rules

### DAuth owns directly
- access truth
- action eligibility truth
- session/auth state truth
- guarded-action decision truth

### Product owns directly
- product home
- product pages
- product dashboards/widgets
- product runtime navigation grouping
- product operator/admin pages

### Module owns directly
- module pages
- module dialogs/forms/tables
- module work surfaces
- module diagnostics/admin views
- module widgets where owned

### UI must not own
- authorization truth
- lifecycle truth
- workflow transition truth
- event truth
- product/module registry truth

---

## 2.3 Required frontend package layout

```text
frontend/src/app/
  core/dos/
  core/dauth/
  products/<product-code>/
  features/<module-code>/
  shared/ui/
  shared/layout/
  shared/forms/
  shared/tables/
  shared/feedback/
  shared/diagnostics/
```

### 2.3.1 Required concern split
#### `core/dos/`
Shell, navigation, workspace/runtime context, global lifecycle/status.

#### `core/dauth/`
Session/access consumption, auth guards, access-aware helpers/directives.

#### `products/<product>/`
Product pages, dashboards, widgets, admin surfaces.

#### `features/<module>/`
Module pages, domain components, services/state, module admin/diagnostic surfaces.

#### `shared/ui/`
Reusable base components and visual primitives.

#### `shared/layout/`
Shell layout elements, headers, sidebars, panels, banners, frames.

#### `shared/forms/`
Field wrappers, validation display, advanced form utilities.

#### `shared/tables/`
Enterprise tables, filters, sorting, bulk-action patterns.

#### `shared/feedback/`
Notifications, empty states, error states, progress and success patterns.

#### `shared/diagnostics/`
Timelines, logs, status strips, health panels, diagnostics widgets.

---

## 2.4 Required UI feature contract

Every page/feature must define:
- feature code
- owner layer
- route or embed context
- required contracts consumed
- displayed entities
- allowed actions consumed from DAuth truth
- workflow surfaces if applicable
- diagnostics/admin surfaces if applicable
- localization requirements
- accessibility requirements

### Feature contract law
No meaningful UI feature should exist only as a loose page file with no declared boundaries.

---

## 2.5 Required component taxonomy

Every component must be classified as one of:
- primitive component
- layout component
- form component
- table/list component
- dashboard/widget component
- feature component
- domain component
- diagnostics component
- admin component
- workflow component
- agent control component

### Component law
Components must be reusable, bounded, and typed.
No god-components that own whole subsystems without declared feature boundaries.

---

## 2.6 Required access-aware rendering model

Every protected action in UI must define:
- visible state
- disabled state
- hidden state
- reason text or rationale surface where appropriate
- request-in-progress state
- denied/error state
- success state
- post-action refresh behavior

### Access-aware law
UI consumes DAuth truth.
UI never computes real permission truth by itself.

---

## 2.7 Required state model

Every page/feature must define:
- initial state
- loading state
- loaded state
- empty state
- error state
- retry state
- partial data state if applicable
- saving/submitting state if applicable
- optimistic state if applicable
- stale/refreshing state if applicable

### State law
No production UI feature may omit explicit loading/empty/error behavior.

---

## 2.8 Required form model

Every serious form must define:
- field ownership
- typed contract
- validation rules
- field-level errors
- form-level errors
- unsaved changes behavior
- submit disable rules
- progress and success behavior
- audit note requirement where needed
- accessibility labels and descriptions

### Form law
No large enterprise form should rely on vague, single-banner validation only.

---

## 2.9 Required table/list model

Every serious list/table must define:
- columns
- sorting
- filtering
- search
- pagination/virtualization strategy
- empty state
- bulk action model
- row action model
- denied/disabled action model
- loading state
- export/share state if applicable

### Table law
No operational enterprise module should depend on simplistic, non-auditable list displays where deep-table behavior is required.

---

## 2.10 Required diagnostics/admin UI model

Every operationally important area must define:
- status indicators
- failure indicators
- audit/timeline visibility where needed
- diagnostics entry points
- admin controls where allowed
- safe operator messages
- recovery or escalation links/actions where allowed

### Diagnostics law
Critical runtime behavior must never be opaque to operators.

---

## 2.11 Required accessibility and localization model

Every UI layer must support:
- keyboard-first usability
- screen-reader semantics
- focus management
- aria relationships where required
- non-color cues
- visible disabled explanations where needed
- bilingual text behavior
- RTL-safe layout and controls
- date/number/text formatting policy
- localization fallback policy

### Accessibility law
Accessibility is not optional polish.
It is mandatory architecture.

---

## 3. Current-State Audit Method

An agent auditing UI feature/component X must perform the following checks.

## 3.1 Feature boundary audit
Verify:
- owner layer is explicit
- feature/page purpose is explicit
- required contracts are explicit
- route/shell placement is explicit

## 3.2 Component audit
Verify:
- component taxonomy is explicit
- reusable vs feature-specific boundaries are clear
- no god-components dominate whole subsystems without decomposition

## 3.3 Access/rendering audit
Verify:
- DAuth access truth is consumed
- action visibility states are explicit
- no local permission engine exists

## 3.4 State audit
Verify:
- loading/empty/error/success/degraded states exist
- retry paths exist
- stale and unsaved-change behavior exists where needed

## 3.5 Form/table audit
Verify:
- enterprise-grade form and table patterns are applied where required
- validation and bulk behaviors are explicit

## 3.6 Accessibility/localization audit
Verify:
- keyboard, screen reader, focus, RTL, and bilingual behavior are explicit and supported

## 3.7 Diagnostics/admin audit
Verify:
- health, status, failures, admin controls, and timeline visibility exist where operationally needed

## 3.8 Test audit
Verify:
- UI tests exist for guarded actions, states, accessibility-critical behavior, and feature flows

---

## 4. Gap Classification for UI Feature and Component Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required page, feature contract, component type, state, accessibility support, diagnostics surface, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required fields or runtime behavior.
Examples:
- page exists but no empty/error states
- form exists but no field-level validation
- table exists but no filter/sort/bulk model where required

### 4.3 Duplicate
Two or more features/components own the same concern.
Examples:
- duplicate admin screens
- duplicate role/action visibility logic
- duplicate table or workflow surface definitions

### 4.4 Wrong Owner
Concern belongs to DOS shell, DAuth consumption, product, or module but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- auth truth in UI
- workflow decisions in component code
- DOS shell logic copied into product/module features

### 4.6 Legacy Carryover
Old page/component structures or dead UX patterns still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- no explicit states
- no denied-action rationale
- single-banner-only form validation on complex forms
- inaccessible custom controls
- untyped component inputs for critical features

### 4.8 Production Blocker
Examples:
- users cannot tell whether an action is allowed
- core features have no loading/error/retry path
- admin cannot see failures or system status

### 4.9 Handover Blocker
Examples:
- feature boundaries unclear
- diagnostics/admin entry points missing
- no contract between UI and backend truth

---

## 5. Required Artifact Matrix

Every UI pass must address all artifact classes below.

| Artifact Class | Required in Patch 9 | Examples |
|---|---|---|
| Files/Folders | Yes | shell, pages, components, forms, tables, diagnostics |
| Services/State | Yes | view-model/state/query services |
| Contracts/Schemas | Yes | feature contracts, form contracts, UI state models |
| Tables/Data | Yes | consumed runtime data surfaces and mappings |
| APIs | Yes | consumed API contracts for feature actions |
| Events | Yes | UI-visible event/timeline consumption where relevant |
| Workflows/Lifecycle | Yes | workflow/action surfaces and status rendering |
| UI/Admin Surfaces | Yes | pages, dialogs, widgets, admin, diagnostics |
| Audit/Logs | Yes | timeline/history/diagnostic visibility where relevant |
| Tests | Yes | feature flow, accessibility, guarded-action, state tests |
| As-Built Updates | Yes | UI structure and feature state notes |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If feature boundaries are weak
### Build this
Create explicit feature contracts and clean package boundaries for:
- shell
- product
- module
- admin
- diagnostics
- workflow
- agent surfaces

### Do not build this
- random page sprawl with no owner
- giant screens owning unrelated responsibilities

## 6.2 If access-aware behavior is weak
### Build this
Create explicit visible/disabled/hidden rationale surfaces and consume DAuth truth through approved contracts.

### Do not build this
- hardcoded permission checks in components
- UI-side truth engines

## 6.3 If states are weak
### Build this
Create full state models:
- loading
- empty
- error
- retry
- success
- refreshing
- degraded

### Do not build this
- blank pages on no-data or error
- loading-only happy-path assumptions

## 6.4 If forms are weak
### Build this
Create enterprise-grade form wrappers with:
- field-level validation
- form-level validation
- progress/submit states
- unsaved-change behavior
- accessible labels/descriptions

### Do not build this
- complex forms with only a single bottom error banner
- unlabeled controls
- explanation-free disabled submits

## 6.5 If tables/lists are weak
### Build this
Create enterprise list/table patterns with:
- filters
- search
- sorting
- bulk actions
- row actions
- loading/empty/error states

### Do not build this
- operational lists with no filter/sort path
- hidden or inconsistent row action policies

## 6.6 If diagnostics/admin are weak
### Build this
Create:
- health/status strips
- timeline/history surfaces
- diagnostics panels
- admin action surfaces
- safe operator messages

### Do not build this
- operationally blind pages
- hidden diagnostics in dev-only tools

## 6.7 If accessibility/RTL are weak
### Build this
Create:
- keyboard-safe interactions
- screen-reader relationships
- focus management
- RTL-safe layouts
- bilingual text handling

### Do not build this
- mouse-only advanced controls
- layout assumptions that break under RTL
- silent status changes with no accessible announcement where required

---

## 7. Example Skeletons

## 7.1 Example frontend layout

```text
frontend/src/app/features/risk/
  pages/risk-hub.component.ts
  components/risk-table.component.ts
  components/risk-detail-panel.component.ts
  services/risk-view-state.service.ts
  workflows/risk-approval-panel.component.ts
  diagnostics/risk-health-panel.component.ts
  contracts/risk-ui.types.ts
  index.ts
```

## 7.2 Example feature contract

```ts
export interface UiFeatureContract {
  featureCode: string;
  ownerLayer: 'dos' | 'product' | 'module';
  route?: string;
  requiredContracts: string[];
  diagnosticsEnabled?: boolean;
}
```

## 7.3 Example action visibility model

```ts
export interface UiActionState {
  visible: boolean;
  enabled: boolean;
  reason?: string;
  inProgress?: boolean;
}
```

## 7.4 Example test expectations

```ts
it('disables a protected action with an explicit rationale when access snapshot denies execution', () => {
  // guarded-action UI example
});

it('renders loading, empty, and error states for the feature table', () => {
  // state model example
});
```

---

## 8. Tests Required for UI Feature and Component Stack

### 8.1 Unit tests required
- component state handling
- action state rendering
- form validation rendering
- list/table interactions
- localization/RTL helpers where relevant

### 8.2 Integration tests required
- page feature flows
- guarded actions
- workflow action surfaces
- admin diagnostics entry points
- unsaved-change and retry flows

### 8.3 Accessibility tests required
- keyboard navigation
- focus movement
- labels/aria relationships
- disabled explanation visibility where required
- RTL rendering for layout-critical views

### 8.4 Operational smoke tests required
- shell loads with coherent product/module context
- key pages surface loading/error/empty states correctly
- operators can see health/status surfaces where expected

---

## 9. Review Checklist for UI Feature and Component Stack

The reviewer must confirm:
- feature ownership boundaries are explicit
- components are correctly classified
- DAuth truth is consumed, not recreated
- state model is explicit and complete
- forms and tables meet enterprise behavior requirements
- diagnostics/admin surfaces exist where needed
- accessibility and RTL behavior are explicit
- tests are declared for critical behavior
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 9 passes for target UI feature/component X only if all below are true.

### 10.1 Ownership correctness
- DOS shell concerns remain in DOS
- DAuth truth remains in DAuth
- product/module concerns remain in the correct feature layer
- no UI layer duplicates backend truth ownership

### 10.2 Artifact completeness
- required pages/components/contracts/state models/diagnostics/tests exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- UI can render truth coherently, safely, access-aware, accessible, bilingual, and operationally usable

### 10.4 Handover readiness
- diagnostics/admin surfaces are visible
- feature contracts are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 9 fails if any of the following are true:
- UI invents auth, workflow, or lifecycle truth
- loading/empty/error states are absent on critical features
- forms or tables are below enterprise requirements where depth is required
- accessibility/RTL support is absent for critical features
- diagnostics/admin visibility is absent where operationally required
- required artifact classes were skipped
- scope widened outside UI layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 9 must update the as-built ledger with:
- feature/component package structure created or normalized
- shell/feature/component/state/access-aware patterns implemented
- diagnostics/admin visibility status
- accessibility/RTL status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with UI-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 9, the next patch should be:

**Patch 10 — Centralized Dynamic UI and DB-Driven Runtime UI Stack**

because the platform next needs the formal engine that powers registry-based, schema-driven, configurable UI without violating UI or backend ownership rules.

---

## 15. One-Line Use Instruction

Use Patch 9 to compare the current UI feature/component implementation against the full canonical UI target, classify every UI-layer gap, build only the missing UI artifacts, validate against UI pass/fail rules, and update the as-built ledger.

# Patch 10 — Centralized Dynamic UI and DB-Driven Runtime UI Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 10 — Centralized Dynamic UI and DB-Driven Runtime UI Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **centralized dynamic UI system** that powers registry-driven, schema-driven, DB-driven runtime UI behavior across DOS, products, modules, workflows, dashboards, widgets, navigation, forms, and operator surfaces.

It tells an agent exactly how to:
- inspect the dynamic UI system
- compare current implementation against the canonical target
- classify every dynamic-UI-layer gap
- know exactly what registries, schemas, renderers, safety boundaries, composition engines, caching rules, versioning rules, admin tooling, tests, and handover artifacts must exist
- know what dynamic UI may own, what it must consume, and what it must never be allowed to define

### 0.4 Patch role in the patch library
This patch is the canonical centralized UI runtime engine document.

It sits after Patch 9 because:
- Patch 9 defines how UI features/components should behave
- Patch 10 defines how parts of UI may be centrally described and rendered from typed registry/configuration/runtime data

No later patch may redefine the centralized dynamic UI engine in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **dynamic UI / DB-driven runtime UI object model**.

### 1.2 Target object types
This patch applies to:
- dashboard registry object
- widget registry object
- layout registry object
- navigation registry object
- page composition object
- drawer template object
- form schema object
- field schema object
- action schema object
- visibility rule object
- runtime composition resolver object
- renderer object
- component binding object
- schema version object
- caching object
- preview/admin tooling object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- low-level design tokens and primitive UI design system details
- DAuth access truth internals
- business workflow truth
- product/module business logic internals

### 1.4 Dynamic UI definition
Dynamic UI is the **controlled runtime composition layer** that turns canonical registry/configuration/schema data into rendered UI surfaces.

Dynamic UI is not:
- a replacement for typed frontend engineering
- a replacement for module/product contracts
- a place to store auth truth
- a place to store workflow truth
- a place to hide business logic
- an unrestricted no-code builder

Dynamic UI is a bounded composition engine for:
- dashboards
- widgets
- navigation
- page sections
- drawers
- forms
- controlled runtime action presentation
- operator/admin-configurable experience layers

---

## 2. Canonical Dynamic UI Target Blueprint

## 2.1 Dynamic UI responsibilities

### A. Registry-driven composition
- dashboard registry
- widget registry
- layout registry
- navigation registry
- drawer template registry
- form schema registry
- page/section composition registry where supported

### B. Runtime rendering
- resolve registry entries
- resolve allowed renderer types
- bind data contracts
- bind DAuth action states
- bind DOS shell/product/module context
- render safe layouts and widgets
- handle versioned schema evolution

### C. Controlled configurability
- tenant overrides where allowed
- product defaults
- module defaults
- operator/admin overrides
- role/access-aware visibility inputs from DAuth truth
- environment-safe feature enablement

### D. Safety and governance
- typed schemas
- allowlisted renderers
- allowlisted component bindings
- versioned schema validation
- no arbitrary remote code execution
- no hidden business logic in DB configuration
- no auth/workflow/lifecycle truth encoded as UI truth

### E. Operational tooling
- preview mode
- validation mode
- publish/draft mode where applicable
- rollback/version history
- diagnostics and broken-layout detection
- migration tooling for schema evolution

---

## 2.2 Dynamic UI ownership boundaries

### DOS owns directly
- centralized UI registries
- centralized composition engine
- renderer allowlist
- layout and widget runtime resolution
- navigation composition engine
- schema versioning and validation framework
- admin tooling for centralized runtime UI

### DAuth owns directly
- action eligibility truth
- access visibility truth
- scope-dependent rendering truth inputs
- session/auth context truth

### Product owns directly
- product dashboard bundles
- product navigation grouping inputs
- product page composition inputs
- product widget bundles and allowed overrides

### Module owns directly
- module widgets
- module forms and field schemas
- module drawers
- module page sections where supported
- module runtime action presentations

### Dynamic UI must not own
- permission truth
- workflow transition truth
- authority truth
- SoD truth
- arbitrary business logic
- arbitrary code execution

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/dynamic-ui/
  registries/
  schemas/
  resolvers/
  render-models/
  versioning/
  validation/
  caching/
  previews/
  publishing/
  admin/
  diagnostics/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `registries/`
Dashboard, widget, layout, navigation, drawer, form, and page-section registries.

#### `schemas/`
Typed schema definitions and schema validators.

#### `resolvers/`
Runtime composition resolvers and dependency resolution.

#### `render-models/`
Safe renderer descriptors and view-model contracts.

#### `versioning/`
Schema migration, schema versioning, and compatibility rules.

#### `validation/`
Registry and schema validation, integrity checks, reference checks.

#### `caching/`
Runtime cache rules and invalidation.

#### `previews/`
Preview and draft rendering.

#### `publishing/`
Publish/rollback/version history controls where supported.

#### `admin/`
Dynamic UI admin surfaces.

#### `diagnostics/`
Broken-schema detection, failed render diagnostics, unresolved dependency reporting.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/dynamic-ui/
  renderers/
  binders/
  dashboards/
  widgets/
  navigation/
  forms/
  drawers/
  previews/
  diagnostics/
  contracts/
  index.ts
```

### Rule
Frontend renderers consume the centralized runtime UI contracts.
They do not define arbitrary local schema semantics that diverge from the centralized engine.

---

## 2.5 Required dynamic UI registries

The centralized engine must support at minimum:
- `dashboard_registry`
- `dashboard_layout_registry`
- `dashboard_widget_registry`
- `widget_registry`
- `navigation_registry`
- `navigation_overrides`
- `navigation_role_bindings`
- `drawer_templates`
- `saved_views` where relevant
- `contextual_suggestions` where relevant
- form schema registry if form centralization is supported
- page section registry if page composition is supported

### Registry law
Each registry entry must be typed, versioned, bounded, and validated.
No free-form unbounded UI JSON should become production truth without schema validation.

---

## 2.6 Required render model

Every dynamic UI element must define:
- element type
- version
- renderer type
- data contract source
- interaction contract
- action bindings
- visibility inputs
- localization support
- accessibility metadata
- diagnostics metadata

### Renderer law
Renderer types must be allowlisted.
No arbitrary renderer resolution from uncontrolled strings.

---

## 2.7 Required form-schema model

If forms are dynamically driven, every form schema must define:
- form code
- version
- field list
- field types
- validation rules
- visibility rules
- readonly/disabled rules
- submit contract
- audit note requirement if relevant
- localization labels/help text
- accessibility descriptors

### Dynamic form law
Dynamic forms may drive presentation and validation structure.
They must not define business authorization truth.

---

## 2.8 Required action and visibility model

Dynamic UI may consume:
- visible state
- enabled state
- disabled rationale
- loading state
- action labels/icons/placement

Dynamic UI may not compute:
- real permission outcomes
- authority outcomes
- workflow approval legality
- lifecycle transition legality

Those must come from DAuth or workflow/backend truth.

---

## 2.9 Required versioning and publishing model

The engine must support:
- draft vs published state where relevant
- version history
- compatibility rules
- migration rules
- rollback path
- broken-reference detection
- schema validation before publish

### Versioning law
No dynamic UI change should silently break runtime with no rollback or validation path.

---

## 2.10 Required diagnostics model

The engine must expose:
- unresolved registry entry detection
- broken renderer detection
- missing data contract detection
- stale schema detection
- invalid visibility binding detection
- publish failure diagnostics
- runtime render failure diagnostics
- tenant override conflict diagnostics

---

## 2.11 Required admin tooling model

Centralized dynamic UI admin must support:
- registry browsing
- preview
- draft editing where supported
- publish
- rollback
- impact analysis
- dependency graph visibility
- diagnostics and validation reports

### Admin tooling law
Dynamic UI admin is a governed operator surface, not an unrestricted production editor with no validation boundaries.

---

## 3. Current-State Audit Method

An agent auditing the dynamic UI system must perform the following checks.

## 3.1 Registry audit
Verify:
- canonical registries exist
- duplicate registries do not define the same concern ambiguously
- entries are typed and versioned

## 3.2 Renderer audit
Verify:
- renderer allowlist exists
- uncontrolled renderer resolution does not exist
- data contracts are explicit

## 3.3 Visibility/action audit
Verify:
- visibility and action state are consumed from authoritative contracts
- dynamic UI does not invent auth/workflow truth

## 3.4 Form/schema audit
Verify:
- forms/fields/actions are typed
- validation metadata exists
- schema versioning exists if dynamic forms are supported

## 3.5 Versioning/publishing audit
Verify:
- preview, publish, rollback, and validation paths exist
- no production-breaking silent config writes occur

## 3.6 Diagnostics/admin audit
Verify:
- failed render and broken schema diagnostics exist
- admin tooling is bounded and safe

## 3.7 Test audit
Verify:
- registry validation, renderer safety, publishing, and rollback paths are tested

---

## 4. Gap Classification for Centralized Dynamic UI Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required registry, schema, resolver, renderer allowlist, preview/publish path, diagnostics surface, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required type safety, validation, or runtime protections.
Examples:
- registry exists but entries are not versioned
- preview exists but no rollback path
- widget schema exists but no accessibility metadata

### 4.3 Duplicate
Two or more registries or runtime UI engines own the same concern.
Examples:
- duplicate dashboard registries
- duplicate page composition systems
- local widget maps acting as hidden second registry

### 4.4 Wrong Owner
Concern belongs to DOS centralized UI runtime but is implemented at product/module/UI-local layer, or vice versa.

### 4.5 Wrong Layer
Examples:
- permission truth in widget registry
- workflow legality encoded in UI config
- product business rules buried in central UI tables

### 4.6 Legacy Carryover
Old dashboard/layout or UI override systems still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- arbitrary renderer strings
- arbitrary code execution via config
- untyped UI schemas
- no publish validation
- no rollback
- UI registry becoming a shadow business-logic engine

### 4.8 Production Blocker
Examples:
- broken registry entries can take down runtime
- no validation/rollback path
- visibility/actions are driven from non-authoritative logic

### 4.9 Handover Blocker
Examples:
- no diagnostics for broken layouts
- no admin tooling
- no version history
- no schema ownership clarity

---

## 5. Required Artifact Matrix

Every dynamic-UI pass must address all artifact classes below.

| Artifact Class | Required in Patch 10 | Examples |
|---|---|---|
| Files/Folders | Yes | registries, schemas, resolvers, renderers, publishing |
| Services | Yes | registry service, renderer resolver, publish validator, diagnostics |
| Contracts/Schemas | Yes | dashboard, widget, form, layout, action contracts |
| Tables/Data | Yes | registries, overrides, layouts, drafts, versions |
| APIs | Yes | preview, publish, rollback, diagnostics, registry browsing |
| Events | Yes | publish, rollback, validation failure, render failure events |
| Workflows/Lifecycle | Yes | publish/approve/rollback flows if governed |
| UI/Admin Surfaces | Yes | registry admin, preview, diagnostics, impact analysis |
| Audit/Logs | Yes | publish logs, rollback logs, broken render logs |
| Tests | Yes | validation, rendering, versioning, rollback, diagnostics tests |
| As-Built Updates | Yes | runtime UI engine state and constraints |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If registries are weak or duplicated
### Build this
Create or normalize:
- canonical registries
- explicit ownership map
- typed entry schemas
- registry validation service

### Do not build this
- multiple overlapping registries for the same concern
- free-form JSON with no schema governance

## 6.2 If renderer system is unsafe
### Build this
Create:
- renderer allowlist
- explicit renderer contracts
- safe binding layer
- runtime diagnostics for missing/invalid bindings

### Do not build this
- arbitrary dynamic component execution
- uncontrolled renderer strings from DB

## 6.3 If action/visibility system is unsafe
### Build this
Create explicit binding to authoritative access/action contracts.

### Do not build this
- local permission logic in dynamic configs
- workflow/action legality in registry JSON

## 6.4 If forms are dynamically driven but weak
### Build this
Create typed form and field schemas with versioning, validation, accessibility metadata, and diagnostics.

### Do not build this
- field behavior that silently encodes business authorization rules
- no-version production form configs

## 6.5 If versioning/publishing is weak
### Build this
Create:
- draft/published model
- publish validation
- rollback
- version history
- dependency impact analysis

### Do not build this
- direct live-edit production config writes with no validation or rollback

## 6.6 If diagnostics/admin tooling is weak
### Build this
Create:
- preview mode
- broken-reference diagnostics
- render failure diagnostics
- registry dependency graph
- operator-safe admin tooling

### Do not build this
- hidden debug-only tools as the only support model

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/dynamic-ui/
  registries/dashboard-registry.service.ts
  registries/widget-registry.service.ts
  schemas/widget.schema.ts
  resolvers/dynamic-ui-resolver.service.ts
  validation/registry-validator.service.ts
  publishing/dynamic-ui-publish.service.ts
  diagnostics/dynamic-ui-diagnostics.service.ts
  contracts/dynamic-ui.types.ts
  index.ts
```

## 7.2 Example widget contract

```ts
export interface WidgetDefinition {
  widgetKey: string;
  version: string;
  rendererType: string;
  dataContract: string;
  accessibilityProfile?: string;
}
```

## 7.3 Example preview contract

```ts
export interface DynamicUiPreviewResult {
  previewId: string;
  valid: boolean;
  warnings: string[];
  brokenDependencies: string[];
}
```

## 7.4 Example test expectations

```ts
it('rejects publishing a dashboard layout with unresolved widget dependencies', () => {
  // publish validation example
});

it('prevents a widget schema from encoding unauthorized action truth locally', () => {
  // safety boundary example
});
```

---

## 8. Tests Required for Centralized Dynamic UI Stack

### 8.1 Unit tests required
- registry validation
- renderer resolution safety
- visibility/action binding safety
- form schema validation
- dependency graph validation

### 8.2 Integration tests required
- dashboard composition
- widget rendering
- preview/publish/rollback flow
- navigation composition
- diagnostics surfacing

### 8.3 Contract tests required
- registry entry contracts
- widget/layout/form schema contracts
- preview/publish result contracts
- diagnostics contracts

### 8.4 Operational smoke tests required
- runtime UI can render published configs coherently
- broken configs are blocked before publish
- rollback restores prior valid state
- diagnostics expose invalid entries and broken dependencies

---

## 9. Review Checklist for Centralized Dynamic UI Stack

The reviewer must confirm:
- registries are canonical and non-duplicated
- renderer system is safe and allowlisted
- dynamic UI consumes authoritative truth rather than inventing it
- versioning/publish/rollback flow is explicit
- diagnostics and admin tooling exist
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 10 passes for target dynamic-UI system X only if all below are true.

### 10.1 Ownership correctness
- DOS owns centralized dynamic UI runtime
- DAuth continues owning access truth
- products/modules provide bounded config inputs without taking over the engine
- no layer duplicates centralized UI concern

### 10.2 Artifact completeness
- required registries/schemas/resolvers/publishing/diagnostics/test artifacts exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- dynamic UI can resolve, render, validate, publish, rollback, and diagnose coherently and safely

### 10.4 Handover readiness
- diagnostics/admin/version history are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 10 fails if any of the following are true:
- registry or renderer logic is unsafe or untyped
- dynamic UI invents auth/workflow/business truth
- publish/rollback/validation paths are absent
- broken configs can silently reach production
- diagnostics/admin tooling is absent
- required artifact classes were skipped
- scope widened outside centralized dynamic UI layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 10 must update the as-built ledger with:
- centralized UI runtime folders/services created or normalized
- registries/schemas/resolvers/publishing/diagnostics status
- safety boundaries and constraints
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with dynamic-UI-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 10, the next patch should be:

**Patch 11 — Settings, Tenant Admin, and Platform Admin Stack**

because the centralized runtime must next be governed through enterprise-grade administrative and configuration-control surfaces.

---

## 15. One-Line Use Instruction

Use Patch 10 to compare the current centralized dynamic UI system against the full canonical target, classify every dynamic-UI-layer gap, build only the missing dynamic-UI artifacts, validate against dynamic-UI pass/fail rules, and update the as-built ledger.

# Patch 11 — Settings, Tenant Admin, and Platform Admin Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 11 — Settings, Tenant Admin, and Platform Admin Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **settings stack, tenant admin stack, and platform admin stack** across DOS, DAuth, products, modules, workflows, AI agents, and operational governance.

It tells an agent exactly how to:
- inspect settings/admin area X
- compare current implementation against the canonical target
- classify every settings/admin-layer gap
- know exactly what settings domains, configuration layers, admin surfaces, approval rules, audit trails, secret boundaries, tenant controls, platform controls, health and diagnostics, tests, and handover artifacts must exist
- know what belongs to DOS, what belongs to DAuth, what belongs to products/modules, and what must never be mixed or bypassed

### 0.4 Patch role in the patch library
This patch is the canonical administrative control document for the platform.

It governs:
- system settings
- tenant settings
- product settings
- module settings
- admin operations
- config governance
- change control
- tenant administration
- platform administration
- operational override and recovery surfaces

No later patch may redefine settings/admin architecture in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **settings and admin object model**.

### 1.2 Target object types
This patch applies to:
- settings domain object
- configuration layer object
- tenant admin object
- platform admin object
- product admin object
- module admin object
- secret/config object
- feature flag object
- enablement object
- override object
- diagnostics/admin action object
- approval-governed admin change object
- audit/change-log object
- environment configuration object
- configuration rollout/rollback object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- DAuth internal control engines
- low-level infrastructure deployment tooling
- centralized dynamic UI internals beyond admin consumption
- product/module business logic outside admin/control surfaces

### 1.4 Settings/admin definition
Settings and admin stack is the **governed control surface** through which operators, tenant admins, platform admins, and product/module admins inspect, configure, enable, disable, constrain, diagnose, and recover the system.

This stack is not:
- a random collection of config screens
- a hidden developer-only backdoor
- direct raw database editing
- environment variables surfaced without governance
- a bypass around DAuth or workflow controls

---

## 2. Canonical Settings/Admin Target Blueprint

## 2.1 Settings responsibilities

### A. Configuration layering
The system must distinguish configuration layers explicitly:
- platform-global
- environment/runtime-global
- tenant-level
- workspace-level where applicable
- product-level
- module-level
- feature-level
- user-preference level
- session/ephemeral view-state level

### B. Settings domains
The system must define at minimum:
- identity/security settings
- SSO/MFA settings
- tenant profile/settings
- product enablement settings
- module enablement settings
- notification settings
- workflow/lifecycle policy settings
- AI-agent policy settings
- observability/diagnostics settings
- data retention and archival settings
- localization/accessibility defaults
- runtime UI and layout settings
- quota/usage settings
- connector/integration settings
- approval/escalation settings

### C. Admin surfaces
The system must define:
- platform admin console
- tenant admin console
- product admin surfaces
- module admin surfaces
- diagnostics/ops console
- change review/audit surfaces
- recovery and rollback surfaces

### D. Change governance
Every sensitive settings change must define:
- owner
- risk class
- approval requirement
- audit logging
- rollout policy
- rollback policy
- visibility scope
- secret handling policy
- effect timing (immediate, restart-required, scheduled, staged)

---

## 2.2 Admin ownership boundaries

### DOS owns directly
- configuration layering model
- platform admin framework
- tenant admin framework
- feature flag framework
- product/module enablement controls
- rollout and rollback framework
- diagnostics and admin topology
- system-wide change logs and governance surfaces

### DAuth owns directly
- settings related to auth/security/control where applicable
- security-sensitive admin access checks
- admin authority checks
- approval requirements for sensitive changes
- audit of sensitive settings/admin actions

### Product owns directly
- product settings domains
- product admin surfaces
- product-specific diagnostics and runtime controls

### Module owns directly
- module settings domains
- module admin surfaces
- module-specific diagnostics and operational controls

### Settings/admin stack must not implement
- hidden privilege bypasses
- developer-only undocumented controls as production truth
- local per-screen config storage with no canonical settings model
- raw secret exposure in UI or APIs

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/admin/
  settings/
  platform-admin/
  tenant-admin/
  enablement/
  rollout/
  approvals/
  secrets/
  diagnostics/
  change-log/
  recovery/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `settings/`
Canonical settings services, resolution, layering, and validation.

#### `platform-admin/`
Platform-wide control surfaces and APIs.

#### `tenant-admin/`
Tenant-scoped control surfaces and APIs.

#### `enablement/`
Product/module/feature enablement and operating state changes.

#### `rollout/`
Draft, staged, immediate, rollback, and deployment-sensitive changes.

#### `approvals/`
Approval-gated admin changes.

#### `secrets/`
Secret references, secret metadata, rotation state, secure binding, never raw disclosure.

#### `diagnostics/`
Admin diagnostics and runtime visibility.

#### `change-log/`
Audit trail and change history.

#### `recovery/`
Recovery, restore, rollback, and emergency intervention controls.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/admin/
  platform/
  tenant/
  settings/
  enablement/
  diagnostics/
  approvals/
  recovery/
  contracts/
  index.ts
```

### Rule
Frontend admin surfaces consume DOS and DAuth truth.
They do not invent hidden admin capabilities.

---

## 2.5 Required settings domain model

Every settings domain must define:
- `domainCode`
- `ownerLayer`
- `scopeLevel`
- `settingKeys`
- `sensitivityClass`
- `secretHandlingRule`
- `validationSchema`
- `defaultingRule`
- `inheritanceRule`
- `overrideRule`
- `auditRule`
- `approvalRule`
- `rollbackRule`

### Scope levels
- global/platform
- environment
- tenant
- workspace
- product
- module
- user preference
- ephemeral/local view only

### Settings law
No setting may exist without explicit domain, scope, validation, and ownership.

---

## 2.6 Required admin action model

Every admin action must define:
- action code
- owner layer
- target scope
- risk class
- required permission
- required authority if high impact
- approval requirement
- side effects
- event emission
- audit log requirement
- rollback or recovery path

### Admin action law
No sensitive admin action should be a raw endpoint with no typed governance model.

---

## 2.7 Required enablement model

The stack must govern:
- tenant activation/deactivation
- product enable/disable
- module enable/disable
- feature flag changes
- operating state changes
- maintenance/quarantine modes
- staged rollout policies
- dependency-aware enablement checks

### Enablement law
Enablement is a governed state change, not a boolean switch only.

---

## 2.8 Required secret and sensitive-config model

For any secret or sensitive config:
- secret value must never be exposed raw to UI
- metadata may be exposed safely
- rotation state must be visible
- binding status must be visible
- access must be tightly controlled
- audit must be mandatory

### Secret law
Settings UI must not become a secret leak surface.

---

## 2.9 Required change governance model

Every sensitive settings/admin change must define:
- who can request it
- who can approve it
- whether immediate application is allowed
- whether staged rollout is required
- what rollback means
- what audit and incident implications exist

### Governance law
No high-impact config change should bypass review, audit, or rollback planning where required.

---

## 2.10 Required diagnostics and recovery model

Admin stack must expose:
- status of products/modules/features
- runtime health summaries
- failed settings applications
- rollout failures
- drift detection where supported
- rollback history
- recovery actions
- quarantine/disable paths where relevant

### Recovery law
Recovery must be explicit and governed.
No raw database edits as the primary settings/admin recovery model.

---

## 2.11 Required admin UI model

The admin UI must provide:
- platform admin console
- tenant admin console
- product/module admin views
- settings editors
- diagnostics dashboards
- rollout/change history
- approval queues for sensitive changes
- rollback and recovery surfaces
- clear disabled/blocked rationale where actions are not allowed

### Admin UI law
Admin UI is a production operator surface.
It must be deeply explicit, safe, auditable, and operationally useful.

---

## 3. Current-State Audit Method

An agent auditing settings/admin area X must perform the following checks.

## 3.1 Settings-domain audit
Verify:
- settings are grouped by clear domain
- scope and ownership are explicit
- validation, defaults, inheritance, and overrides are explicit

## 3.2 Platform/tenant admin audit
Verify:
- platform admin and tenant admin boundaries are explicit
- product/module admin surfaces are bounded
- DAuth access and authority integration exists

## 3.3 Enablement/rollout audit
Verify:
- feature/module/product enablement is governed
- dependency-aware changes exist
- rollback and rollout paths exist

## 3.4 Secret/sensitive-config audit
Verify:
- secret handling is safe
- raw secrets are not disclosed
- binding and rotation visibility exists

## 3.5 Change-governance audit
Verify:
- approvals, audit, and rollback rules exist for sensitive changes

## 3.6 Diagnostics/recovery audit
Verify:
- failures, drift, and recovery are visible
- emergency but governed actions exist where necessary

## 3.7 Test audit
Verify:
- validation, governance, enablement, rollback, and admin permission paths are tested

---

## 4. Gap Classification for Settings/Admin Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required settings domain, admin surface, enablement control, secret rule, approval flow, rollback path, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required fields or runtime behavior.
Examples:
- settings page exists but no domain model
- enablement control exists but no rollback
- admin action exists but no audit or approval requirement

### 4.3 Duplicate
Two or more admin or settings systems own the same concern.
Examples:
- duplicate settings stores
- duplicate platform-admin and tenant-admin controls
- duplicate feature-flag or module-enablement controls

### 4.4 Wrong Owner
Concern belongs to DOS, DAuth, product, or module but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- auth/security config hidden in product admin
- product/module settings implemented as raw frontend-only local state
- environment config edited through ungoverned APIs

### 4.6 Legacy Carryover
Old admin panels or legacy settings stores still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- raw secrets in UI
- hidden admin routes
- unreviewed high-impact changes
- settings with no validation or audit
- no rollback path

### 4.8 Production Blocker
Examples:
- cannot safely disable a broken feature/module
- no admin recovery for rollout failure
- sensitive config changes have no control path

### 4.9 Handover Blocker
Examples:
- no change history
- no diagnostics
- no owner per settings domain
- no documented rollback or recovery path

---

## 5. Required Artifact Matrix

Every settings/admin pass must address all artifact classes below.

| Artifact Class | Required in Patch 11 | Examples |
|---|---|---|
| Files/Folders | Yes | settings, platform-admin, tenant-admin, rollout, recovery |
| Services | Yes | settings resolver, enablement service, rollout service, change audit |
| Contracts/Schemas | Yes | settings domain, admin action, rollout result, rollback result |
| Tables/Data | Yes | settings, feature flags, enablement, change log, approvals |
| APIs | Yes | platform admin, tenant admin, settings update, enablement, diagnostics |
| Events | Yes | settings changed, rollout started, rollback completed, admin intervention events |
| Workflows/Lifecycle | Yes | approval flows and rollout/rollback control paths |
| UI/Admin Surfaces | Yes | platform admin, tenant admin, product/module admin, diagnostics |
| Audit/Logs | Yes | change history, admin action logs, secret access metadata, rollback logs |
| Tests | Yes | validation, approval, enablement, rollback, permission, diagnostics tests |
| As-Built Updates | Yes | settings/admin topology and governance status |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If settings domains are weak or scattered
### Build this
Create:
- canonical settings domain model
- scope layering model
- defaults/inheritance/override rules
- domain validation schemas
- ownership map

### Do not build this
- free-form config keys with no owner or schema
- module/product settings with no platform-admin governance envelope

## 6.2 If admin boundaries are weak
### Build this
Create:
- platform admin boundaries
- tenant admin boundaries
- product/module admin sub-boundaries
- DAuth-integrated action model

### Do not build this
- one giant admin surface with no ownership split
- hidden power routes

## 6.3 If enablement/rollout is weak
### Build this
Create:
- enablement service
- staged rollout and rollback
- dependency validation
- health-aware disable/quarantine controls

### Do not build this
- blind enable/disable booleans
- rollout with no audit or rollback

## 6.4 If secrets/sensitive config are weak
### Build this
Create:
- secret reference model
- safe metadata views
- rotation and binding status surfaces
- secret access audit

### Do not build this
- raw secret values in admin UI
- raw secret transport outside approved secret-management path

## 6.5 If change governance is weak
### Build this
Create:
- approval-gated settings changes
- risk classes
- audit trail
- rollback plan contracts
- change-history surfaces

### Do not build this
- high-impact settings saved immediately with no controls
- admin writes with no traceability

## 6.6 If diagnostics/recovery are weak
### Build this
Create:
- rollout and failure diagnostics
- admin recovery controls
- safe emergency disable/quarantine actions
- drift/failure visibility

### Do not build this
- operational blindness
- recovery only via manual SQL edits

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/admin/
  settings/settings.service.ts
  platform-admin/platform-admin.controller.ts
  tenant-admin/tenant-admin.controller.ts
  enablement/module-enablement.service.ts
  rollout/rollout.service.ts
  approvals/admin-change-approval.service.ts
  secrets/secret-metadata.service.ts
  diagnostics/admin-diagnostics.service.ts
  change-log/admin-change-log.service.ts
  recovery/admin-recovery.service.ts
  contracts/admin.types.ts
  index.ts
```

## 7.2 Example settings domain contract

```ts
export interface SettingsDomainDefinition {
  domainCode: string;
  ownerLayer: 'dos' | 'dauth' | 'product' | 'module';
  scopeLevel: 'global' | 'tenant' | 'product' | 'module' | 'user';
  sensitivityClass: 'low' | 'medium' | 'high' | 'critical';
}
```

## 7.3 Example admin action contract

```ts
export interface AdminActionDefinition {
  actionCode: string;
  riskClass: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  requiresAuthority?: boolean;
}
```

## 7.4 Example test expectations

```ts
it('requires approval before applying a high-impact tenant security setting change', () => {
  // change governance example
});

it('rolls back a failed module enablement change and records the full audit trail', () => {
  // rollout/rollback example
});
```

---

## 8. Tests Required for Settings/Admin Stack

### 8.1 Unit tests required
- settings-domain validation
- inheritance and override resolution
- admin action governance rules
- enablement dependency checks
- secret metadata safety

### 8.2 Integration tests required
- platform admin action flow
- tenant admin change flow
- high-impact approval-gated change flow
- rollout and rollback flow
- diagnostics and recovery flow

### 8.3 Contract tests required
- settings domain contracts
- admin action contracts
- rollout/rollback result contracts
- diagnostics contracts
- secret metadata contracts

### 8.4 Operational smoke tests required
- admins can inspect settings safely
- unauthorized admin actions are blocked
- failed high-impact changes are recoverable
- secret values are never disclosed
- diagnostics and change history are visible

---

## 9. Review Checklist for Settings/Admin Stack

The reviewer must confirm:
- settings domains are explicit and owned
- admin boundaries are explicit
- DAuth controls are integrated for sensitive actions
- enablement and rollout are governed
- secrets are handled safely
- diagnostics and recovery surfaces exist
- tests are declared for critical behavior
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 11 passes for target settings/admin area X only if all below are true.

### 10.1 Ownership correctness
- DOS owns settings/admin framework
- DAuth owns security-sensitive control truth
- products/modules own only their bounded admin domains
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required settings/admin/enablement/rollout/recovery/test artifacts exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- settings can be validated, applied, audited, rolled out, rolled back, and recovered coherently and safely

### 10.4 Handover readiness
- change history, diagnostics, and recovery are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 11 fails if any of the following are true:
- settings are unowned or untyped
- sensitive admin actions bypass DAuth or audit
- no rollback/recovery model exists for high-impact changes
- raw secrets are exposed
- diagnostics/change history are absent
- required artifact classes were skipped
- scope widened outside settings/admin layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 11 must update the as-built ledger with:
- settings/admin folders/services created or normalized
- domain model, admin action model, enablement/rollback status
- diagnostics and recovery status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with settings/admin-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 11, the next patch should be:

**Patch 12 — Operations, Observability, and As-Built Handover Stack**

because after settings/admin, the platform needs the final operational, telemetry, incident, release, and end-state handover control blueprint.

---

## 15. One-Line Use Instruction

Use Patch 11 to compare the current settings/admin implementation against the full canonical target, classify every settings/admin-layer gap, build only the missing settings/admin artifacts, validate against settings/admin pass/fail rules, and update the as-built ledger.

---

# Patch 11 Addendum — Config Architecture Freeze and Consolidation Mandate

## A.0 Addendum Identity

### A.0.1 Addendum name
**Patch 11 Addendum — Config Architecture Freeze and Consolidation Mandate**

### A.0.2 Addendum class
This is an **Architecture Freeze Addendum** to Patch 11.

It is simultaneously:
- a current-state audit finding
- an architectural freeze directive
- a consolidation implementation mandate
- a migration plan
- a security remediation order

### A.0.3 Addendum purpose
This addendum documents the **deep audit findings** of the platform's configuration architecture, freezes one non-negotiable architectural rule, defines the canonical config taxonomy, establishes the consolidation target, and mandates the migration sequence.

### A.0.4 Authority
This addendum has the same authority as Patch 11. No later implementation may contradict it.

---

## A.1 The Frozen Rule

> **No component may mutate configuration unless the resulting value is visible through the canonical runtime resolver.**

This single rule is **non-negotiable** and **retroactive**. Any existing code that violates it is classified as a **production blocker** and must be remediated.

### What this rule kills
- JSON-file-backed admin config writes (`platform-config.service.ts` reading/writing `config/*.json`)
- DB config tables that are never read by the canonical resolver
- `process.env` reads scattered across 78+ source files bypassing the resolver
- Runtime overrides stored in tables the resolver does not query
- Feature flags evaluated by hardcoded tier definitions instead of DB-driven resolution
- Security config with its own parallel cache bypassing the settings resolver

---

## A.2 Current-State Audit Findings

### A.2.1 Eight parallel config resolution systems identified

| # | System | Location | Storage | Status |
|---|--------|----------|---------|--------|
| 1 | **UnifiedConfigService** | `platform/dos/settings/unified-config.service.ts` | 5-layer resolution (env → deployment → tenant DB → product registry → platform defaults) | **CANONICAL — keep and extend** |
| 2 | **SettingsResolver** | `platform/dos/settings/settings-resolver.service.ts` | `tenant_settings` table (6-scope hierarchy: platform → product → tenant → workspace → module → user) | **CANONICAL — keep as persistence layer for #1** |
| 3 | **TenantConfigService** | `platform/dos/tenancy/tenant-config.service.ts` | `tenant_config_versions` table (versioned + rollback) | **KEEP — wire as versioning layer for #2** |
| 4 | **PlatformConfigService** (admin) | `modules/admin/services/platform-config.service.ts` | JSON files on disk (`config/*.json`) | **RETIRE — violates frozen rule** |
| 5 | **SecurityConfigService** | `modules/admin/services/security-config.service.ts` | `tenant_security_config` table + in-memory cache | **ABSORB — merge as scoped namespace in #2** |
| 6 | **RuntimeConfigService** | `platform/dos/settings/runtime-config.service.ts` | `runtime_config` table + cache | **ABSORB — merge into #2 scope=runtime** |
| 7 | **TenantSettingsService** | `platform/dos/settings/tenant-settings.service.ts` | `tenant_custom_settings` table | **ABSORB — already redundant with #2** |
| 8 | **RuntimeOverridesService** | `platform/dos/config/registry/runtime-overrides.service.ts` | `settings` table (scope=runtime_override) + memory cache | **ABSORB — merge into #2 scope=runtime_override** |

### A.2.2 Eleven config DB tables identified

| Table | Schema | Owner | Fate |
|-------|--------|-------|------|
| `tenant_settings` | tenant | DOS | **KEEP — canonical multi-scope store** |
| `tenant_config_versions` | tenant | DOS | **KEEP — versioning store** |
| `tenant_security_config` | tenant | Admin | **MIGRATE — rows move to `tenant_settings` scope=security** |
| `tenant_custom_settings` | tenant | DOS | **MIGRATE — rows move to `tenant_settings`** |
| `runtime_config` | public | DOS | **MIGRATE — rows move to `tenant_settings` scope=runtime** |
| `runtime_overrides` | tenant | Admin | **MIGRATE — rows move to `tenant_settings` scope=runtime_override** |
| `platform_config` | master | DOS | **KEEP — platform-wide tuning (event bus limits, cache TTLs)** |
| `platform_operation_config` | tenant | DOS | **MIGRATE — rows move to `tenant_settings` scope=platform** |
| `admin_configs` | tenant | Admin | **MIGRATE — rows move to `tenant_settings` scope=module, module_code=admin** |
| `admin_settings` | tenant | Admin | **MIGRATE — rows move to `tenant_settings`** |
| `admin_tenant_configs` | tenant | Admin | **MIGRATE — rows move to `tenant_settings` scope=tenant** |

### A.2.3 Three supplementary systems

| System | Location | Issue | Fate |
|--------|----------|-------|------|
| **FeatureFlagService** | `platform/dos/config/feature-flag.service.ts` | Correct — DB-driven, own tables, no overlap | **KEEP as-is** |
| **TierService** | `modules/admin/services/tier.service.ts` | Hardcoded tier definitions in source code | **REFACTOR — move definitions to `platform_config` table** |
| **production-enhancements.config.ts** | `backend/src/config/` | 439 lines of hardcoded values duplicating DB-stored config | **RETIRE — replace reads with `UnifiedConfigService.resolve()`** |

### A.2.4 Config boundary contract asset
The codebase already contains `platform/contracts/config-boundary.ts` (372 lines) with a complete `CONFIG_OWNERSHIP_MAP` classifying every env var by owner (`environment`, `deployment`, `tenant`, `product`, `ai_provider`). This is **purely declarative** — no service reads it at runtime. The consolidation must make this the **enforcement source**.

### A.2.5 The core contradiction
The admin-facing config management routes (`platform-config.routes.ts`) read/write **JSON files on disk** via `platform-config.service.ts`. The actual runtime resolution (`UnifiedConfigService`) never reads those files. An admin changing config in the UI changes a JSON file that has zero effect on runtime behavior.

### A.2.6 platform-db.config.ts duplication
The DB connection config file `platform-db.config.ts` exists in **three identical copies**:
- `backend/src/config/database/platform-db.config.ts` (194 lines)
- `packages/dos-db/src/config.ts` (221 lines)
- `backend/src/config/platform-db.config.ts` (if present)

Canonical source must be `packages/dos-db/src/config.ts`. All others must re-export.

### A.2.7 Security P0: committed secrets
The file `backend/.env` contains **live production secrets** committed to the repository:
- Database passwords (line 15)
- Redis passwords (line 22)
- JWT secrets (lines 26-27)
- SMTP passwords (line 46)
- Azure client secrets (line 58)
- API keys for 10+ AI providers (lines 66, 85, 98-99)
- Bot service secret keys (lines 76-77)

These must be treated as **compromised** and rotated immediately.

---

## A.3 Canonical Config Taxonomy

Before merging storage, every config value must be classified into exactly one of these six categories. Values that do not fit must be reclassified or rejected.

| Category | Definition | Mutability | Storage | Example |
|----------|-----------|------------|---------|---------|
| **setting** | A named preference or behavior toggle with scope, validation, inheritance, and audit trail | Mutable via API | `tenant_settings` (multi-scope) | `bootstrap.session_timeout_minutes`, `notification.email_enabled` |
| **secret** | A credential, key, or token that must never be exposed raw | Mutable via secret manager only | Azure Key Vault / HSM / encrypted vault | `JWT_SECRET`, `ANTHROPIC_API_KEY`, `PG_PASSWORD` |
| **entitlement** | A license-governed capability bound to a subscription tier | Mutable via license management only | `tenant_module_entitlements` | `grc_enabled`, `qiyas_enabled`, `licensed_modules` |
| **feature_flag** | A boolean toggle governing gradual rollout or experimentation | Mutable via feature flag API | `feature_flags` + `tenant_feature_flag_overrides` | `admin.multi_tenant`, `ai.copilot_v2` |
| **runtime_tuning** | An operational parameter affecting performance, thresholds, or circuit breakers | Mutable via admin API, hot-reloadable | `platform_config` (master) or `tenant_settings` scope=runtime | `event_bus.max_in_flight`, `cache.descriptor_ttl_ms` |
| **policy** | A business rule or compliance constraint governing behavior | Mutable via approval-gated workflow | `tenant_config_versions` (versioned) | `riskScoringModel`, `exceptionPolicy`, `approvalRouting` |

### Taxonomy enforcement rule
Any config mutation endpoint must declare which taxonomy category it operates on. Mixed-category stores are prohibited. The `tenant_settings` table uses the `scope` column to enforce this.

---

## A.4 Consolidation Target State

### A.4.1 Config resolution: one service
All config resolution flows through `UnifiedConfigService`. No component reads config from any other source.

```text
UnifiedConfigService.resolve(key, options)
  ├── 1. Environment (process.env) — highest precedence for infrastructure
  ├── 2. Deployment (deployment-profile) — topology and mode
  ├── 3. Tenant (SettingsResolver → tenant_settings DB) — per-customer overrides
  │     └── Scope chain: user → module → workspace → tenant → product → platform
  ├── 4. Product (ProductRegistry) — product defaults
  └── 5. Platform (hardcoded defaults) — neutral fallbacks
```

### A.4.2 Settings persistence: one scoped store
All mutable settings persist in `tenant_settings` with the existing 6-scope hierarchy. No parallel settings tables.

| Scope | When Used |
|-------|-----------|
| `platform` | Platform-wide defaults |
| `product` | Product-specific defaults |
| `tenant` | Tenant-specific overrides |
| `workspace` | Workspace-level settings |
| `module` | Module-specific settings |
| `user` | User preferences |

### A.4.3 Secrets persistence: secret manager only
All secrets flow through `secrets-bootstrap.ts` → Azure Key Vault in production. Development uses `.env` (never committed). No JSON files store secrets. No admin API writes secrets to filesystem.

### A.4.4 Feature flags / entitlements: one ownership model
- **Feature flags**: `FeatureFlagService` reads `feature_flags` + `tenant_feature_flag_overrides` tables. No hardcoded tier lists.
- **Entitlements**: `TenantEntitlementsResolver` reads `tenant_module_entitlements`. Tier definitions move from hardcoded `TIER_DEFINITIONS` to `platform_config` table.

### A.4.5 Admin UI: reads and writes only through canonical API
The admin config panel calls `/api/config-center/*` routes which delegate to `UnifiedConfigService` for reads and `SettingsResolver.upsertSetting()` for writes. No JSON file reads. No parallel DB queries.

### A.4.6 Audit: every mutation captures full context
Every config mutation records:
- `actor` (who changed it)
- `scope` (at what level)
- `old_value` (previous value)
- `new_value` (new value)
- `source` (which API/service triggered it)
- `reason` (optional — why the change was made)
- `timestamp`

### A.4.7 Validation: schema-enforced at mutation and startup
- `CONFIG_OWNERSHIP_MAP` from `config-boundary.ts` becomes the runtime schema source
- Every setting key must have a registered owner, sensitivity class, and validation rule
- `env-check.ts` validates **all** entries in `CONFIG_OWNERSHIP_MAP`, not just 6

### A.4.8 Observability: every resolved value explains its origin
`UnifiedConfigService.resolveWithMetadata()` already returns `{ value, source, overridenLayers }`. This metadata must be exposed to the admin UI for config debugging.

---

## A.5 Migration Plan

### Phase 1: Wire admin routes to UnifiedConfigService (Week 1-2)
1. **Retire** `admin/services/platform-config.service.ts` (JSON file reader)
2. Create new `/api/config-center` routes that delegate to `UnifiedConfigService`
3. **Retire** `admin/routes/runtime-overrides.routes.ts` — redirect to `RuntimeConfigService` in DOS
4. **Merge** `SecurityConfigService` as scoped namespace within `SettingsResolver` (scope=`security`)
5. **Merge** `TenantSettingsService` into `SettingsResolver` (already supports user/module/workspace scope)

### Phase 2: Enforce config-boundary.ts at runtime (Week 2-3)
1. Make `CONFIG_OWNERSHIP_MAP` the runtime validation gate
2. Add Zod schema validation for each config section
3. Wire `env-check.ts` to validate all entries in `CONFIG_OWNERSHIP_MAP`
4. Reject writes to unknown keys

### Phase 3: Unified admin config API (Week 3-4)
1. `/api/config-center/resolve` — resolve a key with full metadata (value, source, overridden layers)
2. `/api/config-center/settings` — CRUD for scoped settings via `SettingsResolver`
3. `/api/config-center/compare` — compare config between tenants
4. `/api/config-center/export` / `/api/config-center/import` — config portability
5. `/api/config-center/audit` — change history with actor, scope, old/new values
6. Add `setAuditData()` on all mutation endpoints

### Phase 4: Secret management hardening (Week 4-5)
1. Remove all secrets from committed `.env` file
2. Create `.env.example` with empty values, add `.env` to `.gitignore`
3. Route all secret reads through `secrets-bootstrap.ts` → Azure Key Vault
4. Remove `rotateSecret()` filesystem writes — replace with KV rotation
5. Rotate all compromised secrets

### Phase 5: Table consolidation (Week 5-6)
1. Migrate rows from `tenant_security_config` → `tenant_settings` (scope=security)
2. Migrate rows from `tenant_custom_settings` → `tenant_settings`
3. Migrate rows from `runtime_config` → `tenant_settings` (scope=runtime)
4. Migrate rows from `runtime_overrides` → `tenant_settings` (scope=runtime_override)
5. Migrate rows from `admin_configs` → `tenant_settings` (scope=module, module_code=admin)
6. Migrate rows from `admin_settings` → `tenant_settings`
7. Migrate rows from `admin_tenant_configs` → `tenant_settings` (scope=tenant)
8. Migrate rows from `platform_operation_config` → `tenant_settings` (scope=platform)
9. Move tier definitions from hardcoded `TIER_DEFINITIONS` → `platform_config` table
10. Deprecate migrated tables (soft-delete, keep for rollback window)

### Migration safety rule
**Unify reads before writes.** The resolver must read from both old and new tables during migration. Only after all consumers use the resolver can old tables be deprecated.

---

## A.6 Surviving Config Services After Consolidation

| Service | Role | Tables |
|---------|------|--------|
| **UnifiedConfigService** | All config resolution (env → deployment → tenant → product → platform) | Delegates to SettingsResolver for DB layer |
| **SettingsResolver** | DB-backed multi-scope settings persistence (platform/product/tenant/workspace/module/user) | `tenant_settings` (single table, all scopes) |
| **TenantConfigService** | Config versioning with rollback for policy-class configs (org structure, RACI, approval routing) | `tenant_config_versions` |
| **FeatureFlagService** | Feature flag evaluation with tenant overrides | `feature_flags` + `tenant_feature_flag_overrides` |
| **SecretsBootstrap** | Secret injection from Azure Key Vault at startup | Azure Key Vault (no DB table) |

Everything else becomes a **consumer** of these five services, not a parallel system.

---

## A.7 Forbidden Patterns (Config-Specific)

The following patterns are **permanently prohibited** after this addendum is adopted:

1. **JSON-file config storage** — No config value may be stored in or read from a JSON file on the filesystem at runtime
2. **Parallel config tables** — No new config table may be created without explicit architecture approval and registration in the consolidation plan
3. **Direct `process.env` reads outside `UnifiedConfigService`** — Infrastructure-only reads (DB connection, Redis connection) in `platform-db.config.ts` are exempt; all other env reads must go through the resolver
4. **Hardcoded tier/feature definitions** — All tier definitions, feature lists, and entitlement rules must be DB-driven
5. **Secret values in admin API responses** — Secret metadata (exists, rotation date, binding status) may be exposed; raw values never
6. **Config writes without audit** — Every config mutation must emit an audit event with actor, scope, old value, new value
7. **Config reads that cannot explain their source** — Every config read in production must be traceable to the resolver layer that provided the value

---

## A.8 Config Center Module Reference

The full end-to-end specification for the Config Center module is defined in:

**[`module-patch-58-config-center-end-to-end.md`](module-patch-58-config-center-end-to-end.md)** (MP-58)

This module patch defines the complete backend services, routes, DB migrations, frontend surfaces, i18n, DAuth integration, and test requirements for the unified config center.

---

## A.9 Addendum Fail Conditions

This addendum fails if any of the following remain true after implementation:

1. Admin config routes still read/write JSON files
2. More than 2 config persistence tables exist (excluding `platform_config` master, `feature_flags`, and `tenant_module_entitlements`)
3. `UnifiedConfigService` is not the single entry point for all config reads
4. Committed `.env` file still contains live secrets
5. `env-check.ts` validates fewer than 50% of env vars in `CONFIG_OWNERSHIP_MAP`
6. Config mutations occur without audit trail
7. `platform-db.config.ts` still exists in more than one canonical location
8. Tier definitions remain hardcoded in TypeScript source

---

# Patch 12 — Operations, Observability, Reliability, Incident Response, and As-Built Handover Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 12 — Operations, Observability, Reliability, Incident Response, and As-Built Handover Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **operations stack** across DOS, DAuth, products, modules, workflows, AI agents, integrations, and runtime administration.

It tells an agent exactly how to:
- inspect operational area X
- compare the current implementation against the canonical operations target
- classify every operations-layer gap
- know exactly what telemetry, logs, traces, metrics, health contracts, reliability controls, alerting, diagnostics, runbooks, incident workflows, recovery controls, postmortem structures, release-health checks, and handover artifacts must exist
- know exactly what makes the platform operationally production-grade instead of merely runnable

### 0.4 Patch role in the patch library
This patch is the canonical operations and handover enforcement document.

It connects:
- DOS runtime health and topology
- DAuth security and control telemetry
- product and module health surfaces
- workflow and AI execution diagnostics
- admin, recovery, and rollout safety
- handover quality at the end of delivery

No later patch may redefine operational production-readiness in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **operations, observability, reliability, incident response, and handover object model**.

### 1.2 Target object types
This patch applies to:
- health contract object
- telemetry object
- metric object
- log object
- trace object
- SLI/SLO object
- alert object
- diagnostic object
- incident object
- runbook object
- recovery object
- reliability guard object
- deployment/runtime verification object
- operational dashboard object
- as-built handover object
- postmortem object
- ownership and escalation object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- product business contracts
- DAuth internal permission logic
- dynamic UI engine internals
- module business workflows except as operational dependencies
- infrastructure vendor-specific setup detail beyond required operational contracts

### 1.4 Operations definition
Operations stack is the **production control and visibility layer** that makes the platform observable, diagnosable, recoverable, supportable, and handover-ready.

Operations stack is not:
- a handful of logs
- a single health endpoint
- infrastructure monitoring only
- dev-only debugging screens
- “we can inspect the database if needed”

Production-grade operations requires:
- consistent signals
- explicit health contracts
- service and workflow visibility
- controlled recovery
- incident discipline
- clear ownership
- handover artifacts that match reality

---

## 2. Canonical Operations Target Blueprint

## 2.1 Operations responsibilities

### A. Runtime health and readiness
- platform readiness
- service readiness
- dependency readiness
- startup health
- degraded-mode visibility
- per-product readiness
- per-module readiness
- DAuth readiness
- workflow engine readiness
- agent runtime readiness
- integration readiness

### B. Telemetry model
- structured logs
- metrics
- distributed traces
- event health signals
- queue/worker health
- workflow execution telemetry
- agent run telemetry
- admin-action telemetry
- configuration and rollout telemetry
- security-sensitive telemetry with safe redaction

### C. Reliability model
- retry policies
- circuit breaking where needed
- idempotency expectations
- timeout policies
- dead-letter handling
- stuck-instance detection
- backpressure awareness
- rate and capacity visibility
- dependency failure handling
- graceful degradation rules

### D. Alerting and diagnostics
- SLI/SLO definitions
- alert thresholds
- page/warn/info classes
- operator diagnostics
- correlation and trace lookup
- failed action diagnostics
- workflow failure diagnostics
- agent failure diagnostics
- security event diagnostics
- rollout and config failure diagnostics

### E. Incident and recovery model
- incident detection
- incident severity model
- ownership and responder routing
- incident timeline capture
- recovery procedures
- safe rollback
- emergency containment
- postmortem creation
- customer/tenant impact capture
- recurrence prevention tracking

### F. As-built handover model
- actual deployed topology summary
- actual control ownership summary
- actual service/package ownership summary
- actual runtime dependencies
- known limitations
- runbooks
- monitoring maps
- alert maps
- recovery procedures
- cutover notes
- unresolved risks

---

## 2.2 Operations ownership boundaries

### DOS owns directly
- platform health framework
- runtime diagnostics backbone
- telemetry conventions
- incident topology and escalation model
- reliability primitives
- operational dashboards and service maps
- as-built handover framework
- runbook framework
- platform-level recovery and rollback framework

### DAuth owns directly
- security/audit-sensitive telemetry
- auth and control-plane health
- security incident signals
- access-control decision diagnostics
- sensitive admin action auditing

### Product owns directly
- product health surfaces
- product operational dashboards
- product runbooks
- product reliability rules beyond DOS primitives
- product incident ownership details

### Module owns directly
- module health signals
- module diagnostics
- module runbooks
- module recovery actions within platform rules

### Operations stack must not implement
- a shadow business logic engine
- raw business truth outside canonical owners
- dev-only undocumented procedures as official recovery model
- hidden privileged recovery paths

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/operations/
  health/
  telemetry/
  logging/
  metrics/
  tracing/
  reliability/
  alerts/
  diagnostics/
  incidents/
  recovery/
  runbooks/
  handover/
  contracts/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `health/`
Health endpoints, readiness checks, dependency and degraded-state evaluators.

#### `telemetry/`
Shared signal model and telemetry publishing.

#### `logging/`
Structured logging policies, redaction, correlation, event enrichment.

#### `metrics/`
Counters, gauges, histograms, SLI/SLO support, aggregation.

#### `tracing/`
Correlation, distributed traces, span rules, cross-service linkage.

#### `reliability/`
Retry, timeout, circuit breaker, dead-letter, backpressure, stuck-instance policies.

#### `alerts/`
Alert contracts, routing classes, severity mapping.

#### `diagnostics/`
Diagnostics APIs, operator introspection, topology and failure surfaces.

#### `incidents/`
Incident lifecycle model, incident records, responder and severity mapping.

#### `recovery/`
Recovery flows, emergency disable, rollback coordination, safe intervention.

#### `runbooks/`
Operational instructions and machine-readable/runbook-linked metadata.

#### `handover/`
As-built ledgers, release notes, support map, unresolved-risk register.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/operations/
  dashboards/
  diagnostics/
  health/
  incidents/
  recovery/
  runbooks/
  handover/
  contracts/
  index.ts
```

### Rule
Operational UI must provide production-grade visibility and controlled recovery.
It must not become a hidden super-admin bypass or an untyped diagnostics toy.

---

## 2.5 Required health model

Every major runtime domain must define:
- liveness
- readiness
- dependency health
- degraded state
- partial failure signals
- startup completion signal
- operational availability classification

### Domains requiring health contracts
- DOS platform core
- DAuth
- each active product
- each active module
- workflow engine
- agent runtime
- integrations/connectors
- rollout/config pipeline
- queue/worker infrastructure where used

### Health law
Health is not binary only.
A system must report meaningful operational state and degraded conditions.

---

## 2.6 Required telemetry model

Every important runtime action must emit telemetry fit for operations.

### Required telemetry families
- request telemetry
- service startup telemetry
- provisioning telemetry
- workflow telemetry
- AI-agent telemetry
- auth/security telemetry
- admin/settings telemetry
- integration/connector telemetry
- retry/failure/dead-letter telemetry
- recovery/rollback telemetry

### Telemetry law
Telemetry must be structured, correlated, and safe.
No sensitive secrets or uncontrolled personal data in logs.

---

## 2.7 Required logging model

Logs must define:
- correlation id
- causation id where relevant
- tenant id when applicable
- workspace id when applicable
- product/module context when applicable
- actor/principal when safe and appropriate
- action/outcome
- severity
- failure reason
- redaction class

### Logging law
No production-critical area may rely on ad hoc string logs only.

---

## 2.8 Required metrics and SLO model

The system must define:
- service-level metrics
- workflow throughput/failure metrics
- auth failure metrics
- approval and queue latency metrics
- agent run metrics
- product/module readiness metrics
- rollout failure metrics
- incident metrics
- top operational pain metrics

### SLO law
Critical services and journeys must define explicit success/latency/error expectations.

---

## 2.9 Required incident model

Every incident model must define:
- incident id
- incident class
- severity
- affected layers
- affected tenants/products/modules
- detection source
- owner
- responders
- timeline
- mitigations
- resolution state
- follow-up actions
- postmortem linkage

### Incident law
Incidents are first-class operational objects, not just chat messages or tickets.

---

## 2.10 Required recovery model

Recovery must define:
- who may intervene
- what actions are allowed
- what approval is needed
- rollback procedures
- restart/replay/retry procedures
- stuck-state handling
- tenant-safe containment
- product/module disablement where required
- audit trail
- communication expectations

### Recovery law
No raw database editing should be the primary official recovery procedure.

---

## 2.11 Required runbook and handover model

Every major operational area must define:
- operating owner
- escalation owner
- dependency map
- health signals
- dashboards
- alert sources
- recovery steps
- rollback steps
- common failure modes
- known caveats
- support contacts or owner role

### Handover law
As-built handover must reflect what is actually deployed, not what was originally designed.

---

## 3. Current-State Audit Method

An agent auditing operational area X must perform the following checks.

## 3.1 Health audit
Verify:
- liveness/readiness/degraded-state contracts exist
- health is available per critical runtime domain
- startup and dependency failures are surfaced

## 3.2 Telemetry audit
Verify:
- logs, metrics, traces, and events are emitted consistently
- correlation exists
- redaction rules exist
- no critical areas are telemetry-dark

## 3.3 Reliability audit
Verify:
- timeout/retry/idempotency/dead-letter policies exist
- backpressure or stuck-state detection exists where relevant
- recovery safety exists

## 3.4 Alerting and diagnostics audit
Verify:
- SLO/threshold definitions exist
- alerts are classified by severity
- operators have diagnostics surfaces
- failure causes are not opaque

## 3.5 Incident audit
Verify:
- incidents are structured
- severity and ownership rules exist
- timeline and resolution tracking exist
- postmortems are linked where required

## 3.6 Recovery audit
Verify:
- rollback and intervention paths are defined
- recovery actions are governed and auditable
- no hidden privileged procedures are the real operational model

## 3.7 Handover audit
Verify:
- as-built ledgers exist
- runbooks exist
- topology/dependency notes exist
- unresolved risks are captured

## 3.8 Test audit
Verify:
- health, telemetry, alerting, recovery, and incident-critical paths are tested

---

## 4. Gap Classification for Operations Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required health contract, telemetry family, alert, runbook, incident model, recovery procedure, or handover artifact does not exist.

### 4.2 Incomplete
Artifact exists but lacks required fields or behavior.
Examples:
- health endpoint exists but no degraded-state signaling
- logs exist but lack correlation ids
- runbook exists but no rollback procedure

### 4.3 Duplicate
Two or more operational systems own the same concern.
Examples:
- duplicate incident registers
- duplicate dashboards as competing truth
- duplicate health definitions with conflicting criteria

### 4.4 Wrong Owner
Concern belongs to DOS ops, DAuth ops, product ops, or module ops but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- business logic embedded in diagnostics engine
- UI-only operational truth with no backend source
- hidden script as official recovery path

### 4.6 Legacy Carryover
Old monitoring, legacy alerts, old recovery steps, or stale handover docs still drive operations.

### 4.7 Forbidden Pattern
Examples:
- no correlation
- no redaction
- no rollback path
- no incident ownership
- no handover ledger
- manual SQL as official recovery plan

### 4.8 Production Blocker
Examples:
- cannot detect degraded state
- cannot safely recover a failed rollout
- cannot determine who owns an incident
- critical runtime areas have no diagnostics

### 4.9 Handover Blocker
Examples:
- no runbooks
- no as-built state
- no known-risk register
- no support or escalation ownership map

---

## 5. Required Artifact Matrix

Every operations pass must address all artifact classes below.

| Artifact Class | Required in Patch 12 | Examples |
|---|---|---|
| Files/Folders | Yes | health, telemetry, incidents, recovery, handover |
| Services | Yes | health service, alert service, incident service, handover ledger service |
| Contracts/Schemas | Yes | health contract, incident contract, recovery contract |
| Tables/Data | Yes | incident logs, runbook metadata, handover ledgers, telemetry metadata |
| APIs | Yes | health, diagnostics, incidents, recovery, handover |
| Events | Yes | incident raised, degraded, recovered, rollout failed events |
| Workflows/Lifecycle | Yes | incident lifecycle, recovery lifecycle, postmortem follow-up |
| UI/Admin Surfaces | Yes | operational dashboards, diagnostics, incident panels, handover views |
| Audit/Logs | Yes | structured logs, admin recovery logs, incident timeline logs |
| Tests | Yes | health, diagnostics, recovery, alerting, incident tests |
| As-Built Updates | Yes | operational reality captured |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If health model is weak
### Build this
Create:
- health contracts per critical runtime domain
- liveness, readiness, degraded-state signaling
- dependency-aware readiness checks

### Do not build this
- one generic “ok” endpoint as the only health truth
- silent startup or dependency failures

## 6.2 If telemetry is weak
### Build this
Create:
- structured logging policy
- metrics registry
- tracing policy
- workflow/agent/auth/admin telemetry families
- correlation id propagation

### Do not build this
- free-form logs only
- metrics with no ownership or naming discipline
- traces missing tenant/product/module context where appropriate

## 6.3 If reliability model is weak
### Build this
Create:
- retry and timeout rules
- dead-letter/stuck-instance handling
- circuit breaking where applicable
- idempotency expectations
- safe recovery hooks

### Do not build this
- hidden retries with no visibility
- unbounded retry storms
- recovery dependent on manual tribal knowledge only

## 6.4 If incident model is weak
### Build this
Create:
- incident contract
- severity model
- ownership routing
- response/timeline tracking
- postmortem linkage

### Do not build this
- incident response defined only in chat or ad hoc tickets
- no accountable owner

## 6.5 If recovery and rollback are weak
### Build this
Create:
- recovery services
- rollback paths
- recovery approvals where needed
- operator-safe interventions
- audit on interventions

### Do not build this
- raw DB edits as the primary official recovery path
- hidden scripts with no approval/audit

## 6.6 If handover is weak
### Build this
Create:
- as-built ledger
- runbook registry
- support and escalation matrix
- known-risk register
- topology and dependency maps

### Do not build this
- stale design docs pretending to be as-built truth
- handover with no operational ownership map

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/operations/
  health/platform-health.service.ts
  telemetry/telemetry.service.ts
  logging/structured-logger.ts
  metrics/metrics-registry.service.ts
  tracing/trace-context.service.ts
  incidents/incident.service.ts
  recovery/recovery.service.ts
  runbooks/runbook-registry.service.ts
  handover/as-built-ledger.service.ts
  diagnostics/diagnostics.controller.ts
  contracts/operations.types.ts
  index.ts
```

## 7.2 Example health contract

```ts
export interface RuntimeHealthStatus {
  serviceCode: string;
  state: 'healthy' | 'degraded' | 'unhealthy' | 'starting';
  dependencies: Array<{ name: string; state: string }>;
  checkedAt: string;
}
```

## 7.3 Example incident contract

```ts
export interface IncidentRecord {
  incidentId: string;
  severity: 'sev0' | 'sev1' | 'sev2' | 'sev3';
  owner: string;
  summary: string;
  affectedAreas: string[];
  openedAt: string;
}
```

## 7.4 Example test expectations

```ts
it('marks workflow runtime as degraded when stuck execution threshold is breached', () => {
  // degraded state example
});

it('records a governed recovery action with full audit context', () => {
  // recovery audit example
});
```

---

## 8. Tests Required for Operations Stack

### 8.1 Unit tests required
- health evaluators
- log redaction
- metric naming and aggregation
- alert threshold evaluation
- incident severity routing
- recovery policy logic

### 8.2 Integration tests required
- health/readiness endpoints
- telemetry propagation
- incident creation and escalation
- recovery/rollback execution
- runbook and handover record generation

### 8.3 Contract tests required
- health contracts
- incident contracts
- diagnostics contracts
- recovery contracts
- handover ledger contracts

### 8.4 Operational smoke tests required
- platform surfaces coherent health state
- major failures are diagnosable
- incidents can be opened and owned
- recovery actions are auditable
- handover ledger reflects current runtime composition

---

## 9. Review Checklist for Operations Stack

The reviewer must confirm:
- health/readiness/degraded-state model is explicit
- telemetry is structured and correlated
- reliability and recovery controls exist
- incident model is explicit and owned
- diagnostics and operational dashboards exist
- runbooks and as-built handover artifacts exist
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 12 passes for target operational area X only if all below are true.

### 10.1 Ownership correctness
- DOS owns the operations backbone
- DAuth, product, and module layers expose their operational surfaces through correct ownership boundaries
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required health/telemetry/incident/recovery/handover/test artifacts exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- system can be monitored, diagnosed, alerted, recovered, and handed over coherently

### 10.4 Handover readiness
- runbooks, support ownership, and as-built status are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 12 fails if any of the following are true:
- critical runtime areas have no meaningful health or diagnostics
- incident ownership is undefined
- recovery/rollback is unofficial or hidden
- no as-built ledger or runbook model exists
- logs/metrics/traces are uncorrelated or unsafe
- required artifact classes were skipped
- scope widened outside operations/handover layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 12 must update the as-built ledger with:
- health/telemetry/incident/recovery/handover folders and services created or normalized
- runtime diagnostic coverage status
- runbook and support ownership status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with operations-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 12, the next patch should be:

**Patch 13 — Integration, Connector, External API, and Ecosystem Stack**

because after operations and handover, the platform needs the full blueprint for controlled external-system participation, partner systems, connectors, and cross-boundary contracts.

---

## 15. One-Line Use Instruction

Use Patch 12 to compare the current operations and handover implementation against the full canonical target, classify every operations-layer gap, build only the missing operations artifacts, validate against operations pass/fail rules, and update the as-built ledger.

# Patch 13 — Integration, Connector, External API, and Ecosystem Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 13 — Integration, Connector, External API, and Ecosystem Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **integration and ecosystem stack** across DOS, DAuth, products, modules, workflows, AI agents, connectors, partner systems, external APIs, and event bridges.

It tells an agent exactly how to:
- inspect integration surface X
- compare current implementation against the canonical integration target
- classify every integration-layer gap
- know exactly what connector contracts, credential boundaries, sync models, rate controls, event bridges, ingestion pipelines, outbound delivery guarantees, external API surfaces, error handling, observability, admin controls, and tests must exist
- know what belongs to DOS, what belongs to DAuth, what belongs to products/modules, and what must never be hidden inside ad hoc scripts or one-off endpoints

### 0.4 Patch role in the patch library
This patch is the canonical integration and ecosystem enforcement document.

It connects:
- DOS runtime and event backbone
- DAuth security and external identity/control boundaries
- products/modules needing inbound or outbound exchange
- workflows and AI agents that consume or trigger integrations
- operational and handover requirements for external-system participation

No later patch may redefine external-system architecture in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **integration, connector, external API, and ecosystem object model**.

### 1.2 Target object types
This patch applies to:
- connector object
- integration definition object
- external API object
- inbound webhook object
- outbound webhook or delivery object
- sync job object
- import/export object
- mapping/transform object
- credential binding object
- event bridge object
- partner contract object
- external identity/scope object
- failure/retry/dead-letter object
- integration admin object
- integration observability object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- generic DOS event backbone internals
- DAuth internal access engine logic
- product business logic beyond integration participation
- UI feature/component rules beyond required integration surfaces

### 1.4 Integration definition
An integration stack is the **governed external boundary system** through which the platform safely exchanges data, events, commands, identity, and artifacts with outside systems.

It is not:
- a set of ad hoc REST calls
- hidden cron jobs
- secret-bearing one-off scripts
- external-system logic scattered across random modules
- unowned webhooks with no audit or retry model

---

## 2. Canonical Integration Target Blueprint

## 2.1 Integration responsibilities

### A. Connector registry
- connector code
- connector type
- owner layer
- target external system
- supported capabilities
- auth method
- sync modes
- event bridge capabilities
- rate/throughput constraints
- operational owner

### B. External contract model
- inbound contract definitions
- outbound contract definitions
- webhook contracts
- polling contracts
- file-based import/export contracts
- event bridge contracts
- mapping/transform contracts
- versioning and compatibility rules

### C. Credential and trust model
- secret/reference handling
- token lifecycle handling
- OAuth or delegated auth handling where applicable
- certificate/signature verification where applicable
- tenant-scoped bindings
- environment separation
- rotation and revoke paths
- audit visibility

### D. Runtime sync and delivery model
- pull sync
- push delivery
- event-driven ingestion
- batch import/export
- retry/backoff
- dead-letter or quarantine
- idempotency
- replay support where needed
- partial-failure handling

### E. Control integration
- DAuth access gates for connector admin and actions
- external-user or partner-scope handling where needed
- workflow and agent participation boundaries
- approval gating for high-risk outbound actions
- data classification and clearance checks where required

### F. Operations and admin
- connector status
- last success/failure
- sync lag
- throughput/errors
- credential binding status
- paused/quarantined state
- manual replay/retry tools
- mapping diagnostics
- partner visibility where appropriate

---

## 2.2 Integration ownership boundaries

### DOS owns directly
- connector framework
- connector registry
- generic sync/delivery primitives
- credential reference framework
- event bridge framework
- retry/dead-letter primitives
- integration health and diagnostics framework
- integration admin framework

### DAuth owns directly
- external auth/control participation
- external-user scopes where needed
- credential access controls
- admin access controls for connectors
- approval/authority gates for high-risk external actions
- audit of sensitive external actions

### Product owns directly
- product-specific partner contracts
- product-level connector bundles
- product-specific data mappings
- product-specific outbound/inbound semantics

### Module owns directly
- module-specific connector behavior
- module-specific import/export and mapping logic
- module-specific sync workflows
- module-specific operator/admin surfaces

### Integration stack must not implement
- secret exposure in UI or logs
- ad hoc one-off integration logic as production truth
- hidden connector ownership
- unsafely autonomous external writes with no approval/control path where required

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/integrations/
  registry/
  connectors/
  contracts/
  credentials/
  inbound/
  outbound/
  sync/
  mapping/
  events/
  retries/
  quarantine/
  admin/
  diagnostics/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `registry/`
Connector and integration definitions, ownership, capability registration.

#### `connectors/`
Connector implementations and connector abstractions.

#### `contracts/`
External payload contracts, schemas, versioning.

#### `credentials/`
Secret references, token bindings, rotation state, trust metadata.

#### `inbound/`
Webhook receivers, inbound adapters, ingestion handlers.

#### `outbound/`
Outbound delivery services, webhooks, API clients.

#### `sync/`
Polling, sync jobs, batch import/export, reconciliation.

#### `mapping/`
Transformations, mapping rules, field/value normalization.

#### `events/`
Event bridge definitions and event-driven connector participation.

#### `retries/`
Retry/backoff handling.

#### `quarantine/`
Dead-letter, failed payload quarantine, manual review.

#### `admin/`
Connector admin routes and operator controls.

#### `diagnostics/`
Health, lag, last-run, failure reasons, replay visibility.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/integrations/
  registry/
  connectors/
  admin/
  diagnostics/
  mappings/
  replay/
  contracts/
  index.ts
```

### Rule
Frontend integration surfaces must expose safe operator/admin functionality.
They must not expose raw secret values or hidden privileged actions.

---

## 2.5 Required connector registry contract

Every connector must define:
- `connectorCode`
- `name`
- `ownerLayer`
- `ownerCode`
- `externalSystem`
- `authMethod`
- `supportedModes`
- `inboundContracts`
- `outboundContracts`
- `eventBridgeModes`
- `rateLimits`
- `dataClassification`
- `approvalPolicy`
- `adminExposurePolicy`
- `healthPolicy`

### Connector law
No production connector should exist without a canonical registry entry and typed contracts.

---

## 2.6 Required credential model

Every connector/integration requiring trust or auth must define:
- credential type
- scope of use
- rotation policy
- expiry awareness
- reference binding
- validation status
- tenant or environment binding
- audit requirements
- safe metadata exposure rules

### Credential law
Credential handling must be reference-based and governed.
No raw secret storage or display in application UI as authoritative runtime practice.

---

## 2.7 Required sync and delivery model

Every integration must define:
- sync or delivery mode
- frequency or trigger
- idempotency key strategy
- ordering assumptions
- retry policy
- dead-letter/quarantine behavior
- replay policy
- partial failure policy
- reconciliation behavior if needed

### Sync law
No integration may rely on hidden retry loops or invisible data-loss behavior.

---

## 2.8 Required mapping and transformation model

Every integration with data movement must define:
- source contract
- target contract
- mapping layer owner
- validation rules
- normalization rules
- classification/redaction rules
- failure handling

### Mapping law
Mappings must be explicit and testable.
No silent field-dropping or hidden transformation logic as runtime truth.

---

## 2.9 Required external API surface model

For any external-facing API or inbound partner surface, define:
- route/endpoint group
- consumer class
- auth/trust policy
- rate control
- payload schema
- versioning strategy
- failure model
- audit policy
- deprecation policy

### External API law
External surfaces are productized contracts, not incidental controller endpoints.

---

## 2.10 Required operational and admin model

Integration operators/admins must be able to see:
- connector status
- binding status
- last run
- last failure
- lag/backlog
- retry/dead-letter counts
- mapping validation failures
- paused/quarantined state
- replay/retry history
- downstream impact where known

### Integration admin law
Operators must be able to diagnose and recover without database edits or hidden scripts.

---

## 3. Current-State Audit Method

An agent auditing integration surface X must perform the following checks.

## 3.1 Registry audit
Verify:
- connectors are explicitly registered
- owners are explicit
- modes and capabilities are explicit
- contracts are typed

## 3.2 Credential audit
Verify:
- credential handling is safe
- raw secrets are not exposed
- rotation/binding status exists
- access is controlled and audited

## 3.3 Contract audit
Verify:
- inbound/outbound payload contracts exist
- versioning exists where needed
- mappings are explicit and typed

## 3.4 Runtime sync/delivery audit
Verify:
- retries, idempotency, replay, and quarantine rules exist
- failure is visible
- partial failures are handled

## 3.5 Control audit
Verify:
- DAuth gates admin and high-risk external actions
- approval or authority requirements exist where needed
- external-user or partner-scope controls exist where applicable

## 3.6 Diagnostics/admin audit
Verify:
- operators can see status, failures, and replay/retry controls
- no opaque connector behavior exists

## 3.7 Test audit
Verify:
- contracts, mappings, retries, dead-letter, and replay flows are tested

---

## 4. Gap Classification for Integration Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required connector registry, contract, retry path, mapping layer, credential rule, admin surface, or test does not exist.

### 4.2 Incomplete
Artifact exists but lacks required behavior or safety.
Examples:
- connector exists but no replay path
- outbound client exists but no idempotency or retry model
- webhook exists but no versioning or signature verification

### 4.3 Duplicate
Two or more integration systems own the same external boundary.
Examples:
- duplicate connectors
- module-local one-off client plus centralized connector
- multiple mapping layers defining the same transform

### 4.4 Wrong Owner
Concern belongs to DOS connector framework, DAuth control surface, product, or module but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- secrets handled in frontend
- product-specific mapping inside DOS core
- connector-specific auth logic bypassing DAuth controls

### 4.6 Legacy Carryover
Old connectors, old webhook routes, legacy sync jobs, or stale mapping logic still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- raw secrets in logs/UI
- hidden scripts as real connector runtime
- no retry/dead-letter/quarantine
- no typed contracts
- no audit on sensitive external actions

### 4.8 Production Blocker
Examples:
- external writes have no replay or failure visibility
- credentials cannot be rotated safely
- connector status is opaque
- critical integration has no quarantine path

### 4.9 Handover Blocker
Examples:
- no connector owner
- no mapping documentation
- no replay/recovery runbook
- no external contract inventory

---

## 5. Required Artifact Matrix

Every integration pass must address all artifact classes below.

| Artifact Class | Required in Patch 13 | Examples |
|---|---|---|
| Files/Folders | Yes | registry, connectors, mappings, retries, diagnostics |
| Services | Yes | connector registry, sync service, delivery service, replay service |
| Contracts/Schemas | Yes | inbound/outbound payloads, mapping contracts, admin contracts |
| Tables/Data | Yes | connector registry, sync runs, failures, replay queue, credential metadata |
| APIs | Yes | webhooks, external APIs, admin and diagnostics endpoints |
| Events | Yes | inbound/outbound/failed/replayed/quarantined events |
| Workflows/Lifecycle | Yes | replay, approval-gated outbound actions, connector incident flows |
| UI/Admin Surfaces | Yes | connector admin, diagnostics, replay/quarantine, mapping visibility |
| Audit/Logs | Yes | external action logs, credential access logs, replay logs |
| Tests | Yes | contract, mapping, retry, replay, auth, diagnostics tests |
| As-Built Updates | Yes | integration topology, contracts, owners, recovery notes |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If connector registry is weak
### Build this
Create:
- canonical connector registry
- connector capability model
- ownership map
- contract inventory

### Do not build this
- connectors defined only by code placement
- undocumented one-off external clients as production truth

## 6.2 If credentials are unsafe
### Build this
Create:
- credential reference model
- safe metadata views
- rotation and binding status
- access controls and audit hooks

### Do not build this
- raw secret exposure
- secrets hardcoded in code/config committed as runtime truth

## 6.3 If sync/delivery is weak
### Build this
Create:
- idempotency rules
- retries/backoff
- quarantine/dead-letter
- replay
- reconciliation where needed

### Do not build this
- fire-and-forget external writes with no recovery model
- invisible retry loops

## 6.4 If mappings are weak
### Build this
Create:
- explicit mapping layer
- typed transforms
- validation and normalization rules
- mapping diagnostics

### Do not build this
- silent transformations in random services/controllers
- untested field mapping logic

## 6.5 If external surfaces are weak
### Build this
Create:
- external contract registry
- versioning
- auth/trust model
- rate control
- failure model
- audit model

### Do not build this
- external-facing routes with incidental schemas and no lifecycle policy

## 6.6 If operator/admin tooling is weak
### Build this
Create:
- connector health views
- replay/quarantine controls
- binding status views
- failure diagnostics and run history

### Do not build this
- opaque connectors
- recovery dependent on engineering-only scripts

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/integrations/
  registry/connector-registry.service.ts
  credentials/credential-binding.service.ts
  inbound/webhook-ingest.service.ts
  outbound/delivery.service.ts
  sync/sync-runner.service.ts
  mapping/mapping-validator.service.ts
  retries/retry-policy.service.ts
  quarantine/quarantine.service.ts
  diagnostics/integration-diagnostics.service.ts
  contracts/integration.types.ts
  index.ts
```

## 7.2 Example connector contract

```ts
export interface ConnectorDefinition {
  connectorCode: string;
  externalSystem: string;
  authMethod: string;
  supportedModes: string[];
  inboundContracts: string[];
  outboundContracts: string[];
}
```

## 7.3 Example replay result contract

```ts
export interface ReplayResult {
  replayId: string;
  sourceFailureId: string;
  status: 'accepted' | 'rejected' | 'completed' | 'failed';
  reason?: string;
}
```

## 7.4 Example test expectations

```ts
it('quarantines an invalid inbound payload and records full diagnostics', () => {
  // quarantine example
});

it('retries an idempotent outbound delivery without duplicating external side effects', () => {
  // retry/idempotency example
});
```

---

## 8. Tests Required for Integration Stack

### 8.1 Unit tests required
- connector registry validation
- credential binding safety
- mapping validation
- retry and replay logic
- rate control and failure classification

### 8.2 Integration tests required
- webhook ingestion
- outbound delivery
- replay and quarantine flows
- connector admin diagnostics
- DAuth-gated connector actions

### 8.3 Contract tests required
- inbound/outbound payload contracts
- mapping contracts
- replay/quarantine result contracts
- connector admin contracts

### 8.4 Operational smoke tests required
- connector status is visible
- failures enter diagnostics/quarantine correctly
- replay succeeds or fails explicitly
- secrets remain undisclosed
- admin actions are controlled and auditable

---

## 9. Review Checklist for Integration Stack

The reviewer must confirm:
- connectors are explicitly registered
- credential handling is safe
- contracts and mappings are typed
- retry/replay/quarantine exist
- DAuth controls sensitive external actions
- operator/admin diagnostics exist
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 13 passes for target integration surface X only if all below are true.

### 10.1 Ownership correctness
- DOS owns the connector/integration framework
- DAuth owns sensitive control boundaries
- products/modules own their bounded integration semantics
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required connector/contract/credential/retry/admin/test artifacts exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- integrations can authenticate, exchange, retry, quarantine, replay, diagnose, and recover coherently

### 10.4 Handover readiness
- connector owners, contracts, diagnostics, and recovery notes are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 13 fails if any of the following are true:
- connectors exist without canonical registry and contracts
- secrets are exposed or unsafe
- external actions have no retry/replay/quarantine model where needed
- operator/admin visibility is absent
- required artifact classes were skipped
- scope widened outside integration layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 13 must update the as-built ledger with:
- integration folders/services created or normalized
- connector registry/contracts/credential/retry status
- diagnostics and recovery status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with integration-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 13, the next patch should be:

**Patch 14 — Delivery, Quality Engineering, Migration, Cutover, and Release Governance Stack**

because after the ecosystem boundary is defined, the platform needs the final blueprint for how change is delivered, verified, migrated, cut over, and formally released to production.

---

## 15. One-Line Use Instruction

Use Patch 13 to compare the current integration and ecosystem implementation against the full canonical target, classify every integration-layer gap, build only the missing integration artifacts, validate against integration pass/fail rules, and update the as-built ledger.

# Patch 14 — Delivery, Quality Engineering, Migration, Cutover, and Release Governance Stack

## 0. Patch Identity

### 0.1 Patch name
**Patch 14 — Delivery, Quality Engineering, Migration, Cutover, and Release Governance Stack**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- target-state specification
- comparison specification
- implementation specification
- review specification
- handover specification

### 0.3 Patch purpose
This patch defines the full target model for the **delivery stack** that moves the platform from design and implementation into verified, governed, production-grade release and controlled change.

It tells an agent exactly how to:
- inspect delivery or release area X
- compare the current implementation against the canonical delivery target
- classify every delivery-layer gap
- know exactly what quality gates, automated tests, contract gates, migration rules, data/backward-compatibility rules, release approvals, cutover procedures, rollback plans, deployment checks, smoke tests, environment promotion rules, and handover artifacts must exist
- know exactly what makes a change releasable, cutover-safe, and supportable in production

### 0.4 Patch role in the patch library
This patch is the canonical delivery and release-governance enforcement document.

It closes the build loop for all previous patches by defining:
- how platform/product/module/workflow/agent/admin/integration changes are verified
- how schema and runtime migrations are governed
- how releases are approved and promoted
- how cutover and rollback are executed
- how final as-built handover is locked

No later patch may redefine release governance or cutover quality in a way that contradicts this patch.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **delivery, QE, migration, cutover, and release governance object model**.

### 1.2 Target object types
This patch applies to:
- quality gate object
- automated test suite object
- contract validation object
- migration object
- backward-compatibility object
- release candidate object
- environment promotion object
- cutover plan object
- rollback plan object
- release approval object
- smoke-test object
- post-deploy verification object
- release note object
- production readiness object
- final handover-lock object

### 1.3 Explicitly out of scope
This patch does **not** fully define:
- low-level CI/CD vendor setup specifics
- product/module design details beyond delivery requirements
- infrastructure-as-code specifics outside required governance and verification rules

### 1.4 Delivery definition
Delivery stack is the **governed quality and release system** that decides whether a change may safely move from code to runtime.

It is not:
- “tests passed locally”
- a deployment button only
- a migration script folder only
- one manual QA pass
- a release note document only

It is a formal system covering:
- quality gates
- compatibility gates
- migration safety
- release candidate integrity
- cutover planning
- rollback planning
- verification and sign-off
- final as-built handover lock

---

## 2. Canonical Delivery Target Blueprint

## 2.1 Delivery responsibilities

### A. Quality engineering model
- unit tests
- integration tests
- contract tests
- migration tests
- workflow and lifecycle tests
- access/control tests
- UI state and accessibility tests
- performance or load tests where relevant
- operational smoke tests
- drift tests

### B. Migration model
- schema migrations
- data migrations
- registry/config migrations
- compatibility windows
- reversible vs non-reversible classification
- data-loss risk classification
- tenant impact classification
- verification and repair steps
- rollback compatibility notes

### C. Release governance model
- release candidate definition
- release train or promotion policy
- required approvals
- freeze rules
- risk classification
- dependency readiness
- operational readiness
- runbook readiness
- support readiness

### D. Cutover model
- cutover steps
- execution order
- stop/go checkpoints
- validation checkpoints
- rollback triggers
- communications and ownership
- tenant/product/module impact handling
- post-cutover monitoring window

### E. Post-deploy verification model
- startup and health checks
- critical path smoke tests
- auth and access checks
- workflow and approval checks
- AI/integration checks where applicable
- operational and telemetry checks
- regression indicators
- rollback/no-rollback decision window

### F. Final handover model
- final as-built capture
- release note closure
- unresolved risk log
- cutover outcome
- rollback outcome if triggered
- support owner confirmation
- monitoring and dashboard confirmation

---

## 2.2 Delivery ownership boundaries

### DOS owns directly
- delivery governance framework
- release and promotion model
- migration governance framework
- cutover and rollback framework
- environment readiness model
- post-deploy verification framework
- final as-built handover lock

### DAuth owns directly
- auth/control test gates
- security-sensitive migration approval requirements
- access/permission/authority regression gates
- privileged release action controls

### Product owns directly
- product release readiness
- product smoke tests
- product migration impacts
- product cutover notes
- product operator handover notes

### Module owns directly
- module-level test inventory
- module migration impacts
- module smoke tests
- module release notes and known risks

### Delivery stack must not implement
- release-by-tribal-memory
- migration without compatibility classification
- hidden cutover actions
- manual-only verification as the primary release gate
- production change with no rollback or no-go criteria

---

## 2.3 Required backend package layout

```text
backend/src/platform/dos/delivery/
  quality/
  contracts/
  migrations/
  compatibility/
  release/
  approvals/
  cutover/
  rollback/
  verification/
  handover/
  diagnostics/
  types/
  index.ts
```

### 2.3.1 Required concern split
#### `quality/`
Test gate definitions, coverage categories, critical-path gate registry.

#### `contracts/`
Contract validation and backward-compatibility checks.

#### `migrations/`
Migration governance, migration metadata, migration verification.

#### `compatibility/`
Version and runtime compatibility rules.

#### `release/`
Release candidates, promotion rules, release metadata, approvals.

#### `approvals/`
Required sign-offs and controlled release permissions.

#### `cutover/`
Execution plans, checkpoints, stop/go gates, communications.

#### `rollback/`
Rollback plans, rollback triggers, rollback verification.

#### `verification/`
Post-deploy checks, smoke tests, health gates, regression detection.

#### `handover/`
Final as-built lock, support handoff, unresolved risk ledger.

#### `diagnostics/`
Release diagnostics, failed migration diagnostics, compatibility diagnostics.

---

## 2.4 Required frontend package layout

```text
frontend/src/app/core/delivery/
  releases/
  migrations/
  cutover/
  verification/
  handover/
  diagnostics/
  contracts/
  index.ts
```

### Rule
Frontend delivery surfaces must support controlled operator/admin visibility and approval, not local hidden release state.

---

## 2.5 Required quality gate model

Every releasable change set must define quality gates for:
- unit coverage
- integration coverage
- contract stability
- migration safety
- access/security regression
- critical user journeys
- workflow-critical paths
- operational readiness
- rollback readiness

### Quality gate law
No release should pass with undefined gate ownership or undefined pass criteria.

---

## 2.6 Required migration model

Every migration must define:
- migration id
- migration type
- owner
- affected schemas/tables/contracts
- reversible or irreversible
- compatibility impact
- data-loss risk
- downtime or no-downtime expectation
- validation steps
- rollback notes
- tenant impact notes

### Migration law
No migration should be treated as “just SQL”.
Migration is a governed operational event.

---

## 2.7 Required release candidate model

Every release candidate must define:
- included changes
- affected layers
- affected products/modules
- risk class
- required approvals
- migration inventory
- smoke-test inventory
- rollback plan
- support owner
- cutover window if applicable

### Release candidate law
Release candidates are typed operational objects, not just git references.

---

## 2.8 Required cutover model

Every cutover must define:
- scope
- owners
- execution sequence
- checkpoints
- no-go criteria
- rollback triggers
- communication path
- validation windows
- post-cutover monitoring period

### Cutover law
No major release should rely on implicit coordination or “we know the steps”.

---

## 2.9 Required rollback model

Every significant release/migration must define:
- rollback trigger conditions
- rollback owner
- rollback steps
- rollback validation
- data integrity considerations
- partial rollback handling
- no-rollback classification if truly irreversible with explicit approval

### Rollback law
“No rollback” requires explicit classification, justification, approval, and compensating controls.

---

## 2.10 Required post-deploy verification model

Post-deploy verification must include:
- service health
- DAuth critical auth checks
- product/module registration checks
- workflow critical path checks
- AI and integration smoke checks where relevant
- metrics and alert sanity checks
- admin/settings critical checks
- user-facing critical journey verification

### Verification law
Deployment is not completion.
Verification is part of the release.

---

## 2.11 Required handover-lock model

Final handover lock must confirm:
- as-built updated
- migrations applied and verified
- release notes finalized
- known-risk register updated
- operational dashboards and runbooks confirmed
- support ownership confirmed
- cutover outcome captured
- rollback outcome captured if relevant

### Handover-lock law
No release is complete until the as-built and support state match reality.

---

## 3. Current-State Audit Method

An agent auditing delivery area X must perform the following checks.

## 3.1 Quality gate audit
Verify:
- gate inventory exists
- gate ownership exists
- pass/fail thresholds are explicit
- critical-path tests are identified

## 3.2 Migration audit
Verify:
- migrations are typed and classified
- validation and rollback notes exist
- compatibility impact is explicit
- irreversible changes are flagged and governed

## 3.3 Release governance audit
Verify:
- release candidate structure exists
- approvals and risk classes exist
- environment promotion rules exist

## 3.4 Cutover/rollback audit
Verify:
- cutover steps are explicit
- stop/go and rollback rules exist
- communication and ownership are explicit

## 3.5 Verification audit
Verify:
- post-deploy verification exists
- smoke tests exist
- operational and security checks are included

## 3.6 Handover audit
Verify:
- final as-built lock exists
- support owner and runbook readiness exist
- unresolved risk register is updated

## 3.7 Test audit
Verify:
- release-critical tests are automated or explicitly governed where manual validation remains necessary

---

## 4. Gap Classification for Delivery Stack

Use the shared taxonomy from Patch 0 with these meanings.

### 4.1 Missing
Required gate, migration classification, release candidate contract, cutover plan, rollback plan, verification step, or handover artifact does not exist.

### 4.2 Incomplete
Artifact exists but lacks required details or execution safety.
Examples:
- migration exists but no rollback note
- release candidate exists but no risk class
- smoke tests exist but no auth/workflow coverage

### 4.3 Duplicate
Two or more release or migration systems own the same concern.
Examples:
- duplicate promotion pipelines with conflicting rules
- multiple handover ledgers
- different cutover documents as competing truth

### 4.4 Wrong Owner
Concern belongs to DOS delivery governance, DAuth security gate, product, or module but is implemented in the wrong layer.

### 4.5 Wrong Layer
Examples:
- module-local release logic bypassing platform governance
- release approvals hidden in CI scripts only
- cutover state only in chat threads or tickets

### 4.6 Legacy Carryover
Old release checklists, obsolete migration rules, or stale rollback procedures still influence runtime.

### 4.7 Forbidden Pattern
Examples:
- no rollback plan
- no migration classification
- no as-built update
- manual-only release with no formal gate model
- production deploy with no post-deploy verification

### 4.8 Production Blocker
Examples:
- cannot tell whether change is safe to deploy
- irreversible schema change with no governance
- no cutover owner
- no smoke test for critical auth or workflow paths

### 4.9 Handover Blocker
Examples:
- no final as-built lock
- no support owner confirmation
- no unresolved risk register
- no cutover outcome record

---

## 5. Required Artifact Matrix

Every delivery pass must address all artifact classes below.

| Artifact Class | Required in Patch 14 | Examples |
|---|---|---|
| Files/Folders | Yes | quality, migrations, release, cutover, rollback, handover |
| Services | Yes | migration verifier, release service, verification service, handover lock service |
| Contracts/Schemas | Yes | release candidate, migration record, cutover plan, rollback result |
| Tables/Data | Yes | release records, migration metadata, handover ledgers, quality gate results |
| APIs | Yes | release admin, migration status, cutover control, handover confirmation |
| Events | Yes | release started, migration failed, cutover completed, rollback completed |
| Workflows/Lifecycle | Yes | release approvals, cutover workflow, rollback workflow |
| UI/Admin Surfaces | Yes | release dashboard, migration diagnostics, cutover console, handover lock view |
| Audit/Logs | Yes | release approvals, migration execution, rollback, final handover logs |
| Tests | Yes | gate, migration, release, rollback, verification tests |
| As-Built Updates | Yes | release reality captured and locked |

If any artifact class is skipped, the pass is incomplete.

---

## 6. Exact Build Instructions

## 6.1 If quality gate model is weak
### Build this
Create:
- gate inventory
- gate owners
- pass/fail thresholds
- critical-path mapping
- release blocker classification

### Do not build this
- vague “tests passed” as the full release gate
- gate criteria hidden in multiple tools with no canonical contract

## 6.2 If migration governance is weak
### Build this
Create:
- migration metadata model
- reversibility classification
- compatibility classification
- tenant impact classification
- validation and rollback notes

### Do not build this
- unclassified schema changes
- data migrations with no verification or rollback thought

## 6.3 If release governance is weak
### Build this
Create:
- release candidate model
- approval model
- environment promotion policy
- risk classification
- support owner assignment

### Do not build this
- release by merge alone
- production push with no release candidate state

## 6.4 If cutover and rollback are weak
### Build this
Create:
- cutover plan
- checkpoint model
- stop/go criteria
- rollback plan
- rollback validation

### Do not build this
- cutover from tribal knowledge
- rollback as “restore backup somehow”

## 6.5 If verification is weak
### Build this
Create:
- post-deploy verification suite
- health checks
- auth/workflow/admin/integration/AI smoke tests
- operational validation windows

### Do not build this
- release completion immediately after deployment with no verification

## 6.6 If handover-lock is weak
### Build this
Create:
- final as-built lock
- support owner confirmation
- known-risk update
- cutover outcome ledger
- unresolved-issue carryforward rules

### Do not build this
- final delivery with stale documentation
- support handoff without explicit ownership and artifacts

---

## 7. Example Skeletons

## 7.1 Example backend layout

```text
backend/src/platform/dos/delivery/
  quality/quality-gate.service.ts
  migrations/migration-governance.service.ts
  release/release-candidate.service.ts
  approvals/release-approval.service.ts
  cutover/cutover.service.ts
  rollback/rollback.service.ts
  verification/post-deploy-verification.service.ts
  handover/handover-lock.service.ts
  diagnostics/release-diagnostics.service.ts
  contracts/delivery.types.ts
  index.ts
```

## 7.2 Example release candidate contract

```ts
export interface ReleaseCandidate {
  releaseId: string;
  riskClass: 'low' | 'medium' | 'high' | 'critical';
  affectedLayers: string[];
  migrations: string[];
  approvalsRequired: string[];
  rollbackPlanId: string;
}
```

## 7.3 Example migration contract

```ts
export interface MigrationRecord {
  migrationId: string;
  migrationType: 'schema' | 'data' | 'registry' | 'config';
  reversible: boolean;
  compatibilityImpact: 'none' | 'low' | 'medium' | 'high';
  validationSteps: string[];
}
```

## 7.4 Example test expectations

```ts
it('blocks release when a critical migration lacks rollback notes or irreversible-change approval', () => {
  // migration governance example
});

it('requires post-deploy verification to pass before marking release complete', () => {
  // release completion example
});
```

---

## 8. Tests Required for Delivery Stack

### 8.1 Unit tests required
- quality gate evaluation
- migration classification
- release approval logic
- cutover checkpoint logic
- rollback trigger logic
- handover-lock logic

### 8.2 Integration tests required
- migration verification flow
- release candidate approval flow
- cutover and rollback flow
- post-deploy verification flow
- final handover-lock flow

### 8.3 Contract tests required
- release candidate contracts
- migration contracts
- cutover/rollback contracts
- verification result contracts
- handover-lock contracts

### 8.4 Operational smoke tests required
- release dashboard reflects actual state
- critical migrations are visible and classified
- rollback path is callable and auditable
- post-deploy verification blocks unsafe completion
- handover lock cannot complete with missing required artifacts

---

## 9. Review Checklist for Delivery Stack

The reviewer must confirm:
- quality gates are explicit and owned
- migrations are classified and governed
- releases require formal candidate state and approvals
- cutover and rollback are explicit
- post-deploy verification exists
- final handover lock exists
- no forbidden patterns were introduced

If any required item is missing, final decision is FAIL.

---

## 10. Acceptance Criteria

Patch 14 passes for target delivery area X only if all below are true.

### 10.1 Ownership correctness
- DOS owns delivery and release governance framework
- DAuth provides security-sensitive gates
- product/module release readiness fits within platform governance
- no layer duplicates another's concern

### 10.2 Artifact completeness
- required quality/migration/release/cutover/rollback/verification/handover/test artifacts exist or are explicitly classified missing for follow-up build

### 10.3 Runtime viability
- changes can be tested, classified, migrated, cut over, rolled back, verified, and handed over coherently

### 10.4 Handover readiness
- final as-built lock and support handoff are explicit
- tests are declared
- as-built update path is explicit

---

## 11. Fail Conditions

Patch 14 fails if any of the following are true:
- no formal release candidate and approval model exists
- migrations are unclassified or unsafe
- cutover/rollback is implicit
- no post-deploy verification exists
- no final handover lock exists
- required artifact classes were skipped
- scope widened outside delivery and release-governance layer without approval

---

## 12. As-Built Update Instructions

Any pass or implementation based on Patch 14 must update the as-built ledger with:
- quality/migration/release/cutover/rollback/handover folders and services created or normalized
- release governance status
- migration and rollback status
- final handover-lock status
- remaining blockers and handover implications

---

## 13. Required Agent Output Format

Use the shared format from Patch 0, with delivery-specific clarity:
1. Slice Summary  
2. Approved Scope Checklist  
3. Requirement-to-Implementation Mapping  
4. Files / Schemas / Tables Inspected  
5. Files / Schemas / Tables Changed  
6. Contracts / Tables / Events Affected  
7. What Was Built / Fixed  
8. What Was Explicitly Not Changed  
9. Gap Classification  
10. Tests / Validation Run  
11. Remaining Risks  
12. Final Decision  
13. Recommended Next Part  
14. As-Built Update Required

---

## 14. Recommended Next Patch

After Patch 14, the next patch should be:

**Patch 15 — Master Cross-Patch Audit, Traceability Matrix, and Agent Execution Protocol**

if you want a final capstone patch that turns Patches 0–14 into one executable audit and implementation operating library.

---

## 15. One-Line Use Instruction

Use Patch 14 to compare the current delivery and release-governance implementation against the full canonical target, classify every delivery-layer gap, build only the missing delivery artifacts, validate against delivery pass/fail rules, and update the as-built ledger.

# Patch 15 — Master Cross-Patch Audit, Traceability Matrix, and Agent Execution Protocol

## 0. Patch Identity

### 0.1 Patch name
**Patch 15 — Master Cross-Patch Audit, Traceability Matrix, and Agent Execution Protocol**

### 0.2 Patch class
This is a **Reusable Enforcement Patch**.

It is simultaneously:
- the master patch-library execution protocol
- the cross-patch traceability model
- the agent operating instruction set
- the implementation sequencing protocol
- the comparison and scoring protocol
- the final compliance and handover protocol

### 0.3 Patch purpose
This patch turns Patches 0–14 into one executable operating library.

It tells an agent exactly how to:
- take any target slice in the platform
- determine which earlier patches apply
- compare current state to the canonical target
- classify every gap using the shared taxonomy
- know exactly what files, services, contracts, tables, events, workflows, UI surfaces, tests, operational artifacts, and handover updates are required
- produce implementation work without drifting ownership, layering, naming, or runtime truth

### 0.4 Patch role in the patch library
This patch is the **master conductor** for the entire patch system.

It defines:
- how the earlier patches must be used together
- how module-specific patches must inherit platform rules
- how service-level execution packs must inherit module rules
- how reviews, audits, implementation, validation, and handover all stay aligned

No later patch may contradict the execution or traceability rules defined here.

---

## 1. Scope and Object Types

### 1.1 What this patch governs
This patch governs the **execution protocol for all platform, product, module, workflow, AI, UI, settings, integration, ops, and delivery work**.

### 1.2 Target object types
This patch applies to:
- platform slice
- product slice
- module slice
- service slice
- workflow slice
- AI-agent slice
- UI feature slice
- settings/admin slice
- integration slice
- operations slice
- delivery/release slice
- as-built handover slice

### 1.3 Explicitly out of scope
This patch does **not** replace the content of Patches 0–14.
It controls how they are applied.

### 1.4 Execution law
No agent may implement a slice directly from memory or local interpretation once the patch library exists.
All work must be traced back through this patch and the relevant subordinate patches.

---

## 2. Canonical Patch Hierarchy

## 2.1 Master patch hierarchy
The patch library must be used in this order of authority.

### Level A — Foundational rules
- Patch 0 — laws, naming, gap taxonomy, scoring, handover format

### Level B — Platform and cross-layer architecture
- Patch 1 — platform blueprint
- Patch 2 — platform/server stack
- Patch 3 — DAuth / security / control spine
- Patch 4 — product stack
- Patch 5 — product server stack
- Patch 6 — module stack
- Patch 7 — workflow stack
- Patch 8 — AI agent stack
- Patch 9 — UI feature and component stack
- Patch 10 — centralized dynamic UI and DB-driven UI stack
- Patch 11 — settings, tenant admin, platform admin stack
- Patch 12 — operations, observability, reliability, incident response, as-built handover stack
- Patch 13 — integration, connector, external API, ecosystem stack
- Patch 14 — delivery, QE, migration, cutover, release governance stack

### Level C — Execution control
- Patch 15 — this patch

### Level D — Module-specific end-to-end patches
One patch per module. Each module patch must explicitly inherit and map to Patches 0–15.

### Level E — Service-specific execution packs
Created only where a module is large enough to justify deep service-level implementation packs.

---

## 2.2 Cross-patch dependency matrix

### Any platform-core slice must apply
- Patch 0
- Patch 1
- Patch 2
- Patch 3 if security/control is involved
- Patch 11 if settings/admin is involved
- Patch 12
- Patch 13 if external integration is involved
- Patch 14
- Patch 15

### Any product slice must apply
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 7 if workflows are involved
- Patch 8 if AI is involved
- Patch 9/10 if UI is involved
- Patch 11 if admin/settings are involved
- Patch 12
- Patch 13 if integrations are involved
- Patch 14
- Patch 15

### Any module slice must apply
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7 if lifecycle/workflow exists
- Patch 8 if AI exists
- Patch 9
- Patch 10 if dynamic UI exists
- Patch 11 if settings/admin exists
- Patch 12
- Patch 13 if integrations exist
- Patch 14
- Patch 15

### Any workflow slice must apply
- Patch 0
- Patch 1
- Patch 3
- Patch 6
- Patch 7
- Patch 8 if AI participates
- Patch 9 if workflow UI exists
- Patch 11 if admin exists
- Patch 12
- Patch 13 if external systems participate
- Patch 14
- Patch 15

### Any AI slice must apply
- Patch 0
- Patch 1
- Patch 3
- Patch 6 or product/module patch as applicable
- Patch 7 if workflow-linked
- Patch 8
- Patch 9/10 for AI UI surfaces
- Patch 11 for admin/controls
- Patch 12
- Patch 13 for tool/integration participation
- Patch 14
- Patch 15

---

## 3. Required Agent Execution Sequence

Every agent must follow this sequence exactly.

## 3.1 Step 1 — Identify the target slice
The agent must explicitly state:
- target type
- exact code area
- owner layer
- nearest product
- nearest module
- whether the slice is platform, product, module, workflow, AI, UI, settings, integration, ops, or delivery

## 3.2 Step 2 — Resolve controlling patches
The agent must list the exact controlling patches from Patches 0–15.
No work may continue without this map.

## 3.3 Step 3 — Build the requirement matrix
The agent must convert the controlling patches into a requirement matrix covering:
- folders/files
- services
- contracts
- tables
- APIs
- events
- workflows
- AI participation
- UI/admin surfaces
- observability
- tests
- handover updates

## 3.4 Step 4 — Inspect current state
The agent must inspect current code, contracts, data, and runtime artifacts.

## 3.5 Step 5 — Classify gaps
Every gap must be classified using Patch 0 taxonomy:
- Missing
- Incomplete
- Duplicate
- Wrong Owner
- Wrong Layer
- Legacy Carryover
- Forbidden Pattern
- Production Blocker
- Handover Blocker

## 3.6 Step 6 — Produce exact implementation scope
The agent must state:
- what will be built
- what will not be changed
- exact files/tables/contracts/events/tests to touch
- exact ownership boundaries not to cross

## 3.7 Step 7 — Build or audit
The agent performs the task.

## 3.8 Step 8 — Validate
The agent must run or specify:
- tests
- validations
- drift checks
- operational checks
- compatibility checks

## 3.9 Step 9 — Score pass/fail
The agent must issue a final decision based on patch rules only.

## 3.10 Step 10 — Update as-built
The agent must explicitly state as-built update requirements.

---

## 4. Required Requirement Matrix Format

Every execution pass must materialize a requirement matrix with these sections.

### 4.1 Structural requirements
- required directories
- required files
- required exports
- required package boundaries
- required naming rules

### 4.2 Runtime requirements
- required services
- required orchestration
- required runtime contracts
- required health and observability hooks

### 4.3 Data requirements
- required tables
- required migrations
- required indexes
- required audit/history data
- required retention/classification rules

### 4.4 Control requirements
- DAuth interactions
- access requirements
- SoD and delegation rules
- lifecycle and approval rules

### 4.5 Experience requirements
- pages
- components
- widgets
- settings/admin surfaces
- diagnostics surfaces

### 4.6 Integration requirements
- events
- APIs
- connectors
- imports/exports
- external contracts

### 4.7 Quality requirements
- tests
- smoke checks
- release checks
- handover requirements

---

## 5. Required Module-Patch Protocol

Every module patch must be **end-to-end** and **standalone**.

## 5.1 Every module patch must include
- module identity
- ownership boundaries
- backend structure
- frontend structure
- data model
- service model
- API model
- DAuth integration
- DOS integration
- workflow integration
- AI integration
- UI/UX model
- settings/admin model
- observability/ops model
- test matrix
- gap engine
- exact build instructions
- as-built update instructions

## 5.2 Every module patch must explicitly map to shared patches
The module patch must contain a section titled:

### Cross-Patch Inheritance Map
and explicitly map how the module inherits:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7 if applicable
- Patch 8 if applicable
- Patch 9
- Patch 10 if applicable
- Patch 11 if applicable
- Patch 12
- Patch 13 if applicable
- Patch 14
- Patch 15

## 5.3 Module patch law
A module patch must tell an agent exactly:
- what to add
- what not to add
- where to add it
- which layer owns it
- which tests make it pass
- which blockers stop production release

No agent should need to infer architecture from scratch once a module patch exists.

---

## 6. Required Service-Pack Protocol

Service packs may be created only when:
- a module is large enough to need deep service decomposition
- the service family is operationally critical
- multiple agents will likely touch the same service family

### Service packs must inherit from
- Patch 0
- Patch 15
- the parent module patch
- and any earlier shared patch relevant to the service concern

### Service pack law
A service pack must not override the parent module patch.
It may only deepen it.

---

## 7. Traceability Matrix Rules

## 7.1 Every requirement must trace to one of these sources
- patch section
- module patch section
- service pack section
- canonical manifest or contract
- approved table or event contract
- as-built delta

## 7.2 Every build artifact must map back to a requirement
No untraced file/service/table/event/UI artifact may be introduced.

## 7.3 Every gap must map to a requirement
No vague “improvement” language.
Every gap must reference the missing or violated requirement.

## 7.4 Every final decision must map to acceptance criteria
No generic PASS/FAIL wording without patch criteria.

---

## 8. Scoring and Decision Protocol

## 8.1 Required score dimensions
For any slice under review, score:
- ownership correctness
- structural completeness
- runtime completeness
- data completeness
- control alignment
- workflow alignment
- AI alignment
- UI/admin completeness
- observability completeness
- test completeness
- handover completeness

## 8.2 Scoring meanings
- PASS = all critical requirements satisfied; remaining gaps are non-blocking and explicitly classified
- PASS WITH WARNINGS = non-critical gaps remain but slice is coherent and releasable for stated scope
- FAIL = any production blocker, ownership violation, missing runtime spine, or skipped artifact class remains

## 8.3 Automatic FAIL conditions
Automatic FAIL if any of the following occur:
- duplicate runtime truth
- wrong owner for core concern
- wrong layer for runtime-critical concern
- skipped artifact classes
- no tests declared for critical slice
- no as-built update requirement
- no controlling-patch map
- hidden/admin bypass path
- critical security/SoD/lifecycle/rollback gap
- incoherent data ownership

---

## 9. Required Agent Output Format

Every implementation or audit based on this patch library must use this exact format.

1. Slice Summary  
2. Target Type and Ownership Layer  
3. Controlling Patch Map  
4. Approved Scope Checklist  
5. Cross-Patch Requirement Matrix  
6. Files / Schemas / Tables / Events Inspected  
7. Files / Schemas / Tables / Events Changed  
8. Requirement-to-Implementation Mapping  
9. What Was Built / Fixed  
10. What Was Explicitly Not Changed  
11. Gap Classification  
12. Tests / Validation Run  
13. Remaining Risks  
14. Final Decision  
15. Recommended Next Part  
16. As-Built Update Required

---

## 10. Required Naming and Package Discipline

### 10.1 Platform names
- Dogan-AI-OS = **DOS**
- Dogan-Auth = **DAuth**
- Shahin-AI = product name

### 10.2 Naming law
No new work may reintroduce ambiguous or drifted names for:
- auth
- access
- lifecycle
- SoD
- delegation
- platform core
- product manifests
- module ownership
- agent runtime

### 10.3 v2 law
No new `v2`, `new`, `temp`, `legacy-next`, `shadow-main`, or equivalent competing runtime packages may be created as a new truth source.

---

## 11. Forbidden Agent Behaviors

Agents must not:
- invent new ownership boundaries
- move DOS concerns into product/module layers
- move DAuth concerns into DOS or products/modules
- create local permission engines
- create local SoD engines
- create local lifecycle engines where DOS/DAuth owns them
- skip required tests
- skip as-built updates
- produce implementation without patch traceability
- use frontend static truth as runtime access truth
- use raw route-level role comparison as canonical auth model

---

## 12. Delivery Sequencing Protocol

## 12.1 Implementation order law
When multiple slices are planned, sequence must prioritize dependency-reducing slices first.

### Preferred near-term execution order
1. Patch 15
2. Module Patch — Onboarding
3. Module Patch — Workflow
4. Module Patch — AI
5. Module Patch — Governance
6. Module Patch — Risk
7. remaining module patches in dependency order

## 12.2 Why this order
Because:
- onboarding unblocks provisioning and tenant bootstrapping
- workflow governs lifecycle/action orchestration
- AI is cross-cutting and ownership-sensitive
- governance and risk drive many downstream controls and reporting flows

---

## 13. As-Built Governance Protocol

## 13.1 Every patch-based delivery must update
- what was built
- what remains missing
- what ownership is now fixed
- what runtime truth moved or was normalized
- what tests were added
- what release/handover implications changed

## 13.2 As-built law
As-built state is mandatory after every significant patch-driven execution.
No silent architecture drift is allowed between implementation and handover.

---

## 14. Acceptance Criteria

Patch 15 passes only if all below are true.

### 14.1 Execution correctness
The patch library can now be used consistently to drive implementation, audit, review, and handover.

### 14.2 Traceability completeness
A future agent can trace any build item back to patch requirements.

### 14.3 Module patch readiness
The system is ready for one end-to-end patch per module.

### 14.4 Handover readiness
Final outputs can now be turned into implementation evidence and as-built records without interpretation drift.

---

## 15. Fail Conditions

Patch 15 fails if any of the following are true:
- it does not define how earlier patches combine
- it does not define module-patch inheritance
- it does not define the standard output format
- it does not define gap scoring and fail conditions
- it does not define traceability rules
- it allows agents to implement by interpretation instead of controlled protocol

---

## 16. Recommended Next Part

After Patch 15, the next artifacts should be:
- **Module Patch 01 — Onboarding Module End-to-End**
- **Module Patch 02 — Workflow Module End-to-End**
- **Module Patch 03 — AI Module End-to-End**
- **Module Patch 04 — Governance Module End-to-End**
- **Module Patch 05 — Risk Module End-to-End**

These are the highest-value next execution patches.

---

## 17. One-Line Use Instruction

Use Patch 15 as the master execution protocol that turns Patches 0–14 into one traceable implementation system, then use it to generate and enforce one end-to-end standalone patch per module.


# Module Patch 01 — Onboarding Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 01 — Onboarding Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Onboarding module** end to end.

It tells an agent exactly how to:
- inspect the current onboarding stack
- compare it against the canonical onboarding target
- know what belongs to DOS, DAuth, Shahin-AI, and Onboarding itself
- know exactly what files, services, contracts, tables, events, workflows, UI surfaces, tests, operational surfaces, and handover records must exist
- know exactly how to rebuild or complete the onboarding stack without reintroducing drift

### 0.4 Module identity
- Module code: `onboarding`
- Layer: domain module
- Primary product alignment: DOS platform onboarding / Shahin-AI bootstrap entry
- Criticality: **P0 platform bootstrap critical**
- Runtime role: tenant creation, first-user bootstrap, early workspace shaping, module selection, activation handoff, provisioning orchestration entry
- Primary dependency domains: DOS, DAuth, workflow, AI, UI shell, settings/admin, operations, delivery

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8
- Patch 9
- Patch 10
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Onboarding owns directly
Onboarding owns:
- sessionized onboarding journey runtime
- onboarding stage definitions and sequencing
- onboarding question bank consumption and answer capture
- scoring/recommendation and workspace preview orchestration
- governance context shaping based on onboarding input
- startup checklist generation
- provisioning job creation and handoff
- onboarding-specific UI pages, stage flows, review stage, bootstrap progression
- registration-to-onboarding bridge only where explicitly approved
- onboarding admin and diagnostics surfaces
- onboarding audit trail for onboarding-specific actions

## 2.2 What Onboarding consumes from DOS
Onboarding consumes from DOS:
- tenant creation backbone
- product/module enablement framework
- workspace defaults framework
- org-pack provisioning hook framework
- shell/navigation/runtime composition
- event backbone
- observability contracts
- settings and admin surfaces where DOS owns them
- platform context

## 2.3 What Onboarding consumes from DAuth
Onboarding consumes from DAuth:
- initial principal creation
- tenant membership creation
- email verification
- invitation or registration security controls
- initial access-profile and role assignment
- approval and sign-off controls where required
- lifecycle authorization for state-changing onboarding actions

## 2.4 What Onboarding must not implement
Onboarding must not own:
- a second tenant engine
- a second auth system
- product/module entitlement truth
- independent org/foundation runtime truth outside DOS
- a private workflow engine
- local permission truth in frontend or backend
- hidden bootstrap scripts outside provisioning contracts

---

## 3. Canonical Backend Structure

```text
backend/src/modules/onboarding/
  controllers/
  routes/
  services/
    provisioning-steps/
  repositories/
  mappers/
  utils/
  constants/
  data/
  security/
  schemas/
  types/
  shared/
  diagnostics/
  admin/
  contracts/
  events/
  jobs/
  index.ts
  onboarding.module.ts
```

## 3.1 Required backend service families

### Journey/session core
- onboarding-session service
- onboarding-flow service
- stage-definition service
- scene service
- question service
- answer service

### Assessment and shaping
- recommendation service
- score service
- confidence-score service
- inferred-facts service
- workspace-preview service
- governance-context service
- journey-profile service
- regulator-explanation service

### Review and completion
- onboarding-review service
- onboarding-completion service
- onboarding-validation service
- startup-checklist service

### Provisioning
- provisioning-definition service
- provisioning-orchestrator service
- provisioning-step-runner service
- provisioning-step families
- provisioning seed integration services
- DOS org-pack hook integration

### Registration bridge
- onboarding-register controller/service flow
- email verification bridge surfaces
- bootstrap path alignment

### Diagnostics/admin
- onboarding diagnostics service
- provisioning diagnostics service
- stuck-session diagnostics
- provisioning replay/retry admin service

### Events/jobs
- onboarding event service
- onboarding progress events
- provisioning lifecycle events
- cleanup/reconciliation jobs if needed

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/onboarding-os/
  pages/
  components/
  services/
  models/
  state/
  contracts/
  diagnostics/
  admin/
  widgets/
  testing/
  index.ts
```

## 4.1 Required frontend ownership
The onboarding frontend must provide:
- onboarding shell
- registration hero/entry
- stage renderer
- answer management
- review stage
- provisioning progress UI
- startup checklist UI
- email verification UI bridge
- governance and workspace preview surfaces
- tech-log / diagnostics surfaces where allowed
- onboarding admin/runtime support views

## 4.2 Frontend must not own
- auth truth
- access truth
- product/module entitlement truth
- DOS shell truth
- backend validation truth as a substitute for canonical contracts

---

## 5. Data Model Requirements

## 5.1 Required public/master tables
The onboarding module may own or consume:
- onboarding session tables
- onboarding stage metadata
- onboarding question bank
- onboarding scoring/recommendation/blocker tables
- provisioning definition tables
- startup checklist templates
- workspace seed profile tables
- plan template tables
- workspace preview templates
- onboarding config tables
- onboarding lookup/reference tables where approved

## 5.2 Required tenant tables
The onboarding module may own or consume:
- provisioning_jobs
- provisioning_steps
- workspace_seeds
- pack_installations
- ninety_day_plans
- plan_item_instances
- onboarding answer drafts
- onboarding consensus/assessment drafts
- activation readiness or bootstrap logs
- product/module kickstart state

## 5.3 Explicit data ownership split
### DOS owns
- tenants
- workspaces
- product/module entitlements
- org/foundation truth
- workspace profile/runtime shell truths

### DAuth owns
- user identity
- memberships
- email verification
- access assignments
- first-user security state

### Onboarding owns
- onboarding journey state
- answers
- scores
- recommendations
- preview and shaping artifacts
- provisioning entry coordination
- checklist generation and early-plan shaping

---

## 6. Required API Surface

## 6.1 Required route groups
- bootstrap/session start
- configuration and lookup
- question and stage retrieval
- answer save/retrieve
- review and completion
- scoring/recommendations/preview
- governance context
- startup checklist
- provisioning start/status/retry/cancel
- registration bridge
- email verification bridge helpers where approved
- diagnostics/admin routes

## 6.2 Required API contract families
- onboarding session contract
- stage contract
- answer contract
- save-bulk-answers contract
- score/recommendation contract
- governance preview contract
- workspace preview contract
- startup checklist contract
- provisioning job contract
- provisioning step contract
- onboarding review contract
- onboarding register contract
- diagnostics contract

---

## 7. Workflow Requirements

## 7.1 Onboarding lifecycle states
At minimum, onboarding must define and govern:
- not_started
- in_progress
- awaiting_review
- review_blocked
- approved
- provisioning_started
- provisioning_partial
- provisioned
- failed
- cancelled

## 7.2 Workflow integration
Onboarding must integrate with Patch 7 rules for:
- state transitions
- review approvals
- self-approval prevention where relevant
- sign-off requirements if approval is privileged
- provisioning retry/cancel flows
- checklist and activation follow-up transitions

## 7.3 Workflow law
Onboarding state changes must not bypass:
- DAuth lifecycle authorization where required
- DOS provisioning contracts
- audit logging
- operational diagnostics

---

## 8. AI and Automation Requirements

## 8.1 AI usage allowed in Onboarding
Allowed:
- suggest responsibilities
- recommend business functions
- infer governance context
- infer staffing suggestions
- infer maturity/readiness hints
- generate workspace preview narratives
- guide next-best onboarding actions

## 8.2 AI usage restrictions
Not allowed:
- silent irreversible provisioning actions without approved workflow
- hidden auto-approval for protected stages
- local AI permission truth
- uncontrolled agent actions outside DAuth and workflow rules

## 8.3 Required AI contracts
- onboarding AI suggestion contract
- explainability reason contract
- confidence contract
- operator override/audit contract
- autonomy boundary contract

---

## 9. UI and Experience Requirements

## 9.1 Required UI surfaces
- registration entry
- onboarding shell
- stage-by-stage Q&A
- progress model
- recommendations/scores surfaces
- governance context view
- workspace preview
- startup checklist
- review and approval stage
- provisioning/milestone stage
- verification banner and resend flows
- diagnostic log and operator-friendly failure surfaces

## 9.2 Required UX states
Every major onboarding surface must define:
- empty
- loading
- partial data
- validation error
- saved/offline queued
- permission/verification blocked
- provisioning active
- provisioning failed
- resumed session
- completed redirect

## 9.3 Accessibility and i18n
- full RTL and Arabic/English compatibility
- keyboard navigation
- screen-reader meaningful state changes
- no disabled primary action without visible explanation
- verification and blocking reasons must be explicit

---

## 10. Settings, Admin, and Runtime Control

## 10.1 Required admin/runtime controls
- onboarding configuration visibility
- stage visibility/control
- provisioning retry/cancel
- stuck-session recovery
- preview/debug surfaces for operators
- module enablement preview during onboarding
- org-pack selection visibility
- runbook and diagnostics links

## 10.2 What must not happen
- ad hoc direct DB editing as the primary recovery path
- hidden feature toggles that change onboarding logic outside documented config
- duplicate admin truths outside DOS/DAuth boundaries

---

## 11. Observability and Operations

## 11.1 Required logs
- session start/resume
- answer save failures
- validation failures
- review decisions
- provisioning start/step/failure/cancel/retry
- preview/scoring failure reasons
- email verification gate events
- operator recovery actions

## 11.2 Required metrics
- session starts
- stage completion rate
- drop-off by stage
- review-block rate
- verification-block rate
- provisioning success/failure/retry rate
- time-to-provision
- org-pack seeding success/failure

## 11.3 Required diagnostics
- session diagnostics
- provisioning diagnostics
- dependency readiness diagnostics
- activation diagnostics
- failed step replay visibility

---

## 12. Required Tests

### 12.1 Unit tests
- session and stage logic
- answer validation
- score/recommendation logic
- governance/workspace preview logic
- provisioning step selection
- email verification gate logic

### 12.2 Integration tests
- register → onboarding flow
- save/retrieve answers
- review stage gating
- provisioning start/status/retry/cancel
- org-pack seeding integration
- module activation and defaults application

### 12.3 Contract tests
- onboarding session contract
- save-bulk-answers contract
- provisioning job/step contracts
- review completion contract
- startup checklist contract

### 12.4 Operational smoke tests
- a new tenant can be onboarded end to end
- org structure can be seeded
- verification gating works
- provisioning failures are diagnosable
- retry/cancel flows are auditable

---

## 13. Exact Build Instructions

## 13.1 If `seed_org_structure` or org-pack path is broken
### Build this
- restore onboarding-to-DOS org-pack hook via `platform/dos/provisioning/org-pack-seeding.service.ts`
- remove deleted foundation imports
- ensure provisioning step handler calls DOS-owned org pack service only

### Do not build this
- reintroduce foundation-owned deleted pack seeding path
- module-local private org structure engine

## 13.2 If onboarding auth gates are scattered
### Build this
- consume DAuth session and verification contracts
- use canonical access/lifecycle checks for review and protected actions
- unify verification gate logic

### Do not build this
- frontend-only auth truth
- local route auth shortcuts

## 13.3 If provisioning diagnostics are weak
### Build this
- explicit diagnostics service and UI surface
- step status, failure reason, retry/cancel, event trace, correlation ids

### Do not build this
- generic “something failed” toast as the only operator signal

## 13.4 If onboarding UI is incomplete
### Build this
- full state surfaces
- explicit blocked/verification/offline/retry states
- stable review and provisioning stages
- diagnostics and support visibility

### Do not build this
- hidden disabled actions without explanation
- score/recommendation calls whose outputs are never rendered

---

## 14. Gap Classification Guidance

Common onboarding gaps must be classified as:
- Missing: no org-pack hook, no review-stage contract, no provisioning diagnostics
- Incomplete: review exists but lacks auth/verification/SoD gates
- Wrong Owner: onboarding implementing DOS org truth or DAuth auth truth
- Wrong Layer: frontend computing runtime access truth
- Production Blocker: tenant cannot be provisioned end to end
- Handover Blocker: no diagnostics, no runbook, no as-built provisioning note

---

## 15. Acceptance Criteria

This module patch passes only if:
- onboarding can move a new tenant from entry to approved provisioning coherently
- onboarding uses DOS for platform/bootstrap ownership
- onboarding uses DAuth for identity and control ownership
- org-pack seeding path is explicit and valid
- review, verification, and provisioning states are explicit
- diagnostics and tests exist
- as-built update is explicit

---

## 16. Fail Conditions

FAIL if any of the following are true:
- onboarding cannot provision a tenant
- onboarding still depends on deleted foundation paths
- onboarding reimplements auth/control truth
- onboarding state transitions bypass workflow/authorization requirements
- required artifact classes are skipped
- diagnostics and tests are not defined

---

## 17. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 02 — Workflow Module End-to-End**

---

## 18. One-Line Use Instruction

Use this patch to compare the current onboarding implementation against the full canonical onboarding target, classify every onboarding-layer gap, build only the missing onboarding artifacts, validate against onboarding pass/fail rules, and update the as-built ledger.

# Module Patch 02 — Workflow Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 02 — Workflow Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Workflow module** end to end.

It tells an agent exactly how to:
- inspect workflow definitions, execution, approvals, transitions, SLA, events, automation, and admin surfaces
- compare current state against the canonical workflow target
- know what belongs to DOS, DAuth, Workflow, AI, and product/module consumers
- know exactly what files, services, contracts, tables, events, UI/admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `workflow`
- Layer: domain/module infrastructure hybrid
- Criticality: **platform-wide control critical**
- Runtime role: workflow definition, execution, approval routing, transition control, escalation, SLA, event-driven orchestration
- Primary dependency domains: DOS, DAuth, AI, operations, delivery, all lifecycle-bearing modules

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8
- Patch 9
- Patch 10 where workflow UI is dynamic
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Workflow owns directly
Workflow owns:
- workflow definitions
- state machine binding to business entities where approved
- transition orchestration
- approval routing
- SLA timers and breach logic
- escalation routing
- workflow execution history
- workflow event emission and subscription adapters
- workflow versioning and rollout rules
- workflow diagnostics/admin surfaces

## 2.2 What Workflow consumes from DOS
Workflow consumes:
- generic lifecycle/state-machine primitives from DOS
- event backbone
- observability
- product/module registry and ownership metadata
- platform context and tenancy

## 2.3 What Workflow consumes from DAuth
Workflow consumes:
- lifecycle authorization
- decision authority
- sign-off authority
- SoD
- delegation
- self-approval prevention
- acting-on-behalf-of rules
- access snapshot / principal context

## 2.4 What Workflow must not implement
Workflow must not own:
- independent auth or approval truth outside DAuth
- a second event bus
- product/module business rules as hidden truth
- silent direct DB transitions bypassing state-machine contracts
- module-local workflow engines acting as separate runtime truth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/workflow/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  workflow.module.ts
```

## 3.1 Required service families

### Definition and registry
- workflow definition service
- transition registry service
- versioning service
- workflow profile resolver

### Execution
- workflow execution service
- transition runner
- approval orchestration service
- SLA service
- escalation service
- retry/recovery service
- compensation/rollback coordination where supported

### Integration
- workflow-to-module bridge service
- workflow event emitter/subscriber
- AI workflow trigger integration
- lifecycle bridge service

### Diagnostics/admin
- workflow diagnostics service
- stuck execution detector
- execution audit viewer
- version rollout admin service

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/workflow/
  pages/
  components/
  services/
  state/
  contracts/
  admin/
  diagnostics/
  widgets/
  testing/
  index.ts
```

Required UI surfaces:
- workflow hub
- execution detail
- approval queues
- transition history
- SLA and escalation views
- workflow admin/versioning views
- diagnostics and failed execution views

---

## 5. Data Model Requirements

Workflow must define or consume:
- workflow definitions
- workflow versions
- workflow executions
- execution steps
- transitions
- approvals
- approval history
- SLA timers
- escalation records
- retry/recovery records
- workflow event bindings
- workflow audit logs

DOS owns generic state-machine primitives.
DAuth owns control decisions.
Workflow owns workflow execution truth.

---

## 6. API Surface Requirements

Required route groups:
- definition registry
- execution creation/start
- transition action
- approval action
- queue retrieval
- history retrieval
- SLA/escalation status
- retry/recovery
- version management
- diagnostics/admin

Required contracts:
- workflow definition
- execution contract
- transition request/decision
- approval decision contract
- execution history contract
- diagnostics contract

---

## 7. Control and DAuth Integration

Workflow must always use DAuth for:
- permission checks
- scope checks
- approval authority
- sign-off
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No transition, approval, override, or high-impact workflow action may bypass DAuth.

---

## 8. AI Integration

Workflow may consume AI for:
- transition recommendations
- bottleneck analysis
- escalation prioritization
- workload balancing
- approval support summaries
- automated action proposals within allowed autonomy rules

Workflow must not allow AI to:
- silently approve protected steps
- override authority requirements
- bypass SoD or maker-checker rules
- mutate execution truth outside workflow contracts

---

## 9. UI and Experience Requirements

Workflow UI must provide:
- definition visibility
- execution list/detail
- approval inbox and action surface
- transition controls
- audit trail
- SLA/escalation views
- version comparison
- failed-execution diagnostics
- admin controls

Must define:
- loading
- empty
- blocked
- delegated
- escalated
- failed
- retried
- cancelled
- completed
- archived states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- enable/disable workflow definitions
- rollout workflow versions
- view and pause stuck executions
- replay/retry where allowed
- inspect approval bottlenecks
- inspect SLA thresholds
- attach runbooks and diagnostics

---

## 11. Observability and Operations

Required logs:
- execution start/end
- transition attempts and results
- approval outcomes
- escalations
- SLA breaches
- retries and recoveries
- DAuth denial reasons
- AI recommendation usage where applicable

Required metrics:
- execution throughput
- failure rate
- SLA breach rate
- approval latency
- retry rate
- stuck execution count

Required diagnostics:
- failed transition diagnostics
- denied approval diagnostics
- event/subscription diagnostics
- version compatibility diagnostics

---

## 12. Required Tests

- definition validation tests
- execution and transition tests
- approval and authority tests
- SoD and self-approval tests
- SLA/escalation tests
- retry/recovery tests
- execution history contract tests
- admin/version rollout tests
- operational smoke tests

---

## 13. Exact Build Instructions

If workflow logic is fragmented across modules:
- centralize reusable workflow truth in the workflow module
- keep module-specific business semantics in module adapters only

If approvals bypass DAuth:
- route all protected decisions through DAuth lifecycle authorization and authority services

If execution diagnostics are weak:
- build explicit diagnostics/admin services and UI surfaces

If versioning is weak:
- create explicit workflow version registry, rollout rules, compatibility rules, and rollback rules

---

## 14. Acceptance Criteria

Pass only if:
- workflow is the single workflow runtime truth
- DAuth governs protected actions
- DOS provides platform primitives only
- module adapters do not become private workflow engines
- diagnostics, tests, and admin/runtime control exist
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- approvals or transitions bypass DAuth
- modules maintain separate runtime workflow engines
- workflow has no explicit diagnostics/admin model
- required artifact classes are skipped
- versioning/rollback is undefined for significant flows

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 03 — AI Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current workflow implementation against the full canonical workflow target, classify every workflow-layer gap, build only the missing workflow artifacts, validate against workflow pass/fail rules, and update the as-built ledger.

# Module Patch 03 — AI Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 03 — AI Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the canonical target for the **AI module and AI operating capabilities that remain module-owned**, while explicitly separating them from DOS-owned AI OS runtime and DAuth-owned agent security.

It tells an agent exactly how to:
- inspect the current AI stack
- separate platform AI OS concerns from module AI concerns
- compare current implementation against the canonical target
- know exactly what runtime services, tool sets, reasoning services, governance hooks, UI surfaces, contracts, tests, and operations artifacts must exist

### 0.4 Module identity
- Module code: `ai`
- Layer: product/domain module with cross-cutting importance
- Criticality: **P0 architectural**
- Runtime role: domain AI behaviors, agent tools, reasoning, AI product surfaces, module-facing AI functionality
- Primary dependency domains: DOS AI OS, DAuth agent security, workflow, integrations, observability, delivery

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8
- Patch 9
- Patch 10
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. AI Ownership Split — Critical Rule

## 2.1 DOS must own
- AI OS kernel
- agent runtime host
- scheduling/process model
- IPC/handoff transport
- runtime memory abstraction
- fleet orchestration
- platform observability of agent runtime
- durable execution primitives
- system-level agent lifecycle

## 2.2 DAuth must own
- agent principal model
- agent tokens/sessions
- agent permission/scope profiles
- agent delegation and authority
- agent SoD
- agent audit/security events

## 2.3 AI module owns directly
- domain agent tool packs
- reasoning and recommendation logic
- LLM gateway policies specific to AI product behavior
- AI UI surfaces
- AI cockpit/product pages
- AI assistance logic for other modules where routed through approved contracts
- module-level model/prompt/config surfaces
- AI module diagnostics and governance integration

## 2.4 AI module must not own
- hidden platform runtime truth that belongs to DOS AI OS
- hidden security/control truth that belongs to DAuth
- second lifecycle or orchestration engines as permanent platform truth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/ai/
  controllers/
  routes/
  services/
    agents/
    orchestration/
    memory/
    gateway/
    llm/
    reasoning/
    observability/
    activity/
    workflow/
    diagnostics/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  admin/
  testing/
  index.ts
  ai.module.ts
```

## 3.1 Required service families

### Domain agent tooling
- tool packs A01–A12 and future typed tool bundles
- module-routing adapters
- tool execution safety adapters

### Reasoning
- decision engine
- explainability service
- recommendation engine
- signal inference
- NL query

### Gateway and LLM
- LLM service/router
- provider policy enforcer
- prompt registry
- injection guard
- trace/usage/cost tracking
- retry and fallback services

### Activity and audit
- agent activity feed
- agent audit
- task tracker
- alerting and correlation

### AI module diagnostics
- AI diagnostics
- failed run analysis
- tool usage diagnostics
- model/prompt diagnostics
- cost diagnostics

### AI-to-workflow/product integration
- proposed action service
- event triggers
- workflow trigger adapters
- module routing bridges

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/ai/
  pages/
  components/
  services/
  cockpit/
  diagnostics/
  governance/
  settings/
  admin/
  widgets/
  state/
  contracts/
  testing/
  index.ts
```

Required UI surfaces:
- AI cockpit
- agent hub
- agent detail
- decision trace
- explainability
- recommendations inbox
- model/runtime config
- policy/rules pages
- AI queue and action review
- diagnostics/cost/usage views
- governance linkage surfaces

---

## 5. Data Model Requirements

AI module may own or consume:
- agent run and step records
- proposals
- AI sessions
- module-owned memory coordination data
- prompt and model config records
- AI usage/cost records
- shadow/canary configuration
- recommendation and observation records

DOS owns platform runtime host truth.
DAuth owns principal/access truth.
AI module owns domain AI behavior and product-facing AI artifacts.

---

## 6. API Surface Requirements

Required route groups:
- agent registry/read views
- run and execution inspection
- tool and prompt admin/config surfaces
- recommendation/proposal surfaces
- explainability and decision history
- AI queue/review actions
- AI diagnostics and cost usage
- module integration hooks
- governance linkage hooks

Required contracts:
- agent run contract
- proposal contract
- recommendation contract
- explanation contract
- tool execution result contract
- prompt/model config contract
- diagnostics contract

---

## 7. Workflow Integration

The AI module must integrate with workflow for:
- proposed actions
- approval queues
- protected actions
- autonomous or semi-autonomous flows
- remediation/action handoff
- retry/recovery of AI-driven tasks

No protected AI action may bypass workflow and DAuth controls.

---

## 8. DAuth Integration

The AI module must consume DAuth for:
- agent principal resolution
- human principal resolution for copilot actions
- tool access gating
- data classification/clearance gating where applicable
- authority for protected actions
- delegation and acting-on-behalf-of
- SoD and self-approval prevention
- audit for agent/human mixed actions

---

## 9. UI and Experience Requirements

Required surfaces:
- AI cockpit
- agent registry/fleet views
- decision/explanation trace
- approval and override views
- tool visibility and invocation history
- cost and usage views
- prompt/model/runtime config pages
- diagnostics and support views

Required experience states:
- model unavailable
- provider degraded
- tool blocked
- permission blocked
- approval required
- delegated
- queued
- running
- streaming
- partial result
- failed
- fallback used
- completed

---

## 10. Settings/Admin/Runtime Control

Required controls:
- model/provider selection policy
- prompt registry management
- shadow/canary enablement
- runtime config controls
- cost/usage caps where supported
- proposal/autonomy policy visibility
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- run start/end
- tool call and outcome
- provider/model selection
- blocked actions
- approval-required actions
- fallback usage
- prompt drift/injection events
- cost and quota events

Required metrics:
- runs
- tokens
- latency
- cost
- success/failure
- tool usage
- fallback rate
- approval-required rate

Required diagnostics:
- failed runs
- model/provider errors
- blocked tool invocations
- invalid output diagnostics
- queue and throughput diagnostics

---

## 12. Required Tests

- tool pack tests
- reasoning and recommendation tests
- prompt/model config tests
- provider routing tests
- blocked-action tests
- workflow and DAuth integration tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

## 13.1 If AI OS concerns still live in the module layer
### Build this
- extract DOS-owned runtime/kernel/orchestration concerns into `platform/dos/ai-os/`
- leave module-owned reasoning, tools, UI, and domain AI behavior in the AI module
- create explicit bridge contracts

### Do not build this
- keep platform runtime truth buried inside the `modules/ai` package

## 13.2 If agent security is weak
### Build this
- consume DAuth agent contracts for principal, session, access, scope, delegation, SoD
- remove local security shortcuts

### Do not build this
- agent-local auth truth
- direct privileged tool execution without DAuth mediation

## 13.3 If diagnostics/admin depth is weak
### Build this
- AI admin control plane
- diagnostics surfaces
- prompt/model/runtime governance views
- approval and override visibility

### Do not build this
- hidden configuration files as the operational admin model

---

## 14. Acceptance Criteria

Pass only if:
- AI module concerns are cleanly separated from DOS AI OS concerns
- DAuth governs agent security/control
- AI module owns only domain AI behaviors and AI product surfaces
- diagnostics/admin/tests are explicit
- workflow and approval interactions are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- platform AI OS truth remains buried in the AI module with no ownership correction
- AI bypasses DAuth or workflow for protected actions
- runtime/admin/diagnostics are opaque
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 04 — Governance Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current AI implementation against the full canonical AI target, classify every AI-layer gap, separate DOS/DAuth/module ownership correctly, build only the missing AI artifacts, validate against AI pass/fail rules, and update the as-built ledger.


# Module Patch 04 — Governance Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 04 — Governance Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Governance module** end to end.

It tells an agent exactly how to:
- inspect governance structures, committees, responsibilities, RACI, approvals, strategic alignment, authority linkage, and governance runtime surfaces
- compare current implementation against the canonical governance target
- know what belongs to DOS foundation, DAuth authority/control, workflow, AI intelligence, and Governance itself
- know exactly what to build and what not to duplicate

### 0.4 Module identity
- Module code: `governance`
- Layer: core business domain module
- Criticality: **P0 control and oversight critical**
- Runtime role: governance bodies, committees, responsibilities, oversight flows, board and committee governance, decision tracking, governance operational visibility
- Primary dependency domains: DOS foundation, DAuth authority/delegation/SoD, workflow, reporting, AI/governance-ai, operations

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where runtime-configured governance UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Governance owns directly
Governance owns:
- governance body definitions beyond DOS structural primitives where domain-owned
- committee lifecycle and membership runtime
- governance responsibilities and assignments
- governance RACI templates and assignments
- board pack and governance meeting artifacts where applicable
- governance decision records and oversight flows
- governance dashboards and oversight views
- governance admin and diagnostics surfaces

## 2.2 What Governance consumes from DOS
Governance consumes:
- organizations, business units, departments, teams, positions, legal entities
- foundation ownership and org hierarchy truth
- platform shell, navigation, event backbone, observability

## 2.3 What Governance consumes from DAuth
Governance consumes:
- authority matrix
- sign-off rules
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- access reviews and security controls where relevant

## 2.4 What Governance must not implement
Governance must not own:
- duplicate org hierarchy truth
- duplicate delegation engine
- duplicate SoD engine
- duplicate approval authority engine
- hidden committee powers outside DAuth authority rules

---

## 3. Canonical Backend Structure

```text
backend/src/modules/governance/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  governance.module.ts
```

## 3.1 Required service families
- governance body service
- committee management service
- committee membership service
- governance responsibility service
- governance assignment service
- governance RACI service
- board pack / agenda / decision services if supported
- governance dashboard/summary services
- governance diagnostics and audit services
- governance AI integration services where applicable

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/governance/
  pages/
  components/
  services/
  dashboards/
  committees/
  responsibilities/
  board-packs/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- governance hub
- bodies and committees pages
- memberships and responsibilities
- RACI views
- decision and oversight dashboards
- board or meeting artifacts where applicable
- diagnostics/admin views

---

## 5. Data Model Requirements

Governance may own or consume:
- governance_domains
- governance_bodies
- governance_reporting_lines
- governance_responsibilities
- governance_responsibility_assignments
- governance_raci_templates
- governance_raci_assignments
- board_packs
- board_pack_items
- governance oversight/audit tables

DOS owns org hierarchy truth.
DAuth owns authority, delegation, SoD, sign-off.
Governance owns governance-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- governance body CRUD and retrieval
- committee membership management
- responsibility and assignment management
- RACI configuration and retrieval
- board pack and agenda flows
- oversight dashboards
- admin/diagnostics
- audit and decision trace retrieval

Required contracts:
- governance body
- committee membership
- responsibility assignment
- RACI entry
- oversight summary
- diagnostics/audit contracts

---

## 7. Workflow and DAuth Integration

Governance must integrate with workflow for:
- committee approvals
- decision sign-off
- oversight escalations
- policy/risk/board review linkage
- meeting and action lifecycle flows where applicable

Governance must integrate with DAuth for:
- decision authority
- sign-off authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No governance decision path may rely on role names alone as authority truth.

---

## 8. AI Integration

Allowed AI participation:
- governance signal interpretation
- governance narrative generation
- board/committee summary generation
- oversight recommendation
- governance health scoring
- action prioritization

Restricted AI behavior:
- no autonomous approval/sign-off
- no authority override
- no hidden delegation or SoD bypass
- no governance truth mutation outside approved workflows

---

## 9. UI and Experience Requirements

Governance UI must provide:
- structure visibility
- committee and responsibility management
- RACI surfaces
- board/meeting oversight views
- decision trace
- diagnostics/admin
- narrative/executive summaries where allowed

Must define:
- empty/loading/error
- authority blocked
- delegated
- sign-off required
- escalated
- archived/inactive states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- governance configuration
- committee and body operating states
- sign-off and escalation visibility
- diagnostics and audit tools
- runbook links
- health and ownership views

---

## 11. Observability and Operations

Required logs:
- governance body changes
- membership changes
- responsibility assignments
- sign-off attempts/results
- escalations
- RACI changes
- AI narrative and recommendation usage where applicable

Required metrics:
- active committees
- overdue decisions
- sign-off latency
- escalations
- unresolved governance actions
- attendance or participation metrics where applicable

Required diagnostics:
- blocked sign-off diagnostics
- delegated decision diagnostics
- responsibility coverage diagnostics
- governance hierarchy diagnostics

---

## 12. Required Tests

- governance body and membership tests
- responsibility and RACI tests
- sign-off/authority tests
- delegation and SoD tests
- diagnostics tests
- dashboard/summary tests
- operational smoke tests

---

## 13. Exact Build Instructions

If governance duplicates foundation:
- move structure truth back to DOS foundation
- keep governance-specific overlays in Governance

If governance duplicates delegation or SoD:
- route all control logic through DAuth
- keep only governance-facing adapters and use cases locally

If governance dashboards or summaries are scattered:
- centralize governance runtime surfaces in governance feature packages and typed services

---

## 14. Acceptance Criteria

Pass only if:
- governance owns governance-domain truth only
- DOS owns structural truth
- DAuth owns authority/delegation/SoD/sign-off control
- workflows are explicit
- dashboards/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- governance duplicates org foundation truth
- governance duplicates delegation/SoD/authority engines
- sign-off paths bypass DAuth
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 05 — Risk Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current governance implementation against the full canonical governance target, classify every governance-layer gap, build only the missing governance artifacts, validate against governance pass/fail rules, and update the as-built ledger.

# Module Patch 05 — Risk Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 05 — Risk Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Risk module** end to end.

It tells an agent exactly how to:
- inspect risk registers, scoring, appetite linkage, KRIs, treatment, approvals, reporting, AI assistance, and control integration
- compare current implementation against the canonical risk target
- know what belongs to Risk, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to Reporting/Analytics/AI
- know exactly what artifacts to build and what not to duplicate

### 0.4 Module identity
- Module code: `risk`
- Layer: core business domain module
- Criticality: **P0 core GRC module**
- Runtime role: risk register, scoring, appetite alignment, treatment tracking, KRI monitoring, approval and escalation of risk decisions
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, reporting, analytics, evidence, compliance, governance, AI

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Risk owns directly
Risk owns:
- risk register entries
- risk taxonomy/category mapping as module truth where approved
- inherent/residual scoring
- risk criteria and appetite linkage
- KRI definitions and breach evaluation where module-owned
- treatment plans and action linkage
- risk review and approval flows
- risk dashboards and executive summaries
- risk diagnostics and admin/runtime controls

## 2.2 What Risk consumes from DOS
Risk consumes:
- org structure and ownership assignments
- workspace/product/module context
- event backbone
- observability
- shell/navigation and dashboard frameworks

## 2.3 What Risk consumes from DAuth
Risk consumes:
- access control
- scoped ownership
- approval authority
- sign-off rules
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

## 2.4 What Risk consumes from other modules
- Governance for risk appetite and oversight
- Evidence for evidence linkage
- Compliance for framework/control cross-mapping
- Workflow for review, escalation, and approval flows
- Reporting/Analytics for summaries
- AI for scoring insight and recommendation where allowed

## 2.5 What Risk must not implement
Risk must not own:
- auth/access truth
- duplicate appetite/authority truth outside approved boundaries
- a hidden workflow engine
- a hidden event bus
- local override of SoD or sign-off policy

---

## 3. Canonical Backend Structure

```text
backend/src/modules/risk/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  risk.module.ts
```

## 3.1 Required service families
- risk register service
- risk scoring service
- risk criteria service
- risk appetite linkage service
- KRI service
- treatment plan service
- risk review/approval service
- risk dashboard/summary service
- risk diagnostics service
- risk AI recommendation adapter where applicable
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/risk/
  pages/
  components/
  services/
  dashboards/
  kri/
  treatment/
  review/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- risk hub
- risk register
- risk detail
- scoring and appetite views
- KRI views
- treatment plans
- approval/review views
- executive dashboard
- diagnostics/admin

---

## 5. Data Model Requirements

Risk may own or consume:
- risk register tables
- risk criteria
- risk categories
- appetite mappings
- KRI definitions and breach logs
- treatment plan tables
- review and approval linkage tables
- dashboard and summary runtime support tables where approved
- audit/history tables for risk changes

DOS owns foundation structure.
DAuth owns control truth.
Risk owns risk-domain truth.

---

## 6. API Surface Requirements

Required route groups:
- risk CRUD
- scoring and criteria
- appetite linkage
- KRI management and breach visibility
- treatment plans
- approval/review actions
- dashboard/summary retrieval
- diagnostics/admin

Required contracts:
- risk entity contract
- score contract
- appetite alignment contract
- KRI contract
- treatment plan contract
- review/approval contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Risk must integrate with workflow for:
- risk review states
- approval states
- escalation on high severity or overdue risks
- treatment plan lifecycle
- KRI breach-triggered flows where applicable

Risk must integrate with DAuth for:
- risk ownership scope
- approval authority/sign-off
- self-approval prevention
- delegation
- SoD
- lifecycle authorization

No protected risk approval may be implemented via raw role checks only.

---

## 8. AI Integration

Allowed AI participation:
- scoring assistance
- treatment recommendation
- risk narrative generation
- KRI anomaly or trend summarization
- prioritization and next-best action
- executive summary generation

Restricted AI behavior:
- no autonomous final approval/sign-off
- no hidden score overrides without audit
- no protected mutations outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Risk UI must provide:
- register and detail views
- scoring surfaces
- appetite alignment views
- KRI visuals
- treatment and action views
- review/approval state visibility
- audit and diagnostics surfaces
- executive dashboards

Must define:
- empty/loading/error
- blocked/authority-required
- delegated
- escalated
- overdue
- archived
- accepted/mitigated/closed states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- risk criteria configuration
- appetite linkage configuration visibility
- KRI thresholds and monitoring visibility
- review/approval configuration visibility
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- risk created/updated/closed
- scoring changes
- appetite alignment changes
- KRI breaches
- review/approval outcomes
- delegated or blocked actions
- AI recommendation usage

Required metrics:
- open risk counts by severity
- review latency
- treatment completion rate
- KRI breach rate
- overdue risk rate
- approval block rate

Required diagnostics:
- scoring inconsistency diagnostics
- KRI pipeline diagnostics
- blocked approval diagnostics
- treatment workflow diagnostics

---

## 12. Required Tests

- risk register tests
- scoring and appetite tests
- KRI tests
- treatment plan tests
- approval/authority tests
- delegation and SoD tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If risk scoring is scattered:
- centralize scoring logic and contracts
- keep AI recommendations separate from final scoring truth unless explicitly governed

If risk approvals bypass DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If KRI visibility exists without runtime diagnostics:
- add KRI diagnostics, breach pipeline diagnostics, and operator surfaces

---

## 14. Acceptance Criteria

Pass only if:
- risk-domain truth is centralized in Risk
- DOS and DAuth boundaries are respected
- workflow and approval paths are explicit
- scoring/KRI/treatment/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected approvals bypass DAuth/workflow
- scoring truth is fragmented or hidden
- KRI/treatment runtime lacks diagnostics and tests
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next likely module patch is:

**Module Patch 06 — Compliance Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current risk implementation against the full canonical risk target, classify every risk-layer gap, build only the missing risk artifacts, validate against risk pass/fail rules, and update the as-built ledger.

# Module Patch 06 — Compliance Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 06 — Compliance Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Compliance module** end to end.

It tells an agent exactly how to:
- inspect framework mapping, obligations, controls linkage, assessments, remediation linkage, evidence linkage, regulatory views, and compliance reporting
- compare the current implementation against the canonical compliance target
- know what belongs to Compliance, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `compliance`
- Layer: core business domain module
- Criticality: **P0 core GRC module**
- Runtime role: framework control mapping, obligation tracking, compliance assessments, regulatory alignment, gap visibility, remediation linkage, executive/regulator reporting support
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, evidence, policy, risk, reporting, analytics, AI, integrations

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Compliance owns directly
Compliance owns:
- framework ingestion/runtime representation at module level
- regulatory/control mapping logic for compliance use cases
- obligation and requirement tracking
- compliance assessment runtime
- framework coverage and maturity views
- compliance gap visibility
- remediation linkage orchestration from compliance perspective
- compliance dashboards, summaries, and regulator-facing readiness surfaces
- compliance diagnostics and admin/runtime control surfaces

## 2.2 What Compliance consumes from DOS
Compliance consumes:
- foundation org structure and ownership context
- product/module enablement state
- event backbone
- observability and shell runtime
- provisioning defaults where needed

## 2.3 What Compliance consumes from DAuth
Compliance consumes:
- access and scoped ownership
- review/approval authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization for state-changing actions
- audit/security event contracts

## 2.4 What Compliance consumes from adjacent modules
- Evidence for evidentiary support and freshness
- Policy for policy linkage and policy obligations
- Risk for control-risk linkage and residual exposure context
- Workflow for reviews, assessments, attestations, approvals, and escalations
- Reporting/Analytics for compliance summaries and executive views
- AI for mapping, gap explanation, scoring support, and narrative assistance

## 2.5 What Compliance must not implement
Compliance must not own:
- auth/access truth
- duplicate approval authority truth
- duplicate workflow engine
- duplicate evidence repository truth
- duplicate policy lifecycle truth
- hidden regulator framework truth outside approved registries

---

## 3. Canonical Backend Structure

```text
backend/src/modules/compliance/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  compliance.module.ts
```

## 3.1 Required backend service families
- framework registry/mapping service
- obligation service
- compliance assessment service
- requirement coverage service
- control cross-mapping service
- regulator readiness service
- compliance gap service
- remediation linkage service
- attestation/review service
- compliance dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/compliance/
  pages/
  components/
  services/
  dashboards/
  frameworks/
  obligations/
  assessments/
  gaps/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- compliance hub
- framework catalog/mapping views
- obligation views
- assessment views
- control mapping views
- gap and remediation linkage views
- dashboard and summary views
- diagnostics/admin views

---

## 5. Data Model Requirements

Compliance may own or consume:
- framework registry tables where module-owned
- requirement/obligation tables
- assessment runtime tables
- framework-control mapping tables
- control coverage and maturity runtime tables
- attestation/review tables
- compliance gap and recommendation tables
- regulatory readiness/support tables
- dashboard/summary support tables
- audit/history tables for compliance changes

DOS owns platform/foundation truth.
DAuth owns control truth.
Compliance owns compliance-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- framework and obligation retrieval/management
- mapping and crosswalk surfaces
- assessment create/run/review
- coverage and maturity retrieval
- gap and remediation linkage retrieval
- attestation/review actions
- dashboards and summaries
- diagnostics/admin

Required contracts:
- framework contract
- obligation contract
- assessment contract
- control mapping contract
- coverage/maturity contract
- gap contract
- attestation/review contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Compliance must integrate with workflow for:
- assessment lifecycle
- attestation and review flows
- regulator-readiness review flows
- remediation handoff flows
- escalation on overdue or failed obligations

Compliance must integrate with DAuth for:
- scoped access
- review/approval authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No protected attestation, review, sign-off, or override may bypass DAuth and workflow.

---

## 8. AI Integration

Allowed AI participation:
- framework mapping assistance
- control crosswalk suggestions
- compliance narrative generation
- obligation summarization
- regulator explanation support
- gap prioritization
- evidence sufficiency hints

Restricted AI behavior:
- no silent attestation/sign-off
- no hidden compliance status override
- no regulator-facing output without traceability/audit where required
- no protected mutation outside workflow/DAuth controls

---

## 9. UI and Experience Requirements

Compliance UI must provide:
- framework and obligation visibility
- assessment execution and result surfaces
- mapping/crosswalk surfaces
- coverage and maturity views
- gaps and remediation visibility
- attestation/review state visibility
- diagnostics and admin/runtime surfaces
- executive/regulator summary surfaces where applicable

Must define:
- empty/loading/error
- blocked/authority-required
- delegated
- escalated
- overdue
- failed assessment
- incomplete evidence
- archived/superseded framework states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- framework activation/deactivation visibility
- mapping policy visibility
- assessment cadence/config visibility
- attestation/review controls
- diagnostics and runbook links
- regulator/export configuration visibility where applicable

---

## 11. Observability and Operations

Required logs:
- framework mapping changes
- obligation changes
- assessment starts/completions/failures
- attestation/review decisions
- escalations
- remediation handoff events
- AI recommendation usage where applicable

Required metrics:
- control coverage
- obligation completion
- assessment pass/fail rates
- overdue obligations
- attestation latency
- framework readiness scores

Required diagnostics:
- assessment pipeline diagnostics
- mapping drift diagnostics
- missing evidence diagnostics
- blocked review diagnostics
- overdue obligation diagnostics

---

## 12. Required Tests

- framework mapping tests
- obligation lifecycle tests
- assessment runtime tests
- control mapping/crosswalk tests
- attestation/review tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If framework and mapping logic is fragmented:
- centralize framework/obligation/mapping runtime in Compliance
- use typed contracts for crosswalks and coverage outputs

If protected attestation/review bypasses DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If compliance UI surfaces are present but runtime contracts are weak:
- add explicit contracts for assessment state, coverage state, obligation state, and diagnostics

If regulator-facing outputs exist without auditability:
- add audit references, export controls, and diagnostics before release

---

## 14. Acceptance Criteria

Pass only if:
- compliance-domain truth is centralized in Compliance
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- mapping/assessment/attestation/gap/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected attestation or review bypasses DAuth/workflow
- compliance truth is fragmented across modules with no canonical contract
- regulator-facing outputs lack diagnostics/audit expectations
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 07 — Policy Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current compliance implementation against the full canonical compliance target, classify every compliance-layer gap, build only the missing compliance artifacts, validate against compliance pass/fail rules, and update the as-built ledger.
# Module Patch 07 — Policy Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 07 — Policy Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Policy module** end to end.

It tells an agent exactly how to:
- inspect policy authoring, lifecycle, approval, publication, acknowledgment, exception linkage, versioning, and policy analytics
- compare the current implementation against the canonical policy target
- know what belongs to Policy, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `policy`
- Layer: core business domain module
- Criticality: **P0 governance and compliance critical**
- Runtime role: policy authoring, review, sign-off, publication, acknowledgment, lifecycle control, traceability, and policy effectiveness visibility
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, compliance, risk, exception, reporting, analytics, AI, integrations

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Policy owns directly
Policy owns:
- policy documents and structured policy records
- policy versioning
- policy lifecycle and publication state
- review/sign-off linkage from policy perspective
- policy acknowledgment runtime
- policy exception linkage from policy perspective
- policy distribution/audience targeting
- policy dashboards, summaries, and effectiveness surfaces
- policy diagnostics and admin/runtime controls

## 2.2 What Policy consumes from DOS
Policy consumes:
- org and audience structure
- tenant/workspace/platform context
- shell/navigation/runtime composition
- event backbone
- observability and settings/admin frameworks

## 2.3 What Policy consumes from DAuth
Policy consumes:
- access and scope control
- sign-off authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- access review/security event contracts where relevant

## 2.4 What Policy consumes from adjacent modules
- Compliance for control/obligation linkage
- Risk for risk-policy linkage
- Exception for policy exceptions
- Workflow for review/approval/publication flows
- Reporting/Analytics for summaries and adoption metrics
- AI for authoring support, summarization, diff explanation, and acknowledgment insights

## 2.5 What Policy must not implement
Policy must not own:
- auth/access truth
- duplicate sign-off or authority truth
- duplicate workflow engine
- hidden publication bypass paths
- document truth split across uncontrolled stores without canonical record

---

## 3. Canonical Backend Structure

```text
backend/src/modules/policy/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  policy.module.ts
```

## 3.1 Required backend service families
- policy authoring service
- policy version service
- policy lifecycle service
- policy publication service
- policy acknowledgment service
- policy audience/distribution service
- policy exception linkage service
- policy dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/policy/
  pages/
  components/
  services/
  dashboards/
  authoring/
  acknowledgments/
  publication/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- policy hub
- policy editor/authoring surfaces
- version comparison views
- review/sign-off/publish surfaces
- acknowledgment and audience views
- policy dashboards and summaries
- diagnostics/admin views

---

## 5. Data Model Requirements

Policy may own or consume:
- policy master tables
- policy version tables
- policy publication state tables
- acknowledgment tables
- audience/distribution tables
- exception linkage tables
- document metadata tables
- audit/history tables for policy changes
- dashboard/support tables for policy metrics

DOS owns platform/foundation truth.
DAuth owns control truth.
Policy owns policy-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- policy CRUD
- version create/compare/retrieve
- review/sign-off/publish actions
- acknowledgment actions and tracking
- audience/distribution retrieval
- policy dashboards and summaries
- diagnostics/admin

Required contracts:
- policy contract
- policy version contract
- publication contract
- acknowledgment contract
- audience/distribution contract
- exception linkage contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Policy must integrate with workflow for:
- review lifecycle
- sign-off lifecycle
- publish/unpublish flows
- acknowledgment campaigns where applicable
- escalation for overdue review/sign-off or critical policies

Policy must integrate with DAuth for:
- scoped access
- sign-off authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No publish, retire, override, or sign-off action may bypass workflow + DAuth.

---

## 8. AI Integration

Allowed AI participation:
- policy drafting assistance
- summarization
- version diff explanation
- acknowledgment insight generation
- policy-control linkage suggestions
- policy readability and completeness assistance

Restricted AI behavior:
- no autonomous sign-off or publish
- no hidden final text mutation after approval without traceability
- no protected state transition outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Policy UI must provide:
- authoring and structured editing
- version history and comparison
- review/sign-off/publish visibility
- acknowledgment visibility
- audience/distribution views
- dashboards and summaries
- diagnostics/admin/runtime surfaces

Must define:
- draft/loading/error
- pending review
- authority required
- delegated
- blocked by SoD/self-approval
- published
- superseded
- retired
- acknowledgment overdue

---

## 10. Settings/Admin/Runtime Control

Required controls:
- document and publication policies
- acknowledgment campaign settings visibility
- review/sign-off settings visibility
- diagnostics and runbook links
- document retention/archive controls visibility where applicable

---

## 11. Observability and Operations

Required logs:
- authoring changes
- version creation
- review/sign-off decisions
- publish/unpublish actions
- acknowledgment events
- exception linkage events
- AI assistance usage where applicable

Required metrics:
- draft-to-publish cycle time
- sign-off latency
- acknowledgment completion rates
- overdue reviews
- superseded policy counts
- policy adoption indicators

Required diagnostics:
- publication pipeline diagnostics
- blocked sign-off diagnostics
- acknowledgment distribution diagnostics
- document/version consistency diagnostics

---

## 12. Required Tests

- policy CRUD and versioning tests
- lifecycle and publication tests
- acknowledgment tests
- audience/distribution tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If policy lifecycle and document truth are split:
- centralize canonical policy runtime truth in Policy
- keep external document stores as backing stores, not runtime truth replacements

If publish/sign-off flows bypass DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If AI drafting surfaces exist without approval-safe traceability:
- add explicit draft provenance, version diff trace, and approval-safe finalization rules

---

## 14. Acceptance Criteria

Pass only if:
- policy-domain truth is centralized in Policy
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- authoring/versioning/publication/acknowledgment/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- publish or sign-off bypasses workflow/DAuth
- policy truth is fragmented or hidden
- acknowledgments or publication lack diagnostics and audit expectations
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 08 — Audit Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current policy implementation against the full canonical policy target, classify every policy-layer gap, build only the missing policy artifacts, validate against policy pass/fail rules, and update the as-built ledger.

# Module Patch 08 — Audit Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 08 — Audit Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Audit module** end to end.

It tells an agent exactly how to:
- inspect audit planning, fieldwork, findings, evidence linkage, issue linkage, reporting, follow-up, and audit analytics
- compare the current implementation against the canonical audit target
- know what belongs to Audit, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `audit`
- Layer: core business domain module
- Criticality: **P0 assurance critical**
- Runtime role: audit universe/planning, audit execution, findings and recommendations, audit evidence linkage, issue follow-up, audit reporting, and assurance dashboards
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, evidence, issues, risk, compliance, reporting, analytics, AI, integrations

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Audit owns directly
Audit owns:
- audit plans and schedules
- audit engagements and scope
- audit workpapers and execution state
- findings and recommendations
- issue/follow-up linkage from audit perspective
- audit reporting and summaries
- audit analytics and assurance dashboards
- audit diagnostics and admin/runtime controls

## 2.2 What Audit consumes from DOS
Audit consumes:
- org/foundation structure and ownership context
- platform shell/runtime and navigation
- event backbone
- observability and admin frameworks

## 2.3 What Audit consumes from DAuth
Audit consumes:
- scoped access
- review and approval authority
- sign-off
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- audit/security decision trace where applicable

## 2.4 What Audit consumes from adjacent modules
- Evidence for evidence collection and linkage
- Issues/Remediation for follow-up tracking
- Risk and Compliance for control/risk context
- Workflow for audit stage transitions, approvals, escalations
- Reporting/Analytics for executive and board reporting
- AI for scoping, finding summarization, report assistance, and pattern detection

## 2.5 What Audit must not implement
Audit must not own:
- auth/access truth
- duplicate evidence repository truth
- duplicate issue/remediation truth
- hidden approval/sign-off engines
- hidden workflow engine

---

## 3. Canonical Backend Structure

```text
backend/src/modules/audit/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  audit.module.ts
```

## 3.1 Required backend service families
- audit planning service
- audit engagement service
- fieldwork/workpaper service
- finding service
- recommendation service
- audit reporting service
- issue/follow-up linkage service
- audit dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/audit/
  pages/
  components/
  services/
  dashboards/
  planning/
  fieldwork/
  findings/
  reporting/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- audit hub
- planning/schedule views
- engagement detail
- workpaper/fieldwork surfaces
- findings and recommendations
- reports and summaries
- diagnostics/admin views

---

## 5. Data Model Requirements

Audit may own or consume:
- audit plan/schedule tables
- audit engagement tables
- workpaper/fieldwork tables
- findings and recommendation tables
- report tables
- follow-up linkage tables
- dashboard/support tables
- audit/history tables for assurance traceability

DOS owns platform/foundation truth.
DAuth owns control truth.
Audit owns audit-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- planning and engagement management
- fieldwork/workpaper management
- findings and recommendations
- report generation/retrieval
- follow-up and linkage retrieval
- dashboards and summaries
- diagnostics/admin

Required contracts:
- audit engagement contract
- workpaper contract
- finding contract
- recommendation contract
- report contract
- follow-up linkage contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Audit must integrate with workflow for:
- planning approval
- fieldwork stage transitions
- report sign-off
- finding closure or follow-up flows
- escalation for overdue/high-severity findings

Audit must integrate with DAuth for:
- scoped access
- report/sign-off authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No audit sign-off, finding closure approval, or report release may bypass workflow + DAuth.

---

## 8. AI Integration

Allowed AI participation:
- scoping assistance
- workpaper summarization
- finding and recommendation drafting support
- narrative generation
- anomaly/pattern assistance
- audit report assistance

Restricted AI behavior:
- no autonomous report sign-off
- no hidden finding closure
- no protected state transition outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Audit UI must provide:
- planning and schedule views
- engagement detail and progress
- workpaper/fieldwork surfaces
- findings/recommendations
- report and summary views
- follow-up visibility
- diagnostics/admin/runtime surfaces

Must define:
- draft/loading/error
- in planning
- in fieldwork
- pending review/sign-off
- authority required
- delegated
- escalated
- overdue
- closed/archived states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- audit planning configuration visibility
- report/sign-off configuration visibility
- follow-up cadence and escalation visibility
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- audit plan creation/changes
- fieldwork progress
- finding creation and updates
- report sign-off outcomes
- follow-up events
- escalations
- AI assistance usage where applicable

Required metrics:
- audits by status
- fieldwork cycle time
- finding aging
- overdue follow-ups
- report sign-off latency
- closure rates

Required diagnostics:
- blocked sign-off diagnostics
- fieldwork pipeline diagnostics
- report generation diagnostics
- follow-up backlog diagnostics

---

## 12. Required Tests

- planning and engagement tests
- workpaper/fieldwork tests
- finding and recommendation tests
- report/sign-off tests
- follow-up linkage tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If audit and issue/remediation truth are conflated:
- keep audit findings/recommendations in Audit
- keep downstream issue/remediation runtime truth in the appropriate module with explicit linkage contracts

If report or closure actions bypass DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If fieldwork exists without operational diagnostics:
- add engagement progress diagnostics, stuck-state diagnostics, and admin/runtime support surfaces

---

## 14. Acceptance Criteria

Pass only if:
- audit-domain truth is centralized in Audit
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- planning/fieldwork/findings/reporting/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- sign-off or closure bypasses workflow/DAuth
- audit truth is fragmented or hidden
- follow-up and reporting lack diagnostics/auditability
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 09 — Evidence Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current audit implementation against the full canonical audit target, classify every audit-layer gap, build only the missing audit artifacts, validate against audit pass/fail rules, and update the as-built ledger.

# Module Patch 09 — Evidence Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 09 — Evidence Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Evidence module** end to end.

It tells an agent exactly how to:
- inspect evidence collection, uploads, connector ingestion, freshness, validation, mapping, review, and evidence analytics
- compare the current implementation against the canonical evidence target
- know what belongs to Evidence, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `evidence`
- Layer: core business domain module
- Criticality: **P0 trust and auditability critical**
- Runtime role: evidence repository, ingestion, validation, freshness monitoring, control/assessment linkage, evidence review, and evidence readiness visibility
- Primary dependency domains: DOS storage/events, DAuth control spine, workflow, compliance, audit, risk, integrations, reporting, analytics, AI

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Evidence owns directly
Evidence owns:
- evidence records and metadata
- evidence collection and upload lifecycle
- connector-based evidence ingestion from module perspective
- evidence freshness and staleness evaluation
- evidence validation and review state
- evidence linkage to controls/assessments/findings where applicable
- evidence dashboards and readiness views
- evidence diagnostics and admin/runtime controls

## 2.2 What Evidence consumes from DOS
Evidence consumes:
- file/storage infrastructure
- event backbone
- observability and shell/admin frameworks
- org/foundation context where needed

## 2.3 What Evidence consumes from DAuth
Evidence consumes:
- scoped access
- review/approval authority where required
- delegation
- SoD
- lifecycle authorization
- security classification/clearance gating if applicable

## 2.4 What Evidence consumes from adjacent modules
- Compliance for assessment/control evidence linkage
- Audit for audit workpaper/findings linkage
- Risk for risk evidence linkage where approved
- Workflow for review/escalation/attestation flows
- Integrations for source-system evidence ingestion
- AI for evidence freshness hints, mapping suggestions, and summarization

## 2.5 What Evidence must not implement
Evidence must not own:
- auth/access truth
- duplicate file storage platform truth
- hidden workflow/review engines
- hidden connector frameworks separate from platform integration contracts

---

## 3. Canonical Backend Structure

```text
backend/src/modules/evidence/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  evidence.module.ts
```

## 3.1 Required backend service families
- evidence repository service
- upload/ingestion service
- connector evidence ingestion adapter service
- freshness/staleness service
- validation/review service
- evidence linkage service
- evidence dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/evidence/
  pages/
  components/
  services/
  dashboards/
  uploads/
  freshness/
  review/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- evidence hub
- evidence list/detail
- upload and ingestion views
- freshness/staleness views
- validation/review views
- linkage and readiness views
- diagnostics/admin views

---

## 5. Data Model Requirements

Evidence may own or consume:
- evidence item tables
- evidence metadata tables
- ingestion pipeline tables
- freshness/staleness tables
- review/validation tables
- linkage tables
- dashboard/support tables
- audit/history tables for evidence traceability

DOS owns storage and platform truth.
DAuth owns control truth.
Evidence owns evidence-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- evidence CRUD and retrieval
- upload/ingestion
- freshness/validation/review
- linkage retrieval and actions
- dashboards and summaries
- diagnostics/admin

Required contracts:
- evidence item contract
- upload/ingestion contract
- freshness contract
- validation/review contract
- linkage contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Evidence must integrate with workflow for:
- evidence review/approval
- freshness escalations
- missing-evidence escalation
- attestation flows where evidence sufficiency is protected

Evidence must integrate with DAuth for:
- scoped access
- review authority where required
- delegation
- SoD
- lifecycle authorization
- clearance/classification enforcement where applicable

No protected evidence review or acceptance may bypass workflow + DAuth.

---

## 8. AI Integration

Allowed AI participation:
- evidence mapping suggestions
- freshness prediction
- gap hints
- evidence summarization
- control/evidence association suggestions
- duplicate detection or quality hints

Restricted AI behavior:
- no autonomous final acceptance of protected evidence
- no hidden classification override
- no protected state transition outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Evidence UI must provide:
- evidence list/detail
- upload and ingestion progress
- freshness/staleness visibility
- review/acceptance state visibility
- linkage views
- dashboards and summaries
- diagnostics/admin/runtime surfaces

Must define:
- empty/loading/error
- uploading/processing
- stale
- missing
- pending review
- blocked/authority required
- delegated
- escalated
- archived/superseded states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- ingestion source visibility
- freshness policy visibility
- review policy visibility
- diagnostics and runbook links
- retention and storage-policy visibility where applicable

---

## 11. Observability and Operations

Required logs:
- upload and ingestion actions
- connector ingestion events
- freshness recalculations
- review/validation decisions
- missing/stale escalations
- AI assistance usage where applicable

Required metrics:
- ingestion success/failure
- stale evidence count
- missing evidence count
- review latency
- evidence reuse/linkage rates
- connector health where applicable

Required diagnostics:
- ingestion pipeline diagnostics
- freshness job diagnostics
- failed upload diagnostics
- review blockage diagnostics
- storage/linkage consistency diagnostics

---

## 12. Required Tests

- evidence CRUD tests
- upload/ingestion tests
- freshness/staleness tests
- review/validation tests
- linkage tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If evidence truth is split between file storage and business records:
- keep storage as DOS infrastructure
- keep evidence canonical runtime truth in Evidence with explicit storage references

If evidence review bypasses DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If ingestion exists without diagnostics:
- add ingestion, freshness, and review diagnostics before release

---

## 14. Acceptance Criteria

Pass only if:
- evidence-domain truth is centralized in Evidence
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- ingestion/freshness/review/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected evidence review bypasses workflow/DAuth
- evidence truth is fragmented or hidden
- ingestion/freshness lacks diagnostics or auditability
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 10 — Vendor Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current evidence implementation against the full canonical evidence target, classify every evidence-layer gap, build only the missing evidence artifacts, validate against evidence pass/fail rules, and update the as-built ledger.
# Module Patch 10 — Vendor Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 10 — Vendor Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Vendor module** end to end.

It tells an agent exactly how to:
- inspect vendor inventory, due diligence, tiering, questionnaires, risk scoring, evidence and issue linkage, continuous monitoring, and vendor governance
- compare the current implementation against the canonical vendor target
- know what belongs to Vendor, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `vendor`
- Layer: core business domain module
- Criticality: **P0 third-party risk critical**
- Runtime role: vendor inventory, onboarding, due diligence, tiering, monitoring, assessments, issues, remediation linkage, and vendor oversight
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, risk, compliance, evidence, reporting, analytics, AI, integrations, portals

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Vendor owns directly
Vendor owns:
- vendor master records from module perspective
- vendor tiering and segmentation
- due diligence/questionnaire runtime
- vendor assessments and scoring
- continuous monitoring state from module perspective
- vendor issue and remediation linkage from vendor perspective
- vendor oversight dashboards and summaries
- vendor diagnostics and admin/runtime controls

## 2.2 What Vendor consumes from DOS
Vendor consumes:
- org/foundation context
- platform shell, navigation, and admin frameworks
- event backbone
- observability
- product/module enablement context

## 2.3 What Vendor consumes from DAuth
Vendor consumes:
- scoped access
- review/approval/sign-off authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- external scope/invitation controls where applicable

## 2.4 What Vendor consumes from adjacent modules
- Risk for vendor risk linkage and scoring context
- Compliance for due diligence/compliance obligations
- Evidence for vendor evidence collection
- Workflow for onboarding/review/approval/escalation flows
- Portals/Integrations for external vendor interactions
- Reporting/Analytics for oversight metrics
- AI for questionnaire analysis, scoring hints, and monitoring narratives

## 2.5 What Vendor must not implement
Vendor must not own:
- auth/access truth
- duplicate invitation/external-access truth outside DAuth
- hidden workflow engine
- hidden portal or connector truth outside approved contracts

---

## 3. Canonical Backend Structure

```text
backend/src/modules/vendor/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  vendor.module.ts
```

## 3.1 Required backend service families
- vendor master service
- vendor onboarding service
- vendor tiering service
- due diligence/questionnaire service
- vendor assessment/scoring service
- vendor monitoring service
- vendor issue/remediation linkage service
- vendor dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/vendor/
  pages/
  components/
  services/
  dashboards/
  onboarding/
  assessments/
  monitoring/
  questionnaires/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- vendor hub
- vendor inventory/detail views
- onboarding and due diligence views
- questionnaire and assessment views
- monitoring and scoring views
- dashboards and summaries
- diagnostics/admin views

---

## 5. Data Model Requirements

Vendor may own or consume:
- vendor master tables
- vendor tier/config tables
- questionnaire/assessment tables
- scoring and monitoring tables
- evidence linkage tables
- issue/remediation linkage tables
- dashboard/support tables
- audit/history tables for vendor actions

DOS owns platform/foundation truth.
DAuth owns control truth.
Vendor owns vendor-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- vendor CRUD and retrieval
- onboarding/due diligence
- questionnaire/assessment actions
- scoring/monitoring retrieval
- dashboards and summaries
- diagnostics/admin

Required contracts:
- vendor contract
- tiering contract
- questionnaire/assessment contract
- scoring/monitoring contract
- issue/evidence linkage contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Vendor must integrate with workflow for:
- vendor onboarding review/approval
- assessment review
- issue/remediation escalation
- re-assessment cadence and approvals
- offboarding or suspension flows where applicable

Vendor must integrate with DAuth for:
- scoped access
- sign-off/review authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- external user scope/invitation control where applicable

No protected vendor approval or sign-off may bypass workflow + DAuth.

---

## 8. AI Integration

Allowed AI participation:
- questionnaire summarization
- scoring support
- anomaly and monitoring narrative
- due diligence hinting
- vendor-risk narrative generation
- remediation prioritization support

Restricted AI behavior:
- no autonomous final vendor approval/sign-off
- no hidden risk/tier override
- no protected state transition outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Vendor UI must provide:
- vendor inventory and detail views
- onboarding and due diligence flows
- questionnaires and assessments
- scoring/monitoring visibility
- issue/evidence linkage visibility
- dashboards and summaries
- diagnostics/admin/runtime surfaces

Must define:
- empty/loading/error
- pending due diligence
- pending review
- blocked/authority required
- delegated
- escalated
- monitored
- suspended
- offboarded/archived states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- tiering policy visibility
- questionnaire/assessment configuration visibility
- monitoring cadence visibility
- portal/external-access visibility where applicable
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- vendor onboarding actions
- questionnaire/assessment events
- scoring changes
- monitoring events
- approval/sign-off events
- issue/remediation linkage events
- AI assistance usage where applicable

Required metrics:
- vendors by tier/status
- assessment completion rate
- overdue reviews
- monitoring alerts
- issue/remediation backlog
- onboarding cycle time

Required diagnostics:
- onboarding pipeline diagnostics
- questionnaire/assessment diagnostics
- monitoring pipeline diagnostics
- blocked approval diagnostics
- portal/external-access diagnostics where applicable

---

## 12. Required Tests

- vendor CRUD tests
- tiering and onboarding tests
- questionnaire/assessment tests
- monitoring/scoring tests
- issue/evidence linkage tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If vendor onboarding and portal/external access are conflated:
- keep vendor-domain runtime truth in Vendor
- keep external access/invitation/security truth in DAuth and portal contracts

If vendor approvals bypass DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If vendor monitoring exists without diagnostics:
- add monitoring, onboarding, and assessment diagnostics before release

---

## 14. Acceptance Criteria

Pass only if:
- vendor-domain truth is centralized in Vendor
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- onboarding/assessment/monitoring/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected vendor approval/sign-off bypasses workflow/DAuth
- vendor truth is fragmented or hidden
- monitoring/onboarding lacks diagnostics or auditability
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next likely module patch is:

**Module Patch 11 — Reporting Module End-to-End** or the next priority module in your sequence.

---

## 17. One-Line Use Instruction

Use this patch to compare the current vendor implementation against the full canonical vendor target, classify every vendor-layer gap, build only the missing vendor artifacts, validate against vendor pass/fail rules, and update the as-built ledger.



# Module Patches 11–16

This document continues the module-specific end-to-end patch library and is designed to be consumed by implementation, audit, gap-filling, and review agents.

These patches follow the same inheritance model and enforcement logic established in Patch 0 and the prior module patches.

---

# Module Patch 11 — Reporting Module End-to-End

## Patch Identity

**Module code:** `reporting`

**Purpose:** Defines the canonical product-grade target for report definitions, report generation, scheduled runs, export packaging, protected distribution, executive packs, board packs, report diagnostics, and reporting admin/runtime surfaces.

## Inheritance

Applies Patch 0, Patch 1, Patch 3, Patch 4, Patch 5, Patch 6, Patch 7, Patch 8 where AI participates, Patch 9, Patch 10 where dynamic UI exists, Patch 11, Patch 12, Patch 13, Patch 14, Patch 15.

## What Reporting owns

* report definitions and templates
* report generation orchestration and run state
* export packaging and delivery records
* scheduled run configuration
* board pack and executive pack composition from reporting perspective
* reporting dashboards and reporting diagnostics
* reporting admin/runtime control surfaces

## What Reporting consumes from DOS

* storage and file delivery infrastructure
* event backbone
* shell/runtime composition
* scheduling infrastructure
* notifications where DOS owns the delivery primitive

## What Reporting consumes from DAuth

* scoped access and data visibility
* release/sign-off authority for protected reports
* delegation
* SoD
* lifecycle authorization for protected publish/release actions
* audit/security decision contracts

## What Reporting consumes from adjacent modules

* Analytics for aggregation inputs
* Risk, Compliance, Audit, Evidence, Policy, Vendor, Incident, and other product modules as source providers
* Workflow for review, release, distribution, and escalation gates
* AI for narrative drafting and summary support

## What Reporting must never implement

* its own auth or access truth
* its own notification truth
* ad hoc extract paths that bypass DAuth and source contracts
* hidden release engines

## Canonical backend structure

```text
backend/src/modules/reporting/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  exporters/
  templates/
  distribution/
  mappers/
  policies/
  data/
  index.ts
  reporting.module.ts
```

## Required backend services

* ReportDefinitionService
* ReportTemplateService
* ReportGenerationService
* ReportRunService
* ReportScheduleService
* ExportPackagingService
* ReportDistributionService
* BoardPackCompositionService
* ReportingDashboardService
* ReportingDiagnosticsService
* ReportingAdminService

## Canonical frontend structure

```text
frontend/src/app/features/reporting/
  pages/
  components/
  services/
  dashboards/
  templates/
  schedules/
  exports/
  distributions/
  board-packs/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

## Required UI surfaces

* reporting hub
* report catalog/detail
* template or builder surfaces
* generation history and run monitor
* schedule management
* delivery and distribution views
* board pack and executive pack views
* diagnostics/admin views

## Data model expectations

* report definitions
* report templates
* report runs and histories
* schedule tables
* export artifact records
* delivery/distribution records
* board pack bundle tables
* reporting audit/history tables

## API groups

* definition/template CRUD
* run generation and retrieval
* scheduling actions
* export/distribution actions
* board pack actions
* dashboards and summaries
* diagnostics/admin

## Workflow + DAuth requirements

Protected release, distribution, executive pack sign-off, and regulator-facing outputs must go through workflow + DAuth. No protected release path may bypass authority, SoD, delegation, or lifecycle authorization.

## AI rules

Allowed:

* narrative drafting
* executive summary generation
* regulator summary support
* anomaly explanation support

Forbidden:

* autonomous protected release
* hidden data selection outside authorized scope
* protected transitions outside workflow + DAuth

## UI states

* empty
* loading
* error
* generating
* scheduled
* failed
* awaiting review/sign-off
* blocked/authority required
* delegated
* distributed
* archived

## Settings/admin/runtime controls

* export format visibility
* retention and schedule settings visibility
* distribution channel visibility
* release policy visibility
* diagnostics and runbook visibility

## Observability

**Logs:** report changes, run start/finish/failure, export events, delivery outcomes, protected release decisions, AI usage.

**Metrics:** run success/failure, latency, delivery success, release latency, top report usage, stale schedule counts.

**Diagnostics:** generation pipeline diagnostics, export diagnostics, delivery diagnostics, permission/scope block diagnostics, source-readiness diagnostics.

## Tests

* definition/template tests
* generation/run tests
* schedule tests
* export/distribution tests
* board pack composition tests
* DAuth authority/SoD/delegation tests
* diagnostics tests
* operational smoke tests

## Build instructions

* Replace hidden report extraction with explicit module contracts.
* Enforce DAuth scope at report assembly and release layers.
* Route protected releases through workflow + DAuth.
* Add generation, data-source, and delivery diagnostics before release.

## Acceptance criteria

Pass only if reporting truth is centralized, DOS/DAuth boundaries are respected, workflow integration is explicit, all runtime/admin/diagnostic/test artifacts exist, and as-built updates are explicit.

## Fail conditions

Fail if protected release bypasses workflow/DAuth, reporting truth is fragmented, exports/distribution lack diagnostics, or any artifact class is skipped.

---

# Module Patch 12 — Analytics Module End-to-End

## Patch Identity

**Module code:** `analytics`

**Purpose:** Defines the canonical target for KPI/KRI computation, metric derivation, trend analysis, benchmark outputs, anomaly views, analytic APIs, and analytics diagnostics.

## What Analytics owns

* derived metrics and analytical views
* KPI/KRI computation models
* aggregation pipelines and snapshots
* anomaly and trend views
* benchmark/comparison outputs
* analytics dashboards and diagnostics
* analytics admin/runtime controls

## What Analytics consumes from DOS

* event streams and telemetry
* job infrastructure
* shell/runtime composition
* observability primitives
* platform/module registry context where approved

## What Analytics consumes from DAuth

* scoped data visibility
* authority-aware visibility when protected analytics exist
* delegation
* SoD for protected publish/recompute actions
* lifecycle authorization

## What Analytics consumes from adjacent modules

* Risk, Compliance, Audit, Evidence, Incident, Vendor, Policy, Workflow, Reporting, and AI as source fact providers

## What Analytics must never implement

* source-of-truth business objects
* auth/access truth
* hidden ETL or shadow data pipelines outside governed contracts
* report distribution truth

## Canonical backend structure

```text
backend/src/modules/analytics/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  pipelines/
  aggregations/
  mappers/
  policies/
  data/
  index.ts
  analytics.module.ts
```

## Required backend services

* MetricRegistryService
* KpiKriComputationService
* AggregationPipelineService
* SnapshotMaterializationService
* TrendService
* BenchmarkService
* AnomalyService
* AnalyticsApiService
* AnalyticsDashboardService
* AnalyticsDiagnosticsService
* AnalyticsAdminService

## Canonical frontend structure

```text
frontend/src/app/features/analytics/
  pages/
  components/
  services/
  dashboards/
  kpis/
  kris/
  trends/
  benchmarks/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

## Required UI surfaces

* analytics hub
* KPI/KRI dashboards
* trend views
* benchmark views
* anomaly/drilldown views
* diagnostics/admin views

## Data model expectations

* metric definitions
* aggregation jobs and runs
* snapshots/materializations
* benchmark datasets where approved
* anomaly/trend tables
* dashboard/support tables
* analytics recalculation audit/history

## API groups

* metric definition retrieval/management
* KPI/KRI retrieval
* trend/benchmark retrieval
* anomaly retrieval
* protected recompute/publish actions where approved
* dashboards and summaries
* diagnostics/admin

## Workflow + DAuth requirements

Certified or protected analytics publication must use workflow + DAuth. Analytics may not silently republish or reclassify access scope.

## AI rules

Allowed:

* anomaly explanation
* trend narration
* insight summarization
* benchmark interpretation

Forbidden:

* silent mutation of certified metrics
* protected publish actions outside workflow + DAuth
* hidden scope reclassification

## UI states

* empty
* loading
* error
* recomputing
* stale snapshot
* failed pipeline
* blocked visibility
* certified/published
* archived

## Settings/admin/runtime controls

* metric configuration visibility
* pipeline cadence visibility
* certified snapshot visibility
* diagnostics and runbook visibility
* freshness policy visibility

## Observability

**Logs:** metric changes, recompute runs, snapshot publication events, anomaly pipeline outcomes, AI usage.

**Metrics:** pipeline success/failure, freshness lag, recompute latency, anomaly counts, snapshot usage, dashboard latency.

**Diagnostics:** pipeline diagnostics, stale snapshot diagnostics, source-readiness diagnostics, blocked visibility diagnostics, materialization health diagnostics.

## Tests

* metric definition tests
* KPI/KRI computation tests
* trend/benchmark tests
* anomaly tests
* protected publish/recompute tests
* DAuth scope/authority/delegation tests
* diagnostics tests
* operational smoke tests

## Build instructions

* Move source-of-truth data back to domain modules if Analytics owns it.
* Keep only approved derivatives/materializations in Analytics.
* Route protected publication through workflow + DAuth.
* Add source-readiness, freshness, and failure diagnostics.

## Acceptance criteria

Pass only if analytics truth is centralized, source truth remains with domain modules, boundaries are respected, and metrics/pipelines/diagnostics/tests are explicit.

## Fail conditions

Fail if Analytics becomes shadow source truth, protected publication bypasses workflow/DAuth, pipelines lack diagnostics, or artifact classes are skipped.

---

# Module Patch 13 — Incident Module End-to-End

## Patch Identity

**Module code:** `incident`

**Purpose:** Defines the canonical target for incident intake, severity, triage, response, investigation, closure, post-incident review, incident evidence linkage, and incident diagnostics.

## What Incident owns

* incident master records
* classification and severity models
* triage and response state from the incident perspective
* investigation timeline and response actions
* evidence linkage from the incident perspective
* post-incident review surfaces
* dashboards, summaries, diagnostics, and admin/runtime controls

## What Incident consumes from DOS

* event backbone
* notification primitives
* shell/runtime composition
* observability
* org/foundation visibility and tenant context

## What Incident consumes from DAuth

* scoped access
* response/closure/sign-off authority
* delegation
* SoD
* self-approval prevention where protected closure exists
* lifecycle authorization

## What Incident consumes from adjacent modules

* Evidence for attachments and linkage
* Risk for root-cause context
* Compliance/Audit for reportability and follow-up
* Workflow for transitions and escalations
* Reporting/Analytics for incident metrics
* AI for classification, summarization, and response guidance

## What Incident must never implement

* auth/access truth
* hidden messaging engines outside platform infrastructure
* hidden workflow truth
* duplicate evidence truth

## Canonical backend structure

```text
backend/src/modules/incident/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  investigations/
  response/
  mappers/
  policies/
  data/
  index.ts
  incident.module.ts
```

## Required backend services

* IncidentIntakeService
* SeverityClassificationService
* TriageAssignmentService
* ResponseContainmentService
* InvestigationService
* ClosureAndPostIncidentReviewService
* EvidenceLinkageService
* IncidentDashboardService
* IncidentDiagnosticsService
* IncidentAdminService

## Canonical frontend structure

```text
frontend/src/app/features/incident/
  pages/
  components/
  services/
  dashboards/
  triage/
  investigation/
  response/
  post-incident/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

## Required UI surfaces

* incident hub
* intake/detail views
* triage and severity surfaces
* response/investigation surfaces
* post-incident review surfaces
* dashboards and summaries
* diagnostics/admin views

## Data model expectations

* incident master tables
* classification/severity tables
* response action tables
* investigation timeline tables
* post-incident review tables
* evidence linkage tables
* dashboard/support tables
* incident audit/history tables

## API groups

* intake and CRUD
* triage/assignment
* response/investigation actions
* closure/post-incident review actions
* dashboards and summaries
* diagnostics/admin

## Workflow + DAuth requirements

Protected closure and incident sign-off must use workflow + DAuth. Severity escalation and closure must never bypass lifecycle authorization, SoD, delegation, or self-approval rules.

## AI rules

Allowed:

* classification support
* timeline synthesis
* investigation summary support
* response guidance support
* lesson-drafting support

Forbidden:

* autonomous protected closure
* hidden severity override without traceability
* protected transitions outside workflow + DAuth

## UI states

* empty
* loading
* error
* open
* triaged
* investigating
* escalated
* blocked/authority required
* delegated
* resolved pending review
* closed
* archived

## Settings/admin/runtime controls

* severity policy visibility
* escalation policy visibility
* closure/review controls
* diagnostics and runbook links
* communication policy visibility where applicable

## Observability

**Logs:** incident changes, triage changes, response actions, closure/review decisions, escalations, AI usage.

**Metrics:** incident counts by severity/status, response and closure latency, overdue investigations, repeat-incident indicators, escalation rates.

**Diagnostics:** stuck incident diagnostics, escalation diagnostics, blocked closure diagnostics, investigation integrity diagnostics, delivery diagnostics where applicable.

## Tests

* incident CRUD/intake tests
* triage/severity tests
* investigation/response tests
* closure/post-incident tests
* evidence linkage tests
* DAuth authority/SoD/delegation/lifecycle tests
* diagnostics tests
* operational smoke tests

## Build instructions

* Route protected actions through workflow + DAuth lifecycle authorization.
* Centralize severity policy in Incident with typed contracts.
* Add stuck-state, escalation, and closure diagnostics before release.

## Acceptance criteria

Pass only if incident truth is centralized, DOS/DAuth boundaries are respected, workflow integration is explicit, and all runtime/admin/diagnostic/test artifacts exist.

## Fail conditions

Fail if protected closure bypasses workflow/DAuth, incident truth is fragmented, severity/escalation lacks diagnostics, or artifact classes are skipped.

---

# Module Patch 14 — Controls Module End-to-End

## Patch Identity

**Module code:** `controls`

**Purpose:** Defines the canonical target for the control library, control ownership, mappings, effectiveness/testing, automation state, control diagnostics, and control governance.

## What Controls owns

* control master records
* control taxonomy and classification
* control design and implementation metadata
* control ownership state from the controls perspective
* control-to-framework, control-to-risk, and control-to-policy mappings where control-owned
* effectiveness/testing state from the controls perspective
* control automation state where supported
* dashboards, summaries, diagnostics, and admin/runtime controls

## What Controls consumes from DOS

* foundation structure for ownership scope
* shell/runtime composition
* event backbone
* observability
* platform context

## What Controls consumes from DAuth

* scoped access
* protected approval/sign-off authority
* delegation
* SoD
* self-approval prevention where protected state changes exist
* lifecycle authorization

## What Controls consumes from adjacent modules

* Compliance for framework obligations
* Risk for control-risk relationships
* Evidence for evidence linkage
* Audit for control testing and findings linkage
* Workflow for approval and lifecycle transitions
* Reporting/Analytics for summaries
* AI for mapping and optimization suggestions

## What Controls must never implement

* auth/access truth
* hidden workflow engines
* duplicate evidence or audit truth
* hidden sign-off shortcuts outside workflow + DAuth

## Canonical backend structure

```text
backend/src/modules/controls/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappings/
  effectiveness/
  automation/
  mappers/
  policies/
  data/
  index.ts
  controls.module.ts
```

## Required backend services

* ControlLibraryService
* ControlDesignService
* ControlOwnershipService
* ControlMappingService
* ControlEffectivenessService
* ControlAutomationStateService
* ControlsDashboardService
* ControlsDiagnosticsService
* ControlsAdminService

## Canonical frontend structure

```text
frontend/src/app/features/controls/
  pages/
  components/
  services/
  dashboards/
  library/
  mappings/
  effectiveness/
  automation/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

## Required UI surfaces

* controls hub
* control library/detail views
* mapping views
* effectiveness/testing views
* automation/state views
* dashboards and summaries
* diagnostics/admin views

## Data model expectations

* control master tables
* control taxonomy tables
* control ownership state tables
* control mapping tables
* effectiveness/testing state tables
* automation state tables
* dashboard/support tables
* control audit/history tables

## API groups

* control CRUD and library retrieval
* ownership/mapping actions
* effectiveness/testing retrieval/actions
* automation/state actions where approved
* dashboards and summaries
* diagnostics/admin

## Workflow + DAuth requirements

Protected control approvals, retirements, activations, and high-impact mapping changes must use workflow + DAuth.

## AI rules

Allowed:

* control drafting support
* mapping suggestions
* optimization hints
* effectiveness narratives
* automation opportunity suggestions

Forbidden:

* autonomous protected approval
* hidden ownership reassignment
* protected transitions outside workflow + DAuth

## UI states

* empty
* loading
* error
* draft
* active
* under review
* blocked/authority required
* delegated
* ineffective/failed
* retired
* archived

## Settings/admin/runtime controls

* taxonomy visibility
* testing/effectiveness policy visibility
* automation policy visibility
* diagnostics and runbook links
* protected transition rule visibility

## Observability

**Logs:** control changes, ownership/mapping changes, testing outcomes, automation changes, approval decisions, AI usage.

**Metrics:** active controls, ineffective controls, overdue tests, automation coverage, ownership gaps, mapping completeness.

**Diagnostics:** mapping consistency diagnostics, ownership-gap diagnostics, test/effectiveness diagnostics, protected-transition diagnostics, automation diagnostics.

## Tests

* control CRUD/library tests
* ownership/mapping tests
* effectiveness/testing tests
* automation-state tests
* DAuth authority/SoD/delegation/lifecycle tests
* diagnostics tests
* operational smoke tests

## Build instructions

* Centralize control runtime truth in Controls.
* Keep cross-module references explicit through contracts.
* Route protected actions through workflow + DAuth.
* Add stale-test, ownership-gap, and mapping diagnostics before release.

## Acceptance criteria

Pass only if control truth is centralized, DOS/DAuth boundaries are respected, workflow integration is explicit, and all library/mapping/effectiveness/admin/diagnostic/test artifacts exist.

## Fail conditions

Fail if protected control actions bypass workflow/DAuth, truth is fragmented, testing/mapping lacks diagnostics, or artifact classes are skipped.

---

# Module Patch 15 — Exception Module End-to-End

## Patch Identity

**Module code:** `exception`

**Purpose:** Defines the canonical target for exception intake, rationale, compensating controls, approval lifecycle, expiry and renewal, exception dashboards, and exception diagnostics.

## What Exception owns

* exception master records
* request intake and rationale
* compensating-control association from the exception perspective
* expiry and renewal logic
* approval/review state
* dashboards, summaries, diagnostics, and admin/runtime controls

## What Exception consumes from DOS

* shell/runtime composition
* event backbone
* observability
* org/foundation visibility and tenant context

## What Exception consumes from DAuth

* scoped access
* approval/sign-off authority
* delegation
* SoD
* self-approval prevention
* lifecycle authorization

## What Exception consumes from adjacent modules

* Risk for risk acceptance linkage
* Controls and Compliance for control and obligation linkage
* Policy for policy exception linkage
* Workflow for approval and renewal flows
* Reporting/Analytics for oversight
* AI for rationale summarization and review support

## What Exception must never implement

* auth/access truth
* risk-acceptance authority truth
* hidden approval workflows
* duplicate control or policy truth

## Canonical backend structure

```text
backend/src/modules/exception/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  renewals/
  approvals/
  mappers/
  policies/
  data/
  index.ts
  exception.module.ts
```

## Required backend services

* ExceptionIntakeService
* ExceptionJustificationService
* CompensatingControlLinkageService
* ExceptionApprovalService
* ExceptionRenewalService
* ExceptionDashboardService
* ExceptionDiagnosticsService
* ExceptionAdminService

## Canonical frontend structure

```text
frontend/src/app/features/exception/
  pages/
  components/
  services/
  dashboards/
  intake/
  approvals/
  renewals/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

## Required UI surfaces

* exception hub
* request/detail views
* approval/review views
* expiry/renewal views
* dashboards and summaries
* diagnostics/admin views

## Data model expectations

* exception master tables
* rationale/justification tables
* compensating-control linkage tables
* approval/review state tables
* expiry/renewal tables
* dashboard/support tables
* exception audit/history tables

## API groups

* exception CRUD/intake
* approval/review actions
* expiry/renewal actions
* dashboards and summaries
* diagnostics/admin

## Workflow + DAuth requirements

Exception approval, renewal approval, revocation, and closure must use workflow + DAuth.

## AI rules

Allowed:

* rationale summarization
* compensating-control suggestion support
* expiry/renewal risk narratives
* oversight summaries

Forbidden:

* autonomous protected approval
* hidden risk acceptance override
* protected transitions outside workflow + DAuth

## UI states

* empty
* loading
* error
* draft
* submitted
* under review
* blocked/authority required
* delegated
* approved active
* expiring
* expired
* revoked
* closed

## Settings/admin/runtime controls

* exception policy visibility
* expiry/renewal settings visibility
* compensating-control policy visibility
* diagnostics and runbook links

## Observability

**Logs:** create/update, justification changes, approval decisions, renewals/expiries, escalations, AI usage.

**Metrics:** open exceptions, expiring exceptions, overdue renewals, high-risk counts, approval latency, revoked/closed counts.

**Diagnostics:** expiry pipeline diagnostics, blocked approval diagnostics, compensating-control linkage diagnostics, stale exception diagnostics.

## Tests

* exception CRUD/intake tests
* approval/review tests
* renewal/expiry tests
* linkage tests
* DAuth authority/SoD/delegation/lifecycle tests
* diagnostics tests
* operational smoke tests

## Build instructions

* Route protected actions through workflow + DAuth lifecycle authorization.
* Centralize explicit renewal and expiry contracts in Exception.
* Add renewal, approval, and stale-state diagnostics before release.

## Acceptance criteria

Pass only if exception truth is centralized, DOS/DAuth boundaries are respected, workflow integration is explicit, and intake/approval/renewal/admin/diagnostic/test artifacts exist.

## Fail conditions

Fail if protected transitions bypass workflow/DAuth, truth is fragmented, expiry/approval lacks diagnostics, or artifact classes are skipped.

---

# Module Patch 16 — Remediation Module End-to-End

## Patch Identity

**Module code:** `remediation`

**Purpose:** Defines the canonical target for corrective action planning, assignment, due dates, escalations, verification, closure, dashboards, and remediation diagnostics.

## What Remediation owns

* remediation master records
* remediation plans and action structures
* assignment and due-date management from the remediation perspective
* escalation and overdue handling
* verification and closure state
* dashboards, summaries, diagnostics, and admin/runtime controls

## What Remediation consumes from DOS

* shell/runtime composition
* notifications and event backbone
* observability
* org/foundation visibility and tenant context

## What Remediation consumes from DAuth

* scoped access
* assignment/verification/closure authority where protected
* delegation
* SoD
* self-approval prevention where protected verification exists
* lifecycle authorization

## What Remediation consumes from adjacent modules

* Incident, Audit, Compliance, Risk, Vendor, Controls, and other modules as remediation sources
* Workflow for approvals, escalations, verification, and closure
* Reporting/Analytics for performance visibility
* AI for plan drafting and progress summarization

## What Remediation must never implement

* auth/access truth
* hidden task engines outside approved workflow/runtime contracts
* source-of-truth issue or finding records
* hidden closure approval flows outside workflow + DAuth

## Canonical backend structure

```text
backend/src/modules/remediation/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  plans/
  verification/
  escalations/
  mappers/
  policies/
  data/
  index.ts
  remediation.module.ts
```

## Required backend services

* RemediationIntakeService
* RemediationPlanService
* AssignmentDueDateService
* EscalationOverdueService
* VerificationClosureService
* RemediationDashboardService
* RemediationDiagnosticsService
* RemediationAdminService

## Canonical frontend structure

```text
frontend/src/app/features/remediation/
  pages/
  components/
  services/
  dashboards/
  plans/
  assignments/
  verification/
  escalations/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

## Required UI surfaces

* remediation hub
* remediation detail and plan views
* assignment and progress views
* verification and closure views
* dashboards and summaries
* diagnostics/admin views

## Data model expectations

* remediation master tables
* plan/action tables
* assignment and due-date tables
* escalation tables
* verification/closure tables
* dashboard/support tables
* remediation audit/history tables

## API groups

* remediation CRUD/intake
* plan and assignment actions
* escalation actions
* verification/closure actions
* dashboards and summaries
* diagnostics/admin

## Workflow + DAuth requirements

Protected verification and closure must use workflow + DAuth. Cross-domain closure handshakes must be explicit.

## AI rules

Allowed:

* plan drafting
* prioritization support
* progress summarization
* blockage explanation support
* escalation narratives

Forbidden:

* autonomous protected closure
* hidden assignment override
* protected transitions outside workflow + DAuth

## UI states

* empty
* loading
* error
* planned
* in progress
* blocked
* escalated
* blocked/authority required
* delegated
* pending verification
* closed
* archived

## Settings/admin/runtime controls

* SLA and due-date policy visibility
* escalation policy visibility
* verification/closure controls
* diagnostics and runbook links

## Observability

**Logs:** remediation changes, assignment events, escalation events, verification/closure decisions, overdue processing, AI usage.

**Metrics:** open remediation counts, overdue counts, closure latency, reassignment rates, blocked counts, source-to-remediation conversion metrics.

**Diagnostics:** overdue pipeline diagnostics, blocked closure diagnostics, assignment health diagnostics, escalation pipeline diagnostics.

## Tests

* remediation CRUD/intake tests
* plan/assignment tests
* escalation tests
* verification/closure tests
* DAuth authority/SoD/delegation/lifecycle tests
* diagnostics tests
* operational smoke tests

## Build instructions

* Centralize remediation runtime truth in Remediation if hidden in source modules.
* Keep source links explicit through contracts.
* Route protected actions through workflow + DAuth lifecycle authorization.
* Add overdue, blockage, and closure diagnostics before release.

## Acceptance criteria

Pass only if remediation truth is centralized, DOS/DAuth boundaries are respected, workflow integration is explicit, and all plan/assignment/escalation/verification/admin/diagnostic/test artifacts exist.

## Fail conditions

Fail if protected verification/closure bypasses workflow/DAuth, truth is fragmented, escalations/closure lack diagnostics, or artifact classes are skipped.

---

## Next recommended sequence

Continue with the next remaining module-specific end-to-end patches in priority order across the remaining module map.

---

# Module Patch Library — Complete Index (MP-01 through MP-44)

> **44 module patches** covering every module in the system. MP-01–MP-16 are inline above.
> MP-01–MP-44 are also available as standalone files in [`complete_module_patch_library/`](complete_module_patch_library/).

## Quick Reference

| MP | Module | Standalone File |
|----|--------|----------------|
| 01 | Onboarding | [`module-patch-01-onboarding-end-to-end.md`](complete_module_patch_library/module-patch-01-onboarding-end-to-end.md) |
| 02 | Workflow | [`module-patch-02-workflow-end-to-end.md`](complete_module_patch_library/module-patch-02-workflow-end-to-end.md) |
| 03 | AI | [`module-patch-03-ai-end-to-end.md`](complete_module_patch_library/module-patch-03-ai-end-to-end.md) |
| 04 | Governance | [`module-patch-04-governance-end-to-end.md`](complete_module_patch_library/module-patch-04-governance-end-to-end.md) |
| 05 | Risk | [`module-patch-05-risk-end-to-end.md`](complete_module_patch_library/module-patch-05-risk-end-to-end.md) |
| 06 | Compliance | [`module-patch-06-compliance-end-to-end.md`](complete_module_patch_library/module-patch-06-compliance-end-to-end.md) |
| 07 | Policy | [`module-patch-07-policy-end-to-end.md`](complete_module_patch_library/module-patch-07-policy-end-to-end.md) |
| 08 | Audit | [`module-patch-08-audit-end-to-end.md`](complete_module_patch_library/module-patch-08-audit-end-to-end.md) |
| 09 | Evidence | [`module-patch-09-evidence-end-to-end.md`](complete_module_patch_library/module-patch-09-evidence-end-to-end.md) |
| 10 | Vendor | [`module-patch-10-vendor-end-to-end.md`](complete_module_patch_library/module-patch-10-vendor-end-to-end.md) |
| 11 | Reporting | [`module-patch-11-reporting-end-to-end.md`](complete_module_patch_library/module-patch-11-reporting-end-to-end.md) |
| 12 | Analytics | [`module-patch-12-analytics-end-to-end.md`](complete_module_patch_library/module-patch-12-analytics-end-to-end.md) |
| 13 | Incident | [`module-patch-13-incident-end-to-end.md`](complete_module_patch_library/module-patch-13-incident-end-to-end.md) |
| 14 | Controls | [`module-patch-14-controls-end-to-end.md`](complete_module_patch_library/module-patch-14-controls-end-to-end.md) |
| 15 | Exception | [`module-patch-15-exception-end-to-end.md`](complete_module_patch_library/module-patch-15-exception-end-to-end.md) |
| 16 | Remediation | [`module-patch-16-remediation-end-to-end.md`](complete_module_patch_library/module-patch-16-remediation-end-to-end.md) |
| 17 | Action | [`module-patch-17-action-end-to-end.md`](complete_module_patch_library/module-patch-17-action-end-to-end.md) |
| 18 | Admin | [`module-patch-18-admin-end-to-end.md`](complete_module_patch_library/module-patch-18-admin-end-to-end.md) |
| 19 | AGRC Engine | [`module-patch-19-agrc-engine-end-to-end.md`](complete_module_patch_library/module-patch-19-agrc-engine-end-to-end.md) |
| 20 | AI Governance | [`module-patch-20-ai-governance-end-to-end.md`](complete_module_patch_library/module-patch-20-ai-governance-end-to-end.md) |
| 21 | Asset | [`module-patch-21-asset-end-to-end.md`](complete_module_patch_library/module-patch-21-asset-end-to-end.md) |
| 22 | BCP | [`module-patch-22-bcp-end-to-end.md`](complete_module_patch_library/module-patch-22-bcp-end-to-end.md) |
| 23 | Bootstrap | [`module-patch-23-bootstrap-end-to-end.md`](complete_module_patch_library/module-patch-23-bootstrap-end-to-end.md) |
| 24 | Dashboard | [`module-patch-24-dashboard-end-to-end.md`](complete_module_patch_library/module-patch-24-dashboard-end-to-end.md) |
| 25 | DORA | [`module-patch-25-dora-end-to-end.md`](complete_module_patch_library/module-patch-25-dora-end-to-end.md) |
| 26 | Governance AI | [`module-patch-26-governance-ai-end-to-end.md`](complete_module_patch_library/module-patch-26-governance-ai-end-to-end.md) |
| 27 | Governance OS | [`module-patch-27-governance-os-end-to-end.md`](complete_module_patch_library/module-patch-27-governance-os-end-to-end.md) |
| 28 | Integrations | [`module-patch-28-integrations-end-to-end.md`](complete_module_patch_library/module-patch-28-integrations-end-to-end.md) |
| 29 | Inbox | [`module-patch-29-inbox-end-to-end.md`](complete_module_patch_library/module-patch-29-inbox-end-to-end.md) |
| 30 | Issues | [`module-patch-30-issues-end-to-end.md`](complete_module_patch_library/module-patch-30-issues-end-to-end.md) |
| 31 | Journey | [`module-patch-31-journey-end-to-end.md`](complete_module_patch_library/module-patch-31-journey-end-to-end.md) |
| 32 | KSA Regulatory | [`module-patch-32-ksa-regulatory-end-to-end.md`](complete_module_patch_library/module-patch-32-ksa-regulatory-end-to-end.md) |
| 33 | Local Knowledge | [`module-patch-33-local-knowledge-end-to-end.md`](complete_module_patch_library/module-patch-33-local-knowledge-end-to-end.md) |
| 34 | Navigation | [`module-patch-34-navigation-end-to-end.md`](complete_module_patch_library/module-patch-34-navigation-end-to-end.md) |
| 35 | Notification | [`module-patch-35-notification-end-to-end.md`](complete_module_patch_library/module-patch-35-notification-end-to-end.md) |
| 36 | Packs | [`module-patch-36-packs-end-to-end.md`](complete_module_patch_library/module-patch-36-packs-end-to-end.md) |
| 37 | Portals | [`module-patch-37-portals-end-to-end.md`](complete_module_patch_library/module-patch-37-portals-end-to-end.md) |
| 38 | Privacy | [`module-patch-38-privacy-end-to-end.md`](complete_module_patch_library/module-patch-38-privacy-end-to-end.md) |
| 39 | Proactive Leadership | [`module-patch-39-proactive-leadership-end-to-end.md`](complete_module_patch_library/module-patch-39-proactive-leadership-end-to-end.md) |
| 40 | Provisioning | [`module-patch-40-provisioning-end-to-end.md`](complete_module_patch_library/module-patch-40-provisioning-end-to-end.md) |
| 41 | Qiyas | [`module-patch-41-qiyas-end-to-end.md`](complete_module_patch_library/module-patch-41-qiyas-end-to-end.md) |
| 42 | Records | [`module-patch-42-records-end-to-end.md`](complete_module_patch_library/module-patch-42-records-end-to-end.md) |
| 43 | Training | [`module-patch-43-training-end-to-end.md`](complete_module_patch_library/module-patch-43-training-end-to-end.md) |
| 44 | Widgets | [`module-patch-44-widgets-end-to-end.md`](complete_module_patch_library/module-patch-44-widgets-end-to-end.md) |

## Usage Protocol

1. Read the relevant module patch file from `complete_module_patch_library/`
2. Compare current module state against the canonical target defined in the patch
3. Classify all gaps using Patch 0 §10 taxonomy (Missing, Incomplete, Duplicate, Wrong Owner, etc.)
4. Build only the missing artifacts — do not duplicate existing compliant code
5. Validate against the patch's pass/fail rules
6. Update the as-built ledger

> **Rule:** Module patches are subordinate to Patch 0 and platform patches 1–15. They must not override DOS ownership, DAuth ownership, product manifest laws, workflow laws, or UI stack laws.









# Commercial Production Closure Program



---

## Commercial Production Closure Program — Full-Repo Scan, Slice, Fix, Release

You are working inside my full platform repository.

### Mission

Do **NOT** stop at audit.
Do **NOT** stop at reporting.
Do **NOT** produce analysis-only output.

You must scan the entire project, divide it into bounded production slices, and for every slice you touch, drive it all the way to commercial production release readiness.

---

## OPERATING RULE

The unit of execution is **NOT** “frontend only”, “backend only”, or “database only”.
The unit of execution is **one bounded vertical production slice**.

A vertical production slice includes, for that specific capability:

* database truth
* backend truth
* frontend truth
* config/env truth
* auth/permission truth
* observability truth
* deployment truth
* rollback truth
* automated verification truth

If you review a slice, you must either:

* **A)** close it to release-ready status, or
* **B)** classify it as blocked with exact blocking dependencies and move those blockers to the global blocker board.

No half-reviewed slices.

---

## NON-NEGOTIABLE ARCHITECTURE RULE

Shahin must remain extractable tomorrow.

So you must preserve strict separation between:

1. **platform-reusable core**
2. **Shahin product-specific modules**

Do not let platform settings, identity, workspace, RBAC, audit, notifications, files, workflow, AI provider gateway, reporting, or admin shell inherit Shahin assumptions unless explicitly intended and documented.

Platform code may serve future products.
Shahin code may depend on platform.
Platform must not depend on Shahin domain assumptions.

---

## GROUND-TRUTH RULE

Code is the source of runtime truth.
Docs are secondary.
If docs and code conflict, flag it as a contradiction and follow executable code paths.

You must explicitly detect and report contradictions such as:

* architecture docs vs actual runtime
* backend framework mismatch
* UI stack mismatch
* duplicated entrypoints
* old docs describing deprecated topology
* module ownership mismatch
* route/config/permission mismatches

---

## PHASE 0 — FULL-REPO SCAN

Scan the entire repository and build a truth map for:

* entrypoints
* backend services
* frontend apps
* database models and migrations
* env/config files
* deployment assets
* CI/CD and test assets
* scripts and bootstrap files
* security-sensitive paths
* product-specific vs platform-specific ownership boundaries

Return:

1. Runtime topology map
2. Contradiction matrix
3. Global blocker list
4. Candidate slice inventory
5. Recommended execution order

---

## PHASE 1 — GLOBAL PROJECT-WIDE BLOCKERS

Before per-slice closure, identify and close all release-blocking horizontal issues that make any commercial release unsafe.

These include at minimum:

* hardcoded credentials / fallback secrets
* JWT/secret weaknesses
* DB transport security / TLS / SSL gaps
* missing release gates
* missing health/readiness checks
* missing structured logging / monitoring / alerting
* broken dependency hygiene
* missing backup / restore / rollback path
* missing production-safe env validation
* any security issue that affects multiple slices

For each blocker:

* find exact code/config location
* fix it
* verify it
* record release evidence
* mark it closed or blocked with exact reason

---

## PHASE 2 — SLICE INVENTORY AND EXECUTION MODEL

After global blockers, divide the repo into bounded vertical slices.

Each slice must be named and owned clearly.

Likely slices include, but are not limited to:

* Platform Config / Workspace Settings / Tenant Config
* Identity / Auth / RBAC
* Core Compliance Engine
* Evidence Lifecycle
* Continuous Control Monitoring
* Risk Register & Treatment
* Audit / Audit Room Portal
* Vendor Due Diligence
* Reporting / Dashboards / Executive Views
* AI Governance / AI Assets / Model-Prompt-Agent Registry
* Deployment / On-Prem / Air-Gapped Packaging
* Observability / Health / Metrics / Ops

Do **not** trust this list blindly.
Build the final slice map from repository truth.

---

## SLICE EXECUTION RULE

For every slice, execute all stages in one pass:

### Stage 1: Ground-truth audit

* actual scope
* files
* data model
* runtime paths
* permissions
* ownership
* contradictions
* dead code / dead routes / dead config

### Stage 2: Closure design

* define release target
* define acceptance criteria
* define non-goals
* define migration impact
* define backward-compatibility impact

### Stage 3: Implementation

* patch code
* patch config
* patch migrations if needed
* patch tests
* patch docs only if docs are misleading or release-relevant

### Stage 4: Hardening

* security
* validation
* error handling
* edge cases
* observability
* operational safeguards

### Stage 5: Verification

* unit tests
* integration tests
* build
* type-check
* lint
* smoke tests
* health endpoint checks
* release checklist validation

### Stage 6: Release packaging

* deployment notes
* env requirements
* rollback procedure
* known risks
* evidence of closure

Do **not** stop after Stage 1.
Do **not** leave the slice partially modernized.

---

## DEFINITION OF “COMMERCIAL PRODUCTION READY”

A slice is only release-ready if all of the following are true:

* runtime path is known and deterministic
* permissions are truthful
* config is production-safe
* secrets are not hardcoded
* logs and metrics exist
* health/readiness behavior is clear
* tests for the changed surface exist and pass
* build/type-check/lint pass for touched surfaces
* rollback path is defined
* docs do not materially mislead release/ops teams
* no unresolved P0/P1 issue remains inside the slice

---

## EXECUTION ORDER

Use this decision rule:

1. Close global blockers first
2. Then close the highest-leverage platform-core slice
3. Then close slices in dependency order
4. Do **not** jump to random domain modules if a core config/identity/platform boundary issue can invalidate them

Bias toward this order unless repository truth disproves it:

* Global blockers
* Platform Config / Workspace Settings / Tenant Config
* Identity / Auth / RBAC
* Deployment / Observability / Ops
* Then domain slices

---

## MANDATORY OUTPUT FORMAT

Always return progress in this exact structure:

### A. Runtime Truth Summary

### B. Contradiction Matrix

### C. Global Blocker Board

### D. Slice Inventory

### E. Current Slice in Execution

### F. Current Slice

* scope
* files
* issues
* fixes applied
* tests run
* remaining blockers
* release status

### G. Updated Program Board

### H. Next Slice

---

## WORKING STYLE

* Be surgical, not broad
* Do not redesign the whole platform at once
* Do not wander into unrelated cleanup
* If a slice depends on a blocker, close the blocker first
* If docs conflict with code, prefer code and record the contradiction
* If you touch a slice, take it to closure
* Continue slice-by-slice until the program board is exhausted or hard-blocked

---

## START NOW

Start immediately with:

1. full-repo runtime truth scan
2. contradiction matrix
3. global blocker board
4. slice inventory
5. first execution target

Preferred first execution target after blocker closure:
**Platform Config / Workspace Settings / Tenant Config**
unless repository truth shows a higher-priority blocker.

---

## ENFORCEMENT NOTES

* No analysis-only pass
* No partial slice modernization
* No random module hopping
* No “frontend done / backend later” handling
* No release claim without verification evidence
* No platform/Shahin coupling drift

---

## SIMPLE EXECUTION LOGIC

Use this rule internally:

**Global blockers first. Then one slice at a time. Each slice goes from scan → fix → harden → verify → release-closeout before moving to the next.**




# Global Platform Operating Constitution
## Platform / Products / Tenants / Models / AI Agents / Delivery / Audit / Handover
**Document ID:** GPOC-v1.0  
**Status:** Proposed Operating Standard  
**Intended Repository Path:** `/docs/governance/Global-Platform-Operating-Constitution.md`  
**Primary Audience:** Engineering, Architecture, Product, Data, DevOps, QA, Security, Audit, Delivery, Handover, AI-Agent Operators  
**Decision Mode:** Execute-by-standard. No improvisation outside approved change control.

---

## 1. Executive Purpose

This document is the constitutional operating standard for building, changing, auditing, deploying, handing over, and evolving the platform.

It exists to stop architectural drift, database drift, role confusion, silent coupling, undocumented shortcuts, and inconsistent delivery practices. It is written as a codebase asset, not as a presentation deck. Every engineer, architect, reviewer, implementer, auditor, DevOps operator, support owner, and AI agent must operate inside this document.

This constitution assumes the platform contains:

- a reusable **platform core**
- one or more **products**
- one or more **tenants / workspaces / organizations**
- one or more **AI providers and models**
- one or more **functions / tools / workflows / jobs**
- one or more **deployment profiles** such as local, cloud, on-prem, or air-gapped

This constitution is therefore designed for a **multi-product, multi-tenant, multi-model, multi-function platform**.

---

## 2. Architectural Context Locked by Existing Project Direction

This constitution explicitly incorporates the project direction already established in the codebase and project materials:

1. The platform core must stay **neutral and reusable**, while product logic remains **product-owned and separable**.
2. Product seed catalogs and product-specific AI assets must remain outside reusable platform orchestration.
3. Configuration must be separated into **environment**, **deployment**, **product**, and **tenant/workspace** layers.
4. The platform must remain valid for **fresh builds**, **fresh tenants**, **new deployments**, and **future extraction into a wider Dogan-OS style core**.
5. The system must support **bilingual delivery**, API-based integration, modular services, containerized deployment, and extensible AI/model layers.

---

## 3. Non-Negotiable Constitutional Laws

### Law 1 - Single Source of Truth
For every truth domain, there is one canonical owner and one canonical representation.

Canonical truth domains include:

- business truth
- product truth
- schema truth
- config truth
- permission truth
- API truth
- workflow truth
- event truth
- deployment truth
- monitoring truth

No duplicate authority.

### Law 2 - Platform Core Neutrality
Reusable platform services must not embed product-specific assumptions.

Allowed:
- generic interfaces
- registries
- orchestration layers
- product manifests
- explicit registration contracts

Forbidden:
- hardcoded product catalogs in platform core
- product-specific defaults inside neutral platform services
- platform routes or permissions borrowing product meaning

### Law 3 - Product Isolation
Each product owns its:

- module definitions
- domain schema
- workflows
- reports
- AI assets
- product defaults
- product onboarding assumptions
- product documentation

### Law 4 - Fresh Build Rule
A fresh environment must be buildable from approved baseline artifacts only.

Required:

- baseline schema
- reference seeds
- bootstrap scripts
- manifest registry
- verification scripts
- deployment config

Forbidden:

- invisible manual patches
- one-off SQL replay chains as runtime dependency
- environment-specific tribal knowledge

### Law 5 - Explicit Contracts Before Implementation
No implementation may proceed without the required contracts:

- domain contract
- API contract
- schema contract
- config contract
- permission contract
- workflow contract
- event contract
- observability contract

### Law 6 - No Hidden Logic
If logic cannot be found, reviewed, tested, and traced, it is non-compliant.

Examples of prohibited hidden logic:

- runtime-created tables without registry ownership
- inline permissions not present in the permission dictionary
- config keys without ownership classification
- audit events without entity ownership truth
- hidden environment fallbacks
- shadow endpoints
- undocumented background jobs

### Law 7 - Controlled AI Governance
AI agents operate only inside governed boundaries:

- approved tasks
- approved tools
- approved input contracts
- approved output contracts
- audit logs
- human review gates where required

### Law 8 - Delivery Includes Operations
A feature is not delivered until it includes:

- code
- schema
- config
- migration path
- tests
- logs
- metrics
- alerts
- rollback
- documentation
- handover material

### Law 9 - Every Change Must Be Traceable
Every change must have:

- reason
- owner
- change artifact
- review artifact
- test evidence
- deployment record
- rollback path

### Law 10 - Drift Is a Defect
Any drift between:

- code and DB
- backend and frontend
- docs and runtime
- route and permission
- config and environment
- product and platform ownership

is a defect and must be logged, triaged, and resolved.

---

## 4. Canonical Scope Model

### 4.1 Platform Core
The platform core is reusable and product-neutral. It may include:

- identity
- tenancy / workspace
- RBAC / ABAC
- audit
- notifications
- file service
- workflow engine
- event bus
- integration gateway
- model/provider gateway
- observability
- billing
- deployment control
- platform settings
- module registry
- manifest loading
- API shell
- web shell / app shell

### 4.2 Product Layer
Each product is product-owned and uses platform capabilities without redefining them.

A product may include:

- product domain entities
- product schema
- product services
- product routes
- product workflows
- product reports
- product AI assets
- product prompts
- product tools
- product defaults
- product onboarding presets

### 4.3 Tenant / Workspace Layer
Each tenant is a runtime customer scope that receives:

- enabled products
- enabled modules
- allowed providers/models
- tenant-specific config overrides
- branding and locale
- data isolation boundaries
- onboarding state
- audit scope
- support and SLA binding

### 4.4 Model / Provider / Function Layer
The platform must support more than one provider, more than one model, and more than one callable function.

Separate these clearly:

- **provider**: OpenAI / local / custom / IBM / internal
- **model**: specific inference model or engine
- **tool/function**: callable action, plugin, connector, computation, or operation
- **workflow**: ordered orchestration across tools/models/humans
- **agent**: governed orchestrator using models + tools + policy

### 4.5 Deployment Layer
Deployment is not product truth and not tenant truth.

Deployment concerns include:

- cloud vs on-prem
- air-gapped vs connected
- shared DB vs isolated DB
- queue mode
- object storage mode
- secret management mode
- topology profile
- monitoring sinks
- disaster recovery profile

---

## 5. Source-of-Truth Matrix

| Truth Domain | Canonical Owner | Canonical Artifact | Forbidden Secondary Authority |
|---|---|---|---|
| Domain entities | Product owner + architecture | Product schema manifest | Inline assumptions in controllers |
| Platform services | Platform architecture | Platform module registry | Product docs redefining platform |
| API contracts | Backend contract owner | OpenAPI / typed contract | UI guesses |
| DB schema | Data architecture | Baseline schema + migrations + schema registry | Ad-hoc SQL folders |
| Permissions | Security architecture | Permission dictionary | Hardcoded route strings outside registry |
| Config | Platform config authority | Typed config schemas + config matrix | Environment guesswork |
| AI models/providers | AI governance authority | Provider registry + model registry | Tool-local hidden defaults |
| Tenant enablement | Tenant config authority | Tenant manifest / config state | Product code assuming enablement |
| Deployment | DevOps authority | Deployment manifests / IaC / profiles | README-only steps |
| Monitoring | SRE / platform ops | Metrics catalog + alert rules | Human memory |

---

## 6. Mandatory Repository Architecture

The repository must follow a structure close to the following. Names may vary only by approved architecture decision.

```text
repo-root/
├── apps/
│   ├── api/
│   ├── web/
│   ├── worker/
│   └── admin/
├── platform/
│   ├── core/
│   │   ├── identity/
│   │   ├── tenancy/
│   │   ├── permissions/
│   │   ├── audit/
│   │   ├── config/
│   │   ├── workflow/
│   │   ├── files/
│   │   ├── events/
│   │   ├── integrations/
│   │   ├── models/
│   │   ├── observability/
│   │   └── registry/
│   ├── contracts/
│   ├── schemas/
│   ├── manifests/
│   └── shared/
├── products/
│   ├── shahin/
│   │   ├── domain/
│   │   ├── api/
│   │   ├── db/
│   │   ├── workflows/
│   │   ├── ai/
│   │   ├── reports/
│   │   ├── seeds/
│   │   └── manifests/
│   └── <future-product>/
├── db/
│   ├── baseline/
│   ├── migrations/
│   ├── seeds/
│   ├── registries/
│   └── verification/
├── docs/
│   ├── governance/
│   ├── architecture/
│   ├── runbooks/
│   ├── handover/
│   └── standards/
├── infra/
│   ├── environments/
│   ├── deployment-profiles/
│   ├── secrets/
│   ├── monitoring/
│   └── ci/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── migration/
│   ├── e2e/
│   └── governance/
└── tools/
    ├── scripts/
    ├── validators/
    ├── drift-checks/
    └── generators/
```

No product-owned code inside platform-neutral folders unless explicitly marked as compatibility or composition-root wiring.

---

## 7. Ownership Rules for Platform / Products / Tenants / Models

### 7.1 Platform-Owned
Platform-owned means:

- reusable by more than one product
- not semantically tied to one product domain
- valid even if one product is removed
- auditable as neutral infrastructure

Examples:
- tenant config shell
- provider registry
- workflow engine
- permission engine
- model allowlist core
- audit service
- event service

### 7.2 Product-Owned
Product-owned means:

- business meaning tied to one product
- domain tables tied to one product
- product reports and templates
- product prompts and model mappings
- product onboarding defaults
- product workflow meanings

### 7.3 Tenant-Owned Runtime State
Tenant-owned state includes:

- enabled products
- enabled modules
- allowed models
- branding
- locale
- workflow overrides
- feature flags where tenant-scoped
- data retention overrides if allowed

### 7.4 Deployment-Owned
Deployment-owned values never belong in tenant or product config:

- secrets
- hostnames
- queue brokers
- storage backends
- cloud providers
- KMS references
- topology mode
- backup targets

---

## 8. Product Manifest Standard

Every product must expose a machine-readable manifest.

### 8.1 Required Product Manifest Fields

```json
{
  "product_code": "shahin",
  "display_name": "Shahin",
  "status": "active",
  "owner_team": "product-shahin",
  "platform_dependencies": [
    "identity",
    "tenancy",
    "audit",
    "permissions",
    "workflow",
    "models"
  ],
  "enabled_by_default": false,
  "module_codes": [
    "governance",
    "risk",
    "compliance",
    "evidence",
    "vendors",
    "reporting"
  ],
  "seed_providers": [
    "products/shahin/ai/shahin-ai-governance-seed"
  ],
  "tenant_defaults": [
    "locale",
    "timezone",
    "dashboard_layout"
  ],
  "required_reference_data": [
    "frameworks",
    "statuses",
    "severity_levels"
  ]
}
```

### 8.2 Rules
- Product manifests must be versioned.
- Product manifests must be loaded by platform registries, not manually duplicated.
- Product manifests must not include deployment secrets.
- Product manifests may reference product seed providers but may not mutate platform contracts directly.

---

## 9. Tenant / Workspace Constitution

### 9.1 Tenant Truth
A tenant is a runtime customer boundary, not a code boundary.

A tenant must always have:

- `tenant_id`
- `tenant_code`
- `workspace_id` if applicable
- `product_enablement`
- `module_enablement`
- `tenant_config_version`
- `allowed_models`
- `data_region`
- `lifecycle_state`
- `audit_scope`

### 9.2 Tenant Config Schema
Every tenant config must validate against a typed schema.

```ts
export interface TenantConfig {
  tenantId: string;
  tenantCode: string;
  workspaceCode: string;
  enabledProducts: string[];
  enabledModules: string[];
  locale: "en" | "ar";
  timezone: string;
  theme: string;
  allowedProviders: string[];
  allowedModels: string[];
  onboardingMode: "manual" | "guided" | "assisted" | "automated";
  workflowProfiles: string[];
  featureFlags: Record<string, boolean>;
  retentionProfile: string;
  supportTier: string;
}
```

### 9.3 Tenant Prohibitions
Tenant config must not directly contain:

- deployment secrets
- infrastructure hostnames unless explicitly tenant-scoped by approved design
- raw SQL
- product code that bypasses manifests
- permissions not present in the permission registry

### 9.4 Fresh Tenant Rule
A fresh tenant must be creatable by:

1. loading approved tenant schema
2. applying platform baseline
3. enabling approved products
4. applying tenant defaults
5. verifying config, permissions, manifests, and readiness

No hidden manual remediation.

---

## 10. Multi-Product Constitution

### 10.1 Multi-Product Rule
A platform may host multiple products. Therefore:

- product routing must remain namespaced
- product permissions must remain namespaced
- product seeds must remain product-owned
- product AI catalogs must remain product-owned
- product modules must not overwrite each other by default

### 10.2 Product Activation Flow
Standard flow:

1. Product manifest loaded
2. Product dependencies validated
3. Product modules registered
4. Product seeds registered
5. Tenant enablement checked
6. Tenant-scoped defaults applied
7. Product availability published to UI/API bootstrap

### 10.3 Product Isolation Tests
Every product must pass:

- no direct import into platform core except approved registration boundaries
- no permission collision with unrelated product
- no table ownership ambiguity
- no config key ownership ambiguity
- no nav ownership ambiguity

---

## 11. Model / Provider / Tool / Function Constitution

### 11.1 Canonical Terms
- **Provider**: service supplying one or more models
- **Model**: inferencing engine or model identity
- **Tool / Function**: callable capability
- **Workflow**: orchestrated sequence
- **Agent**: policy-bound orchestrator of models/tools/workflows

### 11.2 Mandatory Registries
The platform must maintain registries for:

- providers
- models
- tools/functions
- workflows
- agents
- prompt assets
- allowlists
- approval states
- versioned bindings

### 11.3 Registry SQL Baseline

```sql
create table ai_provider_registry (
  provider_code text primary key,
  display_name text not null,
  provider_type text not null,
  status text not null,
  config_scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_model_registry (
  model_code text primary key,
  provider_code text not null references ai_provider_registry(provider_code),
  display_name text not null,
  model_family text not null,
  modality text not null,
  lifecycle_state text not null,
  approval_state text not null,
  tenant_policy_mode text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_tool_registry (
  tool_code text primary key,
  display_name text not null,
  owner_scope text not null,
  product_code text,
  execution_mode text not null,
  approval_state text not null,
  input_schema jsonb not null,
  output_schema jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_agent_registry (
  agent_code text primary key,
  display_name text not null,
  owner_scope text not null,
  product_code text,
  default_model_code text,
  lifecycle_state text not null,
  approval_state text not null,
  input_contract jsonb not null,
  output_contract jsonb not null,
  execution_policy jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 11.4 Multi-Model Rules
The platform must support:

- multiple providers
- multiple approved models per tenant
- fallback chains
- explicit approval policies
- environment restrictions
- tenant/model allowlists
- product/model compatibility rules

### 11.5 Function / Tool Rules
Every function or tool must declare:

- owner scope
- allowed caller(s)
- allowed runtime(s)
- authentication mode
- input schema
- output schema
- side effects
- observability expectations

---

## 12. AI Agent Constitution

### 12.1 Agent Categories
Standard categories include:

- discovery agent
- schema agent
- API contract agent
- code generation agent
- review agent
- audit agent
- migration analysis agent
- deployment preparation agent
- monitoring agent
- documentation agent
- handover preparation agent

### 12.2 Agent Record Standard

```yaml
agent_code: schema_architect
owner_scope: platform
product_code: null
mission: Produce schema proposals from approved domain contracts
allowed_tools:
  - schema_registry_reader
  - ddl_generator
  - diff_checker
forbidden_actions:
  - production_db_write
  - direct_secret_read
input_contract:
  type: schema_request
output_contract:
  type: schema_proposal
review_mode: mandatory_human_review
confidence_policy:
  min_confidence: 0.85
audit_policy:
  emit_events: true
  persist_prompt_hash: true
```

### 12.3 Agent Operating Rules
Agents must:

- use approved input contracts
- emit structured outputs
- emit auditable events
- remain versioned
- never bypass approval gates
- never create undocumented persistence artifacts
- never mutate production without policy and explicit authorization

### 12.4 AI Change Lifecycle
1. agent receives governed input
2. agent proposes artifact
3. artifact validated against schema/API/config/permission contracts
4. artifact tested in sandbox
5. artifact reviewed
6. artifact deployed through normal gates
7. runtime monitored
8. learning recorded

---

## 13. Database Constitution

### 13.1 Database Truth
The database is governed by:

- canonical schema registry
- approved baseline
- approved migrations
- approved seeds
- verification checks
- ownership registry

The database is not governed by accumulated random SQL history.

### 13.2 Canonical Database Layers
Recommended separation:

- `platform_*` or `platform` schema for reusable core
- `product_*` or product schemas for product-owned data
- `tenant-scoped runtime tables` where explicitly required
- `audit_*`
- `event_*`
- `analytics_*`
- `registry_*`

### 13.3 Table Registry Standard
Every table must be registered with:

- table name
- owner scope
- product code if product-owned
- tenant scope mode
- lifecycle status
- source baseline/migration
- retention profile
- contains PII? Y/N
- contains secrets? Y/N
- archival mode
- replacement/deprecation lineage if any

### 13.4 Baseline Rule
If the system has historical SQL sprawl, the correct path is:

1. extract truth
2. classify tables and objects
3. define canonical target schema
4. generate clean baseline
5. archive legacy migrations
6. continue from new governed migration chain

### 13.5 Migration Rule
Every migration must be classed:

- baseline
- additive
- corrective
- rename
- destructive
- backfill
- deprecation
- archival

No uncategorized migration may ship.

### 13.6 Verification Script Requirements
The DB verification layer must check:

- table existence
- column existence
- key existence
- index existence
- enum/reference data integrity
- drift from expected schema
- orphan objects
- tenant readiness
- seed completion

---

## 14. Config Constitution

### 14.1 Four Config Domains
Configuration must be separated into exactly four domains:

1. **Environment config**
2. **Deployment config**
3. **Product config**
4. **Tenant/workspace config**

### 14.2 Environment Config
Contains:
- secrets references
- service endpoints
- provider credentials
- encryption settings
- queue connections
- runtime flags

### 14.3 Deployment Config
Contains:
- cloud/on-prem profile
- DB topology mode
- object storage mode
- offline mode
- scaling mode
- logging/monitoring sinks

### 14.4 Product Config
Contains:
- product defaults
- product modules
- product feature bundles
- product AI defaults
- product onboarding presets

### 14.5 Tenant Config
Contains:
- enabled products
- enabled modules
- allowed models/providers
- branding
- locale
- workflow profiles
- tenant-specific overrides

### 14.6 Hard Prohibitions
- No tenant secrets in product config
- No deployment flags in tenant config
- No product defaults in platform environment files
- No workspace identity leakage into unrelated product logic
- No feature flags without ownership

---

## 15. Permission Constitution

### 15.1 Naming Standard
Permission codes must follow one naming convention only:

```text
<scope>.<resource>.<action>
```

or, where short-form family is intentionally approved:

```text
<module>:<action>
```

Mixed conventions require explicit mapping and justification.

### 15.2 Permission Registry
Every permission must record:

- permission code
- owner scope
- module code
- resource code
- action code
- tenant scope mode
- UI guard mapping
- API guard mapping
- approval requirement

### 15.3 Route Rule
Every route must use:

- explicit permission
- explicit entity ownership
- explicit audit metadata
- explicit event emission policy where required

No `requireRole` drift where permission-based control is mandated.

### 15.4 UI Rule
Frontend guards must not invent permission semantics. They must consume the canonical permission map.

---

## 16. API Constitution

### 16.1 Endpoint Registry
Each endpoint must define:

- route
- method
- owner scope
- contract version
- auth mode
- permission
- request schema
- response schema
- event behavior
- error model

### 16.2 API Stability Rule
SDKs may only be generated from stabilized contracts.

### 16.3 Versioning Rule
Breaking changes require:

- version bump
- changelog
- migration note
- deprecation period where applicable
- integration notice

---

## 17. Event and Audit Constitution

### 17.1 Event Envelope Standard

```json
{
  "event_id": "uuid",
  "event_type": "product.entity.action",
  "module_code": "governance",
  "entity_type": "policy_document",
  "entity_id": "12345",
  "tenant_id": "tenant_abc",
  "actor_type": "user",
  "actor_id": "user_001",
  "source": "api",
  "correlation_id": "trace_123",
  "occurred_at": "2026-04-02T12:00:00Z",
  "metadata": {}
}
```

### 17.2 Audit Minimum Fields
Every auditable mutation must include:

- actor
- tenant
- module
- entity type
- entity id
- action
- before/after summary where relevant
- correlation id
- source
- timestamp

### 17.3 Label Truth Rule
Module labels, entity types, and ownership values must be truthful to the actual owner path. No vague relabeling.

---

## 18. Workflow Constitution

### 18.1 Workflow Rule
Every important object must have:

- lifecycle states
- transition rules
- approval gates
- escalation rules
- SLA behavior
- event emissions
- audit behavior

### 18.2 Workflow Definition Example

```yaml
workflow_code: policy_lifecycle
entity_type: policy_document
states:
  - draft
  - review
  - approved
  - published
  - superseded
  - retired
transitions:
  - from: draft
    to: review
    permission: policy.document.submit
  - from: review
    to: approved
    permission: policy.document.approve
  - from: approved
    to: published
    permission: policy.document.publish
```

### 18.3 Workflow Prohibitions
- No hidden state changes
- No UI-only workflow truth
- No background workflow actions without events and audit

---

## 19. Delivery Constitution

### 19.1 Required Delivery Stages
Every change follows:

1. Intake
2. Truth audit
3. Design
4. Contract approval
5. Baseline/build
6. Implementation
7. Self-review
8. Independent review
9. Test
10. Deploy preparation
11. Deployment
12. Handover
13. Monitoring
14. Improvement

### 19.2 Delivery Gates
No stage may pass without evidence.

| Gate | Required Evidence |
|---|---|
| Scope Gate | approved scope statement |
| Contract Gate | approved contracts |
| Schema Gate | migration and verification plan |
| Review Gate | architecture/security review |
| Test Gate | passing test evidence |
| Observability Gate | logs/metrics/alerts defined |
| Handover Gate | runbooks/docs packaged |
| Rollback Gate | rollback steps approved |

### 19.3 Definition of Done
Work is done only when:

- code merged
- contracts updated
- schema updated
- tests passed
- metrics and logs present
- docs updated
- handover notes updated
- rollback path verified

---

## 20. CI/CD Constitution

### 20.1 Minimum Pipeline Stages

```yaml
stages:
  - validate_manifests
  - lint
  - typecheck
  - unit_test
  - integration_test
  - contract_test
  - migration_test
  - drift_check
  - security_scan
  - package
  - deploy_staging
  - smoke_test
  - approval
  - deploy_production
  - post_deploy_verification
```

### 20.2 Mandatory Automated Checks
- schema drift check
- permission map parity check
- route-to-contract parity check
- manifest validation
- config schema validation
- migration rehearsal
- fresh tenant readiness
- observability presence checks

---

## 21. Monitoring Constitution

### 21.1 Monitoring Layers
Monitoring must cover:

- infrastructure health
- application health
- queue/job health
- DB health
- API health
- tenant health
- model/provider health
- AI workflow health
- business SLA health
- security posture

### 21.2 Required Metrics
At minimum:

- request latency
- error rate
- migration success rate
- fresh tenant provisioning success
- job completion rate
- failed AI runs
- model fallback frequency
- drift detection count
- audit event completeness
- support incident volume

### 21.3 Alert Classes
Alerts must be categorized:

- critical
- high
- medium
- informational

### 21.4 Client Readiness Monitoring
Client-facing deployments must expose:

- health status
- last successful backup
- last successful sync where applicable
- SLA score
- active incidents
- recent deployments

---

## 22. Handover Constitution

### 22.1 Handover Package Must Include
- architecture overview
- deployment profile
- environment inventory
- config matrix
- access matrix
- runbooks
- rollback plan
- backup and restore guide
- monitoring dashboards
- known limitations
- support model
- escalation contacts

### 22.2 Handover Completion Criteria
Handover is complete only when the receiving team can:

- start the system
- verify the system
- recover the system
- onboard a tenant
- trace an incident
- identify owners
- deploy a controlled change

---

## 23. Scenario Playbooks

### Scenario A - Build a New Product
1. approve product charter
2. define product manifest
3. define domain contracts
4. define schema contracts
5. define route contracts
6. define permissions
7. define seeds
8. wire through platform registries
9. run fresh tenant test
10. update docs and handover pack

### Scenario B - Build a New Tenant
1. validate tenant request
2. validate tenant config against typed schema
3. enable approved products
4. apply defaults
5. verify models/providers allowlist
6. run bootstrap
7. run tenant readiness verification
8. emit provisioning audit trail

### Scenario C - Add a New Model Provider
1. register provider
2. add provider config schema
3. register models
4. define approval state
5. define tenant policy controls
6. run sandbox verification
7. update monitoring and fallback policy
8. publish provider onboarding guide

### Scenario D - Replace Historical DB Sprawl with New Baseline
1. freeze schema scope
2. extract actual schema truth
3. classify all tables and objects
4. define canonical target
5. generate baseline DDL
6. generate reference seeds
7. create fresh DB
8. run application verification
9. archive legacy migrations
10. open new governed migration chain

### Scenario E - Audit a Module
1. pull owner manifest
2. pull contracts
3. verify permissions
4. verify route parity
5. verify audit/event coverage
6. verify schema ownership
7. verify tenant behavior
8. issue findings

### Scenario F - Client Handover
1. freeze release
2. generate package
3. train admins
4. train operators
5. verify dashboards
6. verify backup/restore
7. verify escalation matrix
8. obtain signoff

---

## 24. Required Documents in the Codebase

The following files must exist and remain current:

```text
/docs/governance/Global-Platform-Operating-Constitution.md
/docs/architecture/System-Landscape.md
/docs/architecture/Product-Manifest-Registry.md
/docs/architecture/Schema-Registry.md
/docs/standards/Permission-Dictionary.md
/docs/standards/Config-Matrix.md
/docs/standards/Event-Catalog.md
/docs/runbooks/Fresh-Tenant-Provisioning.md
/docs/runbooks/Fresh-Environment-Build.md
/docs/runbooks/Deployment-and-Rollback.md
/docs/handover/Client-Handover-Pack.md
```

---

## 25. Mandatory Code Assets

The codebase must include working machine-readable assets, not only prose.

Required asset classes:

- product manifests
- tenant config schemas
- provider registry definitions
- model registry definitions
- tool registry definitions
- workflow definitions
- permission registry
- event catalog
- DB schema registry
- migration verification scripts
- fresh tenant verification scripts
- drift detection scripts

---

## 26. Anti-Patterns

The following are constitutionally prohibited:

- product logic inside platform-neutral core
- platform config confused with tenant config
- deployment config confused with product config
- direct imports from platform core to product-owned seed catalogs outside approved registration/composition-root wiring
- duplicated route surfaces for the same meaning
- workspace permissions used as catch-all for unrelated domains
- hidden SQL patches
- hidden runtime table creation
- model defaults hidden inside tools
- tool side effects not documented
- AI agents bypassing human approval policy
- undocumented onboarding assumptions
- docs not matching runtime truth

---

## 27. Minimum Role Responsibilities

| Role | Must Do | Must Not Do |
|---|---|---|
| Architect | protect boundaries, approve contracts | bypass standards for speed |
| Developer | implement contracts exactly | invent hidden semantics |
| Reviewer | verify parity and ownership truth | approve undocumented drift |
| DevOps | deploy only through governed profiles | patch live systems invisibly |
| Data engineer | maintain schema truth and verification | treat DB as a dump |
| Auditor | verify actual runtime truth | assume documents are enough |
| Product owner | approve scope and product meaning | change architecture by request alone |
| AI operator | run governed AI workflows | allow untracked autonomous changes |

---

## 28. Immediate Adoption Plan

### Phase 1 - Foundation
- adopt this constitution
- assign owner
- publish path in repo
- freeze non-compliant shortcuts

### Phase 2 - Registry Build
- create product manifest registry
- create config matrix
- create permission dictionary
- create schema registry
- create model/provider registry

### Phase 3 - Verification Layer
- add drift checks
- add fresh build verification
- add fresh tenant verification
- add permission parity checks
- add route contract checks

### Phase 4 - Delivery Hardening
- add CI gates
- add observability checks
- add handover package generation
- add rollback validation

---

## 29. Final Operating Principle

**Design by contract. Build by baseline. Register everything. Audit every mutation. Separate platform from products. Separate products from tenants. Separate tenants from deployment. Separate models from tools. Deliver with proof. Evolve without drift.**

---

## 30. Appendix A - Example Product-Owned AI Seed Registration

```ts
// products/shahin/ai/register-shahin-ai-assets.ts
import { registerAiSeedProvider } from "../../platform/core/models/seed-registry";

registerAiSeedProvider("shahin", () => ({
  agents: ["a01", "a02", "a03"],
  prompts: ["risk_summary_v1"],
  tools: ["framework_lookup", "evidence_classifier"],
  workflows: ["grc_triage"]
}));
```

Platform core may consume the registry contract. Platform core must not embed the Shahin catalog inline.

---

## 31. Appendix B - Example Drift Check Categories

```text
drift categories:
- schema_drift
- config_drift
- permission_drift
- route_contract_drift
- manifest_drift
- tenant_readiness_drift
- ai_registry_drift
- observability_drift
```

---

## 32. Appendix C - Example Release Readiness Checklist

- [ ] scope approved
- [ ] contracts updated
- [ ] schema reviewed
- [ ] migrations rehearsed
- [ ] tests passed
- [ ] monitoring updated
- [ ] rollback verified
- [ ] handover notes updated
- [ ] tenant impact assessed
- [ ] model/provider impact assessed
- [ ] product manifest impact assessed
- [ ] deployment profile impact assessed

---

## 33. Appendix D - Example Fresh Build Checklist

- [ ] baseline schema applied
- [ ] reference data seeded
- [ ] product manifests loaded
- [ ] provider registry loaded
- [ ] model registry loaded
- [ ] permission dictionary loaded
- [ ] event catalog loaded
- [ ] tenant bootstrap verified
- [ ] smoke tests passed
- [ ] monitoring attached

---

## 34. Approval Block

| Field | Value |
|---|---|
| Constitution Owner | Platform Architecture Authority |
| Required Reviewers | Product, Data, Security, DevOps, QA, Audit |
| Effective Date | Upon approval |
| Review Frequency | Every release cycle or architectural change |
| Change Control | Pull request + architecture signoff + version bump |

