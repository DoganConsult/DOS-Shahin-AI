// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const BENCHMARKS_MANIFEST: ModuleManifest = {
  code: 'benchmarks',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Benchmarks',
  nameAr: 'المقارنات المعيارية',
  descriptionEn: 'Benchmark framework catalog, control mapping, maturity scoring, and anonymized peer comparison analytics.',
  descriptionAr: 'كتالوج أطر المقارنة المعيارية وربط الضوابط وتسجيل النضج وتحليلات المقارنة المجهولة مع الأقران.',
  tier: 'cross-module',
  category: 'product',
  routeBase: '/api/benchmarks',
  eventNamespace: 'benchmarks',
  tablePrefix: 'benchmark',
  ownedTables: ['benchmarks_catalog', 'benchmark_control_mappings', 'benchmark_scores', 'benchmark_peer_data'],
  sharedTables: [],
  referencedTables: ['controls'],
  aggregateRoots: ['benchmarks_catalog'],
  publishedEvents: ['benchmarks.score_computed'],
  consumedEvents: ['controls.effectiveness_updated'],
  hardDeps: ['foundation'],
  softDeps: ['compliance', 'controls'],
  navId: 'benchmarks',
  navChildCount: 3,
  workflowTemplateCode: null,
  workflowSlaHours: null,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: [],
  aiEnabled: false,
  featureFlags: [],
  installable: true,
  provisioningOrder: 35,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: [],
  securityPermissions: [
    { permissionCode: 'benchmarks.read', resourceType: 'benchmark', actionType: 'read', descriptionEn: 'View benchmarks and scores', descriptionAr: 'عرض المقارنات والنتائج', sensitive: false },
    { permissionCode: 'benchmarks.manage', resourceType: 'benchmark', actionType: 'manage', descriptionEn: 'Create benchmarks and mappings', descriptionAr: 'إنشاء المقارنات والربط', sensitive: true }
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'benchmarks.viewer', archetype: 'viewer', nameEn: 'Benchmark Viewer', nameAr: 'عارض المقارنات', isDefault: true, isSystem: true, isGlobal: false, permissions: ['benchmarks.read'] },
    { roleCode: 'benchmarks.analyst', archetype: 'contributor', nameEn: 'Benchmark Analyst', nameAr: 'محلل المقارنات', isDefault: false, isSystem: true, isGlobal: false, permissions: ['benchmarks.read', 'benchmarks.manage'] }
  ] as ModuleRole[],
  securityActions: [],
  approvalRules: [],
  ownershipRules: [],
  sodRules: []
};
registerModule(BENCHMARKS_MANIFEST);
