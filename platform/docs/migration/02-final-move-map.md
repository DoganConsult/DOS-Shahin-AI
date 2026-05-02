# 02 — Final Move Map

> Generated: `2026-04-29T02:56:54.126Z`
> Canonical root: `/root/DOS-AIO/DOS Platform`

## Batch summary

| Batch | Description | Move count |
| --- | --- | --- |
| 1 | Shahin-AI product app | 1 |
| 2 | Shahin-AI product frontend (composition/nav/theme/...) | 12 |
| 3 | Canonical modules → modules/{moduleCode} | 53 |
| 4 | Platform-tier folders → platform/ | 8 |
| 5 | Embedded packages → packages/ | 21 |
| 6 | Embedded services → services/ | 11 |
| 7 | Registries / manifests consolidation | 2 |
| 8 | Scripts / ops (no-op) | 2 |
| 9 | Tests (no-op) | 1 |
| — | **TOTAL** | **111** |

## Quarantined (unsafe-to-move on this pass)

- `DOS` — Legacy nested DOS root with its own packages/services/modules. Plan: file-by-file inventory in Gate D pre-flight. Do NOT mass-move.
- `DOS-AIO-Specs` — Specs/docs (non-source).

## All moves

| Batch | Owner | Old → New | Imports | Workspace | tsconfig | Routes | PkgName | Risk | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | product-owned:shahin-ai | `Shahin-AI Website/spa` → `products/shahin-ai/app` | ✅ | ✅ | ✅ | ✅ | ✅ | high | `git mv 'products/shahin-ai/app' 'Shahin-AI Website/spa'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/agents` → `products/shahin-ai/agents` | — | — | — | — | — | low | `git mv 'products/shahin-ai/agents' 'Shahin-AI Website/agents'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/assets` → `products/shahin-ai/assets` | — | — | — | — | — | low | `git mv 'products/shahin-ai/assets' 'Shahin-AI Website/assets'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/composition` → `products/shahin-ai/composition` | — | — | — | — | — | low | `git mv 'products/shahin-ai/composition' 'Shahin-AI Website/composition'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/dynamic-ui` → `products/shahin-ai/dynamic-ui` | — | — | — | — | — | low | `git mv 'products/shahin-ai/dynamic-ui' 'Shahin-AI Website/dynamic-ui'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/frontend` → `products/shahin-ai/frontend-legacy` | — | ✅ | — | — | — | medium | `git mv 'products/shahin-ai/frontend-legacy' 'Shahin-AI Website/frontend'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/i18n` → `products/shahin-ai/i18n` | — | — | — | — | — | low | `git mv 'products/shahin-ai/i18n' 'Shahin-AI Website/i18n'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/navigation` → `products/shahin-ai/navigation` | — | — | — | — | — | low | `git mv 'products/shahin-ai/navigation' 'Shahin-AI Website/navigation'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/routes` → `products/shahin-ai/routes` | — | — | — | — | — | low | `git mv 'products/shahin-ai/routes' 'Shahin-AI Website/routes'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/services` → `products/shahin-ai/services` | ✅ | — | — | — | — | low | `git mv 'products/shahin-ai/services' 'Shahin-AI Website/services'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/state` → `products/shahin-ai/state` | ✅ | — | — | — | — | low | `git mv 'products/shahin-ai/state' 'Shahin-AI Website/state'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/tests` → `products/shahin-ai/tests` | — | — | — | — | — | low | `git mv 'products/shahin-ai/tests' 'Shahin-AI Website/tests'` |
| 2 | product-owned:shahin-ai | `Shahin-AI Website/theme` → `products/shahin-ai/theme` | — | — | — | — | — | low | `git mv 'products/shahin-ai/theme' 'Shahin-AI Website/theme'` |
| 3 | module-owned | `Action Module` → `modules/action` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/action' 'Action Module'` |
| 3 | module-owned | `AGRC-engine Module` → `modules/agrc-engine` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/agrc-engine' 'AGRC-engine Module'` |
| 3 | module-owned | `AI-OS Module/_sources/modules_ai` → `modules/ai` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/ai' 'AI-OS Module/_sources/modules_ai'` |
| 3 | module-owned | `AI-OS Module/_sources/modules_ai-governance` → `modules/ai-governance` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/ai-governance' 'AI-OS Module/_sources/modules_ai-governance'` |
| 3 | module-owned | `Analytics Module` → `modules/analytics` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/analytics' 'Analytics Module'` |
| 3 | module-owned | `Asset Module` → `modules/asset` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/asset' 'Asset Module'` |
| 3 | module-owned | `Attestation Module` → `modules/attestation` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/attestation' 'Attestation Module'` |
| 3 | module-owned | `Audit Module` → `modules/audit` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/audit' 'Audit Module'` |
| 3 | module-owned | `BCP Module/_sources/modules_bcp` → `modules/bcp` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/bcp' 'BCP Module/_sources/modules_bcp'` |
| 3 | module-owned | `benchmarks` → `modules/benchmarks` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/benchmarks' 'benchmarks'` |
| 3 | module-owned | `Compliance Module` → `modules/compliance` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/compliance' 'Compliance Module'` |
| 3 | module-owned | `Controls Module` → `modules/controls` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/controls' 'Controls Module'` |
| 3 | module-owned | `dashboard` → `modules/dashboard` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/dashboard' 'dashboard'` |
| 3 | module-owned | `dashboard/dashboard-editor` → `modules/dashboard-editor` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/dashboard-editor' 'dashboard/dashboard-editor'` |
| 3 | module-owned | `DORA Module` → `modules/dora` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/dora' 'DORA Module'` |
| 3 | module-owned | `Dynamic UI Module` → `modules/dynamic-ui` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/dynamic-ui' 'Dynamic UI Module'` |
| 3 | module-owned | `Evidence Module` → `modules/evidence` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/evidence' 'Evidence Module'` |
| 3 | module-owned | `exception` → `modules/exception` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/exception' 'exception'` |
| 3 | module-owned | `executive` → `modules/executive` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/executive' 'executive'` |
| 3 | module-owned | `fitch` → `modules/fitch` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/fitch' 'fitch'` |
| 3 | module-owned | `Foundation Module` → `modules/foundation` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/foundation' 'Foundation Module'` |
| 3 | module-owned | `Foundation Module/team` → `modules/team` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/team' 'Foundation Module/team'` |
| 3 | module-owned | `Governance Module` → `modules/governance` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/governance' 'Governance Module'` |
| 3 | module-owned | `Governance Module/governance-ai` → `modules/governance-ai` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/governance-ai' 'Governance Module/governance-ai'` |
| 3 | module-owned | `Governance Module/governance-os` → `modules/governance-os` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/governance-os' 'Governance Module/governance-os'` |
| 3 | module-owned | `grc-query` → `modules/grc-query` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/grc-query' 'grc-query'` |
| 3 | module-owned | `Inbox Module` → `modules/inbox` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/inbox' 'Inbox Module'` |
| 3 | module-owned | `Incident Module` → `modules/incident` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/incident' 'Incident Module'` |
| 3 | module-owned | `integrations` → `modules/integrations` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/integrations' 'integrations'` |
| 3 | module-owned | `Isues Module` → `modules/issues` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/issues' 'Isues Module'` |
| 3 | module-owned | `knowledge Module` → `modules/local-knowledge` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/local-knowledge' 'knowledge Module'` |
| 3 | module-owned | `knowledge Module/knowledge` → `modules/knowledge` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/knowledge' 'knowledge Module/knowledge'` |
| 3 | module-owned | `ksa-regulatory Module` → `modules/ksa-regulatory` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/ksa-regulatory' 'ksa-regulatory Module'` |
| 3 | module-owned | `MCP Module` → `modules/mcp` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/mcp' 'MCP Module'` |
| 3 | module-owned | `Mobile Module` → `modules/mobile` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/mobile' 'Mobile Module'` |
| 3 | module-owned | `Notification Module` → `modules/notification` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/notification' 'Notification Module'` |
| 3 | module-owned | `Onboarding Module/journey` → `modules/journey` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/journey' 'Onboarding Module/journey'` |
| 3 | module-owned | `Onboarding Module/modules-onboarding` → `modules/onboarding` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/onboarding' 'Onboarding Module/modules-onboarding'` |
| 3 | module-owned | `operating-cockpit` → `modules/operating-cockpit` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/operating-cockpit' 'operating-cockpit'` |
| 3 | module-owned | `playbooks` → `modules/playbooks` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/playbooks' 'playbooks'` |
| 3 | module-owned | `Policy Module` → `modules/policy` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/policy' 'Policy Module'` |
| 3 | module-owned | `portals` → `modules/portals` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/portals' 'portals'` |
| 3 | module-owned | `Privacy Module` → `modules/privacy` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/privacy' 'Privacy Module'` |
| 3 | module-owned | `proactive-leadership` → `modules/proactive-leadership` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/proactive-leadership' 'proactive-leadership'` |
| 3 | module-owned | `Qiyas Module` → `modules/qiyas` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/qiyas' 'Qiyas Module'` |
| 3 | module-owned | `records` → `modules/records` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/records' 'records'` |
| 3 | module-owned | `Remediation Module` → `modules/remediation` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/remediation' 'Remediation Module'` |
| 3 | module-owned | `Reporting Module` → `modules/reporting` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/reporting' 'Reporting Module'` |
| 3 | module-owned | `Risk Module` → `modules/risk` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/risk' 'Risk Module'` |
| 3 | module-owned | `Training Module` → `modules/training` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/training' 'Training Module'` |
| 3 | module-owned | `Vendor Module/_sources/modules_vendor` → `modules/vendor` | ✅ | ✅ | ✅ | — | ✅ | high | `git mv 'modules/vendor' 'Vendor Module/_sources/modules_vendor'` |
| 3 | module-owned | `widgets` → `modules/widgets` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/widgets' 'widgets'` |
| 3 | module-owned | `Workflow Module` → `modules/workflow` | ✅ | ✅ | ✅ | — | ✅ | medium | `git mv 'modules/workflow' 'Workflow Module'` |
| 4 | platform-owned | `contracts` → `platform/contracts` | ✅ | — | ✅ | — | — | medium | `git mv 'platform/contracts' 'contracts'` |
| 4 | platform-owned | `docs` → `platform/docs` | ✅ | — | ✅ | — | — | medium | `git mv 'platform/docs' 'docs'` |
| 4 | platform-owned | `errors` → `platform/errors` | ✅ | — | ✅ | — | — | medium | `git mv 'platform/errors' 'errors'` |
| 4 | platform-owned | `migration` → `platform/migration` | ✅ | — | ✅ | — | — | medium | `git mv 'platform/migration' 'migration'` |
| 4 | platform-owned | `platform-core` → `platform/shared/platform-core` | ✅ | ✅ | ✅ | — | — | medium | `git mv 'platform/shared/platform-core' 'platform-core'` |
| 4 | platform-owned | `product-shell` → `platform/shared/product-shell` | ✅ | ✅ | ✅ | — | — | medium | `git mv 'platform/shared/product-shell' 'product-shell'` |
| 4 | platform-owned | `routing` → `platform/routing` | ✅ | — | ✅ | — | — | medium | `git mv 'platform/routing' 'routing'` |
| 4 | platform-owned | `utils` → `platform/shared/utils` | ✅ | — | ✅ | — | — | medium | `git mv 'platform/shared/utils' 'utils'` |
| 5 | shared-package | `AI-OS Module/_sources/packages_ai` → `packages/ai` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/ai' 'AI-OS Module/_sources/packages_ai'` |
| 5 | shared-package | `AI-OS Module/_sources/packages_modules_ai` → `packages/modules_ai` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/modules_ai' 'AI-OS Module/_sources/packages_modules_ai'` |
| 5 | shared-package | `AI-OS Module/_sources/packages_modules_ai-governance` → `packages/modules_ai-governance` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/modules_ai-governance' 'AI-OS Module/_sources/packages_modules_ai-governance'` |
| 5 | shared-package | `BCP Module/_sources/packages_modules_bcp` → `packages/modules_bcp` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/modules_bcp' 'BCP Module/_sources/packages_modules_bcp'` |
| 5 | shared-package | `DAuth Module/packages/authz-ids` → `packages/authz-ids` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/authz-ids' 'DAuth Module/packages/authz-ids'` |
| 5 | shared-package | `DAuth Module/packages/contract-tests` → `packages/contract-tests` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/contract-tests' 'DAuth Module/packages/contract-tests'` |
| 5 | shared-package | `DAuth Module/packages/core` → `packages/core` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/core' 'DAuth Module/packages/core'` |
| 5 | shared-package | `DAuth Module/packages/csrf` → `packages/csrf` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/csrf' 'DAuth Module/packages/csrf'` |
| 5 | shared-package | `DAuth Module/packages/frontend` → `packages/frontend` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/frontend' 'DAuth Module/packages/frontend'` |
| 5 | shared-package | `DAuth Module/packages/module-auth` → `packages/module-auth` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/module-auth' 'DAuth Module/packages/module-auth'` |
| 5 | shared-package | `DAuth Module/packages/shared` → `packages/shared` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/shared' 'DAuth Module/packages/shared'` |
| 5 | shared-package | `DNOC Module/packages/core` → `packages/core` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/core' 'DNOC Module/packages/core'` |
| 5 | shared-package | `DNOC Module/packages/frontend` → `packages/frontend` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/frontend' 'DNOC Module/packages/frontend'` |
| 5 | shared-package | `DOS/packages/core` → `packages/core` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/core' 'DOS/packages/core'` |
| 5 | shared-package | `DOS/packages/frontend` → `packages/frontend` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/frontend' 'DOS/packages/frontend'` |
| 5 | shared-package | `DSOC Module/packages/core` → `packages/core` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/core' 'DSOC Module/packages/core'` |
| 5 | shared-package | `DSOC Module/packages/frontend` → `packages/frontend` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/frontend' 'DSOC Module/packages/frontend'` |
| 5 | shared-package | `Vendor Module/_sources/packages_modules_vendor` → `packages/modules_vendor` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/modules_vendor' 'Vendor Module/_sources/packages_modules_vendor'` |
| 5 | shared-package | `Workflow Module/_sources/packages_modules_workflow` → `packages/modules_workflow` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/modules_workflow' 'Workflow Module/_sources/packages_modules_workflow'` |
| 5 | shared-package | `Workflow Module/packages/shared-workflow-types` → `packages/shared-workflow-types` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/shared-workflow-types' 'Workflow Module/packages/shared-workflow-types'` |
| 5 | shared-package | `Workflow Module/packages/shared-workflow-types-grc` → `packages/shared-workflow-types-grc` | — | ✅ | ✅ | — | ✅ | medium | `git mv 'packages/shared-workflow-types-grc' 'Workflow Module/packages/shared-workflow-types-grc'` |
| 6 | runtime-service | `AI-OS Module/_sources/services_ai-engine-service` → `services/ai-engine-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/ai-engine-service' 'AI-OS Module/_sources/services_ai-engine-service'` |
| 6 | runtime-service | `AI-OS Module/_sources/services_ai-gateway-service` → `services/ai-gateway-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/ai-gateway-service' 'AI-OS Module/_sources/services_ai-gateway-service'` |
| 6 | runtime-service | `AI-OS Module/_sources/services_ai-governance-service` → `services/ai-governance-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/ai-governance-service' 'AI-OS Module/_sources/services_ai-governance-service'` |
| 6 | runtime-service | `AI-OS Module/_sources/services_tenant-service_src_domain_ai-os` → `services/tenant-service_src_domain_ai-os` | — | ✅ | — | — | ✅ | high | `git mv 'services/tenant-service_src_domain_ai-os' 'AI-OS Module/_sources/services_tenant-service_src_domain_ai-os'` |
| 6 | runtime-service | `BCP Module/_sources/services_bcp-service` → `services/bcp-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/bcp-service' 'BCP Module/_sources/services_bcp-service'` |
| 6 | runtime-service | `DAuth Module/services/auth-service` → `services/auth-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/auth-service' 'DAuth Module/services/auth-service'` |
| 6 | runtime-service | `DNOC Module/services/dnoc-service` → `services/dnoc-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/dnoc-service' 'DNOC Module/services/dnoc-service'` |
| 6 | runtime-service | `DOS/services/dos-service` → `services/dos-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/dos-service' 'DOS/services/dos-service'` |
| 6 | runtime-service | `DSOC Module/services/dsoc-service` → `services/dsoc-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/dsoc-service' 'DSOC Module/services/dsoc-service'` |
| 6 | runtime-service | `Vendor Module/_sources/services_vendor-service` → `services/vendor-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/vendor-service' 'Vendor Module/_sources/services_vendor-service'` |
| 6 | runtime-service | `Workflow Module/_sources/services_workflow-service` → `services/workflow-service` | — | ✅ | — | — | ✅ | high | `git mv 'services/workflow-service' 'Workflow Module/_sources/services_workflow-service'` |
| 7 | manifest | `manifests` → `manifests` | — | — | — | — | — | low | `git mv 'manifests' 'manifests'` |
| 7 | registry | `registries` → `registries` | — | — | — | — | — | low | `git mv 'registries' 'registries'` |
| 8 | ops | `ops` → `ops` | — | — | — | — | — | low | `git mv 'ops' 'ops'` |
| 8 | platform-owned | `scripts` → `scripts` | — | — | — | — | — | low | `git mv 'scripts' 'scripts'` |
| 9 | test | `tests` → `tests` | — | — | — | — | — | low | `git mv 'tests' 'tests'` |

