import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiClientService } from '@app/core/services/api-client.service';

export interface ConfigResolveResult {
  key: string;
  value: unknown;
  source: string;
  overriddenLayers: string[];
  owner?: string;
  sensitive?: boolean;
  mutable?: boolean;
}

export interface ConfigResolutionExplanation {
  key: string;
  layers: { layer: string; value: unknown | undefined; active: boolean }[];
  finalValue: unknown;
  finalSource: string;
}

export interface ConfigDiff {
  key: string;
  scope: string;
  valueA: unknown;
  valueB: unknown;
  sourceA: string;
  sourceB: string;
  match: boolean;
}

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

export interface SecretBindingReport {
  totalSecrets: number;
  bound: number;
  unbound: number;
  items: { key: string; bound: boolean; sensitive: boolean }[];
}

export interface ConfigDriftItem {
  key: string;
  expectedSource: string;
  actualSource: string;
  expectedValue: unknown;
  actualValue: unknown;
  severity: 'info' | 'warning' | 'critical';
}

export interface ConfigDriftReport {
  tenantId: string;
  checkedAt: string;
  driftItems: ConfigDriftItem[];
  totalDrift: number;
  overallStatus: 'clean' | 'drifted' | 'critical_drift';
}

export interface SettingRecord {
  key: string;
  value: unknown;
  scope: string;
  productKey?: string;
  moduleCode?: string;
  workspaceId?: string;
  // canonical fields surfaced by tenant-service /config-center/settings
  label?: string;
  description?: string;
  category?: string;
  module?: string;
  dataType?: string;
  enumValues?: string[];
  allowedScopes?: string[];
  isOverridable?: boolean;
  isLockable?: boolean;
  isSecret?: boolean;
  requiresRestart?: boolean;
  lockedAtTenant?: boolean;
  effectiveSource?: 'user' | 'tenant' | 'platform' | 'default';
  effectiveValue?: unknown;
  platformDefault?: unknown;
  platformValue?: unknown;
  tenantValue?: unknown;
  userValue?: unknown;
}

export interface ConfigSettingsServerResponse {
  tenantId?: string;
  items?: SettingRecord[];
  total?: number;
}

export interface ConfigImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  dryRun: boolean;
  approvalRequired?: boolean;
  approvalRequestId?: string;
  status?: string;
}

export interface ConfigSnapshot {
  tenantId: string;
  exportedAt: string;
  exportedBy: string;
  version: string;
  scopes: string[];
  settings: Record<string, { value: unknown; scope: string; moduleCode?: string }>;
  metadata: { settingCount: number; scopeBreakdown: Record<string, number> };
}

export interface WorkspaceConfigResponse {
  config: Record<string, unknown>;
  count: number;
  items: GatewayInventoryItem[];
}

export interface ShellOverrideResponse {
  override: Record<string, unknown>;
}

export interface WorkspaceBatchResult {
  ok: boolean;
  results: { key: string; ok: boolean; error?: string }[];
  updated: number;
}

export interface GatewayInventoryItem {
  key: string;
  owner: string;
  description: string;
  mutable: boolean;
  sensitive: boolean;
  bootstrap: boolean;
  currentValue: unknown;
  currentSource: string;
  hasOverride: boolean;
}

export interface GatewayInventoryResponse {
  total: number;
  bootstrapKeys: number;
  overriddenKeys: number;
  items: GatewayInventoryItem[];
}

export interface PaginatedResponse<T> {
  count: number;
  entries?: T[];
  settings?: T[];
  results?: T[];
  diffs?: T[];
}

@Injectable({ providedIn: 'root' })
export class ConfigCenterService {
  private api = inject(ApiClientService);
  private base = '/api/config-center';

  resolveKey(key: string, params?: Record<string, string>) {
    return this.api.get<ConfigResolveResult>(`${this.base}/resolve/${key}`, { params });
  }

  resolveBatch(keys: string[]) {
    return this.api.post<PaginatedResponse<ConfigResolveResult>>(`${this.base}/resolve/batch`, { keys });
  }

  explainKey(key: string) {
    return this.api.get<ConfigResolutionExplanation>(`${this.base}/explain/${key}`);
  }

  /**
   * Reads tenant-service /config-center/settings (canonical effective view).
   * Server returns { tenantId, items: SettingRecord[], total }. We normalize
   * to PaginatedResponse so legacy callers continue to read `settings`/`count`,
   * while new callers can use `items` plus the rich SettingRecord fields
   * (effectiveValue, effectiveSource, allowedScopes, ...).
   * The optional `scope` filter is applied client-side because the server
   * always returns the effective view across user/tenant/platform.
   */
  getSettings(scope?: string, moduleCode?: string): Observable<PaginatedResponse<SettingRecord> & { tenantId?: string; items?: SettingRecord[] }> {
    const params: Record<string, string> = {};
    if (moduleCode) params['module'] = moduleCode;
    return this.api.get<ConfigSettingsServerResponse>(`${this.base}/settings`, { params }).pipe(
      map((r) => {
        const all: SettingRecord[] = (r?.items || []).map(it => ({
          ...it,
          // shape compatibility — legacy SettingRecord required `value` + `scope`
          value: it.effectiveValue ?? it.platformDefault ?? null,
          scope: it.effectiveSource || 'default',
        }));
        const filtered = scope
          ? all.filter(i => Array.isArray(i.allowedScopes) && i.allowedScopes!.includes(scope))
          : all;
        return {
          tenantId: r?.tenantId,
          items: filtered,
          settings: filtered,
          count: filtered.length,
        };
      }),
    );
  }

