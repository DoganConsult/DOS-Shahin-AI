/**
 * quality-gate — Module Manifest
 * Automated quality gate evaluation: DevSecOps, AI guardrails, schema drift, VRT, mutation testing.
 * Wired into the platform admin dashboard workspace with per-tenant gate evaluation.
 */

import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { QGATE_PERMISSIONS, QGATE_ROLES, QGATE_ACTIONS } from './security/quality-gate.security';
import { QGATE_APPROVAL_MATRIX } from './security/quality-gate.approval-matrix';
import { QGATE_PUBLISHED_EVENTS, QGATE_CONSUMED_EVENTS } from './events/quality-gate.events';

export const QUALITY_GATE_MANIFEST: ModuleManifest = {
  code: 'quality-gate',
  version: '1.0.0',
  aliases: ['qgate'],
  nameEn: 'Quality Gates',
  nameAr: 'بوابات الجودة',
  descriptionEn: 'Automated 7-stage quality gate evaluation: DevSecOps, unit coverage, schema drift, AI guardrails, E2E/VRT, performance, mutation testing. Per-tenant evaluation with platform admin dashboard.',
  descriptionAr: 'تقييم بوابات الجودة الآلية ذات السبع مراحل: DevSecOps، تغطية الوحدات، انحراف المخطط، حواجز الذكاء الاصطناعي، الاختبار الشامل/المرئي، الأداء، اختبار الطفرات. تقييم لكل مستأجر مع لوحة إدارة المنصة.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/quality-gate',
  eventNamespace: 'quality-gate',
  tablePrefix: 'qgate_',

  ownedTables: [
    'qgate_runs',
    'qgate_stage_results',
    'qgate_ai_eval_scores',
    'qgate_schema_drift_log',
    'qgate_vrt_snapshots',
    'qgate_mutation_reports',
    'qgate_thresholds',
  ],
  sharedTables: [],
  referencedTables: [
    'dos_quality_gates',
    'gate_definitions',
    'gate_validation_rules',
    'enforcement_gate_log',
    'audit_trail',
  ],
  aggregateRoots: ['qgate_runs'],

  publishedEvents: QGATE_PUBLISHED_EVENTS,
  consumedEvents: QGATE_CONSUMED_EVENTS,

  hardDeps: ['admin' as any],
  softDeps: ['governance' as any, 'compliance' as any],

  navId: 'quality-gate',
  navChildCount: 4,
  workflowTemplateCode: 'quality_gate_run',
  workflowSlaHours: 2,
  automationLevel: 'full',
  agentBinding: null,
  aiCapabilities: ['recommendations', 'classification', 'anomaly_detection'],
  aiEnabled: true,

  featureFlags: [
    'qgate.ai_guardrails',
    'qgate.schema_drift',
    'qgate.vrt',
    'qgate.mutation',
    'qgate.devsecops',
  ],
  installable: true,
  provisioningOrder: 45,
  licensingTier: 'enterprise',
  visibility: 'internal',
  adminSurfaces: [
    'quality-gate-dashboard',
    'quality-gate-thresholds',
    'quality-gate-ai-config',
  ],
  healthSignals: [
    'schema_exists',
    'tables_exist',
    'last_gate_pass',
    'ai_guardrails_healthy',
    'schema_drift_clean',
  ],

  securityPermissions: QGATE_PERMISSIONS,
  securityRoles: QGATE_ROLES,
  securityActions: QGATE_ACTIONS,
  approvalRules: QGATE_APPROVAL_MATRIX,
  ownershipRules: [
    {
      entityType: 'qgate_runs',
      ownerField: 'triggered_by',
      reviewerField: null,
      approverField: 'override_by',
      assigneeField: null,
      orgScopeField: null,
      defaultOwnerRole: 'quality-gate.operator',
      canDelegate: false,
      delegateRoles: [],
      canReassign: false,
      reassignRoles: [],
      requiresApproval: false,
      creatorRights: 'full',
      externalVisible: false,
      rowLevelAccess: 'global',
    },
  ],
  sodRules: [
    {
      ruleCode: 'quality-gate.sod.executor_overrider',
      descriptionEn: 'Quality gate executor cannot override the same run they triggered',
      descriptionAr: 'لا يمكن لمنفذ بوابة الجودة تجاوز نفس العملية التي أطلقها',
      conflictingRoles: [],
      conflictingActions: ['quality-gate.run.execute', 'quality-gate.run.override'],
      conflictingTransitions: [],
      severity: 'high',
      enforcement: 'block',
      temporaryWaiverAllowed: false,
      waiverMaxDays: null,
      compensatingControls: ['dual_admin_approval'],
      overrideAuthority: ['admin.executive_owner'],
      auditObligations: ['log_sod_violation', 'notify_security'],
    },
  ],
};

registerModule(QUALITY_GATE_MANIFEST);
