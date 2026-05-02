// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const PLATFORM_STATS_MANIFEST: ModuleManifest = {
  code: 'platform-stats',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Platform Statistics',
  nameAr: 'إحصائيات المنصة',
  descriptionEn: 'Platform-wide statistics aggregation, system health metrics, usage analytics, and operational KPI computation.',
  descriptionAr: 'تجميع الإحصائيات على مستوى المنصة، مقاييس صحة النظام، تحليلات الاستخدام، وحساب مؤشرات الأداء التشغيلية.',
  tier: 'technical-support',
  category: 'platform',
  routeBase: '/api/platform-stats',
  eventNamespace: 'platform-stats',
  tablePrefix: 'platform_',
  ownedTables: ['platform_metrics', 'platform_kpis', 'platform_usage_log'],
  sharedTables: [],
  referencedTables: ['users', 'modules_registry'],
  aggregateRoots: ['platform_metrics'],
  publishedEvents: ['platform-stats.metric_recorded', 'platform-stats.kpi_computed'],
  consumedEvents: [],
  hardDeps: ['foundation'],
  softDeps: ['analytics', 'admin'],
  navId: 'platform-stats',
  navChildCount: 4,
  workflowTemplateCode: null,
  workflowSlaHours: null,
  automationLevel: 'full',
  agentBinding: null,
  aiCapabilities: ['anomaly_detection', 'trend_prediction'],
  aiEnabled: true,
  featureFlags: ['platform-stats.auto_refresh'],
  installable: true,
  provisioningOrder: 90,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: ['platform-stats-config'],
  securityPermissions: [
    { permissionCode: 'platform-stats.read', resourceType: 'metrics', actionType: 'read', descriptionEn: 'View platform statistics', descriptionAr: 'عرض إحصائيات المنصة', sensitive: false },
    { permissionCode: 'platform-stats.manage', resourceType: 'metrics', actionType: 'manage', descriptionEn: 'Manage metric collection', descriptionAr: 'إدارة جمع المقاييس', sensitive: true }
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'platform-stats.viewer', archetype: 'viewer', nameEn: 'Stats Viewer', nameAr: 'عارض الإحصائيات', isDefault: true, isSystem: true, isGlobal: false, permissions: ['platform-stats.read'] },
    { roleCode: 'platform-stats.admin', archetype: 'module_lead', nameEn: 'Stats Administrator', nameAr: 'مسؤول الإحصائيات', isDefault: false, isSystem: true, isGlobal: false, permissions: ['platform-stats.read', 'platform-stats.manage'] }
  ] as ModuleRole[],
  securityActions: [
    { actionCode: 'platform-stats.view', labelEn: 'View Statistics', labelAr: 'عرض الإحصائيات', requiredPermissions: ['platform-stats.read'], dangerLevel: 'safe', auditable: false },
    { actionCode: 'platform-stats.record_metric', labelEn: 'Record Metric', labelAr: 'تسجيل مقياس', requiredPermissions: ['platform-stats.manage'], dangerLevel: 'moderate', auditable: true }
  ] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: []
};
registerModule(PLATFORM_STATS_MANIFEST);