  getSetting(key: string, _scope?: string) {
    return this.api.get<SettingRecord>(`${this.base}/settings/${key}`);
  }

  /**
   * Writes a value at the requested scope. Supported by tenant-service:
   *   scope=tenant — requires tenant_admin or platform_admin role
   *   scope=user   — caller writes own preference
   * Server returns 423 LOCKED if dos.config_locks pins the key.
   */
  upsertSetting(key: string, body: { value: unknown; scope?: string; reason?: string }) {
    const scope = body.scope || 'tenant';
    return this.api.put<{ ok: boolean; scope: string; scopeId: string }>(
      `${this.base}/settings/${encodeURIComponent(key)}?scope=${encodeURIComponent(scope)}`,
      { value: body.value, reason: body.reason },
    );
  }

  /**
   * Server has no DELETE — deletion is modeled as overriding back to the
   * inherited platform default. We re-PUT null at the requested scope which
   * deactivates the override row and lets inheritance take over.
   */
  deleteSetting(key: string, scope?: string) {
    const s = scope || 'tenant';
    return this.api.put<{ ok: boolean; scope: string; scopeId: string }>(
      `${this.base}/settings/${encodeURIComponent(key)}?scope=${encodeURIComponent(s)}`,
      { value: null },
    );
  }

  compareTenants(tenantA: string, tenantB: string, scope?: string) {
    const params: Record<string, string> = { tenantA, tenantB };
    if (scope) params['scope'] = scope;
    return this.api.get<PaginatedResponse<ConfigDiff>>(`${this.base}/compare/tenants`, { params });
  }

  compareToDefaults() {
    return this.api.get<PaginatedResponse<ConfigDiff>>(`${this.base}/compare/defaults`);
  }

  exportConfig(scopes?: string[]) {
    const params: Record<string, string> = {};
    if (scopes?.length) params['scopes'] = scopes.join(',');
    return this.api.get<ConfigSnapshot>(`${this.base}/export`, { params });
  }

  importConfig(snapshot: ConfigSnapshot, dryRun = false) {
    return this.api.post<ConfigImportResult>(`${this.base}/import`, { snapshot, dryRun });
  }

  getAuditHistory(params?: Record<string, string>) {
    return this.api.get<PaginatedResponse<ConfigAuditEntry>>(`${this.base}/audit`, { params });
  }

  getAuditForKey(key: string) {
    return this.api.get<PaginatedResponse<ConfigAuditEntry>>(`${this.base}/audit/${key}`);
  }

  getEnvHealth() {
    return this.api.get<EnvHealthReport>(`${this.base}/health/env`);
  }

  getSecretBindings() {
    return this.api.get<SecretBindingReport>(`${this.base}/health/secrets`);
  }

  getDrift() {
    return this.api.get<ConfigDriftReport>(`${this.base}/health/drift`);
  }

  getDiagnostics() {
    return this.api.get<Record<string, unknown>>(`${this.base}/health/diagnostics`);
  }

  getGatewayInventory() {
    return this.api.get<GatewayInventoryResponse>(`${this.base}/gateway/inventory`);
  }

  getGatewayOverrides() {
    return this.api.get<{ overrides: Record<string, unknown> }>(`${this.base}/gateway/overrides`);
  }

  setGatewayOverride(key: string, value: unknown) {
    return this.api.put<{ ok: boolean; key: string }>(`${this.base}/gateway/override/${key}`, { value });
  }

  clearGatewayOverride(key: string) {
    return this.api.delete<{ ok: boolean; key: string }>(`${this.base}/gateway/override/${key}`);
  }

  invalidateGatewayCache(key?: string) {
    return this.api.post<{ ok: boolean; invalidated: string }>(`${this.base}/gateway/invalidate`, key ? { key } : {});
  }

  getWorkspaceConfig() {
    return this.api.get<WorkspaceConfigResponse>(`${this.base}/gateway/workspace-config`);
  }

  getShellOverride() {
    return this.api.get<ShellOverrideResponse>(`${this.base}/gateway/shell-override`);
  }

  updateWorkspaceBatch(updates: Record<string, unknown>) {
    return this.api.put<WorkspaceBatchResult>(`${this.base}/gateway/workspace-batch`, { updates });
  }
}
