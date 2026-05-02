# Module Patch 58 — Config Center Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 58 — Config Center Module End-to-End**

### 0.2 Module code
`config-center`

### 0.3 Surface class
`platform_core_surface`

### 0.4 Governing platform patches
- Patch 0 — Common Enforcement Standard
- Patch 1 — Platform Full-Stack Core
- Patch 2 — Data / Schema / Contracts Stack
- Patch 11 — Settings, Tenant Admin, and Platform Admin Stack
- Patch 11 Addendum — Config Architecture Freeze and Consolidation Mandate

### 0.5 Module purpose
The Config Center module is the **single administrative API surface** for all platform configuration. It consolidates 8 fragmented config systems into one governed control plane backed by the canonical `UnifiedConfigService` resolver and `SettingsResolver` persistence layer.

### 0.6 What this module replaces
- `admin/services/platform-config.service.ts` (JSON file reader) — **fully replaced**
- `admin/routes/platform-config.routes.ts` — **fully replaced**
- `admin/routes/runtime-overrides.routes.ts` — **fully replaced**
- `admin/routes/tier.routes.ts` — **absorbed** (tier definitions move to DB)
- `admin/routes/entitlements.routes.ts` — **absorbed** (entitlements stay, but routed through config center)
- `admin/routes/dynamic-config.routes.ts` — **partially absorbed** (rate limits, agent config stay in their domains; dashboard/widget config stays)
- `config/production-enhancements.config.ts` — **retired** (reads replaced with resolver calls)

---

## 1. Module Purpose and Boundaries

### 1.1 Business problem
Platform administrators need a single place to view, modify, validate, audit, compare, export, and import configuration across all layers (environment, deployment, tenant, product, module, user). Currently, config management is fragmented across 8 services, 11 DB tables, JSON files, and hardcoded TypeScript.

### 1.2 Users
- **Platform Admin**: Full config visibility and mutation across all tenants
- **Tenant Admin**: Tenant-scoped config management (settings, security, features)
- **Module Admin**: Module-scoped settings within their authorized modules
- **Viewer/Auditor**: Read-only config inspection and change history

### 1.3 What users can do
- Resolve any config key and see which layer provided the value
- View all settings for a scope (tenant, module, user)
- Update settings with validation, audit, and optional approval
- Compare config between tenants
- Export/import tenant config snapshots
- View config change history with full audit trail
- Check environment variable health and secret binding status
- Detect config drift between layers

### 1.4 Module boundaries
This module **owns**:
- Config resolution API (read-through to `UnifiedConfigService`)
- Settings CRUD API (write-through to `SettingsResolver`)
- Config comparison and diff
- Config export/import
- Config audit trail
- Environment health checks
- Config drift detection
- Secret metadata exposure (never raw values)

This module **does NOT own**:
- Feature flag evaluation (owned by `FeatureFlagService` in DOS)
- Tenant config versioning for policy objects (owned by `TenantConfigService` in DOS)
- Secret storage/rotation (owned by `SecretsBootstrap` / Azure Key Vault)
- AI agent config CRUD (owned by AI module, exposed through `dynamic-config.routes.ts`)
- Dashboard/widget registry (owned by dashboard module)

---

## 2. Module Manifest

