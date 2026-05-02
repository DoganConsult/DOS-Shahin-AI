# Config Center Microservices Refactor Proposal

## Goal

Refactor `platform/config-center` from a mixed admin shell plus ops/env catch-all into a fully isolated, service-oriented control plane with clear ownership for:

- config catalog and schema
- effective config resolution
- config mutations and approvals
- runtime config gateway and cache invalidation
- secret bindings and vault references
- drift, audit, and health reporting
- admin UI as a separate frontend package

This proposal is grounded in the current codebase shape under `platform/config-center`.

## Current State Summary

### What exists now

- `platform/config-center/config-center.service.ts`
  - Angular frontend facade over `/api/config-center/*`
  - mixes settings, audit, drift, env health, gateway overrides, workspace config, import/export
- `platform/config-center/config-settings.component.ts`
  - live settings editor
- `platform/config-center/config-workspace.component.ts`
  - live workspace shell/editor UI
- `platform/config-center/config-gateway.component.ts`
  - live runtime inventory and override UI
- `platform/config-center/contracts/config/*`
  - config scopes, schemas, permissions contract primitives
- `platform/config-center/runtime/ui-runtime-store.service.ts`
  - policy-driven UI runtime store
- `platform/config-center/routing/component-registry.ts`
  - route/component registry concerns
- `platform/config-center/env/*`
  - environment files for most platform and service processes
- `platform/config-center/ops/*`
  - PM2 ecosystem and deployment wiring
- `platform/config-center/records/*`
- `platform/config-center/integrations/*`
  - backend-style subprojects with their own `tsconfig.json`

### Structural problems

1. `platform/config-center` is not one bounded context.
2. The frontend admin shell appears to call `/api/config-center/*`, but backend ownership is diffuse and not clearly isolated in this subtree.
3. Environment files, PM2 ecosystem config, UI admin pages, runtime UI state, and module manifests live in one folder.
4. `records` and `integrations` are domain/module concerns embedded inside a platform control-plane folder.
5. The subproject TS configs in `records` and `integrations` disable strictness.
6. Secret semantics are defined in contracts, but the gateway UI still renders `currentValue` for sensitive rows.
7. Settings UI scope semantics are inconsistent with the declared config scope model.

## Refactor Outcome

### Target Principle

`platform/config-center` should stop being the implementation bucket.

Instead:

- frontend admin UI becomes its own platform app package
- backend capabilities move into isolated services under `services/`
- shared contracts and resolver logic move into packages under `packages/`
- ops/env assets move under a dedicated deployment structure
- non-config domains leave this folder entirely

## Target Architecture

### Service decomposition

#### 1. `config-catalog-service`

Owns:

- setting declarations
- schema validation rules
- scope rules
- allowed override model
- module/product/platform config metadata

APIs:

- `GET /api/config-catalog/settings`
- `GET /api/config-catalog/settings/:key`
- `GET /api/config-catalog/scopes`
- `GET /api/config-catalog/schemas/:key`

Own tables:

- `config_setting_catalog`
- `config_setting_schema`
- `config_scope_rules`
- `config_owner_registry`

#### 2. `config-resolution-service`

Owns:

- effective config resolution across platform/environment/product/module/tenant/user
- explain/trace resolution
- compare effective state
- export effective snapshots

APIs:

- `GET /api/config-resolution/settings`
- `GET /api/config-resolution/settings/:key`
- `GET /api/config-resolution/explain/:key`
- `GET /api/config-resolution/compare/tenants`
- `GET /api/config-resolution/compare/defaults`
- `GET /api/config-resolution/export`

Own tables:

- none required for source-of-truth declarations if it reads catalog + overrides + runtime cache
- optional materialized projection:
  - `config_effective_projection`

#### 3. `config-command-service`

Owns:

- upsert/delete override commands
- lock handling
- import snapshots
- approval workflow for risky mutations
- mutation authorization policy

APIs:

- `PUT /api/config-command/settings/:key`
- `DELETE /api/config-command/settings/:key`
- `POST /api/config-command/import`
- `POST /api/config-command/locks`
- `DELETE /api/config-command/locks/:key`

Own tables:

- `config_overrides`
- `config_locks`
- `config_import_jobs`
- `config_approval_requests`

#### 4. `config-runtime-service`

Owns:

- gateway inventory
- runtime override projection
- cache invalidation
- workspace shell config projection
- shell override projection

APIs:

- `GET /api/config-runtime/gateway/inventory`
- `GET /api/config-runtime/gateway/overrides`
- `PUT /api/config-runtime/gateway/override/:key`
- `DELETE /api/config-runtime/gateway/override/:key`
- `POST /api/config-runtime/gateway/invalidate`
- `GET /api/config-runtime/gateway/workspace-config`
- `GET /api/config-runtime/gateway/shell-override`
- `PUT /api/config-runtime/gateway/workspace-batch`

