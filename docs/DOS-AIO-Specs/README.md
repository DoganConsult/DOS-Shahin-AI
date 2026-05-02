# DOS-AIO-Specs — Single Source of Truth

> **For any agent, team member, or reviewer: start here. This folder is the only authoritative spec container for the entire DOS / DAuth / Shahin-AI platform.**

---

## ⚡ Quick Rule

**When tasked with ANY work on this platform, reference only:**

```
DOS-AIO-Specs/DOS-AIO.md
```

This is the **single entry point**. From DOS-AIO.md you can navigate to:
- Platform architecture laws (Patches 0–7)
- Module-level specs (MP-01–MP-44)
- Live codebase metrics (202 columns × 65 modules)
- Release gates, blocker tracking, and deployment readiness

**Do NOT reference any other .md file as authoritative.** All other docs are legacy/reference only.

---

## 📂 What's in This Folder

| File | Purpose | Authority |
|------|---------|-----------|
| [`DOS-AIO.md`](DOS-AIO.md) | **Master spec document** — 26,000+ lines. 16 platform patches + 16 inline module patches. Architecture laws, ownership model, audit methods, build instructions. | **Governing — read this first** |
| [`DOS-AIO-actualcodebase.csv`](DOS-AIO-actualcodebase.csv) | **Operational registry** — 202 columns × 65 module surfaces. Every metric verified against live codebase. | **Ground truth for code state** |
| `module-patch-01-*.md` to `module-patch-44-*.md` | **Per-module specs** — end-to-end patch files for 44 canonical modules. Each defines scope, services, tables, routes, events, lifecycle, UI, tests, acceptance criteria. | **Module-level specs** |
| `README.md` (this file) | Gateway and navigation guide. | Reference |

---

## 🔗 Navigation Map

```
DOS-AIO.md (start here)
├── Patch 0 — Common Enforcement Standard (laws, ownership, gap taxonomy)
├── DAuth / DOS Design Freeze (canonical domain model)
├── Phase 0 — Audit Report (post-deletion baseline)
├── Agent Operating Pack (phase prompts for agents)
├── Enterprise Rebuild Playbook §A–§AQ (production runbook)
├── Patches 1–7 (Platform, Data, DAuth, Product, Server, Module, Workflow)
├── Inline Module Patches MP-01–MP-16
│   ├── MP-01 Onboarding
│   ├── MP-02 Workflow
│   ├── MP-03 AI
│   ├── MP-04 Governance
│   ├── MP-05 Risk
│   ├── MP-06 Compliance
│   ├── MP-07 Policy
│   ├── MP-08 Audit
│   ├── MP-09 Evidence
│   ├── MP-10 Vendor
│   ├── MP-11 Reporting
│   ├── MP-12 Analytics
│   ├── MP-13 Incident
│   ├── MP-14 Controls
│   ├── MP-15 Exception
│   └── MP-16 Remediation
└── Module-to-Spec Map (links every codebase surface to its governing spec)

External Module Patches (this folder)
├── module-patch-17-action-end-to-end.md
├── module-patch-18-admin-end-to-end.md
├── ...
└── module-patch-44-widgets-end-to-end.md

DOS-AIO-actualcodebase.csv
├── SPEC: columns — patch numbers, target descriptions
├── ACTUAL: columns — LOC, DB tables, FE components (filesystem-verified)
├── LIVE: columns — services, APIs, tests (grep-verified)
├── REL: columns — release wave, gate score, go-live decision
├── OWN: columns — engineering/product/security/QA owners
├── BLOCK: columns — P0/P1 blockers, @ts-ignore, dependencies
├── VERIFY: columns — build, lint, typecheck, test status
├── OPS: columns — health endpoints, runbooks, rollback plans
├── DEPLOY: columns — runtime type, air-gap support, DB migration
├── RISK: columns — exposure, data classification, security criticality
└── CLASS: columns — canonical MP mapping, spec coverage, surface class
```

---

## 📋 Module Patch Inventory (44 specs)

