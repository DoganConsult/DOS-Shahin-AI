export { CONFIG_CENTER_MANIFEST } from './config-center.module';
export { CONFIG_CENTER_MANIFEST_META } from './manifest/config-center.manifest';
export { CONFIG_CENTER_EVENT_CONTRACT, CONFIG_CENTER_PUBLISHED_EVENTS, CONFIG_CENTER_CONSUMED_EVENTS } from './events/config-center.events';
export { registerConfigCenterEventSubscribers } from './events/config-center.subscribers';
export { CONFIG_CENTER_PERMISSIONS, CONFIG_CENTER_ROLES, CONFIG_CENTER_ACTIONS } from './security/config-center.security';
export { CONFIG_CENTER_APPROVAL_MATRIX } from './security/config-center.approval-matrix';
export { CONFIG_CENTER_SOD_RULES } from './security/config-center.sod';

export { ConfigGateway } from './ports/config-gateway.port';
export { resolveConfig, resolveManyConfigs, explainResolution } from './services/config-resolution.service';
export { getConfigSetting, getConfigSettingsForScope, upsertConfigSetting, deleteConfigSetting } from './services/config-settings.service';
export { logConfigChange, getConfigAuditHistory } from './services/config-audit.service';
export { compareTenants, compareTenantToDefaults } from './services/config-compare.service';
export { exportConfig, importConfig } from './services/config-export-import.service';
export { checkEnvHealth, checkSecretBindings, detectConfigDrift } from './services/config-health.service';
export { runConfigDiagnostics } from './services/config-diagnostics.service';

export { default as configResolutionRoutes } from './routes/config-resolution.routes';
export { default as configSettingsRoutes } from './routes/config-settings.routes';
export { default as configCompareRoutes } from './routes/config-compare.routes';
export { default as configExportImportRoutes } from './routes/config-export-import.routes';
export { default as configAuditRoutes } from './routes/config-audit.routes';
export { default as configHealthRoutes } from './routes/config-health.routes';

export type {
  ConfigResolveOptions,
  ConfigResolveResult,
  ConfigResolutionExplanation,
  ConfigDiff,
  ConfigSnapshot,
  ConfigImportResult,
  ConfigAuditEntry,
  EnvHealthReport,
  SecretBindingReport,
  ConfigDriftReport,
} from './contracts/config-center.contracts';
