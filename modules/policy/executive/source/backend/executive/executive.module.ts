// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const EXECUTIVE_MANIFEST: ModuleManifest = {
  code: 'executive',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Executive Command',
  nameAr: 'القيادة التنفيذية',
  descriptionEn: 'Board-level executive briefings, strategic objective tracking, risk appetite monitoring, and AI-powered memo generation.',
  descriptionAr: 'تقارير مجلس الإدارة التنفيذية وتتبع الأهداف الاستراتيجية ومراقبة حد المخاطر وإنشاء المذكرات بالذكاء الاصطناعي.',
  tier: 'technical-support',
  category: 'product',
  routeBase: '/api/executive',
  eventNamespace: 'executive',
  tablePrefix: 'executive_',
  ownedTables: ['executive_briefs', 'executive_objectives', 'executive_risk_appetite'],
  sharedTables: [],
  referencedTables: ['users', 'risk_register'],
  aggregateRoots: ['executive_briefs'],
  publishedEvents: ['executive.brief_created', 'executive.brief_approved', 'executive.appetite_breach'],
  consumedEvents: ['analytics.kpi_updated', 'risk.exposure_changed'],
  hardDeps: ['foundation'],
  softDeps: ['analytics', 'risk', 'compliance', 'ai', 'reporting'],
  navId: 'executive',
  navChildCount: 4,
  workflowTemplateCode: 'executive_brief_approval',
  workflowSlaHours: 24,
  automationLevel: 'semi',
  agentBinding: 'A-EXEC',
  aiCapabilities: ['briefing_generation', 'objective_trajectory_analysis'],
  aiEnabled: true,
  featureFlags: ['executive.ai_briefs'],
  installable: true,
  provisioningOrder: 80,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: ['executive-config'],
  securityPermissions: [
    { permissionCode: 'executive.read', resourceType: 'executive', actionType: 'read', descriptionEn: 'View executive data', descriptionAr: 'عرض البيانات التنفيذية', sensitive: false },
    { permissionCode: 'executive.brief.manage', resourceType: 'brief', actionType: 'manage', descriptionEn: 'Create and edit briefs', descriptionAr: 'إنشاء وتحرير التقارير', sensitive: true },
    { permissionCode: 'executive.brief.approve', resourceType: 'brief', actionType: 'approve', descriptionEn: 'Approve executive briefs', descriptionAr: 'اعتماد التقارير التنفيذية', sensitive: true },
    { permissionCode: 'executive.objective.manage', resourceType: 'objective', actionType: 'manage', descriptionEn: 'Manage strategic objectives', descriptionAr: 'إدارة الأهداف الاستراتيجية', sensitive: true },
    { permissionCode: 'executive.appetite.manage', resourceType: 'appetite', actionType: 'manage', descriptionEn: 'Configure risk appetite', descriptionAr: 'تهيئة حد المخاطر', sensitive: true }
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'executive.viewer', archetype: 'viewer', nameEn: 'Executive Viewer', nameAr: 'عارض تنفيذي', isDefault: true, isSystem: true, isGlobal: false, permissions: ['executive.read'] },
    { roleCode: 'executive.analyst', archetype: 'contributor', nameEn: 'Executive Analyst', nameAr: 'محلل تنفيذي', isDefault: false, isSystem: true, isGlobal: false, permissions: ['executive.read', 'executive.brief.manage', 'executive.objective.manage'] },
    { roleCode: 'executive.board', archetype: 'approver', nameEn: 'Board Member', nameAr: 'عضو مجلس الإدارة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['executive.read', 'executive.brief.approve'] },
    { roleCode: 'executive.admin', archetype: 'module_lead', nameEn: 'Executive Admin', nameAr: 'مسؤول تنفيذي', isDefault: false, isSystem: true, isGlobal: false, permissions: ['executive.read', 'executive.brief.manage', 'executive.brief.approve', 'executive.objective.manage', 'executive.appetite.manage'] }
  ] as ModuleRole[],
  securityActions: [
    { actionCode: 'executive.brief.approve', labelEn: 'Approve Briefing', labelAr: 'اعتماد التقرير', requiredPermissions: ['executive.brief.approve'], dangerLevel: 'moderate', auditable: true, requiresWorkflow: true }
  ] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: []
};
registerModule(EXECUTIVE_MANIFEST);