| MP | Module | File | Inline? |
|----|--------|------|---------|
| 01 | Onboarding | [`module-patch-01-onboarding-end-to-end.md`](module-patch-01-onboarding-end-to-end.md) | ✅ + external |
| 02 | Workflow | [`module-patch-02-workflow-end-to-end.md`](module-patch-02-workflow-end-to-end.md) | ✅ + external |
| 03 | AI | [`module-patch-03-ai-end-to-end.md`](module-patch-03-ai-end-to-end.md) | ✅ + external |
| 04 | Governance | [`module-patch-04-governance-end-to-end.md`](module-patch-04-governance-end-to-end.md) | ✅ + external |
| 05 | Risk | [`module-patch-05-risk-end-to-end.md`](module-patch-05-risk-end-to-end.md) | ✅ + external |
| 06 | Compliance | [`module-patch-06-compliance-end-to-end.md`](module-patch-06-compliance-end-to-end.md) | ✅ + external |
| 07 | Policy | [`module-patch-07-policy-end-to-end.md`](module-patch-07-policy-end-to-end.md) | ✅ + external |
| 08 | Audit | [`module-patch-08-audit-end-to-end.md`](module-patch-08-audit-end-to-end.md) | ✅ + external |
| 09 | Evidence | [`module-patch-09-evidence-end-to-end.md`](module-patch-09-evidence-end-to-end.md) | ✅ + external |
| 10 | Vendor | [`module-patch-10-vendor-end-to-end.md`](module-patch-10-vendor-end-to-end.md) | ✅ + external |
| 11 | Reporting | [`module-patch-11-reporting-end-to-end.md`](module-patch-11-reporting-end-to-end.md) | ✅ + external |
| 12 | Analytics | [`module-patch-12-analytics-end-to-end.md`](module-patch-12-analytics-end-to-end.md) | ✅ + external |
| 13 | Incident | [`module-patch-13-incident-end-to-end.md`](module-patch-13-incident-end-to-end.md) | ✅ + external |
| 14 | Controls | [`module-patch-14-controls-end-to-end.md`](module-patch-14-controls-end-to-end.md) | ✅ + external |
| 15 | Exception | [`module-patch-15-exception-end-to-end.md`](module-patch-15-exception-end-to-end.md) | ✅ + external |
| 16 | Remediation | [`module-patch-16-remediation-end-to-end.md`](module-patch-16-remediation-end-to-end.md) | ✅ + external |
| 17 | Action | [`module-patch-17-action-end-to-end.md`](module-patch-17-action-end-to-end.md) | External only |
| 18 | Admin | [`module-patch-18-admin-end-to-end.md`](module-patch-18-admin-end-to-end.md) | External only |
| 19 | AGRC Engine | [`module-patch-19-agrc-engine-end-to-end.md`](module-patch-19-agrc-engine-end-to-end.md) | External only |
| 20 | AI Governance | [`module-patch-20-ai-governance-end-to-end.md`](module-patch-20-ai-governance-end-to-end.md) | External only |
| 21 | Asset | [`module-patch-21-asset-end-to-end.md`](module-patch-21-asset-end-to-end.md) | External only |
| 22 | BCP | [`module-patch-22-bcp-end-to-end.md`](module-patch-22-bcp-end-to-end.md) | External only |
| 23 | Bootstrap | [`module-patch-23-bootstrap-end-to-end.md`](module-patch-23-bootstrap-end-to-end.md) | External only |
| 24 | Dashboard | [`module-patch-24-dashboard-end-to-end.md`](module-patch-24-dashboard-end-to-end.md) | External only |
| 25 | DORA | [`module-patch-25-dora-end-to-end.md`](module-patch-25-dora-end-to-end.md) | External only |
| 26 | Governance AI | [`module-patch-26-governance-ai-end-to-end.md`](module-patch-26-governance-ai-end-to-end.md) | External only |
| 27 | Governance OS | [`module-patch-27-governance-os-end-to-end.md`](module-patch-27-governance-os-end-to-end.md) | External only |
| 28 | Integrations | [`module-patch-28-integrations-end-to-end.md`](module-patch-28-integrations-end-to-end.md) | External only |
| 29 | Inbox | [`module-patch-29-inbox-end-to-end.md`](module-patch-29-inbox-end-to-end.md) | External only |
| 30 | Issues | [`module-patch-30-issues-end-to-end.md`](module-patch-30-issues-end-to-end.md) | External only |
| 31 | Journey | [`module-patch-31-journey-end-to-end.md`](module-patch-31-journey-end-to-end.md) | External only |
| 32 | KSA Regulatory | [`module-patch-32-ksa-regulatory-end-to-end.md`](module-patch-32-ksa-regulatory-end-to-end.md) | External only |
| 33 | Local Knowledge | [`module-patch-33-local-knowledge-end-to-end.md`](module-patch-33-local-knowledge-end-to-end.md) | External only |
| 34 | Navigation | [`module-patch-34-navigation-end-to-end.md`](module-patch-34-navigation-end-to-end.md) | External only |
| 35 | Notification | [`module-patch-35-notification-end-to-end.md`](module-patch-35-notification-end-to-end.md) | External only |
| 36 | Packs | [`module-patch-36-packs-end-to-end.md`](module-patch-36-packs-end-to-end.md) | External only |
| 37 | Portals | [`module-patch-37-portals-end-to-end.md`](module-patch-37-portals-end-to-end.md) | External only |
| 38 | Privacy | [`module-patch-38-privacy-end-to-end.md`](module-patch-38-privacy-end-to-end.md) | External only |
| 39 | Proactive Leadership | [`module-patch-39-proactive-leadership-end-to-end.md`](module-patch-39-proactive-leadership-end-to-end.md) | External only |
| 40 | Provisioning | [`module-patch-40-provisioning-end-to-end.md`](module-patch-40-provisioning-end-to-end.md) | External only |
| 41 | Qiyas | [`module-patch-41-qiyas-end-to-end.md`](module-patch-41-qiyas-end-to-end.md) | External only |
| 42 | Records | [`module-patch-42-records-end-to-end.md`](module-patch-42-records-end-to-end.md) | External only |
| 43 | Training | [`module-patch-43-training-end-to-end.md`](module-patch-43-training-end-to-end.md) | External only |
| 44 | Widgets | [`module-patch-44-widgets-end-to-end.md`](module-patch-44-widgets-end-to-end.md) | External only |

