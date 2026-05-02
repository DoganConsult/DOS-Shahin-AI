# 20 — Add or Enroll a Module

## A. Add a New Module

1. Create `modules/{moduleCode}/` (lowercase kebab-case, regex `^[a-z][a-z0-9-]{1,63}$`).
2. Add `module.manifest.json` with: `schemaVersion: 1`, `moduleCode` (= folder name), `displayName`, `version`, `extractable: true`, `selfContained: true`, `contracts`, `platformDependencies`.
3. Define contracts under `contracts/dynamic-ui/`, `contracts/agents/`, `contracts/workflow/`.
4. Implement under `src/`. Do NOT import any product internals.
5. Tests under `tests/`. Real tests only — no mocks for the contract surface.

## B. Enroll a Module in a Product

1. Add an entry to `products/{p}/product.manifest.json` → `enabledModules[]`.
2. Add a route line(s) for the module in `registries/route-registry.json` under `kind: "product-internal"`.
3. Enroll widgets in `products/{p}/dynamic-ui/enrollment.json`.
4. Enroll agents in `products/{p}/agents/enrollment.json` if the module exposes any.
5. Enroll workflows in `products/{p}/composition/workflows/enrollment.json` if applicable.
6. Run `pnpm run validate:manifests` and `node scripts/restructure/99-final-structure-gate.mjs`.

## C. Module Boundary Checklist

- ✅ `moduleCode` matches folder name.
- ✅ No imports from `products/*` or `@shahin-ai/*`.
- ✅ Public surface limited to `@dos/modules/{moduleCode}` (contracts).
- ✅ Module is plug-and-play (can be removed/extracted without product code edits beyond enrollment).
