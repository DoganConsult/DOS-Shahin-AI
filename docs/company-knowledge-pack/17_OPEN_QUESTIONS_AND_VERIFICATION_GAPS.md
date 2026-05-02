# 17 — Open questions and verification gaps

---

## NEEDS_RUNTIME_VERIFICATION (priority)

1. **Gateway route matrix** — Which `services.registry.json` entries are mounted in `services/gateway` for a given commit.  
2. **Keycloak** — Realm layout, client ids, token claims for tenant resolution.  
3. **Database** — Which services connect to which schemas; migration state.  
4. **Shahin-AI Website deploy** — Is port 3000 shell always this Angular app?  
5. **AI endpoints** — Live URLs, keys, model policy, tenant prompt isolation.  
6. **Per-module vertical slices** — AGENTS.md requires E2E proof per module; not asserted here.

---

## Design / product unknowns

- Canonical relationship between **AGRC-OS** (i18n string) and **Dogan-AI OS** / **Shahin-AI** naming in customer contracts.  
- Trademark status of each public name (**NEEDS_RUNTIME_VERIFICATION** / legal).

---

## Inventory unknowns

- Exact file count under `DOS Platform/` drifts — re-run `find` for audits.  
- Some registry rows may reference **generator provenance** paths that differ from runtime layout.

---

## Naming audit reminder

Before publishing any derived doc, grep for:

`Dogan-AI company`, `Dogan AI company`, `Dogan-AI is the company`
