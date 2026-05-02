# Config Source Inventory — Phase C0 (2026-05-01)

**Goal:** locate every place where configuration values, hardcoded module lists,
hardcoded API URLs, env-derived runtime values, and localStorage-config patterns
live today, so Phases C1–C6 can replace them with the canonical Config OS.

This file is the **input** to the Config OS migration. Phase C6 closes when this
inventory's "Migration action" column is satisfied for every row.

## Hardcoded module lists (replace via product manifest + config resolver)

| File | Symbol | Current owner | Correct owner | Scope | Migration action |
|------|--------|---------------|---------------|-------|------------------|
| `products/shahin-ai/app/src/app/shell/workspace-shell.component.ts` | (was `MOBILE_BOTTOM_NAV`/`ACCOUNT_MENU_ITEMS`) | product | platform | platform/product | ✅ DONE — replaced by `WorkspaceShellConfigService` derivations |
| `products/shahin-ai/app/src/app/pages/pages/workspace-home.component.ts` | (was `MODULE_LABELS` map) | product | module manifest | module | ✅ DONE — derived from `enabledModules[]` |
| `platform/ai/services/ai-engine-service/src/config/canonical-modules.ts` | `CANONICAL_MODULES` array | service-local | platform | platform | C1+: register as platform default; service reads via resolver |
| `platform/workflow/_sources/services_workflow-service/src/domain/config/canonical-modules.ts` | `CANONICAL_MODULES` array | service-local | platform | platform | C1+: same canonical source as above (dedupe) |
| `platform/ai/services/ai-engine-service/src/runtime/ai/ports/config.port.ts` | `ConfigPort` (per-service ad hoc) | service-local | platform | platform/module | C2+: replace with platform `ConfigResolver` interface |
| `platform/config-center/shared/contracts/module-form-fields.test.ts`, `module-shell-registry.test.ts` | per-module form/shell registries | shared/contracts | platform | module | C1+: lift to module manifest schema |

## Hardcoded API URLs in products/ (move to environment scope)

| File | Action |
|------|--------|
| `products/shahin-ai/app/src/app/pages/settings/settings.component.ts` | Replace literal `/api/*` strings with config-resolved API base + relative path |
| `products/shahin-ai/app/src/app/pages/pages/workspace-home.component.ts` | same |
| `products/shahin-ai/app/src/app/pages/tenant-profile/tenant-profile.component.ts` | same |
| `products/shahin-ai/app/src/app/pages/profile/profile.component.ts` | same |
| `products/shahin-ai/app/src/app/shell/workspace-shell.component.ts` | same |

**Rule:** browser may receive only **public** runtime config. Service URLs that
include any tenant id, internal hostname, or secret must not appear in `products/`.

## localStorage config usage (audit per file)