```ts
export const CONFIG_CENTER_MANIFEST: ModuleManifest = {
  code: 'config-center',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Config Center',
  nameAr: 'مركز الإعدادات',
  descriptionEn: 'Unified configuration management, resolution, audit, and governance for all platform layers.',
  descriptionAr: 'إدارة الإعدادات الموحدة والحل والتدقيق والحوكمة لجميع طبقات المنصة.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/config-center',
  eventNamespace: 'config-center',
  tablePrefix: 'config_center_',
  ownedTables: [
    'config_center_audit_log',
  ],
  sharedTables: ['tenant_settings', 'platform_config', 'tenant_config_versions'],
  referencedTables: ['audit_trail', 'users', 'feature_flags', 'tenant_module_entitlements'],
  aggregateRoots: [],
  publishedEvents: CONFIG_CENTER_PUBLISHED_EVENTS,
  consumedEvents: [],
  hardDeps: ['foundation'],
  softDeps: ['admin'],
  navId: 'config-center',
  navChildCount: 4,
  workflowTemplateCode: null,
  workflowSlaHours: null,
  automationLevel: 'manual',
  agentBinding: null,
  aiCapabilities: [],
  aiEnabled: false,
  featureFlags: [],
  installable: false,
  provisioningOrder: 0,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['config-resolution', 'settings-management', 'config-audit', 'config-health'],
  securityPermissions: CONFIG_CENTER_PERMISSIONS,
  securityRoles: CONFIG_CENTER_ROLES,
  securityActions: CONFIG_CENTER_ACTIONS,
  approvalRules: CONFIG_CENTER_APPROVAL_MATRIX,
  ownershipRules: [],
  sodRules: CONFIG_CENTER_SOD_RULES,
  mcpServiceEntrypoint: null,
};
```

---

## 3. Required Backend Services

### 3.1 ConfigResolutionService
Delegates to `UnifiedConfigService.resolveWithMetadata()`. Returns value, source layer, overridden layers, and metadata.

```ts
export class ConfigResolutionService {
  async resolve(key: string, options: ConfigResolveOptions): Promise<ConfigResolveResult>;
  async resolveMany(keys: string[], options: ConfigResolveOptions): Promise<ConfigResolveResult[]>;
  async resolveAll(scope: SettingsScope, options: ConfigResolveOptions): Promise<ConfigResolveResult[]>;
  async explainResolution(key: string, options: ConfigResolveOptions): Promise<ConfigResolutionExplanation>;
}
```

### 3.2 ConfigSettingsService
Delegates to `SettingsResolver` for CRUD. Adds validation via `CONFIG_OWNERSHIP_MAP`, audit trail, and optional approval gating.

```ts
export class ConfigSettingsService {
  async getSetting(ctx: SettingsContext, key: string): Promise<SettingRecord | null>;
  async getSettingsForScope(ctx: SettingsContext): Promise<SettingRecord[]>;
  async upsertSetting(ctx: SettingsContext, key: string, value: unknown, actor: string, reason?: string): Promise<void>;
  async deleteSetting(ctx: SettingsContext, key: string, actor: string): Promise<void>;
  async validateSettingKey(key: string, value: unknown): Promise<ValidationResult>;
}
```

### 3.3 ConfigCompareService
Compares config between two tenants, or between a tenant and platform defaults.

```ts
export class ConfigCompareService {
  async compareTenants(tenantA: string, tenantB: string, scope?: SettingsScope): Promise<ConfigDiff[]>;
  async compareTenantToDefaults(tenantId: string): Promise<ConfigDiff[]>;
}
```

### 3.4 ConfigExportImportService
Exports/imports tenant config snapshots as JSON with validation.

```ts
export class ConfigExportImportService {
  async exportConfig(tenantId: string, scopes?: SettingsScope[]): Promise<ConfigSnapshot>;
  async importConfig(tenantId: string, snapshot: ConfigSnapshot, actor: string, dryRun?: boolean): Promise<ConfigImportResult>;
}
```

### 3.5 ConfigAuditService
Provides config change history. Writes to `config_center_audit_log`.

```ts
export class ConfigAuditService {
  async logChange(entry: ConfigAuditEntry): Promise<void>;
  async getHistory(key?: string, tenantId?: string, limit?: number): Promise<ConfigAuditEntry[]>;
  async getChangesByActor(actorId: string, limit?: number): Promise<ConfigAuditEntry[]>;
}
```

### 3.6 ConfigHealthService
Checks environment variable completeness, secret binding status, and config drift.

```ts
export class ConfigHealthService {
  async checkEnvHealth(): Promise<EnvHealthReport>;
  async checkSecretBindings(): Promise<SecretBindingReport>;
  async detectDrift(tenantId: string): Promise<ConfigDriftReport>;
}
```

---

## 4. Required Frontend Surfaces

