import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { CONFIG_CENTER_PERMISSIONS, CONFIG_CENTER_ROLES, CONFIG_CENTER_ACTIONS } from './security/config-center.security';
import { CONFIG_CENTER_APPROVAL_MATRIX } from './security/config-center.approval-matrix';
import { CONFIG_CENTER_SOD_RULES } from './security/config-center.sod';
import { CONFIG_CENTER_PUBLISHED_EVENTS, CONFIG_CENTER_CONSUMED_EVENTS } from './events/config-center.events';

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
  consumedEvents: CONFIG_CENTER_CONSUMED_EVENTS,
  hardDeps: ['foundation'],
  softDeps: ['admin'],
  navId: 'config-center',
  navChildCount: 7,
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
  adminSurfaces: ['config-resolution', 'settings-management', 'config-audit', 'config-health', 'config-compare', 'config-gateway', 'workspace-config'],
  securityPermissions: CONFIG_CENTER_PERMISSIONS,
  securityRoles: CONFIG_CENTER_ROLES,
  securityActions: CONFIG_CENTER_ACTIONS,
  approvalRules: CONFIG_CENTER_APPROVAL_MATRIX,
  ownershipRules: [],
  sodRules: CONFIG_CENTER_SOD_RULES,
  mcpServiceEntrypoint: null,
};

registerModule(CONFIG_CENTER_MANIFEST);
