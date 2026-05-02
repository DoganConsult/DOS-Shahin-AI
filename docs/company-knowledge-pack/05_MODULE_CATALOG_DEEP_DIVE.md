# 05 — Module catalog deep dive

**Platform:** Dogan-AI OS · **Company:** Dogan Consult

---

> **Post-restructure note (2026-04-29, Phase 3.5):** The manifest counts below
> reflect a **pre-restructure** inventory snapshot. After Phase 3 platform-module
> promotions and the Phase 3.5 manifest standardization, the 4 legacy
> `platform-module.manifest.json` files (DAuth, DOS, DSOC, DNOC) have been
> promoted to canonical v1 `module.manifest.json` files at
> `platform/<x>/module.manifest.json` with required `kind:"platform"` and
> `lifecycle.stage:"ga"`. Rich metadata is preserved verbatim under
> `metadata.*`. Legacy files are archived under
> `_quarantine/legacy-manifests/<x>/`. This document is retained as a
> historical snapshot.

---

## Registry vs filesystem

- **`DOS Platform/registries/modules.registry.json`** — 72 entries in `modules` array (`jq` verified).  
- **`DOS Platform/registries/services.registry.json`** — 37 `serviceCode` entries (`grep` count).  
- **Manifest files** — 32 `module.manifest.json` + 4 `platform-module.manifest.json` under `DOS Platform/` (glob count).

Many registry rows show `implementationStatus: "inferred"` and `provenance: "backend/src/modules/..."` — treat as **inventory / generator output**, not proof each path exists on disk unchanged.

```yaml
claim: "Foundation module manifest declares moduleCode foundation and routeBase /api/foundation"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/Foundation Module/module.manifest.json"
```

---

## Example module folders (non-exhaustive)

From `DOS Platform/` listing: Foundation, Governance, Risk, Workflow, Evidence, Audit, DAuth, DSOC, DNOC, MCP, AI-OS, Onboarding, Shahin-AI Website, ksa-regulatory, etc.

---

## `_sources` mirrors

Several modules include `_sources/` (e.g. AI-OS, DAuth). These are **reference / upstream mirrors** for SDK or design parity — **INFERRED_FROM_STRUCTURE** for “shipping in production” unless build graphs import them.

```yaml
claim: "AI-OS Module contains _sources with langfuse/langgraph paths in tree"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/AI-OS Module/_sources/"
    note: "NEEDS_RUNTIME_VERIFICATION for live AI routes"
```

---

## NEEDS_RUNTIME_VERIFICATION

- Per-module HTTP mount under gateway.  
- Per-module database schemas and migrations in target environment.  
- Entitlement flags per tenant for each module.