## Notes (per move)

- **Shahin-AI Website/spa → products/shahin-ai/app** — Canonical Angular SPA. After mv, update angular.json projects.app.root, tsconfig refs, package name to @shahin-ai/app, and pnpm-workspace path.
- **Shahin-AI Website/agents → products/shahin-ai/agents** — Conditional move: only if Shahin-AI Website/agents exists (validated at Gate D).
- **Shahin-AI Website/assets → products/shahin-ai/assets** — Conditional move: only if Shahin-AI Website/assets exists (validated at Gate D).
- **Shahin-AI Website/composition → products/shahin-ai/composition** — Conditional move: only if Shahin-AI Website/composition exists (validated at Gate D).
- **Shahin-AI Website/dynamic-ui → products/shahin-ai/dynamic-ui** — Conditional move: only if Shahin-AI Website/dynamic-ui exists (validated at Gate D).
- **Shahin-AI Website/frontend → products/shahin-ai/frontend-legacy** — Legacy frontend retained as compatibility shim under product root with documented removal date (Gate L). DO NOT delete in this pass.
- **Shahin-AI Website/i18n → products/shahin-ai/i18n** — Conditional move: only if Shahin-AI Website/i18n exists (validated at Gate D).
- **Shahin-AI Website/navigation → products/shahin-ai/navigation** — Conditional move: only if Shahin-AI Website/navigation exists (validated at Gate D).
- **Shahin-AI Website/routes → products/shahin-ai/routes** — Conditional move: only if Shahin-AI Website/routes exists (validated at Gate D).
- **Shahin-AI Website/services → products/shahin-ai/services** — Conditional move: only if Shahin-AI Website/services exists (validated at Gate D).
- **Shahin-AI Website/state → products/shahin-ai/state** — Conditional move: only if Shahin-AI Website/state exists (validated at Gate D).
- **Shahin-AI Website/tests → products/shahin-ai/tests** — Conditional move: only if Shahin-AI Website/tests exists (validated at Gate D).
- **Shahin-AI Website/theme → products/shahin-ai/theme** — Conditional move: only if Shahin-AI Website/theme exists (validated at Gate D).
- **AI-OS Module/_sources/modules_ai → modules/ai** — NESTED-MODULE: requires manual promotion plan in Gate D
- **AI-OS Module/_sources/modules_ai-governance → modules/ai-governance** — NESTED-MODULE: requires manual promotion plan in Gate D
- **BCP Module/_sources/modules_bcp → modules/bcp** — NESTED-MODULE: requires manual promotion plan in Gate D
- **dashboard/dashboard-editor → modules/dashboard-editor** — NESTED-MODULE: requires manual promotion plan in Gate D
- **Foundation Module/team → modules/team** — NESTED-MODULE: requires manual promotion plan in Gate D
- **Governance Module/governance-ai → modules/governance-ai** — NESTED-MODULE: requires manual promotion plan in Gate D
- **Governance Module/governance-os → modules/governance-os** — NESTED-MODULE: requires manual promotion plan in Gate D
- **knowledge Module/knowledge → modules/knowledge** — NESTED-MODULE: requires manual promotion plan in Gate D
- **Onboarding Module/journey → modules/journey** — NESTED-MODULE: requires manual promotion plan in Gate D
- **Onboarding Module/modules-onboarding → modules/onboarding** — NESTED-MODULE: requires manual promotion plan in Gate D
- **Vendor Module/_sources/modules_vendor → modules/vendor** — NESTED-MODULE: requires manual promotion plan in Gate D
- **AI-OS Module/_sources/packages_ai → packages/ai** — Promoted from AI-OS Module.
- **AI-OS Module/_sources/packages_modules_ai → packages/modules_ai** — Promoted from AI-OS Module.
- **AI-OS Module/_sources/packages_modules_ai-governance → packages/modules_ai-governance** — Promoted from AI-OS Module.
- **BCP Module/_sources/packages_modules_bcp → packages/modules_bcp** — Promoted from BCP Module.
- **DAuth Module/packages/authz-ids → packages/authz-ids** — Promoted from DAuth Module.
- **DAuth Module/packages/contract-tests → packages/contract-tests** — Promoted from DAuth Module.
- **DAuth Module/packages/core → packages/core** — Promoted from DAuth Module.
- **DAuth Module/packages/csrf → packages/csrf** — Promoted from DAuth Module.
- **DAuth Module/packages/frontend → packages/frontend** — Promoted from DAuth Module.
- **DAuth Module/packages/module-auth → packages/module-auth** — Promoted from DAuth Module.
- **DAuth Module/packages/shared → packages/shared** — Promoted from DAuth Module.
- **DNOC Module/packages/core → packages/core** — Promoted from DNOC Module.
- **DNOC Module/packages/frontend → packages/frontend** — Promoted from DNOC Module.
- **DOS/packages/core → packages/core** — Promoted from DOS.
- **DOS/packages/frontend → packages/frontend** — Promoted from DOS.
- **DSOC Module/packages/core → packages/core** — Promoted from DSOC Module.
- **DSOC Module/packages/frontend → packages/frontend** — Promoted from DSOC Module.
- **Vendor Module/_sources/packages_modules_vendor → packages/modules_vendor** — Promoted from Vendor Module.
- **Workflow Module/_sources/packages_modules_workflow → packages/modules_workflow** — Promoted from Workflow Module.
- **Workflow Module/packages/shared-workflow-types → packages/shared-workflow-types** — Promoted from Workflow Module.
- **Workflow Module/packages/shared-workflow-types-grc → packages/shared-workflow-types-grc** — Promoted from Workflow Module.
- **AI-OS Module/_sources/services_ai-engine-service → services/ai-engine-service** — Promoted from AI-OS Module. Build & smoke required immediately after.
- **AI-OS Module/_sources/services_ai-gateway-service → services/ai-gateway-service** — Promoted from AI-OS Module. Build & smoke required immediately after.
- **AI-OS Module/_sources/services_ai-governance-service → services/ai-governance-service** — Promoted from AI-OS Module. Build & smoke required immediately after.
- **AI-OS Module/_sources/services_tenant-service_src_domain_ai-os → services/tenant-service_src_domain_ai-os** — Promoted from AI-OS Module. Build & smoke required immediately after.
- **BCP Module/_sources/services_bcp-service → services/bcp-service** — Promoted from BCP Module. Build & smoke required immediately after.
- **DAuth Module/services/auth-service → services/auth-service** — Promoted from DAuth Module. Build & smoke required immediately after.
- **DNOC Module/services/dnoc-service → services/dnoc-service** — Promoted from DNOC Module. Build & smoke required immediately after.
- **DOS/services/dos-service → services/dos-service** — Promoted from DOS. Build & smoke required immediately after.
- **DSOC Module/services/dsoc-service → services/dsoc-service** — Promoted from DSOC Module. Build & smoke required immediately after.
- **Vendor Module/_sources/services_vendor-service → services/vendor-service** — Promoted from Vendor Module. Build & smoke required immediately after.
- **Workflow Module/_sources/services_workflow-service → services/workflow-service** — Promoted from Workflow Module. Build & smoke required immediately after.
- **manifests → manifests** — No-op: already at canonical location.
- **registries → registries** — No-op: already at canonical location; will consolidate nested manifests/ directory contents during Gate D.
- **ops → ops** — No-op: already at canonical location.
- **scripts → scripts** — No-op: already at canonical location.
- **tests → tests** — No-op: already at canonical location.

