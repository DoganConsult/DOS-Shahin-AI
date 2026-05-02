// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const CONNECTORS_MANIFEST: ModuleManifest = {
  code: 'connectors',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Connectors',
  nameAr: 'الموصلات',
  descriptionEn: 'Outbound integration adapters: ServiceNow, Apache Tika, Unstructured.io, and generic HTTP/OAuth2 connectors for document ingestion and system bridging.',
  descriptionAr: 'محولات التكامل الصادرة: ServiceNow، Apache Tika، Unstructured.io، وموصلات HTTP/OAuth2 العامة لاستيعاب المستندات وربط الأنظمة.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/connectors',
  eventNamespace: 'connectors',
  tablePrefix: 'connector_',
  ownedTables: [
    'connector_registrations',
    'connector_credentials',
    'connector_invocations',
  ],
  sharedTables: [],
  referencedTables: ['tenants', 'audit_trail'],
  aggregateRoots: ['connector_registrations'],
  publishedEvents: [
    'connectors.invocation_succeeded',
    'connectors.invocation_failed',
    'connectors.registration_changed',
  ],
  consumedEvents: [],
  hardDeps: ['foundation'],
  softDeps: ['config-center'],
  navId: 'connectors',
  navChildCount: 3,
  workflowTemplateCode: null,
  workflowSlaHours: null,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: [],
  aiEnabled: false,
  featureFlags: ['connectors.servicenow', 'connectors.tika', 'connectors.unstructured'],
  installable: true,
  provisioningOrder: 20,
  licensingTier: 'professional',
  visibility: 'internal',
  adminSurfaces: ['connector-registry', 'connector-credentials', 'connector-invocation-log'],
  securityPermissions: [
    { permissionCode: 'connectors.read', resourceType: 'connector', actionType: 'read', descriptionEn: 'View connector registry', descriptionAr: 'عرض سجل الموصلات', sensitive: false },
    { permissionCode: 'connectors.manage', resourceType: 'connector', actionType: 'manage', descriptionEn: 'Manage connector registrations and credentials', descriptionAr: 'إدارة تسجيلات الموصلات وبيانات الاعتماد', sensitive: true },
    { permissionCode: 'connectors.invoke', resourceType: 'connector', actionType: 'execute', descriptionEn: 'Invoke connectors', descriptionAr: 'استدعاء الموصلات', sensitive: true },
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'connectors.viewer', archetype: 'viewer', nameEn: 'Connector Viewer', nameAr: 'عارض الموصلات', isDefault: true, isSystem: true, isGlobal: false, permissions: ['connectors.read'] },
    { roleCode: 'connectors.operator', archetype: 'operator', nameEn: 'Connector Operator', nameAr: 'مشغل الموصلات', isDefault: false, isSystem: true, isGlobal: false, permissions: ['connectors.read', 'connectors.invoke'] },
    { roleCode: 'connectors.admin', archetype: 'module_lead', nameEn: 'Connector Administrator', nameAr: 'مسؤول الموصلات', isDefault: false, isSystem: true, isGlobal: false, permissions: ['connectors.read', 'connectors.manage', 'connectors.invoke'] },
  ] as ModuleRole[],
  securityActions: [
    { actionCode: 'connectors.view', labelEn: 'View Connectors', labelAr: 'عرض الموصلات', requiredPermissions: ['connectors.read'], dangerLevel: 'safe', auditable: false },
    { actionCode: 'connectors.register', labelEn: 'Register Connector', labelAr: 'تسجيل موصل', requiredPermissions: ['connectors.manage'], dangerLevel: 'moderate', auditable: true },
    { actionCode: 'connectors.invoke', labelEn: 'Invoke Connector', labelAr: 'استدعاء موصل', requiredPermissions: ['connectors.invoke'], dangerLevel: 'moderate', auditable: true },
  ] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: [],
  mcpServiceEntrypoint: null,
};

registerModule(CONNECTORS_MANIFEST);
