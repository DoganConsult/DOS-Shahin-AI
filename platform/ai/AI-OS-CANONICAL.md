# AI-OS — Canonical owners (Definition-of-Done concept)

This folder is **platform DNA** (`kind: platform`, `moduleCode: ai-os`), not a tenant-entitled `modules/*` package. The same **three-owner** idea from [docs/module-definition-of-done.md](../../docs/module-definition-of-done.md) applies, **adapted**:

| Owner | Meaning for platform AI |
|-------|-------------------------|
| **Runtime / orchestration** | HTTP routes, jobs, event publish/consume, sidecar/kernel — **thin edges**, logic in services/packages. |
| **Shell / enrollment** | One obvious place where AI surfaces mount in the SPA (module route groups + standalone routes). |
| **UI system** | Presentation uses `@dos/ui-system` / `@dos/design-tokens` / contracts; no parallel design system inside `platform/ai`. |

**Constitution:** *AI OS orchestrates.* This tree owns the **AI plane**; products **compose** and **consume** only.

---

## 1. Canonical runtime owner (orchestration)

**Primary contract**

- `module.manifest.json` — platform identity, services, events, schemas, OpenAPI path.

**Service bootstraps** (each is the **single** HTTP + lifecycle entry for that process)

| Service | Entry | Routes barrel |
|---------|--------|----------------|
| ai-gateway-service | `services/ai-gateway-service/src/server.ts` | `services/ai-gateway-service/src/routes/index.ts` |
| ai-engine-service | `services/ai-engine-service/src/server.ts` | under `services/ai-engine-service/src/routes/` |
| ai-governance-service | `services/ai-governance-service/src/server.ts` | under `services/ai-governance-service/src/routes/` |

**Shared libraries** (types, facades, RAG, gateway registry)

- `packages/ai/` — `@dos/ai`
- `packages/ai-gateway/` — `@dos/ai-gateway`
- `packages/core-ai/` — `@dos/core-ai`
- `packages/modules-ai/` — engine module package (routes/services/**single** `ports/`)
- `packages/modules-ai-governance/` — governance package (same pattern)

**In-process platform extension**

- `_sidecars/tenant-service-domain-ai-os/` — kernel + tool base + model router consumed by `tenant-service` (keep **one** sidecar; no duplicate kernels).

**Rules**

- **Do not** add a second “global bootstrap” that re-registers the same routes/events for the same service.
- **Do not** duplicate `ports/` trees inside `packages/modules-ai*` — one `ports/` per package.
- Jobs: use the **shared** `JobDefinition` contract from `@dos/platform-core/jobs` (or one local re-export), not ad-hoc shapes.
- Events: one publisher/subscriber pattern per service; names align with `module.manifest.json` event sections.

---

## 2. Canonical shell / Dynamic UI owner (enrollment)

**Route groups** (lazy shell children under the AI module)

- `frontend/ai/ai.module.routes.ts` — exports `aiModuleRouteGroup`, `aiStandaloneRoutes`.

**Secondary governance routes** (if applicable)

- `frontend/ai-governance/ai-governance.module.routes.ts`

**Shared frontend services**

- `frontend/modules-ai/services/` — HTTP helpers used by AI pages.

**Product composition**

- Products may **import** these route groups; they must **not** fork a second copy of the same `ModuleRouteGroup` for the same `moduleCode` without retiring the old one.

**Rules**

- **One** source of truth for which paths exist for `moduleCode: ai` / AI-OS admin surfaces.
- Dynamic UI (Phase C): resolver/registry should point at **these** route entries, not duplicate manifests under `products/*`.

---

## 3. Canonical UI system owner (presentation)

- Prefer **shared** layout, tables, dialogs, tokens from `@dos/ui-system` and `@dos/design-tokens`.
- Pages live under `frontend/features/ai/` and `frontend/features/ai-governance/` (and related feature folders).
- **Drift to converge (see Wave doc):** legacy Angular folders at `platform/ai/*` root (`ai-hub/`, `copilot/`, `ai-os-dashboard/`, …) that mirror `frontend/features/*` are **candidates for deletion or thin re-export** once imports are unified — avoid growing new features there.

---

## 4. Related docs

- [README.md](./README.md) — layout, APIs, consolidation summary.
- [docs/module-dod-wave-1-platform-ai.md](../../docs/module-dod-wave-1-platform-ai.md) — Wave 1 baseline and convergence checklist.
- [docs/module-definition-of-done.md](../../docs/module-definition-of-done.md) — full DOD (module wording; adapt mentally for platform).

---

## 5. PR checklist (quick)

- [ ] Touches only **one** of: service bootstrap, package `ports/`, or `frontend/ai/ai.module.routes.ts` unless cross-cutting change is explicitly justified.
- [ ] No new parallel `ports/*` subtree.
- [ ] No placeholder production route on an entitled path.
- [ ] New jobs use shared **JobDefinition** typing.
- [ ] UI additions use **UI system** primitives where the shell already does.
