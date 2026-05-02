import type { SettingsScope } from '@dos/platform-core/settings/settings-resolver.service';
import type { ConfigOwner } from '../../../platform/contracts/config-boundary';

export interface ConfigResolveOptions {
  tenantId?: string;
  workspaceId?: string;
  userId?: string;
  moduleCode?: string;
  roleCode?: string;
  dashboardCode?: string;
}

export interface ConfigResolveResult {
  key: string;
  value: unknown;
  source: string;
  overriddenLayers: string[];
  owner?: ConfigOwner;
  sensitive?: boolean;
  mutable?: boolean;
}

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

export interface ConfigDiff {
  key: string;
  scope: string;
  valueA: unknown;
  valueB: unknown;
  sourceA: string;
  sourceB: string;
  match: boolean;
}

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

export interface ConfigImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  dryRun: boolean;
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
