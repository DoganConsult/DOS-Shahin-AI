# DOS-AIO Platform

[![Build: Passing](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/DoganConsult/DOS/actions/workflows/ci.yml)
[![CI Main](https://github.com/DoganConsult/DOS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DoganConsult/DOS/actions/workflows/ci.yml)
[![CI Staging](https://github.com/DoganConsult/DOS/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/DoganConsult/DOS/actions/workflows/ci.yml)
[![Security Scan](https://img.shields.io/badge/security-passing-brightgreen.svg)](https://github.com/DoganConsult/DOS/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen.svg)](https://codecov.io/gh/DoganConsult/DOS)

Enterprise GRC (Governance, Risk & Compliance) platform powered by AI — built as a four-tier
microservices + modules + multi-product composition. One canonical home per concern; products
consume, never own.

## Architecture (four-tier)

| Tier | Path | Tenancy | Always present? | Examples |
|------|------|---------|-----------------|----------|
| **Platform DNA** | [platform/](platform/) | Unconditional | Yes — every workspace | Foundation, DAuth, DSOC, DNOC, DOS, AI, UI-System |
| **Microservices** | [services/](services/) | Per-tenant via headers | Yes — backend boots | gateway, user-service, audit-service, notification-service |
| **Modules** | [modules/](modules/) | Tenant-entitled | Only when entitled | risk, compliance, controls, audit, evidence, policy, vendor, asset, incident |
| **Products** | [products/](products/) | N/A (consumer) | Composition only | shahin-ai, tuwaiq-ai, dogan-ai, doganconsult, doganhub, doganlab |

**Direction of dependency:** products → modules → services → platform. Never reverse.

## Quick Start

```bash
pnpm install
pnpm run build:packages
pnpm run test:unit
```

## Top-level layout

```
DOS Platform/
├── platform/             Platform DNA (always available, not always visible)
│   ├── foundation/       canonical org/identity/SoD/lifecycle DNA
│   ├── dauth/            identity, session, MFA, authority, SoD enforcement
│   ├── dsoc/             security operations DNA
│   ├── dnoc/             observability/ops DNA
│   ├── dos/              DB schemas, migrations, registries, events, lifecycle
│   ├── ai/               AI-OS engine + gateway + governance
│   ├── ui-system/        design tokens + ui-contracts + ui-system primitives
│   ├── access/           @dos/access-store (session/permissions/entitlements)
│   ├── runtime/          bootstrap, infrastructure, websocket, interceptors,
│   │                     guards, navigation, routing, utils, lifecycle, config
│   ├── workflow/         workflow engine
│   └── config-center/    backend admin UI + envs + ops
│
├── services/             Microservices (Express + PM2). Each service has src/, dist/,
│                         package.json, tsconfig.json, server.ts entry. Examples:
│                         gateway:4000, user-service:4003, audit-service:4006,
│                         tenant-service:4002, governance-policy-service, ...
│
├── modules/              Reusable module library (kebab-case, no spaces).
│                         Each product enrolls modules in its product.manifest.json.
│                         Modules are tenant-entitled; not all tenants get all modules.
│
├── products/             Composition-only consumers.
│                         shahin-ai (real, beta), tuwaiq-ai (scaffold),
│                         dogan-ai / doganconsult / doganhub / doganlab (placeholders).
│                         Products own: route map, theme, manifest, product-specific
│                         page content. Products do NOT own: session/access/nav/shell DNA.
│
├── scripts/              Repo-wide CI scripts and reorg tooling
├── tests/                Cross-cutting tests (contracts, integration, regression)
└── docs/                 Repo-level docs (see docs/architecture.md for canonical rules)
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — canonical four-tier rules
- [Deploy Runbook](ops/runbooks/deploy.md)
- [Rollback Runbook](ops/runbooks/rollback.md)
- [Incident Response](ops/runbooks/incident-response.md)
- [Monitoring](ops/runbooks/monitoring.md)
