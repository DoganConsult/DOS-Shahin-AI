# 01 — Platform / Product / Module Boundaries

## 1. The Three Layers

| Layer    | Path Prefix              | Purpose                                                  |
|----------|--------------------------|----------------------------------------------------------|
| Platform | `platform/`, `packages/`, `services/`, `registries/`, `manifests/`, `ops/`, `scripts/`, `tests/` | Runs the OS. Defines contracts and runtime substrate.     |
| Product  | `products/{product}/`    | Composes a UX/UI experience on top of the platform.       |
| Module   | `modules/{module-code}/` | Self-contained, extractable, plug-and-play domain module. |

## 2. Hard Rules (enforced by Gate I)

1. Platform code must not import from `products/*` or `@shahin-ai/*` (Gate I check 11).
2. Modules must not import from `products/shahin-ai` (Gate I check 12).
3. No product code inside `platform/` (Gate I check 13).
4. No module code inside `products/` — products only **enroll** modules via contracts (Gate I check 14).
5. No `localStorage` token storage anywhere (Gate I check 15).

## 3. Allowed Communication Patterns

- **Platform → Module:** through module contracts published under `modules/{m}/contracts/*` and consumed via `@dos/module-sdk` and `@dos/contracts`.
- **Module → Platform:** only via `@dos/contracts`, `@dos/module-sdk`, `@dos/types`, `@dos/runtime-config`. Never via product packages.
- **Product → Module:** only via enrollment files (`products/{p}/dynamic-ui/enrollment.json`, `products/{p}/agents/enrollment.json`, `products/{p}/composition/workflows/enrollment.json`).
- **Product → Platform:** through `@dos/contracts`, `@dos/platform-core`, `@dos/runtime-config`. Never imports from another product.

## 4. Forbidden Patterns

- A module reaching into a product's components, routes, or theme.
- A platform package importing a product's selectors or stores.
- A product reaching into a module's internal services without going through the module's published contract surface.
- Deep relative imports (`../../`) crossing layer boundaries.

## 5. Where to Put New Code

| Question | Put it under |
|---|---|
| Is it product-specific UX shell, theme, navigation, or branding? | `products/shahin-ai/` |
| Is it a domain capability that other products could enroll? | `modules/{module-code}/` |
| Is it shared across the OS regardless of product? | `packages/` (build-time) or `services/` (runtime) |
| Is it a contract or schema? | `platform/contracts/{kind}/` |
| Is it environment, runtime, or product registration config? | `platform/config/` |