### 4.1 Config Resolution Explorer
- Search/browse config keys
- Resolve any key and see value + source layer + overridden layers
- Filter by scope, owner, sensitivity

### 4.2 Settings Manager
- CRUD for tenant/module/user settings
- Inline validation
- Scope selector (platform/tenant/workspace/module/user)
- Bilingual labels (EN/AR)

### 4.3 Config Audit Trail
- Timeline of config changes
- Filter by key, actor, scope, date range
- Before/after value diff view

### 4.4 Config Health Dashboard
- Environment variable completeness gauge
- Secret binding status indicators
- Config drift alerts
- Tenant config comparison view

---

## 5. Required DB Migration

### 5.1 Config Center Audit Log

```sql
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.config_center_audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.current_tenant_id', true),
  config_key TEXT NOT NULL,
  scope TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_type TEXT NOT NULL CHECK (change_type IN ('set', 'update', 'delete', 'import', 'rollback')),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'migration', 'import')),
  source TEXT NOT NULL DEFAULT 'api',
  reason TEXT,
  module_code TEXT,
  product_key TEXT,
  workspace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccal_tenant ON __TENANT_SCHEMA__.config_center_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ccal_key ON __TENANT_SCHEMA__.config_center_audit_log(config_key);
CREATE INDEX IF NOT EXISTS idx_ccal_actor ON __TENANT_SCHEMA__.config_center_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_ccal_created ON __TENANT_SCHEMA__.config_center_audit_log(created_at);
```

---

## 6. API Surface Requirements

### 6.1 Config Resolution API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| GET | `/api/config-center/resolve/:key` | `config.setting.read` | Resolve a single key with metadata |
| POST | `/api/config-center/resolve/batch` | `config.setting.read` | Resolve multiple keys |
| GET | `/api/config-center/resolve/all` | `config.setting.read` | Resolve all settings for a scope |
| GET | `/api/config-center/explain/:key` | `config.setting.read` | Full resolution explanation (all layers) |

### 6.2 Settings CRUD API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| GET | `/api/config-center/settings` | `config.setting.read` | List settings for scope |
| GET | `/api/config-center/settings/:key` | `config.setting.read` | Get single setting |
| PUT | `/api/config-center/settings/:key` | `config.setting.write` | Upsert setting with validation |
| DELETE | `/api/config-center/settings/:key` | `config.setting.write` | Delete setting |

### 6.3 Config Compare API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| GET | `/api/config-center/compare/tenants` | `config.compare.read` | Compare two tenants |
| GET | `/api/config-center/compare/defaults` | `config.compare.read` | Compare tenant to defaults |

### 6.4 Config Export/Import API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| GET | `/api/config-center/export` | `config.export.read` | Export tenant config snapshot |
| POST | `/api/config-center/import` | `config.import.write` | Import config snapshot (with dry-run) |

### 6.5 Config Audit API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| GET | `/api/config-center/audit` | `config.audit.read` | Config change history |
| GET | `/api/config-center/audit/:key` | `config.audit.read` | History for specific key |

### 6.6 Config Health API

| Method | Route | Permission | Description |
|--------|-------|------------|-------------|
| GET | `/api/config-center/health/env` | `config.health.read` | Environment variable health |
| GET | `/api/config-center/health/secrets` | `config.health.read` | Secret binding status |
| GET | `/api/config-center/health/drift` | `config.health.read` | Config drift detection |

---

## 7. Security (DAuth Integration)

### 7.1 Permissions

```ts
export const CONFIG_CENTER_PERMISSIONS = [
  { code: 'config.setting.read', descriptionEn: 'Read config settings', descriptionAr: 'قراءة إعدادات التكوين' },
  { code: 'config.setting.write', descriptionEn: 'Write config settings', descriptionAr: 'كتابة إعدادات التكوين' },
  { code: 'config.compare.read', descriptionEn: 'Compare tenant configs', descriptionAr: 'مقارنة إعدادات المستأجرين' },
  { code: 'config.export.read', descriptionEn: 'Export config snapshot', descriptionAr: 'تصدير لقطة الإعدادات' },
  { code: 'config.import.write', descriptionEn: 'Import config snapshot', descriptionAr: 'استيراد لقطة الإعدادات' },
  { code: 'config.audit.read', descriptionEn: 'Read config audit trail', descriptionAr: 'قراءة سجل تدقيق الإعدادات' },
  { code: 'config.health.read', descriptionEn: 'Read config health', descriptionAr: 'قراءة صحة الإعدادات' },
];
```

