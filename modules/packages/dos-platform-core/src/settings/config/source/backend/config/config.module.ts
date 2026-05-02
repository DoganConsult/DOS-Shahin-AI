// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const CONFIG_MANIFEST: ModuleManifest = {
  code: 'config',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Config',
  nameAr: 'الإعدادات',
  descriptionEn: 'Static platform configuration: module-workflow mapping, runtime contracts, and shared config primitives consumed by the config-center.',
  descriptionAr: 'إعدادات المنصة الثابتة: ربط الوحدات بسير العمل، عقود وقت التشغيل، وعناصر الإعدادات المشتركة التي يستهلكها مركز الإعدادات.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/config',
  eventNamespace: 'config',
  tablePrefix: 'config_',
  ownedTables: [],
  sharedTables: ['platform_config', 'tenant_settings'],
  referencedTables: ['modules_registry', 'workflow_templates'],
  aggregateRoots: [],
  publishedEvents: [],
  consumedEvents: [],
  hardDeps: ['foundation'],
  softDeps: ['config-center'],
  navId: 'config',
  navChildCount: 0,
  workflowTemplateCode: null,
  workflowSlaHours: null,
  automationLevel: 'manual',
  agentBinding: null,
  aiCapabilities: [],
  aiEnabled: false,
  featureFlags: [],
  installable: false,
  provisioningOrder: 10,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['config-map', 'config-validator'],
  securityPermissions: [
    { permissionCode: 'config.read', resourceType: 'config', actionType: 'read', descriptionEn: 'Read platform config', descriptionAr: 'قراءة إعدادات المنصة', sensitive: false },
    { permissionCode: 'config.manage', resourceType: 'config', actionType: 'manage', descriptionEn: 'Manage platform config', descriptionAr: 'إدارة إعدادات المنصة', sensitive: true },
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'config.viewer', archetype: 'viewer', nameEn: 'Config Viewer', nameAr: 'عارض الإعدادات', isDefault: true, isSystem: true, isGlobal: false, permissions: ['config.read'] },
    { roleCode: 'config.admin', archetype: 'module_lead', nameEn: 'Config Administrator', nameAr: 'مسؤول الإعدادات', isDefault: false, isSystem: true, isGlobal: false, permissions: ['config.read', 'config.manage'] },
  ] as ModuleRole[],
  securityActions: [
    { actionCode: 'config.view', labelEn: 'View Config', labelAr: 'عرض الإعدادات', requiredPermissions: ['config.read'], dangerLevel: 'safe', auditable: false },
    { actionCode: 'config.update', labelEn: 'Update Config', labelAr: 'تحديث الإعدادات', requiredPermissions: ['config.manage'], dangerLevel: 'moderate', auditable: true },
  ] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: [],
  mcpServiceEntrypoint: null,
};

registerModule(CONFIG_MANIFEST);
