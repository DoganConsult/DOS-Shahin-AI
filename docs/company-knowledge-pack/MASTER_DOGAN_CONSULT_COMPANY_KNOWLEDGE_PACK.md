# MASTER — Dogan Consult Company Knowledge Pack

**Official documentation product name**

**Dogan Consult Company Knowledge Pack — Dogan-AI OS Platform, Shahin-AI Product, Modules, AI, Sales, and Design Reference.**

**Attribution:** *Powered by Dogan Consult* · *Built by Dogan Consult*

---

> **Post-restructure note (2026-04-29, Phase 3.5):** The repository structure
> and manifest paths described below are an inventory snapshot captured **before**
> the Phase 3 platform-module promotions and the Phase 3.5 manifest standardization.
> In particular, the 4 legacy `platform-module.manifest.json` files (DAuth, DOS,
> DSOC, DNOC) referenced in the counts have been promoted to canonical v1
> `module.manifest.json` files at `platform/<x>/module.manifest.json` with
> required `kind:"platform"` and `lifecycle.stage:"ga"`; rich metadata is
> preserved verbatim under `metadata.*`. Legacy files are archived under
> `_quarantine/legacy-manifests/<x>/`. This document is retained as a historical
> snapshot — see `platform/docs/migration/` for the post-restructure inventory.

---

## Naming hierarchy (mandatory)

1. **Company** = **Dogan Consult**  
2. **Platform** = **Dogan-AI OS**  
3. **Product example** = **Shahin-AI** (runs on Dogan-AI OS)  
4. **Attribution** = *Powered by Dogan Consult* / *Built by Dogan Consult*  
5. **Forbidden** = “Dogan-AI company”, “Dogan AI company”, “Dogan-AI is the company”

---

## Canonical public wording (verbatim)

**English — platform:** *Dogan-AI OS by Dogan Consult is an AI-native enterprise operating platform for governed products, regulated SaaS, and sovereign deployments.*

**Arabic — platform:** *منصة Dogan-AI OS من Dogan Consult هي منصة تشغيل مؤسسية مدعومة بالذكاء الاصطناعي لبناء وتشغيل منتجات منظمة وآمنة وقابلة للحوكمة.*

**English — Shahin:** *Shahin-AI by Dogan Consult, powered by Dogan-AI OS.*

**Arabic — Shahin:** *Shahin-AI من Dogan Consult، مدعوم بمنصة Dogan-AI OS.*

---

## Table of contents (numbered files)

| # | File |
|---|------|
| 00 | [00_README.md](./00_README.md) |
| 01 | [01_EXECUTIVE_SUMMARY.md](./01_EXECUTIVE_SUMMARY.md) |
| 02 | [02_PLATFORM_TRUTH_DOGAN_AI_OS.md](./02_PLATFORM_TRUTH_DOGAN_AI_OS.md) |
| 03 | [03_ARCHITECTURE_AND_RUNTIME_INVENTORY.md](./03_ARCHITECTURE_AND_RUNTIME_INVENTORY.md) |
| 04 | [04_PRODUCTS_AND_PRODUCT_LAYER.md](./04_PRODUCTS_AND_PRODUCT_LAYER.md) |
| 05 | [05_MODULE_CATALOG_DEEP_DIVE.md](./05_MODULE_CATALOG_DEEP_DIVE.md) |
| 06 | [06_PLATFORM_CAPABILITIES_FOR_SALES.md](./06_PLATFORM_CAPABILITIES_FOR_SALES.md) |
| 07 | [07_AI_POWER_STACK.md](./07_AI_POWER_STACK.md) |
| 08 | [08_DAUTH_IDENTITY_AUTHORIZATION_TRUST.md](./08_DAUTH_IDENTITY_AUTHORIZATION_TRUST.md) |
| 09 | [09_DSOC_SECURITY_OPERATIONS.md](./09_DSOC_SECURITY_OPERATIONS.md) |
| 10 | [10_DNOC_NETWORK_OPERATIONS_OBSERVABILITY.md](./10_DNOC_NETWORK_OPERATIONS_OBSERVABILITY.md) |
| 11 | [11_WORKFLOW_AUDIT_EVIDENCE_GOVERNANCE.md](./11_WORKFLOW_AUDIT_EVIDENCE_GOVERNANCE.md) |
| 12 | [12_KSA_GCC_REGULATORY_READINESS.md](./12_KSA_GCC_REGULATORY_READINESS.md) |
| 13 | [13_COMPETITIVE_POSITIONING_AND_DIFFERENTIATORS.md](./13_COMPETITIVE_POSITIONING_AND_DIFFERENTIATORS.md) |
| 14 | [14_DESIGN_CONTENT_VIDEO_PPT_INFOGRAPHIC_BRIEF.md](./14_DESIGN_CONTENT_VIDEO_PPT_INFOGRAPHIC_BRIEF.md) |
| 15 | [15_SALES_TALK_TRACKS_BY_AUDIENCE.md](./15_SALES_TALK_TRACKS_BY_AUDIENCE.md) |
| 16 | [16_CLAIMS_REGISTER_AND_EVIDENCE_MAP.md](./16_CLAIMS_REGISTER_AND_EVIDENCE_MAP.md) |
| 17 | [17_OPEN_QUESTIONS_AND_VERIFICATION_GAPS.md](./17_OPEN_QUESTIONS_AND_VERIFICATION_GAPS.md) |

