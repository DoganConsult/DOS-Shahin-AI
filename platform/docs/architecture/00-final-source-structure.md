# 00 — Final Source Structure (Dogan-AI OS)

> Status: target architecture, partially realized. Gate I baseline (post-skeleton): **10/18**. See `platform/docs/migration/_reports/99-final-structure-gate.md` and `platform/docs/migration/99-final-restructure-report.md`.

## 1. Canonical Root

`/root/DOS-AIO/DOS Platform` is the **single, stable, canonical source tree** for Dogan-AI OS. No platform, product, service, module, package, or runtime source may live outside this root. Compatibility paths must not point outside this root.

## 2. Top-Level Layout

```
/root/DOS-AIO/DOS Platform
├── platform/        # Dogan-AI OS platform (control planes, contracts, config, shared, docs)
│   ├── control-planes/{dos,dauth,dsoc,dnoc}
│   ├── contracts/{product,module,routing,navigation,permissions,dynamic-ui,agents,workflow}
│   ├── config/{products,environments,runtime,deployment}
│   ├── shared/{ui,types,utils,theme,i18n,testing}
│   └── docs/{architecture,developer-guides,migration}
├── products/        # Product compositions on top of the platform
│   └── shahin-ai/   # First product (NOT the platform)
│       ├── app/ routes/ navigation/ composition/ theme/ assets/ i18n/
│       ├── state/ services/ dynamic-ui/ agents/ tests/
│       ├── product.manifest.json
│       └── product.config.ts
├── modules/{module-code}/    # Canonical, extractable, plug-and-play modules
├── services/                 # Runtime services (gateway, auth, tenant, …)
├── packages/                 # Shared platform packages (@dos/*)
├── registries/               # Cross-cutting registries (routes, modules, services, …)
├── manifests/                # Source-of-truth manifests
├── ops/                      # Operational scripts and configs
├── scripts/                  # Tooling, including scripts/restructure/*
└── tests/                    # Cross-cutting tests
```

## 3. Layer Responsibilities

| Layer       | Owns                                              | Must Not                                    |
|-------------|---------------------------------------------------|---------------------------------------------|
| `platform/` | OS contracts, runtime config, shared UI/types     | Reference any product or module internals   |
| `packages/` | Shared `@dos/*` packages                          | Import from `products/*` or `modules/*` internals |
| `services/` | Runtime services                                  | Embed product/module-specific business code |
| `modules/`  | Canonical modules (self-contained, extractable)    | Import Shahin-AI internals                  |
| `products/` | Product composition (UI shell, routing, theme)    | Reach into a module's internals (must enroll via contracts) |
| `registries/` & `manifests/` | Source-of-truth metadata           | Drift from the manifests under each owner   |

## 4. Namespacing

- `@dos/*` — platform packages
- `@shahin-ai/*` — Shahin-AI product packages
- `@dos/modules/{module-code}` — module **contract surface** only (never deep imports)

Deep relative imports across `platform/`, `products/`, and `modules/` are forbidden.

## 5. Auth & Security Invariants

- Shahin-AI auth is **httpOnly cookie-session** only.
- `localStorage`-stored auth tokens are forbidden.
- No Docker, no mocks, no fake-green tests, no skipped tests to hide failures.

## 6. Verification

`scripts/restructure/99-final-structure-gate.mjs` enforces 18 deterministic checks over this structure and writes its results to `platform/docs/migration/_reports/99-final-structure-gate.{json,md}`.