---

## 🔒 Authority Rules

1. **DOS-AIO.md is the single source of truth.** All module patches, CSV data, and team instructions derive from it.
2. **Module patches (MP-01–MP-44) are subordinate to Patch 0.** They must not override DOS ownership, DAuth ownership, product manifest laws, workflow laws, or UI stack laws.
3. **DOS-AIO-actualcodebase.csv is the operational truth.** It maps every spec expectation to what actually exists in the codebase.
4. **No other markdown file in this repository is authoritative.** All `docs/*.md`, root `*.md` files (except CLAUDE.md), and legacy reports are reference-only.

---

## 🤖 Agent / Team Onboarding

When giving context to any AI agent or team member, use this single reference:

```
@DOS-AIO-Specs/DOS-AIO.md
```

From this file, the agent can:
- Read the 15 Architecture Laws (Patch 0 §4)
- Understand the 5-Layer Ownership Model (§5)
- Find the module they need to work on (Module-to-Spec Map in the index)
- Navigate to the relevant module patch file
- Check the operational registry for current implementation state
- Understand gap taxonomy, acceptance criteria, and fail conditions

**Never give an agent a module patch file without also giving them DOS-AIO.md.** The module patch inherits all rules from Patch 0 and the stack patches.

---

## 📊 Coverage Summary

| Category | Count | Status |
|----------|-------|--------|
| Platform patches (0–7) | 8 | ✅ Inline in DOS-AIO.md |
| Platform patches (8–15) | 8 | ✅ Inline in DOS-AIO.md |
| Module patches (inline MP-01–MP-16) | 16 | ✅ Inline + external files |
| Module patches (external MP-17–MP-44) | 28 | ✅ External files only |
| Codebase surfaces covered by specs | 49/65 | ✅ 98.2% of LOC |
| Orphan surfaces needing new specs | 13 | ❌ 1.8% of LOC (13,187 LOC) |
| Operational registry columns | 202 | ✅ All code-derived |
| Registry modules | 65 | ✅ Filesystem-verified |