| File | Purpose | Action |
|------|---------|--------|
| `platform/dos/shell/storage.service.ts` | Generic K/V wrapper | Keep (it's the abstraction) |
| `platform/runtime/infrastructure/i18n/i18n.service.test.ts` | Test scaffolding | Keep |
| `platform/runtime/infrastructure/theme/theme.service.test.ts` | Test scaffolding | Keep |
| `platform/core/services/ui-infra/i18n.service.ts` | Stores `grc_lang` ('ar'/'en') | C4+: migrate to user preference scope via `@dos/config-client.getUserPreferences().language` |
| `platform/foundation/ui/pages/foundation-overview.component.ts` | Per-component view state | C4+: migrate to user preference scope (table density, layout) |
| `platform/config-center/board-report/features/mobile/services/secure-storage.service.ts` | Mobile secure-storage abstraction | Keep at platform tier |
| `platform/config-center/shared/services/guided-tour.service.ts` | Tour-step tracking | C4+: user preference scope |
| `platform/config-center/board-report/invitations/invitation-accept.component.ts` | One-shot invitation token | Keep (transient) |
| `platform/config-center/change-password/change-password.component.ts` | Audit usage | Inspect before C4 — likely transient state |
| `platform/config-center/shared/layout/scope-filters/workspace-switcher.test.ts` | Test only | Keep |

**Rule (locked):** No localStorage for **auth/access/runtime config**. User
preferences (language, density, layout) are server-stored under user scope and
loaded via `@dos/config-client`. Transient UI state (open/closed sections,
last-visited tab) may stay in localStorage but must not be confused with config.

## Existing config infrastructure (extend, do not duplicate)

| Path | Status | Action |
|------|--------|--------|
| `modules/packages/dos-runtime-config/` (`@dos/runtime-config`) | Exists. Today: typed env validation per service via Zod. Public surface: `validateEnv` and per-service config loaders. | **Extend** in Phase C4 to be the unified frontend client (`loadPublicRuntimeConfig`, `loadEffectiveConfig`, `getConfig`, `getFeatureFlag`, `getThemeConfig`, `getLocaleConfig`, `getModuleConfig`, `getTenantConfig`, `getUserPreferences`). Do NOT create a separate `@dos/config-client` package. |
| `platform/config-center/` | Exists. Holds env files, ops, admin UI fragments, and previously held the services tree (now promoted to `services/`). | **Add** `contracts/config/` (Phase C1), `resolver/` (C2). The admin UI fragments stay; new Config Center UI pages added in C5 use `@dos/ui-system`. |
| `services/tenant-service/` | Has tenant-config endpoints today. | Promote tenant-config logic to `services/config-center-service/` in C3, OR keep tenant-service routes as a temporary proxy that the gateway re-routes once `config-center-service` lands. |
| `platform/dos/migrations/` | DB migrations live here. | Phase C3 adds migrations for `dos.config_definitions`, `dos.config_values`, `dos.config_audit_log`, `dos.secret_refs`. |

## Env variable classification (C0 sample — full list lands in C1 schema)

**Secret env (NEVER exposed):**
- `DB_PASSWORD`, `KEYCLOAK_CLIENT_SECRET`, `JWT_SECRET`, `OAUTH_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GATEWAY_ORIGIN_HMAC_SECRET`

**Server runtime env (backend only):**
- `DATABASE_URL`, `REDIS_URL`, `KEYCLOAK_BASE_URL` (internal), `INTERNAL_AUTH_*`, all `*_INTERNAL_*` vars, all per-service `PORT`/`HOST` settings

**Public runtime env (safe to expose to FE):**
- `PUBLIC_APP_ENV` (e.g., `production`, `staging`)
- `PUBLIC_API_BASE_URL` (gateway public URL)
- `PUBLIC_BRAND_CODE` (e.g., `shahin-ai`, `tuwaiq-ai`)
- `PUBLIC_SENTRY_DSN` (if telemetry approved for FE)
- `PUBLIC_FEATURE_FLAGS_DEFAULT` (build-time defaults; tenant/user can override at runtime)

**Rule:** only `PUBLIC_*` prefixed env vars may appear in
`GET /api/config-center/runtime/public`. Anything else returns 403 if attempted.

## Anti-patterns to flag in Phase C6 (CI guards)

| Pattern | Lint guard |
|---------|------------|
| `process.env.*` or `import.meta.env.*` inside `products/*/src/app/**` | C6 guard: forbid (only `@dos/runtime-config` may read env) |
| Hardcoded module code arrays inside `products/` | C6 guard: forbid (must come from manifest or config resolver) |
| Free-form `Record<string, any>` config blobs | C6 guard: forbid (every key must be in a registered schema) |
| `localStorage.setItem('access_*'|'session_*'|'permissions'|'modules', …)` | C6 guard: forbid (use `@dos/access-store`) |

## Roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **C0** | This audit document | ✅ DONE |
| **C1** | Schemas in `platform/config-center/contracts/config/` (PlatformConfigSchema, EnvironmentConfigSchema, ProductConfigSchema, ModuleConfigSchema, TenantConfigSchema, UserConfigSchema, PublicRuntimeConfigSchema, SecretRefSchema) | NEXT |
| **C2** | Resolver in `platform/config-center/resolver/` (ConfigResolver, ConfigSource, ConfigScope, ConfigPrecedence) | pending |
| **C3** | `services/config-center-service/` + DB tables (`dos.config_definitions`, `dos.config_values`, `dos.config_audit_log`, `dos.secret_refs`) + migrations | pending |
| **C4** | Extend `@dos/runtime-config` to FE config client (loadPublicRuntimeConfig, loadEffectiveConfig, getConfig, getFeatureFlag, getThemeConfig, getLocaleConfig, getModuleConfig, getTenantConfig, getUserPreferences) | pending |
| **C5** | Config Center UI pages (Platform / Product / Module / Tenant / User Preferences / Runtime / Secrets / Audit) using `@dos/ui-system` | pending |
| **C6** | Replace hardcoded config across the codebase; add CI guards (`config:guards`) | pending |

## Validation gates (Phase C6 acceptance)

```
pnpm --filter @dos/design-tokens build
pnpm --filter @dos/ui-contracts build
pnpm --filter @dos/ui-system build
pnpm --filter @dos/access-store build
pnpm --filter @dos/runtime-config build         # extended in C4
pnpm --filter config-center-service build       # new in C3
pnpm --filter shahin-ai-grc-frontend build
pnpm ui-os:guards
pnpm config:guards                              # new in C6
```

## Acceptance criteria

Config OS is "complete" only when ALL hold:
- This inventory's Migration action is satisfied for every row.
- All schemas registered in `contracts/config/`.
- Resolver implements 7-scope precedence.
- API exposes safe read/write/audit/validate endpoints.
- `@dos/runtime-config` is the single FE config client.
- Tenant/user/product/module/platform/environment/secret scopes supported.
- Secrets are reference-only on FE.
- Shahin uses platform config client (zero localStorage for auth/access/runtime).
- Dynamic UI / nav consumes effective config (no product-local hardcoded nav).
- Builds green; guards pass or report no new baseline violations.
