# platform/ai — AI-OS

**Layer:** platform (always-on shared infrastructure, not for sale)
**`kind`:** `platform`
**`moduleCode`:** `ai-os`
**Status:** Promoted 2026-04-30 (parity with the other 6 platform modules: dauth, dos, dsoc, dnoc, foundation, dynamic-ui)

## Definition of Done — start here (platform adaptation)

The repo-wide **module** bar is [docs/module-definition-of-done.md](../../docs/module-definition-of-done.md). For **platform AI-OS**, the same *three-owner* idea applies (runtime orchestration, shell enrollment, UI system), adapted for DNA — not tenant entitlement.

| Document | Purpose |
|----------|---------|
| **[AI-OS-CANONICAL.md](./AI-OS-CANONICAL.md)** | **Single source of truth** for canonical bootstraps, route enrollment, packages, and anti-patterns. |
| [docs/module-dod-wave-1-platform-ai.md](../../docs/module-dod-wave-1-platform-ai.md) | Wave 1 baseline + inventory + later waves for this tree. |

**Rule of thumb:** *AI OS orchestrates.* Products and `modules/*` **consume** the AI plane; they do not own parallel gateway/engine/governance stacks.

## Purpose
AI-OS is the platform-level AI plane every product and module talks to:
- `ai-gateway-service`     — provider routing, quota, cost, rate limiting (`/api/ai`)
- `ai-engine-service`      — inference orchestration, agents, tool calling (`/api/ai-engine`)
- `ai-governance-service`  — policy, safety, audit, redaction, evals (`/api/ai-governance`)

Business modules (e.g. `risk`, `compliance`, `audit`) consume AI capability
through this plane. They never call an external model directly.

## Canonical layout

```
platform/ai/
├── module.manifest.json          # kind: platform, moduleCode: ai-os
├── README.md
├── contracts/
│   └── ai-os.openapi.yaml        # canonical port-style contract
├── bundles/
│   └── default.bundle.json       # ai-os-default deployment bundle
├── migrations/
│   ├── migrations-index.json
│   ├── public/ai-governance/     # 13 SQL files
│   └── tenant/
│       ├── ai/                   # 8 SQL files (engine schema)
│       └── ai-governance/        # 4 SQL files
├── services/
│   ├── ai-gateway-service/       # @dos/ai-gateway-service
│   ├── ai-engine-service/        # @dos/ai-engine-service
│   └── ai-governance-service/    # @dos/ai-governance-service
├── packages/
│   ├── ai/                       # @dos/ai (shared types/SDK facade)
│   ├── ai-gateway/               # @dos/ai-gateway (config registry + vector store)
│   ├── core-ai/                  # @dos/core-ai (pgvector RAG adapter)
│   ├── modules-ai/               # @dos/modules-ai (engine module package)
│   └── modules-ai-governance/    # @dos/modules-ai-governance (governance package)
├── modules/
│   ├── ai/                       # sub-module manifest (engine DB ownership)
│   └── ai-governance/            # sub-module manifest (governance DB ownership)
├── frontend/
│   ├── ai/                       # ai.module.routes
│   ├── ai-governance/            # ai-governance.module.routes
│   └── modules-ai/               # shared module-AI services
└── _sidecars/
    └── tenant-service-domain-ai-os/   # AI-OS kernel + ollama router + tool base
                                       # (consumed in-process by tenant-service)
```

## Consolidation summary (2026-04-30)
1. **Hoisted `module.manifest.json`** to `platform/ai/` root with `kind:"platform"`, `moduleCode:"ai-os"`. Sub-module manifests under `platform/ai/modules/{ai,ai-governance}/` are preserved for granular DB ownership tracking.
2. **Created `contracts/ai-os.openapi.yaml`**, **`bundles/default.bundle.json`**, and **`migrations/migrations-index.json`** for parity with the other 6 platform modules.
3. **Physically moved migration files** from `platform/ai/modules/{ai,ai-governance}/db/{public,tenant}/migrations/` into `platform/ai/migrations/{public,tenant}/{ai,ai-governance}/`. Sub-module namespacing avoids filename collisions.
4. **Consolidated scattered AI sources**:
   - `packages/dos-platform-core/src/ai-gateway/{ai-config.registry,vector-store.service}.ts` → `platform/ai/packages/ai-gateway/src/` (new package `@dos/ai-gateway`).
   - `packages/dos-platform-core/src/ai/pgvector-rag-adapter.ts` → `platform/ai/packages/core-ai/src/` (new package `@dos/core-ai`).
   - `services/tenant-service/ai/{models/ollama-model-router,tools/tool-base}.ts` → `platform/ai/_sidecars/tenant-service-domain-ai-os/{models,tools}/`.
   - The original `dos-platform-core` files were replaced with thin re-export shims so existing consumers importing `@dos/platform-core/ai-gateway/...` and `@dos/platform-core/ai/...` keep working without code changes.
5. **Fixed fragile build script** in `ai-engine-service/package.json`: `../../../ops/scripts/...` → `../../../../ops/scripts/...` (now correct from `platform/ai/services/<svc>/`).
6. **Updated `pnpm-workspace.yaml`** to register `platform/ai/packages/*` and `platform/ai/services/*`. Removed stale `AI-OS Module/_sources/services_ai-*` legacy entries.
7. **Tightened validator** (`scripts/validate-manifests.mjs`): removed AI-OS services from `PENDING_SERVICE_PROMOTIONS` so the registry cross-check is now a hard error if any of the three services is missing.

## API surface
| Service                  | Base path             | Health                    |
| ------------------------ | --------------------- | ------------------------- |
| ai-gateway-service       | `/api/ai`             | `/api/ai/health`          |
| ai-engine-service        | `/api/ai-engine`      | `/api/ai-engine/health`   |
| ai-governance-service    | `/api/ai-governance`  | `/api/ai-governance/health` |

## Schema
All AI-OS tables live in the `platform_ai` Postgres schema (see `module.manifest.json` → `metadata.schemas.dedicated.tables` for the full list of 44 tables across `ai_*` and `ai_gov_*` prefixes).

## Event namespace
- Publishes: `ai.*` (engine, agent, proposal, autonomy, kill switch, drift, cost) and `ai_governance.*` (model registered, assessment completed, bias detected, fairness scored, ethical review, impact assessed, monitoring alert, policy violated, transparency report, validation completed).
- Subscribes: `risk.*`, `compliance.*`, `policy.document.approved`, `audit.finding*`, `workflow.status*`, `governance.health.updated`.
