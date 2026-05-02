import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { AGRC_ENGINE_PERMISSIONS, AGRC_ENGINE_ROLES, AGRC_ENGINE_ACTIONS } from './security/agrc-engine.security';
import { AGRC_ENGINE_APPROVAL_MATRIX } from './security/agrc-engine.approval-matrix';

export const AGRC_ENGINE_MANIFEST: ModuleManifest = {
  code: 'agrc-engine',
  version: '1.0.0',
  aliases: [],
  nameEn: 'AGRC Engine',
  nameAr: 'محرك AGRC',
  descriptionEn: 'AGRC orchestration, CCM, telemetry, and automation engine.',
  descriptionAr: '',
  tier: 'platform',
  category: 'platform_infra',
  routeBase: '/api/agrc-engine',
  eventNamespace: 'agrc-engine',
  tablePrefix: 'agrc_engine_',
  ownedTables: ['agrc_engine_runs', 'agrc_engine_results', 'agrc_engine_config'],
  sharedTables: [],
  referencedTables: [],
  aggregateRoots: [],
  publishedEvents: ['agrc_engine.run_started', 'agrc_engine.run_completed', 'agrc_engine.run_failed', 'agrc_engine.config_changed'],
  consumedEvents: [],
  hardDeps: [],
  softDeps: [],
  navId: 'agrc-engine',
  navChildCount: 0,
  workflowTemplateCode: 'agrc_engine_config_review',
  workflowSlaHours: 24,
  automationLevel: 'full',
  agentBinding: 'A-ENGINE',
  aiCapabilities: ['health_monitor', 'anomaly_detection'],
  aiEnabled: true,
  featureFlags: [],
  installable: false,
  provisioningOrder: 50,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: [],

  securityPermissions: AGRC_ENGINE_PERMISSIONS,
  securityRoles: AGRC_ENGINE_ROLES,
  securityActions: AGRC_ENGINE_ACTIONS,
  approvalRules: AGRC_ENGINE_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'agrc_engine_run', ownerField: 'triggered_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'agrc-engine.module_lead', canDelegate: false, delegateRoles: [], canReassign: false, reassignRoles: [], requiresApproval: false, creatorRights: 'read_only', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'agrc_engine_config', ownerField: 'updated_by', reviewerField: 'reviewer_id', approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'agrc-engine.module_lead', canDelegate: true, delegateRoles: ['agrc-engine.operator'], canReassign: true, reassignRoles: ['agrc-engine.module_lead', 'agrc-engine.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'agrc_engine.sod.executor_reviewer', descriptionEn: 'Engine executor cannot review their own run results', descriptionAr: 'لا يمكن لمنفذ المحرك مراجعة نتائج تشغيله', conflictingRoles: [], conflictingActions: ['agrc_engine.run.execute', 'agrc_engine.run.review'], conflictingTransitions: [], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['audit_review'], overrideAuthority: ['agrc-engine.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'agrc_engine.sod.config_changer_activator', descriptionEn: 'Engine config changer cannot activate their own config change', descriptionAr: 'لا يمكن لمغير تكوين المحرك تفعيل تغييره', conflictingRoles: [], conflictingActions: ['agrc_engine.config.update', 'agrc_engine.config.activate'], conflictingTransitions: ['pending->active'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['admin_review'], overrideAuthority: ['agrc-engine.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(AGRC_ENGINE_MANIFEST);