## Execution commands (per batch)

### Batch 1 — Shahin-AI product app

```bash
git mv 'Shahin-AI Website/spa' 'products/shahin-ai/app'
```

### Batch 2 — Shahin-AI product frontend (composition/nav/theme/...)

```bash
git mv 'Shahin-AI Website/agents' 'products/shahin-ai/agents'
git mv 'Shahin-AI Website/assets' 'products/shahin-ai/assets'
git mv 'Shahin-AI Website/composition' 'products/shahin-ai/composition'
git mv 'Shahin-AI Website/dynamic-ui' 'products/shahin-ai/dynamic-ui'
git mv 'Shahin-AI Website/frontend' 'products/shahin-ai/frontend-legacy'
git mv 'Shahin-AI Website/i18n' 'products/shahin-ai/i18n'
git mv 'Shahin-AI Website/navigation' 'products/shahin-ai/navigation'
git mv 'Shahin-AI Website/routes' 'products/shahin-ai/routes'
git mv 'Shahin-AI Website/services' 'products/shahin-ai/services'
git mv 'Shahin-AI Website/state' 'products/shahin-ai/state'
git mv 'Shahin-AI Website/tests' 'products/shahin-ai/tests'
git mv 'Shahin-AI Website/theme' 'products/shahin-ai/theme'
```

