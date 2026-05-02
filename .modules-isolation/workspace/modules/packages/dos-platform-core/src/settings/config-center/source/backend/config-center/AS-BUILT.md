# AS-BUILT: Config Center Module (MP-58)

## Module Identity
- **Module Code:** `config-center`
- **Spec:** `DOS-AIO-Specs/module-patch-58-config-center-end-to-end.md`
- **Tier:** Platform Core Surface
- **Route Base:** `/api/config-center`
- **Event Namespace:** `config-center`
- **Criticality:** P1

## Owned Artifacts

### Backend Services (7)
1. **config-resolution.service.ts** — `resolveConfig()`, `resolveManyConfigs()`, `explainResolution()` via DOS `UnifiedConfigService`
2. **config-settings.service.ts** — `getConfigSetting()`, `getConfigSettingsForScope()`, `upsertConfigSetting()`, `deleteConfigSetting()` via DOS `SettingsResolver`
3. **config-compare.service.ts** — `compareTenants()`, `compareTenantToDefaults()`
4. **config-export-import.service.ts** — `exportConfig()`, `importConfig()` with dry-run support
5. **config-audit.service.ts** — `logConfigChange()`, `getConfigAuditHistory()`
6. **config-health.service.ts** — `checkEnvHealth()`, `checkSecretBindings()`, `detectConfigDrift()`
7. **config-diagnostics.service.ts** — `runConfigDiagnostics()` aggregate health check

### Routes (6)
- `config-resolution.routes.ts` — `GET /resolve/:key`, `POST /resolve/batch`, `GET /explain/:key`
- `config-settings.routes.ts` — `GET /settings`, `GET /settings/:key`, `PUT /settings/:key`, `DELETE /settings/:key`
- `config-compare.routes.ts` — `GET /compare/tenants`, `GET /compare/defaults`
- `config-export-import.routes.ts` — `GET /export`, `POST /import` (with DAuth approval gate)
- `config-audit.routes.ts` — `GET /audit`, `GET /audit/:key`
- `config-health.routes.ts` — `GET /health/env`, `GET /health/secrets`, `GET /health/drift`, `GET /health/diagnostics`

### Database Tables
- Uses platform `tenant_settings` table (no parallel config tables per spec §15)
- `config_center_audit_log` — owned audit table
- Shared: `platform_config`, `tenant_config_versions`
- Referenced: `audit_trail`, `users`, `feature_flags`, `tenant_module_entitlements`

### Frontend Components (5)
- `config-resolution.component.ts` — Key resolution with layer explanation
- `config-settings.component.ts` — CRUD settings management with inline editing
- `config-audit.component.ts` — Paginated audit history
- `config-health.component.ts` — Environment health, secret bindings, drift detection
- `config-compare.component.ts` — Tenant-to-defaults comparison with diff table

## Protected Actions (DAuth Enforcement Points)

### Permissions (7)
| Permission Code | Resource | Action | Sensitive |
|---|---|---|---|
| `config.setting.read` | setting | read | No |
| `config.setting.write` | setting | write | Yes |
| `config.compare.read` | compare | read | No |
| `config.export.read` | export | read | No |
| `config.import.write` | import | write | Yes |
| `config.audit.read` | audit | read | No |
| `config.health.read` | health | read | No |

### Roles (4)
| Role Code | Archetype | Permissions |
|---|---|---|
| `config.platform_admin` | executive_owner | All 7 |
| `config.tenant_admin` | module_lead | setting.read/write, audit.read, health.read |
| `config.viewer` | viewer | setting.read, audit.read |
| `config.auditor` | auditor | setting.read, audit.read, health.read, export.read |

### Approval Matrix
- **Entity:** `config_snapshot` | **Transition:** `pending_import → imported`
- **Required Role:** `config.platform_admin` | **Min Approvers:** 1
- **Import route** calls `findApprovalRule()` → `initiateApproval()` when approval rule is registered

### SoD Rules
- `config.sod.import_approver` — Config importer cannot approve their own import (severity: critical, enforcement: block)

## Event Backbone
- **Publishes:** `config-center.setting_updated`, `config-center.setting_deleted`, `config-center.config_imported`, `config-center.config_exported`, `config-center.drift_detected`
- **Consumes:** None
- **Ordering:** Strict, partitioned by `tenantId`

## Runtime Wiring
- Route catalogs: `domain-routes.catalog.ts` + `shahin-ai/route-catalogs/domain-routes.catalog.ts`
- Event subscribers: `registerConfigCenterEventSubscribers()` in `agrc-event-subscribers.ts`
- Navigation: Sidebar entry with 5 children (resolve, settings, audit, health, compare)
- Migration: `#172` tenant migration

## Diagnostics
- `runConfigDiagnostics()` checks: overdue settings, stale config, drift status, env health, secret bindings

## Known Risks
1. Config resolution cascading may hide lower-priority overrides — UI shows all layers via explain endpoint
2. Import validation must prevent circular dependencies in module configs
3. Large config snapshots may impact import performance — dry-run mode available for preview
