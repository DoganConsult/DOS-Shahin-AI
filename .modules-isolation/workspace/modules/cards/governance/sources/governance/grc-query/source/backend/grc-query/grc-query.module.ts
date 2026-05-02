// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const GRC_QUERY_MANIFEST: ModuleManifest = {
  code: 'grc-query',
  version: '1.0.0',
  aliases: [],
  nameEn: 'GRC Query Engine',
  nameAr: 'محرك استعلام الحوكمة',
  descriptionEn: 'Cross-module federated search, natural language query translation, and saved query management.',
  descriptionAr: 'بحث موحد عبر الوحدات، ترجمة استعلامات اللغة الطبيعية، وإدارة الاستعلامات المحفوظة.',
  tier: 'cross-module',
  category: 'product',
  routeBase: '/api/grc-query',
  eventNamespace: 'grc-query',
  tablePrefix: 'grc_',
  ownedTables: ['grc_query_log', 'grc_saved_queries'],
  sharedTables: [],
  referencedTables: ['risk_register', 'compliance_items', 'audit_plans', 'incidents', 'controls'],
  aggregateRoots: [],
  publishedEvents: [],
  consumedEvents: [],
  hardDeps: ['foundation'],
  softDeps: ['risk', 'compliance', 'audit', 'incident', 'controls', 'ai'],
  navId: 'grc-query',
  navChildCount: 2,
  workflowTemplateCode: null,
  workflowSlaHours: null,
  automationLevel: 'full',
  agentBinding: 'A-QRY',
  aiCapabilities: ['nl_query_translation'],
  aiEnabled: true,
  featureFlags: ['grc-query.nlq'],
  installable: true,
  provisioningOrder: 30,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: [],
  securityPermissions: [
    { permissionCode: 'grc-query.read', resourceType: 'query', actionType: 'read', descriptionEn: 'Execute queries', descriptionAr: 'تنفيذ الاستعلامات', sensitive: false },
    { permissionCode: 'grc-query.manage', resourceType: 'query', actionType: 'manage', descriptionEn: 'Save and share queries', descriptionAr: 'حفظ ومشاركة الاستعلامات', sensitive: false }
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'grc-query.user', archetype: 'viewer', nameEn: 'Query User', nameAr: 'مستخدم الاستعلام', isDefault: true, isSystem: true, isGlobal: false, permissions: ['grc-query.read'] },
    { roleCode: 'grc-query.analyst', archetype: 'contributor', nameEn: 'Query Analyst', nameAr: 'محلل الاستعلام', isDefault: false, isSystem: true, isGlobal: false, permissions: ['grc-query.read', 'grc-query.manage'] }
  ] as ModuleRole[],
  securityActions: [] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: []
};
registerModule(GRC_QUERY_MANIFEST);