### Batch 3 — Canonical modules → modules/{moduleCode}

```bash
git mv 'Action Module' 'modules/action'
git mv 'AGRC-engine Module' 'modules/agrc-engine'
git mv 'AI-OS Module/_sources/modules_ai' 'modules/ai'
git mv 'AI-OS Module/_sources/modules_ai-governance' 'modules/ai-governance'
git mv 'Analytics Module' 'modules/analytics'
git mv 'Asset Module' 'modules/asset'
git mv 'Attestation Module' 'modules/attestation'
git mv 'Audit Module' 'modules/audit'
git mv 'BCP Module/_sources/modules_bcp' 'modules/bcp'
git mv 'benchmarks' 'modules/benchmarks'
git mv 'Compliance Module' 'modules/compliance'
git mv 'Controls Module' 'modules/controls'
git mv 'dashboard' 'modules/dashboard'
git mv 'dashboard/dashboard-editor' 'modules/dashboard-editor'
git mv 'DORA Module' 'modules/dora'
git mv 'Dynamic UI Module' 'modules/dynamic-ui'
git mv 'Evidence Module' 'modules/evidence'
git mv 'exception' 'modules/exception'
git mv 'executive' 'modules/executive'
git mv 'fitch' 'modules/fitch'
git mv 'Foundation Module' 'modules/foundation'
git mv 'Foundation Module/team' 'modules/team'
git mv 'Governance Module' 'modules/governance'
git mv 'Governance Module/governance-ai' 'modules/governance-ai'
git mv 'Governance Module/governance-os' 'modules/governance-os'
git mv 'grc-query' 'modules/grc-query'
git mv 'Inbox Module' 'modules/inbox'
git mv 'Incident Module' 'modules/incident'
git mv 'integrations' 'modules/integrations'
git mv 'Isues Module' 'modules/issues'
git mv 'knowledge Module' 'modules/local-knowledge'
git mv 'knowledge Module/knowledge' 'modules/knowledge'
git mv 'ksa-regulatory Module' 'modules/ksa-regulatory'
git mv 'MCP Module' 'modules/mcp'
git mv 'Mobile Module' 'modules/mobile'
git mv 'Notification Module' 'modules/notification'
git mv 'Onboarding Module/journey' 'modules/journey'
git mv 'Onboarding Module/modules-onboarding' 'modules/onboarding'
git mv 'operating-cockpit' 'modules/operating-cockpit'
git mv 'playbooks' 'modules/playbooks'
git mv 'Policy Module' 'modules/policy'
git mv 'portals' 'modules/portals'
git mv 'Privacy Module' 'modules/privacy'
git mv 'proactive-leadership' 'modules/proactive-leadership'
git mv 'Qiyas Module' 'modules/qiyas'
git mv 'records' 'modules/records'
git mv 'Remediation Module' 'modules/remediation'
git mv 'Reporting Module' 'modules/reporting'
git mv 'Risk Module' 'modules/risk'
git mv 'Training Module' 'modules/training'
git mv 'Vendor Module/_sources/modules_vendor' 'modules/vendor'
git mv 'widgets' 'modules/widgets'
git mv 'Workflow Module' 'modules/workflow'
```

