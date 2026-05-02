# 02 — Product Registration

A product registers with the platform through three artifacts:

| Artifact | Path | Owner |
|---|---|---|
| `product.manifest.json` | `products/{product}/product.manifest.json` | Product |
| `product.config.ts` | `products/{product}/product.config.ts` | Product |
| Platform-side registration | `platform/config/products/{product}.product.json` | Platform |

## 1. Product Manifest

Validated by `platform/contracts/product/product.manifest.schema.json`. Required keys:

- `schemaVersion` (must be `1`)
- `productCode` (e.g. `shahin-ai`)
- `displayName`
- `hosts[]`
- `authMode` (currently fixed to `cookie-session`)
- `enabledModules[]` (with `moduleCode`, `version`, `scope`)
- `routeComposition` (mountPoint, publicCompatPrefixes, redirects)
- `navigationComposition` (`primary[]`, `secondary[]`)
- `dynamicUiEnrollment.enrollmentRef`
- `agentEnrollment.enrollmentRef`
- `workflowEnrollment.enrollmentRef`
- `theme` (base + overrides)
- `i18n` (defaultLocale + supportedLocales)
- `platformDependencies` and `moduleDependencies`

Example: `products/shahin-ai/product.manifest.json`.

## 2. Product Config (Typed)

`product.config.ts` exposes the manifest as a typed `ProductRuntimeConfig` (from `@dos/contracts`) and is the only thing the product shell consumes at runtime. It MUST NOT import platform internals or module internals.

## 3. Platform-Side Registration

`platform/config/products/{product}.product.json` is what binds the product into the platform composition layer (host map, mount point, public compat prefixes, rollout stage). Its `manifestRef` points back to the product's manifest.

## 4. Registration Lifecycle

1. Product creates/updates its manifest and config.
2. Platform updates its product registration file.
3. `validate:manifests` (Gate J) ensures both files conform to schemas.
4. The route registry is regenerated/checked so existing public URLs and product-internal URLs all resolve.
5. `99-final-structure-gate.mjs` (Gate I) re-runs to confirm boundaries.