Own tables:

- `config_runtime_overrides`
- `config_runtime_cache_state`
- `workspace_shell_projection`

#### 5. `config-governance-service`

Owns:

- audit history
- drift detection
- env health checks
- diagnostics
- policy conformance reporting

APIs:

- `GET /api/config-governance/audit`
- `GET /api/config-governance/audit/:key`
- `GET /api/config-governance/health/env`
- `GET /api/config-governance/health/secrets`
- `GET /api/config-governance/health/drift`
- `GET /api/config-governance/health/diagnostics`

Own tables:

- `config_audit_log`
- `config_drift_history`
- `config_health_reports`

#### 6. `config-secret-service`

Owns:

- vault references
- secret binding metadata
- secret masking policy
- secret rotation metadata

APIs:

- `GET /api/config-secrets/bindings`
- `PUT /api/config-secrets/bindings/:key`
- `POST /api/config-secrets/rotate/:key`

Own tables:

- `config_secret_bindings`
- `config_secret_rotation_log`

Rule:

- no raw secret values returned to any frontend route
- all admin surfaces receive masked references only

#### 7. `config-admin-ui`

Owns:

- settings page
- workspace page
- gateway page
- compare/audit/health/resolution UI

Rule:

- this package does not own backend logic, env files, or ops boot config

## Target Repository Layout

```text
platform/
  config-admin-ui/
    src/
      app/
        pages/
          settings/
          workspace/
          gateway/
          audit/
          drift/
          health/
          resolution/
        application/
          config-admin.facade.ts
        infrastructure/
          config-catalog.client.ts
          config-resolution.client.ts
          config-command.client.ts
          config-runtime.client.ts
          config-governance.client.ts
          config-secret.client.ts
    tsconfig.json
    package.json

services/
  config-catalog-service/
    src/
      routes/
      services/
      repositories/
      contracts/
      server.ts
    tsconfig.json
    package.json

  config-resolution-service/
    src/
      routes/
      services/
      projections/
      server.ts

  config-command-service/
    src/
      routes/
      services/
      policies/
      jobs/
      server.ts

  config-runtime-service/
    src/
      routes/
      services/
      cache/
      projections/
      server.ts

  config-governance-service/
    src/
      routes/
      services/
      scanners/
      reports/
      server.ts

  config-secret-service/
    src/
      routes/
      services/
      vault/
      server.ts

packages/
  config-contracts/
    src/
      scopes.ts
      schemas.ts
      permissions.ts
      events.ts
      api.ts

  config-resolver-core/
    src/
      precedence.ts
      resolver.ts
      explain.ts
      compare.ts

  config-policy-engine/
    src/
      mutation-policy.ts
      secret-policy.ts
      lock-policy.ts

  config-sdk/
    src/
      catalog-client.ts
      resolution-client.ts
      command-client.ts
      runtime-client.ts
      governance-client.ts
      secrets-client.ts

ops/
  env/
    config-catalog-service/
    config-resolution-service/
    config-command-service/
    config-runtime-service/
    config-governance-service/
    config-secret-service/
  pm2/
    ecosystem.config-platform.js
  scripts/
    generate-edge-config.mjs
    config-matrix.sh
```

## What Moves Where

### Move out of `platform/config-center`

#### Move to `platform/config-admin-ui`

- `config-center.service.ts`
- `config-settings.component.ts`
- `config-workspace.component.ts`
- `config-gateway.component.ts`
- `config-health.component.ts`
- `config-audit.component.ts`
- `config-compare.component.ts`
- `config-resolution.component.ts`

#### Move to `packages/config-contracts`

- `contracts/config/config-scopes.ts`
- `contracts/config/config-schemas.ts`
- `contracts/config/config-permissions.ts`

#### Move to `services/config-runtime-service` or out of config-center entirely

- `runtime/ui-runtime-store.service.ts`

Note:

- if this is really general app-shell runtime state, it belongs in `platform/runtime` or `platform/app-shell`, not config-center

#### Move to app-shell or dynamic-ui ownership

- `routing/component-registry.ts`

This is route/component registry behavior, not config admin behavior.

#### Move to central ops deployment ownership

- `env/*`
- `ops/ecosystem.platform.config.js`
- `ops/ecosystem.*.config.js`
- `ops/ports.allocation.json`

#### Extract from config-center entirely into domain modules/services

- `records/*`
  - target module already declared as `modules/records`
  - future service already declared as `records-service`
- `integrations/*`
  - target module should become `modules/integrations`
  - future service already declared as `integrations-service`

## API Strategy

### Current anti-pattern

