# products/tuwaiq-ai — Tuwaiq-AI

**Layer:** product (consumes platform + opt-in business modules)
**`kind`:** `product`
**Domain:** `tuwaiq-ai.com`

## Status: scaffold-only (`lifecycle.stage = experimental`)

This is a placeholder product slot reserving the canonical layout for the
Tuwaiq-AI brand. The runtime app and website land here when the product
owner makes the first real commit (per the four-tier architecture: products
are composition-only consumers of `platform/` + `modules/`).

## Promotion contract

To promote past `experimental`:
1. Add `app/` (Angular SPA) following the `products/shahin-ai/app/` shape.
2. Populate `enabledModules[]` in `product.manifest.json` with the modules
   this product consumes from `modules/`.
3. Bump `lifecycle.stage` to `alpha` and update `enteredStageAt`.
4. Add `tsconfig.json` paths if the product needs custom aliases beyond
   the canonical `@app/*`, `@dos/module-*`, `@dos/ui-system`, `@dos/access-store`.
