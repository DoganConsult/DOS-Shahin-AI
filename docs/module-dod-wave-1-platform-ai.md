# Wave 1 — Platform AI-OS baseline (`platform/ai`)

Pilot alignment with [module-definition-of-done.md](./module-definition-of-done.md), scoped to **platform DNA** only (`platform/ai`, `moduleCode: ai-os`). Not a tenant `modules/*` module.

**Canonical owner doc:** [platform/ai/AI-OS-CANONICAL.md](../platform/ai/AI-OS-CANONICAL.md)

---

## Wave 1 goals (baseline repair + orientation)

1. **Measurable orientation** — One README + canonical owner doc; every agent knows where HTTP, enrollment, and UI live.
2. **No new structural debt** — Freeze duplicate `ports/`, duplicate bootstraps, duplicate route manifests until Wave 2 explicitly collapses them.
3. **Typing / build** — Filtered `pnpm --filter @dos/ai-gateway-service|ai-engine-service|ai-governance-service build` (adjust names to match `package.json`) green on touched slices.
4. **Inventory** — List legacy duplicate UI roots at `platform/ai/<component>/` vs `platform/ai/frontend/features/**` for Wave 2–4.

---

## Inventory (current structural notes)

| Area | Location | Note |
|------|----------|------|
| Platform manifest | `platform/ai/module.manifest.json` | Single hoisted manifest |
| OpenAPI | `platform/ai/contracts/ai-os.openapi.yaml` | |
| Migrations | `platform/ai/migrations/` | public + tenant namespaced |
| Gateway service | `platform/ai/services/ai-gateway-service/` | `src/server.ts` |
| Engine service | `platform/ai/services/ai-engine-service/` | `src/server.ts` |
| Governance service | `platform/ai/services/ai-governance-service/` | `src/server.ts` |
| Engine package | `platform/ai/packages/modules-ai/` | **one** `ports/` |
| Governance package | `platform/ai/packages/modules-ai-governance/` | **one** `ports/` |
| Shell enrollment | `platform/ai/frontend/ai/ai.module.routes.ts` | `aiModuleRouteGroup`, `aiStandaloneRoutes` |
| Features | `platform/ai/frontend/features/{ai,ai-governance}/` | Preferred page home |
| Legacy feature-like roots | `platform/ai/{ai-hub,copilot,ai-os-dashboard,...}/` | Convergence / delete or re-export in later waves |

---

## Wave 2–5 (forward plan, not blocking Wave 1)

| Wave | Focus |
|------|--------|
| **2** | Canonical owner pass: collapse duplicate Angular roots; single enrollment path verified in products. |
| **3** | Dynamic UI: one resolver/registry for AI surfaces; no duplicate product manifests. |
| **4** | UI system normalization: migrate stragglers to `@dos/ui-system`. |
| **5** | CI gates: grep for duplicate `ports/` under `platform/ai/packages`; block second `server.ts` pattern per service. |

---

## Validation commands (examples)

```bash
# Packages (adjust filters to workspace names)
pnpm --filter @dos/ai build
pnpm --filter @dos/modules-ai build
pnpm --filter @dos/modules-ai-governance build

# Services
pnpm --filter @dos/ai-gateway-service build
pnpm --filter @dos/ai-engine-service build
pnpm --filter @dos/ai-governance-service build
```

If a filter name differs, read the `name` field in each `package.json` under `platform/ai/services/*` and `packages/*`.

---

## Done when (Wave 1)

- [x] `AI-OS-CANONICAL.md` exists and matches actual entry files.
- [x] `README.md` links to canonical owners + this wave doc.
- [ ] Filtered builds green (owner runs in CI or locally).
- [ ] Optional: open ticket list from legacy-folder inventory for Wave 2.