The admin UI depends on one broad `ConfigCenterService` that fronts many different backend concerns through one `/api/config-center` namespace.

### Proposed API strategy

Keep a UI-friendly facade, but split backend ownership:

```text
/api/config-catalog/*
/api/config-resolution/*
/api/config-command/*
/api/config-runtime/*
/api/config-governance/*
/api/config-secrets/*
```

Optional compatibility layer:

- keep `/api/config-center/*` temporarily at the gateway
- route each endpoint to the new owning service
- remove the compatibility layer after the admin UI migrates to explicit service clients

## Data Ownership

### Core rule

Each service owns its tables and emits events instead of sharing write access.

### Suggested ownership map

```text
config-catalog-service
  - config_setting_catalog
  - config_setting_schema
  - config_scope_rules
  - config_owner_registry

config-command-service
  - config_overrides
  - config_locks
  - config_import_jobs
  - config_approval_requests

config-runtime-service
  - config_runtime_overrides
  - config_runtime_cache_state
  - workspace_shell_projection

config-governance-service
  - config_audit_log
  - config_drift_history
  - config_health_reports

config-secret-service
  - config_secret_bindings
  - config_secret_rotation_log
```

## Event Model

Publish these events on the platform bus:

- `config.catalog.updated`
- `config.override.upserted`
- `config.override.deleted`
- `config.lock.changed`
- `config.snapshot.imported`
- `config.runtime.override.changed`
- `config.runtime.cache.invalidated`
- `config.secret.binding.changed`
- `config.drift.detected`
- `config.health.reported`

Consumers:

- app shell / dynamic UI
- tenant-service
- gateway
- audit and observability

## Migration Plan

### Phase 0: Freeze the boundary

- stop adding new domains under `platform/config-center`
- declare it deprecated as an implementation bucket
- mark `records` and `integrations` as extraction candidates immediately

### Phase 1: Shared contracts first

- extract `contracts/config/*` into `packages/config-contracts`
- create `packages/config-resolver-core`
- replace direct imports in UI with package imports

### Phase 2: Split admin UI from backend concerns

- create `platform/config-admin-ui`
- move Angular pages and `ConfigCenterService` there
- split the single facade into multiple clients:
  - `ConfigCatalogClient`
  - `ConfigResolutionClient`
  - `ConfigCommandClient`
  - `ConfigRuntimeClient`
  - `ConfigGovernanceClient`
  - `ConfigSecretClient`

### Phase 3: Extract backend services

- stand up `config-catalog-service`
- stand up `config-command-service`
- stand up `config-runtime-service`
- stand up `config-governance-service`
- stand up `config-secret-service`
- add temporary gateway compatibility routing for `/api/config-center/*`

### Phase 4: Extract non-config domains

- move `platform/config-center/records` to `modules/records` + `services/records-service`
- move `platform/config-center/integrations` to `modules/integrations` + `services/integrations-service`

### Phase 5: Move ops/env assets out

- move `platform/config-center/env/*` to `ops/env/*`
- move PM2 ecosystem config to central deployment ownership
- make service env ownership explicit per service

### Phase 6: Enforce policies

- block raw secret values from frontend inventory routes
- align settings scope UI with real scope contract
- remove unsupported scope labels like `workspace` unless it becomes a real scope in the contract and backend

## First Pull Requests

### PR 1

- add `packages/config-contracts`
- move scope/schema/permissions contracts
- update imports

### PR 2

- create `platform/config-admin-ui`
- move `config-center.service.ts` and core components
- split service clients by backend concern

### PR 3

- create `services/config-runtime-service`
- move gateway inventory, override, workspace-batch, shell override APIs behind it

### PR 4

- create `services/config-command-service`
- move settings write/delete/import/lock APIs behind it

### PR 5

- create `services/config-governance-service`
- move audit, drift, env health, diagnostics behind it

### PR 6

- extract `records` and `integrations` out of config-center

### PR 7

- move `env/*` and PM2 assets to central `ops/`

## Acceptance Criteria

- `platform/config-center` no longer contains domain modules, env bundles, or PM2 ecosystem files
- admin UI has no direct dependency on a catch-all `ConfigCenterService`
- each backend route has one owning service
- secrets are masked at the API boundary and never rendered raw in the UI
- unsupported scopes are not shown in the admin UI
- `records` and `integrations` are no longer inside config-center
- each extracted service has its own `package.json`, `tsconfig.json`, env file, health route, and manifest

## Recommendation

Do not refactor this as one big rename. Use a strangler migration:

1. extract contracts
2. extract UI shell
3. extract runtime and command services
4. extract governance and secrets
5. remove domain and ops sprawl from config-center

That gets the platform to isolated microservices without breaking the admin surface all at once.