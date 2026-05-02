# 10 — Add a New Product

> Audience: platform engineers and product owners adding a new product on top of Dogan-AI OS.

## 1. Choose a `productCode`

Lowercase, kebab-case, matches `^[a-z][a-z0-9-]{1,63}$`. Used as folder name and namespace prefix.

## 2. Create the Product Folder

```
products/{productCode}/
├── app/
├── routes/
├── navigation/
├── composition/
├── theme/
├── assets/
├── i18n/
├── state/
├── services/
├── dynamic-ui/
├── agents/
├── tests/
├── product.manifest.json
└── product.config.ts
```

Seed each subfolder with a one-paragraph `README.md`. (Use Shahin-AI as a reference.)

## 3. Author `product.manifest.json`

Conform to `platform/contracts/product/product.manifest.schema.json`. Required: `productCode`, `displayName`, `hosts`, `authMode: "cookie-session"`, `enabledModules`, `routeComposition`, `navigationComposition`, `dynamicUiEnrollment`, `agentEnrollment`, `workflowEnrollment`, `theme`, `i18n`, `platformDependencies`, `moduleDependencies`.

## 4. Author `product.config.ts`

Typed binding consuming `@dos/contracts`. Must NOT import platform internals or module internals. Must NOT introduce `localStorage` token storage.

## 5. Register on the Platform

Create `platform/config/products/{productCode}.product.json` with `manifestRef`, `hosts`, `authMode`, `routeMountPoint`, `publicCompatPrefixes`, `rolloutStage`.

## 6. Add Routes

Append product-internal routes to `registries/route-registry.json` under `kind: "product-internal"`. If the product is reachable from existing public URLs, add `kind: "public"` compat aliases that redirect or directly serve those routes.

## 7. Enroll Modules and Agents

- `products/{p}/dynamic-ui/enrollment.json`
- `products/{p}/agents/enrollment.json`
- `products/{p}/composition/workflows/enrollment.json`

## 8. Validate

```bash
pnpm run validate:manifests
pnpm run target:check
node scripts/restructure/99-final-structure-gate.mjs
```

All Gate I checks (1–18) must pass for the new product before release.
