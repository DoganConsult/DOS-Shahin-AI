# 08 — DAuth: identity, authorization, trust

**Dogan-AI OS** platform security narrative; **Dogan Consult** as builder.

---

## DAuth module

- `DOS Platform/DAuth Module/` — manifests, packages, `_sources`.  
- Shared package exports (gateway origin, `requireDauth`, authz evaluator ports) under `DOS Platform/DAuth Module/packages/shared/src/index.ts`.

```yaml
claim: "DAuth shared package exports gatewayOrigin, requireDauth, createStaticEvaluator"
confidence: CONFIRMED_IN_CODE
evidence:
  - path: "DOS Platform/DAuth Module/packages/shared/src/index.ts"
```

---

## Gateway + Keycloak

`services/gateway/package.json` documents `KEYCLOAK_ISSUER_URL`, `KEYCLOAK_JWKS_URL`, and scripts referencing auth/tenant URLs.

```yaml
claim: "Gateway package.json documents Keycloak JWKS and service URLs"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "services/gateway/package.json"
```

**NEEDS_RUNTIME_VERIFICATION:** Token exchange, realm per tenant, JWKS rotation, and gateway route table vs `services.registry.json`.

---

## Shahin-AI Website (user-facing trust copy)

Manifest and i18n include **Dogan Consult** attribution — good for **public trust** claims; separate from OIDC wire proof.

```yaml
claim: "PWA manifest attributes Shahin-AI to Dogan Consult"
confidence: CONFIRMED_IN_CONFIG
evidence:
  - path: "DOS Platform/Shahin-AI Website/frontend/public/manifest.json"
```