### Batch 4 — Platform-tier folders → platform/

```bash
git mv 'contracts' 'platform/contracts'
git mv 'docs' 'platform/docs'
git mv 'errors' 'platform/errors'
git mv 'migration' 'platform/migration'
git mv 'platform-core' 'platform/shared/platform-core'
git mv 'product-shell' 'platform/shared/product-shell'
git mv 'routing' 'platform/routing'
git mv 'utils' 'platform/shared/utils'
```

### Batch 5 — Embedded packages → packages/

```bash
git mv 'AI-OS Module/_sources/packages_ai' 'packages/ai'
git mv 'AI-OS Module/_sources/packages_modules_ai' 'packages/modules_ai'
git mv 'AI-OS Module/_sources/packages_modules_ai-governance' 'packages/modules_ai-governance'
git mv 'BCP Module/_sources/packages_modules_bcp' 'packages/modules_bcp'
git mv 'DAuth Module/packages/authz-ids' 'packages/authz-ids'
git mv 'DAuth Module/packages/contract-tests' 'packages/contract-tests'
git mv 'DAuth Module/packages/core' 'packages/core'
git mv 'DAuth Module/packages/csrf' 'packages/csrf'
git mv 'DAuth Module/packages/frontend' 'packages/frontend'
git mv 'DAuth Module/packages/module-auth' 'packages/module-auth'
git mv 'DAuth Module/packages/shared' 'packages/shared'
git mv 'DNOC Module/packages/core' 'packages/core'
git mv 'DNOC Module/packages/frontend' 'packages/frontend'
git mv 'DOS/packages/core' 'packages/core'
git mv 'DOS/packages/frontend' 'packages/frontend'
git mv 'DSOC Module/packages/core' 'packages/core'
git mv 'DSOC Module/packages/frontend' 'packages/frontend'
git mv 'Vendor Module/_sources/packages_modules_vendor' 'packages/modules_vendor'
git mv 'Workflow Module/_sources/packages_modules_workflow' 'packages/modules_workflow'
git mv 'Workflow Module/packages/shared-workflow-types' 'packages/shared-workflow-types'
git mv 'Workflow Module/packages/shared-workflow-types-grc' 'packages/shared-workflow-types-grc'
```