### 7.2 Roles

| Role | Permissions |
|------|-------------|
| `config.platform_admin` | All permissions |
| `config.tenant_admin` | `setting.read`, `setting.write`, `audit.read`, `health.read` (tenant-scoped) |
| `config.viewer` | `setting.read`, `audit.read` |
| `config.auditor` | `setting.read`, `audit.read`, `health.read`, `export.read` |

### 7.3 SoD Rules

```ts
export const CONFIG_CENTER_SOD_RULES = [
  {
    ruleCode: 'config.sod.import_approver',
    descriptionEn: 'Config importer cannot approve their own import',
    descriptionAr: 'لا يمكن لمستورد الإعدادات الموافقة على استيراده',
    conflictingActions: ['config.import.write', 'config.import.approve'],
    severity: 'critical',
    enforcement: 'block',
  },
];
```

---

## 8. Contracts and Types

### 8.1 Config Resolution Result

```ts
export interface ConfigResolveResult {
  key: string;
  value: unknown;
  source: string;
  overriddenLayers: string[];
  owner?: ConfigOwner;
  sensitive?: boolean;
  mutable?: boolean;
}
```

### 8.2 Config Resolution Explanation

```ts
export interface ConfigResolutionExplanation {
  key: string;
  layers: {
    layer: string;
    value: unknown | undefined;
    active: boolean;
  }[];
  finalValue: unknown;
  finalSource: string;
}
```

### 8.3 Config Diff

```ts
export interface ConfigDiff {
  key: string;
  scope: string;
  valueA: unknown;
  valueB: unknown;
  sourceA: string;
  sourceB: string;
  match: boolean;
}
```

### 8.4 Config Snapshot

```ts
export interface ConfigSnapshot {
  tenantId: string;
  exportedAt: string;
  exportedBy: string;
  version: string;
  scopes: SettingsScope[];
  settings: Record<string, { value: unknown; scope: string; moduleCode?: string }>;
  metadata: {
    settingCount: number;
    scopeBreakdown: Record<string, number>;
  };
}
```

### 8.5 Config Audit Entry

```ts
export interface ConfigAuditEntry {
  auditId: string;
  tenantId: string;
  configKey: string;
  scope: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'set' | 'update' | 'delete' | 'import' | 'rollback';
  actorId: string;
  actorType: 'user' | 'system' | 'migration' | 'import';
  source: string;
  reason?: string;
  moduleCode?: string;
  productKey?: string;
  workspaceId?: string;
  createdAt: string;
}
```

### 8.6 Environment Health Report

```ts
export interface EnvHealthReport {
  totalRegistered: number;
  totalSet: number;
  totalMissing: number;
  totalSensitive: number;
  totalSensitiveSet: number;
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
}
```

### 8.7 Config Drift Report

```ts
export interface ConfigDriftReport {
  tenantId: string;
  checkedAt: string;
  driftItems: {
    key: string;
    expectedSource: string;
    actualSource: string;
    expectedValue: unknown;
    actualValue: unknown;
    severity: 'info' | 'warning' | 'critical';
  }[];
  totalDrift: number;
  overallStatus: 'clean' | 'drifted' | 'critical_drift';
}
```

---

## 9. i18n Requirements

### 9.1 English keys (`i18n/en.json`)

