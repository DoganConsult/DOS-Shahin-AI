# 16 — Claims register and evidence map

| ID | Claim | Confidence | Primary evidence path |
|----|-------|------------|------------------------|
| C-01 | Company is **Dogan Consult** | Policy (this pack) | `00_README.md` |
| C-02 | Platform is **Dogan-AI OS** | Policy (this pack) | `00_README.md` |
| C-03 | Shahin-AI is product example | CONFIRMED_IN_CONFIG | `Shahin-AI Website/frontend/package.json` |
| C-04 | PM2 runs 4 apps | CONFIRMED_IN_CONFIG | `ops/ecosystem.all.config.js` |
| C-05 | 72 modules in registry | CONFIRMED_IN_CONFIG | `DOS Platform/registries/modules.registry.json` |
| C-06 | 37 services in registry | CONFIRMED_IN_CONFIG | `DOS Platform/registries/services.registry.json` |
| C-07 | 32 module manifests + 4 platform-module | CONFIRMED_IN_CODE | glob under `DOS Platform/` |
| C-08 | Gateway documents Keycloak env | CONFIRMED_IN_CONFIG | `services/gateway/package.json` |
| C-09 | pnpm workspace includes Shahin frontend | CONFIRMED_IN_CONFIG | `pnpm-workspace.yaml` |
| C-10 | Root build does not wire all modules | CONFIRMED_IN_CONFIG | `package.json` (noop modules comment) |
| C-11 | LangGraph/Langfuse in AI-OS `_sources` | CONFIRMED_IN_CODE | `DOS Platform/AI-OS Module/_sources/` |
| C-12 | All 72 modules live in prod | **NOT CLAIMED** | NEEDS_RUNTIME_VERIFICATION |
| C-13 | Canonical EN platform one-liner (approved pack copy) | PACK_POLICY | `00_README.md` § Canonical public wording |
| C-14 | Canonical EN Shahin one-liner (approved pack copy) | PACK_POLICY | `00_README.md` § Canonical public wording |

---

## UI vs backend separation

| Claim type | Example | Where to prove |
|------------|---------|----------------|
| UI copy | KSA painkiller | `manifest.json`, i18n |
| Backend | JWKS validation | gateway runtime + Keycloak |
| Inventory | Module count | `modules.registry.json` |

---

## Forbidden claims row

| Forbidden | Replacement |
|-----------|-------------|
| Dogan-AI company | **Dogan Consult** (company) |
| Dogan-AI is the company | **Dogan Consult** is the company; **Dogan-AI OS** is the platform |