### Batch 6 — Embedded services → services/

```bash
git mv 'AI-OS Module/_sources/services_ai-engine-service' 'services/ai-engine-service'
git mv 'AI-OS Module/_sources/services_ai-gateway-service' 'services/ai-gateway-service'
git mv 'AI-OS Module/_sources/services_ai-governance-service' 'services/ai-governance-service'
git mv 'AI-OS Module/_sources/services_tenant-service_src_domain_ai-os' 'services/tenant-service_src_domain_ai-os'
git mv 'BCP Module/_sources/services_bcp-service' 'services/bcp-service'
git mv 'DAuth Module/services/auth-service' 'services/auth-service'
git mv 'DNOC Module/services/dnoc-service' 'services/dnoc-service'
git mv 'DOS/services/dos-service' 'services/dos-service'
git mv 'DSOC Module/services/dsoc-service' 'services/dsoc-service'
git mv 'Vendor Module/_sources/services_vendor-service' 'services/vendor-service'
git mv 'Workflow Module/_sources/services_workflow-service' 'services/workflow-service'
```

### Batch 7 — Registries / manifests consolidation

```bash
git mv 'manifests' 'manifests'
git mv 'registries' 'registries'
```

### Batch 8 — Scripts / ops (no-op)

```bash
git mv 'ops' 'ops'
git mv 'scripts' 'scripts'
```

### Batch 9 — Tests (no-op)

```bash
git mv 'tests' 'tests'
```
