/**
 * quality-gate — Module Security Registration
 * Permissions, roles, and actions for the Quality Gate module.
 * DAuth module-security-seeder ingests these at startup (Law 3).
 */

import type { ModulePermission, ModuleRole, ModuleAction } from '@dos/types';

export const QGATE_PERMISSIONS: ModulePermission[] = [
  { permissionCode: 'quality-gate.run.read', resourceType: 'run', actionType: 'read', descriptionEn: 'View quality gate runs', descriptionAr: 'عرض عمليات بوابة الجودة', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'quality-gate.run.execute', resourceType: 'run', actionType: 'execute', descriptionEn: 'Trigger quality gate evaluation', descriptionAr: 'تشغيل تقييم بوابة الجودة', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'quality-gate.run.override', resourceType: 'run', actionType: 'approve', descriptionEn: 'Override failing quality gates', descriptionAr: 'تجاوز بوابات الجودة الفاشلة', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'quality-gate.threshold.read', resourceType: 'threshold', actionType: 'read', descriptionEn: 'View quality gate thresholds', descriptionAr: 'عرض حدود بوابة الجودة', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'quality-gate.threshold.write', resourceType: 'threshold', actionType: 'write', descriptionEn: 'Configure quality gate thresholds', descriptionAr: 'تكوين حدود بوابة الجودة', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'quality-gate.drift.read', resourceType: 'drift', actionType: 'read', descriptionEn: 'View schema drift reports', descriptionAr: 'عرض تقارير انحراف المخطط', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
  { permissionCode: 'quality-gate.ai-eval.read', resourceType: 'ai_eval', actionType: 'read', descriptionEn: 'View AI guardrail evaluations', descriptionAr: 'عرض تقييمات حواجز الذكاء الاصطناعي', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
];

export const QGATE_ROLES: ModuleRole[] = [
  { roleCode: 'quality-gate.executive_owner', archetype: 'executive_owner', nameEn: 'Quality Gate Owner', nameAr: 'مالك بوابة الجودة', descriptionEn: 'Full access to quality gate management and overrides', descriptionAr: 'وصول كامل لإدارة بوابة الجودة والتجاوزات', isDefault: false, isSystem: true, isGlobal: false, permissions: ['quality-gate.run.read', 'quality-gate.run.execute', 'quality-gate.run.override', 'quality-gate.threshold.read', 'quality-gate.threshold.write', 'quality-gate.drift.read', 'quality-gate.ai-eval.read'], authorityLevel: 'required', defaultScope: 'org' },
  { roleCode: 'quality-gate.operator', archetype: 'operator', nameEn: 'Quality Gate Operator', nameAr: 'مشغل بوابة الجودة', descriptionEn: 'Execute and monitor quality gate evaluations', descriptionAr: 'تنفيذ ومراقبة تقييمات بوابة الجودة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['quality-gate.run.read', 'quality-gate.run.execute', 'quality-gate.threshold.read', 'quality-gate.drift.read', 'quality-gate.ai-eval.read'], authorityLevel: 'required', defaultScope: 'org' },
  { roleCode: 'quality-gate.reviewer', archetype: 'reviewer', nameEn: 'Quality Gate Reviewer', nameAr: 'مراجع بوابة الجودة', descriptionEn: 'View quality gate results and reports', descriptionAr: 'عرض نتائج وتقارير بوابة الجودة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['quality-gate.run.read', 'quality-gate.threshold.read', 'quality-gate.drift.read', 'quality-gate.ai-eval.read'], authorityLevel: 'optional', defaultScope: 'own' },
  { roleCode: 'quality-gate.viewer', archetype: 'viewer', nameEn: 'Quality Gate Viewer', nameAr: 'مشاهد بوابة الجودة', descriptionEn: 'Read-only access to quality gate data', descriptionAr: 'وصول للقراءة فقط لبيانات بوابة الجودة', isDefault: true, isSystem: false, isGlobal: false, permissions: ['quality-gate.run.read', 'quality-gate.drift.read'], authorityLevel: 'optional', defaultScope: 'own' },
];

export const QGATE_ACTIONS: ModuleAction[] = [
  { actionCode: 'quality-gate.run.read', labelEn: 'View quality gate runs', labelAr: 'عرض عمليات بوابة الجودة', requiredPermissions: ['quality-gate.run.read'], requiredAuthorityLevel: 'optional', sodSensitive: false, aiEnabled: false, aiBlocked: false, dangerLevel: 'safe', requiresWorkflow: false, requiresApproval: false, auditable: false, reversible: true, bulkSafe: true, externalExposure: false },
  { actionCode: 'quality-gate.run.execute', labelEn: 'Execute quality gate evaluation', labelAr: 'تنفيذ تقييم بوابة الجودة', requiredPermissions: ['quality-gate.run.execute'], requiredAuthorityLevel: 'required', sodSensitive: false, aiEnabled: true, aiBlocked: false, dangerLevel: 'safe', requiresWorkflow: false, requiresApproval: false, auditable: true, reversible: false, bulkSafe: false, externalExposure: false },
  { actionCode: 'quality-gate.run.override', labelEn: 'Override failing quality gate', labelAr: 'تجاوز بوابة الجودة الفاشلة', requiredPermissions: ['quality-gate.run.override'], requiredAuthorityLevel: 'required', sodSensitive: true, aiEnabled: false, aiBlocked: true, dangerLevel: 'destructive', requiresWorkflow: true, requiresApproval: true, auditable: true, reversible: false, bulkSafe: false, externalExposure: false },
  { actionCode: 'quality-gate.threshold.write', labelEn: 'Update quality gate thresholds', labelAr: 'تحديث حدود بوابة الجودة', requiredPermissions: ['quality-gate.threshold.write'], requiredAuthorityLevel: 'required', sodSensitive: false, aiEnabled: false, aiBlocked: false, dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, auditable: true, reversible: true, bulkSafe: false, externalExposure: false },
];
