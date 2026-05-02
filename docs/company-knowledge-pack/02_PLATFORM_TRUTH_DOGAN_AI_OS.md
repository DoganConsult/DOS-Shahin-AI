# 02 — Platform truth: Dogan-AI OS

**Naming:** **Dogan-AI OS** = platform. **Dogan Consult** = company. **Shahin-AI** = product example on the platform.

**Canonical (verbatim, public):** *Dogan-AI OS by Dogan Consult is an AI-native enterprise operating platform for governed products, regulated SaaS, and sovereign deployments.* — *Shahin-AI by Dogan Consult, powered by Dogan-AI OS.*

---

> **Post-restructure note (2026-04-29, Phase 3.5):** The evidence anchors below
> reference `**/platform-module.manifest.json` glob patterns from a
> **pre-restructure** snapshot. After Phase 3 platform-module promotions and
> Phase 3.5 manifest standardization, those 4 legacy files (DAuth, DOS, DSOC,
> DNOC) have been promoted to canonical v1 `module.manifest.json` files at
> `platform/<x>/module.manifest.json` with `kind:"platform"` +
> `lifecycle.stage:"ga"`. Legacy files are archived under
> `_quarantine/legacy-manifests/<x>/`. This document is retained as a
> historical snapshot.

---

## Two layers of “truth”

### A) Narrow default runtime (what PM2 starts today)

The committed `ops/ecosystem.all.config.js` starts **four** Node apps:

| App | Port (config) | Role (from name / comments) |
|-----|----------------|------------------------------|
| dos-gateway | 4000 | API gateway |
| dos-auth-service | 4001 | Auth |
| dos-tenant-service | 4002 | Tenant |
| dos-product-shell | 3000 | Product shell UI |

```yaml
claim: "Four PM2 apps; gateway README states no business modules wired"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "ops/ecosystem.all.config.js"
  - path: "services/gateway/README.md"
```

**NEEDS_RUNTIME_VERIFICATION:** Actual health of each port on a given host, TLS termination, and upstream DB/Keycloak.

---

### B) Broad platform artifact tree (design + future wiring)

Under `DOS Platform/` there are **many** `* Module` directories, `registries/*.json`, `manifests/`, per-module `module.manifest.json` files, and `_sources` mirrors. This proves **platform intent and inventory**, not that each module is mounted in the default PM2 slice.

```yaml
claim: "DOS Platform contains 35+ top-level entries including many Module folders"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/"
    note: "directory listing; see inventory doc"
```

```yaml
claim: "modules.registry.json array length 72"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/registries/modules.registry.json"
```

```yaml
claim: "Glob found 32 module.manifest.json and 4 platform-module.manifest.json under DOS Platform"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/**/module.manifest.json"
  - path: "DOS Platform/**/platform-module.manifest.json"
    note: "counts from find; NEEDS_RUNTIME_VERIFICATION for each mount"
```

---

## Safe public wording

- **Dogan-AI OS** is the **platform** architecture and module ecosystem in this repository.  
- **Dogan Consult** is the **company** behind the platform and product work.  
- Default **demo/dev** runtime is a **small** subset of services; full module fleet is **not** implied by PM2 alone.

---

## UI copy vs backend (Shahin-AI Website)

Frontend **ngrx** seed names a workspace **“Dogan-AI OS GRC”** — treat as **UI/product framing**, not corporate entity naming.

```yaml
claim: "ngrx.providers.ts uses label 'Dogan-AI OS GRC'"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/src/app/blueprint/core/ngrx/ngrx.providers.ts"
```

PWA **manifest** uses **Shahin-AI by Dogan Consult** (product + company).

```yaml
claim: "manifest.json names Shahin-AI by Dogan Consult"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/public/manifest.json"
```