---

## Merged executive summary (EN)

**Dogan Consult** builds **Dogan-AI OS**, a modular operating system for high-trust software. **Shahin-AI** is a **product example** that runs on **Dogan-AI OS** and is represented in-repo by the **Shahin-AI Website** Angular application and related workspace entries. The **default PM2** configuration runs **four** applications (gateway, auth-service, tenant-service, product-shell), while **registries** list **37** services and **72** modules — demonstrating **breadth** separately from **default runtime depth**.

---

## Final report (execution checklist)

### Files created

`00_README.md` through `17_OPEN_QUESTIONS_AND_VERIFICATION_GAPS.md`, plus **`MASTER_DOGAN_CONSULT_COMPANY_KNOWLEDGE_PACK.md`**, under:

`/root/DOS-AIO/DOS Platform/docs/company-knowledge-pack/`

### Repository areas inspected

- `DOS Platform/` (modules, Shahin-AI Website, registries, DAuth, AI-OS `_sources`, etc.)  
- `services/` (gateway package.json, service layout)  
- `ops/ecosystem.all.config.js`  
- `pnpm-workspace.yaml`, `package.json`  
- `docs/audits/dos-platform-inventory-2026-04-27.md`  
- `DOS Platform/registries/modules.registry.json`, `services.registry.json`  
- `DOS Platform/Shahin-AI Website/frontend/public/manifest.json`, `package.json`, selected i18n

### Counts found

| Item | Count |
|------|------|
| `modules.registry.json` → `modules` array | **72** |
| `services.registry.json` → `serviceCode` | **37** |
| `module.manifest.json` under DOS Platform | **32** |
| `platform-module.manifest.json` | **4** |
| `services/` top-level directories | **30** |
| PM2 apps in `ecosystem.all.config.js` | **4** |
| DOS Platform files (from prior audit doc) | **~18,817** (NEEDS_RECOUNT if tree changes) |

### Strong confirmed capabilities

- Committed **module** and **service** registries with concrete JSON.  
- **PM2** ecosystem for **gateway, auth, tenant, shell**.  
- **Shahin-AI** frontend with **Dogan Consult** attribution in manifest/package.  
- **Gateway** package metadata for **Keycloak** JWKS / issuer.  
- Large **DOS Platform** module tree suitable for **platform** positioning.

### Partial / scaffolded capabilities

- Many modules inferred or mirrored (`_sources`); not proven in default PM2.  
- AI (LangGraph/Langfuse) present as vendor/reference tree — **not** proven as live product AI without runtime checks.

### Safe public claims

- **Dogan Consult** is the company; **Dogan-AI OS** is the platform; **Shahin-AI** is an example product.  
- Registries enumerate **72** modules and **37** services.  
- Default demo slice runs **four** PM2 apps.

### Claims requiring runtime verification

- Live OIDC/JWKS, DB migrations, per-route gateway wiring, AI endpoints, per-tenant entitlements — see `17_OPEN_QUESTIONS_AND_VERIFICATION_GAPS.md`.

### Top evidence references

1. `ops/ecosystem.all.config.js`  
2. `DOS Platform/registries/modules.registry.json`  
3. `DOS Platform/registries/services.registry.json`  
4. `package.json` (modules noop / not wired)  
5. `DOS Platform/Shahin-AI Website/frontend/public/manifest.json`  
6. `services/gateway/package.json`  
7. `docs/audits/dos-platform-inventory-2026-04-27.md`

### Naming consistency result

Run after pack creation:

```bash
rg -n "Dogan-AI company|Dogan AI company|Dogan-AI is the company" "/root/DOS-AIO/DOS Platform/docs/company-knowledge-pack/" || true
```

**Interpretation:** `rg` may match lines that **quote** these strings as **forbidden** or in **replacement tables** (e.g. `00_README.md`, `14_…`, `16_…`, `MASTER`). That is intentional. There is **no** affirmative use of those phrases as the company name; company-level wording uses **Dogan Consult**, platform wording uses **Dogan-AI OS**, and **Shahin-AI** is described as a product example on the platform.

**PASS** (semantic): forbidden phrases appear only in prohibitions / corrections, not as corporate identity.

**Naming hierarchy pass (canonical copy):** Verbatim approved EN/AR platform and Shahin lines from the stakeholder plan are present in `00_README.md`, `01_EXECUTIVE_SUMMARY.md`, `02_PLATFORM_TRUTH_DOGAN_AI_OS.md`, `06_PLATFORM_CAPABILITIES_FOR_SALES.md`, `14_DESIGN_CONTENT_VIDEO_PPT_INFOGRAPHIC_BRIEF.md`, `15_SALES_TALK_TRACKS_BY_AUDIENCE.md`, `16_CLAIMS_REGISTER_AND_EVIDENCE_MAP.md` (claims C-13/C-14), and this MASTER.

### Recommended next step

1. Execute the `rg` naming check in CI on `docs/company-knowledge-pack/`.  
2. Produce a one-page **runtime evidence** appendix (health URLs, gateway OpenAPI if any) when a staging environment is available.
