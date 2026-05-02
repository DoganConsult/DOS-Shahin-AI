# Tenant Schema Table Catalog (per-module)

**Source:** `migration/inventory/table-ownership-map.json` (2026-04-12T05:12:21.132Z)

**Total tenant-scoped tables:** 1378 across 55 modules

Each tenant schema (e.g. `tenant_dogan`, `tenant_51f36271df62ea3d`) contains all of these tables.

Per-module detail in [`by-module/`](by-module/) — each row carries a Purpose column.

Purpose Source legend: **R** = registry-declared (authoritative), **P** = name-suffix pattern, **T** = name-token heuristic, **N** = fallback humanize.

## Module index

| Module | Owner service | Tables | Has-data | Schema-only | Detail |
|---|---|---:|---:|---:|---|
| `ai` | `ai-gateway-service` | 175 | 15 | 160 | [open](by-module/ai.md) |
| `admin` | `tenant-service` | 147 | 45 | 102 | [open](by-module/admin.md) |
| `compliance` | `compliance-controls-service` | 94 | 11 | 83 | [open](by-module/compliance.md) |
| `governance` | `governance-policy-service` | 86 | 6 | 80 | [open](by-module/governance.md) |
| `workflow` | `workflow-service` | 83 | 22 | 61 | [open](by-module/workflow.md) |
| `auth` | `auth-service` | 81 | 30 | 51 | [open](by-module/auth.md) |
| `qiyas` | `compliance-controls-service` | 72 | 2 | 70 | [open](by-module/qiyas.md) |
| `evidence` | `evidence-audit-reporting-service` | 49 | 8 | 41 | [open](by-module/evidence.md) |
| `risk` | `risk-incident-service` | 49 | 3 | 46 | [open](by-module/risk.md) |
| `foundation` | `tenant-service` | 46 | 8 | 38 | [open](by-module/foundation.md) |
| `integrations` | `gateway` | 38 | 4 | 34 | [open](by-module/integrations.md) |
| `vendor` | `risk-incident-service` | 38 | 3 | 35 | [open](by-module/vendor.md) |
| `onboarding` | `onboarding-service` | 34 | 6 | 28 | [open](by-module/onboarding.md) |
| `audit` | `evidence-audit-reporting-service` | 30 | 3 | 27 | [open](by-module/audit.md) |
| `incident` | `risk-incident-service` | 29 | 3 | 26 | [open](by-module/incident.md) |
| `policy` | `governance-policy-service` | 29 | 5 | 24 | [open](by-module/policy.md) |
| `governance-os` | `governance-policy-service` | 26 | 0 | 26 | [open](by-module/governance-os.md) |
| `dora` | `compliance-controls-service` | 22 | 2 | 20 | [open](by-module/dora.md) |
| `bcp` | `risk-incident-service` | 22 | 3 | 19 | [open](by-module/bcp.md) |
| `privacy` | `compliance-controls-service` | 21 | 0 | 21 | [open](by-module/privacy.md) |
| `agrc-engine` | `ai-gateway-service` | 20 | 6 | 14 | [open](by-module/agrc-engine.md) |
| `training` | `compliance-controls-service` | 19 | 5 | 14 | [open](by-module/training.md) |
| `local-knowledge` | `compliance-controls-service` | 15 | 0 | 15 | [open](by-module/local-knowledge.md) |
| `asset` | `risk-incident-service` | 12 | 2 | 10 | [open](by-module/asset.md) |
| `action` | `risk-incident-service` | 11 | 3 | 8 | [open](by-module/action.md) |
| `dashboard` | `evidence-audit-reporting-service` | 9 | 2 | 7 | [open](by-module/dashboard.md) |
| `ai-governance` | `ai-gateway-service` | 8 | 0 | 8 | [open](by-module/ai-governance.md) |
| `notification` | `notification-service` | 8 | 1 | 7 | [open](by-module/notification.md) |
| `mcp` | `ai-gateway-service` | 8 | 0 | 8 | [open](by-module/mcp.md) |
| `navigation` | `tenant-service` | 8 | 3 | 5 | [open](by-module/navigation.md) |
| `workspace` | `tenant-service` | 8 | 0 | 8 | [open](by-module/workspace.md) |
| `proactive-leadership` | `governance-policy-service` | 7 | 0 | 7 | [open](by-module/proactive-leadership.md) |
| `quality-gate` | `tenant-service` | 7 | 0 | 7 | [open](by-module/quality-gate.md) |
| `ksa-regulatory` | `compliance-controls-service` | 6 | 2 | 4 | [open](by-module/ksa-regulatory.md) |
| `analytics` | `evidence-audit-reporting-service` | 5 | 0 | 5 | [open](by-module/analytics.md) |
| `records` | `evidence-audit-reporting-service` | 5 | 0 | 5 | [open](by-module/records.md) |
| `exception` | `compliance-controls-service` | 5 | 1 | 4 | [open](by-module/exception.md) |
| `reporting` | `evidence-audit-reporting-service` | 5 | 1 | 4 | [open](by-module/reporting.md) |
| `team` | `tenant-service` | 5 | 2 | 3 | [open](by-module/team.md) |
| `governance-ai` | `governance-policy-service` | 4 | 1 | 3 | [open](by-module/governance-ai.md) |
| `provisioning` | `tenant-service` | 4 | 0 | 4 | [open](by-module/provisioning.md) |
| `remediation` | `risk-incident-service` | 4 | 1 | 3 | [open](by-module/remediation.md) |
| `controls` | `compliance-controls-service` | 3 | 0 | 3 | [open](by-module/controls.md) |
| `delegation` | `auth-service` | 3 | 0 | 3 | [open](by-module/delegation.md) |
| `security` | `auth-service` | 3 | 0 | 3 | [open](by-module/security.md) |
| `widgets` | `evidence-audit-reporting-service` | 3 | 2 | 1 | [open](by-module/widgets.md) |
| `attestation` | `evidence-audit-reporting-service` | 2 | 0 | 2 | [open](by-module/attestation.md) |
| `dashboard-editor` | `evidence-audit-reporting-service` | 2 | 1 | 1 | [open](by-module/dashboard-editor.md) |
| `sod` | `auth-service` | 2 | 0 | 2 | [open](by-module/sod.md) |
| `access` | `auth-service` | 1 | 0 | 1 | [open](by-module/access.md) |
| `connectors` | `gateway` | 1 | 0 | 1 | [open](by-module/connectors.md) |
| `knowledge` | `compliance-controls-service` | 1 | 0 | 1 | [open](by-module/knowledge.md) |
| `operating` | `tenant-service` | 1 | 0 | 1 | [open](by-module/operating.md) |
| `mobile` | `notification-service` | 1 | 0 | 1 | [open](by-module/mobile.md) |
| `webhooks` | `gateway` | 1 | 0 | 1 | [open](by-module/webhooks.md) |
| **TOTAL** | | **1378** | | | |