```json
{
  "configCenter.title": "Config Center",
  "configCenter.resolve": "Resolve Config",
  "configCenter.settings": "Settings Manager",
  "configCenter.audit": "Change History",
  "configCenter.health": "Health & Diagnostics",
  "configCenter.compare": "Compare Tenants",
  "configCenter.export": "Export Config",
  "configCenter.import": "Import Config",
  "configCenter.source": "Source Layer",
  "configCenter.overridden": "Overridden Layers",
  "configCenter.scope": "Scope",
  "configCenter.key": "Config Key",
  "configCenter.value": "Value",
  "configCenter.sensitive": "Sensitive",
  "configCenter.owner": "Owner",
  "configCenter.drift": "Config Drift",
  "configCenter.noData": "No configuration data found. Settings will appear once the tenant is configured.",
  "configCenter.noAudit": "No configuration changes recorded yet."
}
```

### 9.2 Arabic keys (`i18n/ar.json`)

```json
{
  "configCenter.title": "مركز الإعدادات",
  "configCenter.resolve": "حل الإعدادات",
  "configCenter.settings": "إدارة الإعدادات",
  "configCenter.audit": "سجل التغييرات",
  "configCenter.health": "الصحة والتشخيصات",
  "configCenter.compare": "مقارنة المستأجرين",
  "configCenter.export": "تصدير الإعدادات",
  "configCenter.import": "استيراد الإعدادات",
  "configCenter.source": "طبقة المصدر",
  "configCenter.overridden": "الطبقات المتجاوزة",
  "configCenter.scope": "النطاق",
  "configCenter.key": "مفتاح الإعداد",
  "configCenter.value": "القيمة",
  "configCenter.sensitive": "حساس",
  "configCenter.owner": "المالك",
  "configCenter.drift": "انحراف الإعدادات",
  "configCenter.noData": "لم يتم العثور على بيانات إعدادات. ستظهر الإعدادات بمجرد تكوين المستأجر.",
  "configCenter.noAudit": "لم يتم تسجيل أي تغييرات في الإعدادات بعد."
}
```

---

## 10. Backend Package Layout

```text
backend/src/modules/config-center/
  config-center.module.ts
  security/
    config-center.security.ts
    config-center.approval-matrix.ts
  events/
    config-center.events.ts
  ports/
    auth.port.ts
    database.port.ts
    events.port.ts
    middleware.port.ts
  routes/
    config-resolution.routes.ts
    config-settings.routes.ts
    config-compare.routes.ts
    config-export-import.routes.ts
    config-audit.routes.ts
    config-health.routes.ts
  services/
    config-resolution.service.ts
    config-settings.service.ts
    config-compare.service.ts
    config-export-import.service.ts
    config-audit.service.ts
    config-health.service.ts
  schemas/
    config-center.schemas.ts
  contracts/
    config-center.contracts.ts
  i18n/
    en.json
    ar.json
```

---

## 11. Frontend Package Layout

```text
frontend/src/app/pages/config-center/
  config-center.routes.ts
  config-resolution/
    config-resolution.component.ts
    config-resolution.component.html
  settings-manager/
    settings-manager.component.ts
    settings-manager.component.html
  config-audit/
    config-audit.component.ts
    config-audit.component.html
  config-health/
    config-health.component.ts
    config-health.component.html
  config-compare/
    config-compare.component.ts
    config-compare.component.html

frontend/src/app/core/config-center/
  config-center.service.ts
  config-center.contracts.ts
```

---

## 12. Route Catalog Registration

The module must be registered in both:
- `backend/src/platform/route-catalogs/domain-routes.catalog.ts`
- `backend/src/products/shahin-ai/route-catalogs/domain-routes.catalog.ts`

```ts
{
  moduleCode: 'config-center',
  routeBase: '/api/config-center',
  routeFiles: [
    'config-resolution.routes',
    'config-settings.routes',
    'config-compare.routes',
    'config-export-import.routes',
    'config-audit.routes',
    'config-health.routes',
  ],
}
```

---

## 13. Navigation Registration

Add to `navigation.config.ts`:

