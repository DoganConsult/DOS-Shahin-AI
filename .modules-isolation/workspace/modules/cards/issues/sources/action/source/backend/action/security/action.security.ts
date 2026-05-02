/**
 * Action Module — Security Registration
 * Canonical permissions, roles, and actions for the action module.
 * @owner Module:action
 */

import type { ModulePermission, ModuleRole, ModuleAction } from '@dos/types';

// ── Permissions (15) ────────────────────────────────────────────

export const ACTION_PERMISSIONS: ModulePermission[] = [
  { permissionCode: 'action.item.read', resourceType: 'item', actionType: 'read', descriptionEn: 'Read action items', descriptionAr: 'قراءة عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.write', resourceType: 'item', actionType: 'write', descriptionEn: 'Create action items', descriptionAr: 'إنشاء عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.update', resourceType: 'item', actionType: 'update', descriptionEn: 'Update action items', descriptionAr: 'تحديث عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.delete', resourceType: 'item', actionType: 'delete', descriptionEn: 'Delete action items', descriptionAr: 'حذف عناصر الإجراءات', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.verify', resourceType: 'item', actionType: 'verify', descriptionEn: 'Verify completed action items', descriptionAr: 'التحقق من عناصر الإجراءات المكتملة', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.close', resourceType: 'item', actionType: 'close', descriptionEn: 'Close verified action items', descriptionAr: 'إغلاق عناصر الإجراءات المتحققة', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.cancel', resourceType: 'item', actionType: 'cancel', descriptionEn: 'Cancel action items', descriptionAr: 'إلغاء عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.reopen', resourceType: 'item', actionType: 'reopen', descriptionEn: 'Reopen cancelled or completed action items', descriptionAr: 'إعادة فتح عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.escalate', resourceType: 'item', actionType: 'escalate', descriptionEn: 'Escalate overdue action items', descriptionAr: 'تصعيد عناصر الإجراءات المتأخرة', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.assign', resourceType: 'item', actionType: 'assign', descriptionEn: 'Assign action items', descriptionAr: 'تعيين عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.reassign', resourceType: 'item', actionType: 'reassign', descriptionEn: 'Reassign action items', descriptionAr: 'إعادة تعيين عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.bulk', resourceType: 'item', actionType: 'bulk', descriptionEn: 'Perform bulk operations on action items', descriptionAr: 'عمليات جماعية على عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.export', resourceType: 'item', actionType: 'export', descriptionEn: 'Export action items', descriptionAr: 'تصدير عناصر الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'action.item.configure', resourceType: 'item', actionType: 'configure', descriptionEn: 'Configure action module settings', descriptionAr: 'تكوين إعدادات وحدة الإجراءات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'admin.system.manage', resourceType: 'system', actionType: 'manage', descriptionEn: 'Full system administration', descriptionAr: 'إدارة النظام الكاملة', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
];

// ── All permission codes (convenience) ──────────────────────────

const ALL_CODES = ACTION_PERMISSIONS.map(p => p.permissionCode);

// ── Roles (8) ───────────────────────────────────────────────────

export const ACTION_ROLES: ModuleRole[] = [
  {
    roleCode: 'action.executive_owner', archetype: 'executive_owner',
    nameEn: 'Action Executive Owner', nameAr: 'المالك التنفيذي للإجراءات',
    descriptionEn: 'Full control over all action module operations', descriptionAr: 'تحكم كامل في جميع عمليات وحدة الإجراءات',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ALL_CODES,
    authorityLevel: 'required', defaultScope: 'org',
  },
  {
    roleCode: 'action.module_lead', archetype: 'module_lead',
    nameEn: 'Action Module Lead', nameAr: 'قائد وحدة الإجراءات',
    descriptionEn: 'Manages action items and team operations', descriptionAr: 'يدير عناصر الإجراءات وعمليات الفريق',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ALL_CODES.filter(c => c !== 'action.item.configure' && c !== 'admin.system.manage'),
    authorityLevel: 'required', defaultScope: 'department',
  },
  {
    roleCode: 'action.approver', archetype: 'approver',
    nameEn: 'Action Approver', nameAr: 'معتمد الإجراءات',
    descriptionEn: 'Verifies and closes action items', descriptionAr: 'يتحقق ويغلق عناصر الإجراءات',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ['action.item.read', 'action.item.verify', 'action.item.close', 'action.item.reopen', 'action.item.export'],
    authorityLevel: 'required', defaultScope: 'own',
  },
  {
    roleCode: 'action.operator', archetype: 'operator',
    nameEn: 'Action Operator', nameAr: 'مشغّل الإجراءات',
    descriptionEn: 'Executes and manages day-to-day action items', descriptionAr: 'ينفذ ويدير عناصر الإجراءات اليومية',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ['action.item.read', 'action.item.write', 'action.item.update', 'action.item.cancel', 'action.item.assign', 'action.item.reassign', 'action.item.bulk', 'action.item.export'],
    authorityLevel: 'recommended', defaultScope: 'own',
  },
  {
    roleCode: 'action.contributor', archetype: 'contributor',
    nameEn: 'Action Contributor', nameAr: 'مساهم الإجراءات',
    descriptionEn: 'Creates and updates action items', descriptionAr: 'ينشئ ويحدث عناصر الإجراءات',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ['action.item.read', 'action.item.write', 'action.item.update', 'action.item.cancel'],
    authorityLevel: 'optional', defaultScope: 'own',
  },
  {
    roleCode: 'action.reviewer', archetype: 'reviewer',
    nameEn: 'Action Reviewer', nameAr: 'مراجع الإجراءات',
    descriptionEn: 'Reviews and verifies action items', descriptionAr: 'يراجع ويتحقق من عناصر الإجراءات',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ['action.item.read', 'action.item.verify', 'action.item.export'],
    authorityLevel: 'optional', defaultScope: 'own',
  },
  {
    roleCode: 'action.auditor', archetype: 'auditor',
    nameEn: 'Action Auditor', nameAr: 'مدقق الإجراءات',
    descriptionEn: 'Read-only access with export for audit', descriptionAr: 'وصول للقراءة فقط مع التصدير للتدقيق',
    isDefault: false, isSystem: false, isGlobal: false,
    permissions: ['action.item.read', 'action.item.export'],
    authorityLevel: 'optional', defaultScope: 'own',
  },
  {
    roleCode: 'action.viewer', archetype: 'viewer',
    nameEn: 'Action Viewer', nameAr: 'مشاهد الإجراءات',
    descriptionEn: 'Read-only access to action items', descriptionAr: 'وصول للقراءة فقط لعناصر الإجراءات',
    isDefault: true, isSystem: false, isGlobal: false,
    permissions: ['action.item.read'],
    authorityLevel: 'optional', defaultScope: 'own',
  },
];

// ── Actions (15) ────────────────────────────────────────────────

export const ACTION_ACTIONS: ModuleAction[] = [
  {
    actionCode: 'action.item.read', labelEn: 'Read action items', labelAr: 'قراءة عناصر الإجراءات',
    requiredPermissions: ['action.item.read'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'advisory',
    dangerLevel: 'safe', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: false, reversible: true, bulkSafe: true, externalExposure: false,
  },
  {
    actionCode: 'action.item.write', labelEn: 'Create action items', labelAr: 'إنشاء عناصر الإجراءات',
    requiredPermissions: ['action.item.write'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.update', labelEn: 'Update action items', labelAr: 'تحديث عناصر الإجراءات',
    requiredPermissions: ['action.item.update'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: true, externalExposure: false,
  },
  {
    actionCode: 'action.item.delete', labelEn: 'Delete action items', labelAr: 'حذف عناصر الإجراءات',
    requiredPermissions: ['action.item.delete'], requiredAuthorityLevel: 'required',
    sodSensitive: true, aiEnabled: false, aiBlocked: true, aiClassification: 'blocked',
    dangerLevel: 'destructive', requiresWorkflow: false, requiresApproval: true, requiresHumanReview: true,
    auditable: true, reversible: false, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.verify', labelEn: 'Verify action items', labelAr: 'التحقق من عناصر الإجراءات',
    requiredPermissions: ['action.item.verify'], requiredAuthorityLevel: 'required',
    sodSensitive: true, aiEnabled: false, aiBlocked: false, aiClassification: 'blocked',
    dangerLevel: 'moderate', requiresWorkflow: true, requiresApproval: true, requiresHumanReview: true,
    auditable: true, reversible: false, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.close', labelEn: 'Close action items', labelAr: 'إغلاق عناصر الإجراءات',
    requiredPermissions: ['action.item.close'], requiredAuthorityLevel: 'required',
    sodSensitive: true, aiEnabled: false, aiBlocked: false, aiClassification: 'blocked',
    dangerLevel: 'moderate', requiresWorkflow: true, requiresApproval: true, requiresHumanReview: true,
    auditable: true, reversible: false, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.cancel', labelEn: 'Cancel action items', labelAr: 'إلغاء عناصر الإجراءات',
    requiredPermissions: ['action.item.cancel'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: false, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.reopen', labelEn: 'Reopen action items', labelAr: 'إعادة فتح عناصر الإجراءات',
    requiredPermissions: ['action.item.reopen'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: false, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.escalate', labelEn: 'Escalate action items', labelAr: 'تصعيد عناصر الإجراءات',
    requiredPermissions: ['action.item.escalate'], requiredAuthorityLevel: 'required',
    sodSensitive: false, aiEnabled: false, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.assign', labelEn: 'Assign action items', labelAr: 'تعيين عناصر الإجراءات',
    requiredPermissions: ['action.item.assign'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'safe', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.reassign', labelEn: 'Reassign action items', labelAr: 'إعادة تعيين عناصر الإجراءات',
    requiredPermissions: ['action.item.reassign'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'action.item.bulk', labelEn: 'Bulk operations on action items', labelAr: 'عمليات جماعية على عناصر الإجراءات',
    requiredPermissions: ['action.item.bulk'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: false, aiBlocked: false, aiClassification: 'pre_screen',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: false, bulkSafe: true, externalExposure: false,
  },
  {
    actionCode: 'action.item.export', labelEn: 'Export action items', labelAr: 'تصدير عناصر الإجراءات',
    requiredPermissions: ['action.item.export'], requiredAuthorityLevel: 'optional',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'advisory',
    dangerLevel: 'safe', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: true, externalExposure: false,
  },
  {
    actionCode: 'action.item.configure', labelEn: 'Configure action module', labelAr: 'تكوين وحدة الإجراءات',
    requiredPermissions: ['action.item.configure'], requiredAuthorityLevel: 'required',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'autonomous',
    dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: true, bulkSafe: false, externalExposure: false,
  },
  {
    actionCode: 'admin.system.manage', labelEn: 'System administration', labelAr: 'إدارة النظام',
    requiredPermissions: ['admin.system.manage'], requiredAuthorityLevel: 'required',
    sodSensitive: false, aiEnabled: true, aiBlocked: false, aiClassification: 'autonomous',
    dangerLevel: 'destructive', requiresWorkflow: false, requiresApproval: false, requiresHumanReview: false,
    auditable: true, reversible: false, bulkSafe: false, externalExposure: false,
  },
];
