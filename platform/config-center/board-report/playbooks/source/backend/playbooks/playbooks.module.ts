// @ts-nocheck
import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const PLAYBOOKS_MANIFEST: ModuleManifest = {
  code: 'playbooks',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Playbooks',
  nameAr: 'دليل الإجراءات',
  descriptionEn: 'Structured response playbooks for incident handling, remediation workflows, and automated trigger-based execution.',
  descriptionAr: 'أدلة إجراءات الاستجابة المنظمة لمعالجة الحوادث وسير عمل المعالجة والتنفيذ التلقائي بناءً على المحفزات.',
  tier: 'product-hub',
  category: 'product',
  routeBase: '/api/playbooks',
  eventNamespace: 'playbooks',
  tablePrefix: 'playbook_',
  ownedTables: ['playbook_templates', 'playbook_steps', 'playbook_executions', 'playbook_execution_logs'],
  sharedTables: [],
  referencedTables: ['users', 'incidents', 'action_items'],
  aggregateRoots: ['playbook_templates'],
  publishedEvents: ['playbooks.execution_started', 'playbooks.execution_completed', 'playbooks.step_completed'],
  consumedEvents: ['incident.created', 'remediation.created'],
  hardDeps: ['foundation'],
  softDeps: ['incident', 'remediation', 'workflow', 'action', 'notification'],
  navId: 'playbooks',
  navChildCount: 3,
  workflowTemplateCode: 'playbook_template_approval',
  workflowSlaHours: 24,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: [],
  aiEnabled: false,
  featureFlags: [],
  installable: true,
  provisioningOrder: 25,
  licensingTier: 'professional',
  visibility: 'internal',
  adminSurfaces: ['playbooks-config'],
  securityPermissions: [
    { permissionCode: 'playbooks.read', resourceType: 'playbook', actionType: 'read', descriptionEn: 'View playbooks', descriptionAr: 'عرض أدلة الإجراءات', sensitive: false },
    { permissionCode: 'playbooks.template.manage', resourceType: 'template', actionType: 'manage', descriptionEn: 'Manage playbook templates', descriptionAr: 'إدارة قوالب أدلة الإجراءات', sensitive: true },
    { permissionCode: 'playbooks.execute', resourceType: 'execution', actionType: 'execute', descriptionEn: 'Execute playbooks', descriptionAr: 'تنفيذ أدلة الإجراءات', sensitive: true }
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'playbooks.viewer', archetype: 'viewer', nameEn: 'Playbook Viewer', nameAr: 'عارض الأدلة', isDefault: true, isSystem: true, isGlobal: false, permissions: ['playbooks.read'] },
    { roleCode: 'playbooks.operator', archetype: 'contributor', nameEn: 'Playbook Operator', nameAr: 'مشغّل الأدلة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['playbooks.read', 'playbooks.execute'] },
    { roleCode: 'playbooks.admin', archetype: 'module_lead', nameEn: 'Playbook Admin', nameAr: 'مسؤول الأدلة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['playbooks.read', 'playbooks.template.manage', 'playbooks.execute'] }
  ] as ModuleRole[],
  securityActions: [
    { actionCode: 'playbooks.execute', labelEn: 'Execute Playbook', labelAr: 'تنفيذ الدليل', requiredPermissions: ['playbooks.execute'], dangerLevel: 'moderate', auditable: true, requiresWorkflow: true }
  ] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: []
};
registerModule(PLAYBOOKS_MANIFEST);