```ts
{
  id: 'config-center',
  labelEn: 'Config Center',
  labelAr: 'مركز الإعدادات',
  icon: 'pi pi-cog',
  route: '/config-center',
  parentId: 'admin',
  requiredPermission: 'config.setting.read',
  sortOrder: 5,
  children: [
    { id: 'config-resolution', labelEn: 'Resolution Explorer', labelAr: 'مستكشف الحل', route: '/config-center/resolve' },
    { id: 'config-settings', labelEn: 'Settings Manager', labelAr: 'إدارة الإعدادات', route: '/config-center/settings' },
    { id: 'config-audit', labelEn: 'Change History', labelAr: 'سجل التغييرات', route: '/config-center/audit' },
    { id: 'config-health', labelEn: 'Health & Diagnostics', labelAr: 'الصحة والتشخيصات', route: '/config-center/health' },
  ],
}
```

---

## 14. Tests Required

### 14.1 Unit tests
- Config resolution returns correct layer precedence
- Settings validation rejects unknown keys
- Settings validation rejects writes to immutable keys
- Sensitive values are masked in API responses
- Config diff correctly identifies mismatches
- Export/import round-trip preserves all settings
- Audit log captures actor, scope, old/new values

### 14.2 Integration tests
- Full resolve flow: env → deployment → tenant → product → platform
- Settings CRUD with audit trail verification
- Tenant comparison produces accurate diff
- Export → Import → Verify round-trip
- Health check reports missing env vars correctly
- Permission enforcement blocks unauthorized writes
- SoD rule blocks self-approval of imports

### 14.3 Contract tests
- `ConfigResolveResult` matches declared interface
- `ConfigDiff` matches declared interface
- `ConfigSnapshot` round-trips through JSON serialization
- `ConfigAuditEntry` matches DB schema
- `EnvHealthReport` matches declared interface

---

## 15. Acceptance Criteria

This module passes only if:

1. All config reads flow through `UnifiedConfigService` — no parallel resolution paths
2. All config writes flow through `SettingsResolver` with audit — no direct DB writes
3. Admin UI shows resolved value + source layer for every config key
4. Config changes produce audit trail entries with actor, scope, old/new values
5. Sensitive values are never exposed raw in API responses
6. Environment health check covers all entries in `CONFIG_OWNERSHIP_MAP`
7. Tenant comparison correctly identifies config differences
8. Export/import round-trip preserves all settings without data loss
9. DAuth permissions are enforced on all endpoints
10. Bilingual (EN + AR) labels exist for all UI surfaces

---

## 16. Fail Conditions

This module fails if:

1. Any config route reads from JSON files on disk
2. Any config route bypasses `UnifiedConfigService` for resolution
3. Any config write occurs without an audit log entry
4. Secret values appear in any API response
5. The module creates parallel config tables instead of using `tenant_settings`
6. Permission checks are missing on any endpoint
7. i18n keys are missing for EN or AR
8. The frozen rule (Patch 11 Addendum §A.1) is violated by any route or service

---

## 17. Implementation Priority

| Priority | Action | Week |
|----------|--------|------|
| P0 | Create module skeleton with manifest, security, ports | 1 |
| P0 | Implement `ConfigResolutionService` delegating to `UnifiedConfigService` | 1 |
| P0 | Implement `ConfigSettingsService` delegating to `SettingsResolver` | 1 |
| P0 | Implement resolution and settings routes with Zod validation | 1 |
| P1 | Implement `ConfigAuditService` with DB table migration | 2 |
| P1 | Implement `ConfigHealthService` reading `CONFIG_OWNERSHIP_MAP` | 2 |
| P1 | Implement `ConfigCompareService` | 2 |
| P2 | Implement `ConfigExportImportService` | 3 |
| P2 | Implement frontend surfaces | 3-4 |
| P2 | Register in route catalog and navigation | 3 |
| P3 | Implement config drift detection | 4 |
| P3 | Write full test suite | 4 |

---

## 18. One-Line Use Instruction

Use MP-58 to build the unified Config Center module that consolidates all config management behind the canonical `UnifiedConfigService` resolver, eliminates JSON-file and parallel-table config patterns, and provides resolution, CRUD, comparison, export/import, audit, and health APIs with full DAuth integration and bilingual UI.
