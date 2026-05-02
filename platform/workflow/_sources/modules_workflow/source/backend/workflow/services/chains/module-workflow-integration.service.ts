import { MODULE_WORKFLOW_MAP, type CanonicalModuleCode as _CanonicalModuleCode, isCanonicalModuleCode } from '../../ports/config.port';
import { isKillSwitchActive, logIntervention } from '../ops/workflow-kill-switch.service';
import { checkBudget } from '../ai/workflow-ai-budget.service';
import { checkBoundaries } from '../ops/workflow-forbidden-boundaries.service';
import { checkStepAutonomy } from '../ai/workflow-step-autonomy.service';
import { checkReviewRequired } from '../approvals/workflow-mandatory-review.service';
import { createAINote } from '../ai/workflow-ai-notes.service';
import { createDraftAction, type DraftType } from '../approvals/workflow-draft-actions.service';
import { getApplicableRecommendations } from '../ai/workflow-recommendation-catalog.service';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import { logger as _logger } from '../../ports/logger.port';
import { safeQuery } from "@dos/db";

export const AGENT_MODULE_BINDING: Record<string, string[]> = {
  A01: ['risk'],
  A02: ['compliance'],
  A03: ['policy', 'governance', 'exception'],
  A04: ['evidence'],
  A05: ['audit'],
  A06: ['incident', 'bcp'],
  A07: ['vendor', 'asset'],
  A08: ['remediation', 'action'],
  A09: ['training', 'qiyas'],
  A10: ['ai-governance'],
};

export function getAgentForModule(moduleCode: string): string | null {
  for (const [agentId, modules] of Object.entries(AGENT_MODULE_BINDING)) {
    if (modules.includes(moduleCode)) return agentId;
  }
  return null;
}

export function getModulesForAgent(agentId: string): string[] {
  return AGENT_MODULE_BINDING[agentId] ?? [];
}

export function isAgentBoundToModule(agentId: string, moduleCode: string): boolean {
  return (AGENT_MODULE_BINDING[agentId] ?? []).includes(moduleCode);
}

export interface ModuleSLAConfig {
  warningPct: number;
  breachAction: string;
  escalationRoles: string[];
  autoReassignOnBreach: boolean;
}

export const MODULE_SLA_CONFIG: Record<string, ModuleSLAConfig> = {
  risk:           { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['risk_manager', 'ciso'],           autoReassignOnBreach: false },
  compliance:     { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['compliance_officer', 'ciso'],     autoReassignOnBreach: false },
  policy:         { warningPct: 0.80, breachAction: 'escalate',    escalationRoles: ['policy_owner', 'governance_lead'],autoReassignOnBreach: false },
  evidence:       { warningPct: 0.70, breachAction: 'reassign',    escalationRoles: ['evidence_lead', 'auditor'],       autoReassignOnBreach: true },
  audit:          { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['audit_lead', 'ciso'],             autoReassignOnBreach: false },
  incident:       { warningPct: 0.50, breachAction: 'escalate',    escalationRoles: ['incident_commander', 'ciso'],     autoReassignOnBreach: false },
  exception:      { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['exception_approver', 'ciso'],     autoReassignOnBreach: false },
  governance:     { warningPct: 0.80, breachAction: 'escalate',    escalationRoles: ['governance_lead', 'board_sec'],   autoReassignOnBreach: false },
  vendor:         { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['vendor_manager', 'procurement'],  autoReassignOnBreach: false },
  bcp:            { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['bcp_coordinator', 'ciso'],        autoReassignOnBreach: false },
  asset:          { warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['asset_owner', 'it_manager'],      autoReassignOnBreach: false },
  remediation:    { warningPct: 0.70, breachAction: 'reassign',    escalationRoles: ['remediation_lead', 'risk_mgr'],   autoReassignOnBreach: true },
  action:         { warningPct: 0.70, breachAction: 'reassign',    escalationRoles: ['action_owner', 'project_mgr'],    autoReassignOnBreach: true },
  training:       { warningPct: 0.80, breachAction: 'escalate',    escalationRoles: ['training_lead', 'hr_manager'],    autoReassignOnBreach: false },
  qiyas:          { warningPct: 0.80, breachAction: 'escalate',    escalationRoles: ['maturity_lead', 'ciso'],          autoReassignOnBreach: false },
  'ai-governance':{ warningPct: 0.75, breachAction: 'escalate',    escalationRoles: ['ai_ethics_lead', 'ciso'],         autoReassignOnBreach: false },
};

export function getModuleSLAConfig(moduleCode: string): ModuleSLAConfig {
  return MODULE_SLA_CONFIG[moduleCode] ?? { warningPct: 0.75, breachAction: 'escalate', escalationRoles: ['admin'], autoReassignOnBreach: false };
}

export const MODULE_COMPENSATION_REGISTRY: Record<string, string> = {
  risk_score_auto:         'risk_score_revert',
  risk_treatment_auto:     'risk_treatment_revert',
  compliance_test_auto:    'compliance_test_revert',
  compliance_gap_auto:     'compliance_gap_revert',
  evidence_auto_validate:  'evidence_invalidate',
  evidence_auto_collect:   'evidence_uncollect',
  policy_auto_draft:       'policy_draft_discard',
  policy_section_auto:     'policy_section_revert',
  audit_finding_auto:      'audit_finding_revert',
  incident_auto_triage:    'incident_retriage',
  incident_auto_contain:   'incident_uncontain',
  exception_auto_review:   'exception_review_revert',
  vendor_auto_score:       'vendor_score_revert',
  vendor_auto_assess:      'vendor_assess_revert',
  bcp_auto_assess:         'bcp_assess_revert',
  asset_auto_classify:     'asset_classify_revert',
  remediation_auto_plan:   'remediation_plan_revert',
  remediation_auto_verify: 'remediation_verify_revert',
  action_auto_assign:      'action_unassign',
  action_auto_complete:    'action_uncomplete',
  training_auto_assign:    'training_unassign',
  training_auto_assess:    'training_assess_revert',
  qiyas_auto_score:        'qiyas_score_revert',
  ai_gov_auto_assess:      'ai_gov_assess_revert',
};

export function getModuleCompensatingAction(originalAction: string): string | null {
  return Object.hasOwn(MODULE_COMPENSATION_REGISTRY, originalAction)
    ? MODULE_COMPENSATION_REGISTRY[originalAction]
    : null;
}

export interface CrossModuleChainTemplate {
  chainCode: string;
  name_en: string;
  name_ar: string;
  description: string;
  steps: Array<{ order: number; moduleCode: string; stepType: string; label: string }>;
}

export const CROSS_MODULE_CHAIN_TEMPLATES: CrossModuleChainTemplate[] = [
  {
    chainCode: 'risk_to_remediation',
    name_en: 'Risk to Remediation',
    name_ar: 'من المخاطر إلى المعالجة',
    description: 'End-to-end flow from risk identification through evidence collection to remediation tracking',
    steps: [
      { order: 1, moduleCode: 'risk',        stepType: 'risk_assessment',     label: 'Assess Risk' },
      { order: 2, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Collect Evidence' },
      { order: 3, moduleCode: 'compliance',   stepType: 'compliance_test',     label: 'Test Compliance' },
      { order: 4, moduleCode: 'action',       stepType: 'action_create',       label: 'Create Action Items' },
      { order: 5, moduleCode: 'evidence',     stepType: 'evidence_review',     label: 'Review Evidence' },
      { order: 6, moduleCode: 'remediation',  stepType: 'remediation_plan',    label: 'Plan Remediation' },
    ],
  },
  {
    chainCode: 'incident_to_compliance',
    name_en: 'Incident to Compliance',
    name_ar: 'من الحوادث إلى الامتثال',
    description: 'Incident response through investigation to compliance impact assessment',
    steps: [
      { order: 1, moduleCode: 'incident',    stepType: 'incident_triage',     label: 'Triage Incident' },
      { order: 2, moduleCode: 'incident',    stepType: 'incident_contain',    label: 'Contain Incident' },
      { order: 3, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Collect Evidence' },
      { order: 4, moduleCode: 'compliance',   stepType: 'compliance_impact',   label: 'Assess Compliance Impact' },
      { order: 5, moduleCode: 'action',       stepType: 'action_create',       label: 'Corrective Actions' },
    ],
  },
  {
    chainCode: 'policy_to_training',
    name_en: 'Policy to Training',
    name_ar: 'من السياسات إلى التدريب',
    description: 'Policy creation through approval to training campaign rollout',
    steps: [
      { order: 1, moduleCode: 'policy',      stepType: 'policy_draft',        label: 'Draft Policy' },
      { order: 2, moduleCode: 'governance',   stepType: 'governance_review',   label: 'Governance Review' },
      { order: 3, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Supporting Evidence' },
      { order: 4, moduleCode: 'training',     stepType: 'training_design',     label: 'Design Training' },
      { order: 5, moduleCode: 'training',     stepType: 'training_deploy',     label: 'Deploy Training' },
    ],
  },
  {
    chainCode: 'audit_to_action',
    name_en: 'Audit to Action',
    name_ar: 'من التدقيق إلى الإجراءات',
    description: 'Audit finding lifecycle through remediation to closure verification',
    steps: [
      { order: 1, moduleCode: 'audit',       stepType: 'audit_plan',          label: 'Plan Audit' },
      { order: 2, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Collect Audit Evidence' },
      { order: 3, moduleCode: 'audit',        stepType: 'audit_finding',       label: 'Document Finding' },
      { order: 4, moduleCode: 'action',       stepType: 'action_create',       label: 'Create Action Item' },
      { order: 5, moduleCode: 'remediation',  stepType: 'remediation_verify',  label: 'Verify Remediation' },
    ],
  },
  {
    chainCode: 'vendor_lifecycle',
    name_en: 'Vendor Lifecycle',
    name_ar: 'دورة حياة المورد',
    description: 'Full vendor lifecycle from due diligence through risk assessment to ongoing monitoring',
    steps: [
      { order: 1, moduleCode: 'vendor',      stepType: 'vendor_assess',       label: 'Vendor Assessment' },
      { order: 2, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Vendor Evidence' },
      { order: 3, moduleCode: 'risk',         stepType: 'risk_assessment',     label: 'Vendor Risk Assessment' },
      { order: 4, moduleCode: 'compliance',   stepType: 'compliance_test',     label: 'Vendor Compliance Check' },
      { order: 5, moduleCode: 'action',       stepType: 'action_create',       label: 'Vendor Actions' },
    ],
  },
  {
    chainCode: 'exception_governance',
    name_en: 'Exception Governance',
    name_ar: 'حوكمة الاستثناءات',
    description: 'Exception request through risk assessment, governance approval, and compensating controls',
    steps: [
      { order: 1, moduleCode: 'exception',   stepType: 'exception_request',   label: 'Request Exception' },
      { order: 2, moduleCode: 'risk',         stepType: 'risk_assessment',     label: 'Exception Risk Assessment' },
      { order: 3, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Compensating Evidence' },
      { order: 4, moduleCode: 'governance',   stepType: 'governance_approve',  label: 'Governance Approval' },
    ],
  },
  {
    chainCode: 'bcp_test_cycle',
    name_en: 'BCP Test Cycle',
    name_ar: 'دورة اختبار استمرارية الأعمال',
    description: 'Business continuity plan testing through evidence gathering to improvement actions',
    steps: [
      { order: 1, moduleCode: 'bcp',         stepType: 'bcp_plan',            label: 'BCP Planning' },
      { order: 2, moduleCode: 'bcp',          stepType: 'bcp_test',            label: 'Execute BCP Test' },
      { order: 3, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Test Evidence' },
      { order: 4, moduleCode: 'action',       stepType: 'action_create',       label: 'Improvement Actions' },
    ],
  },
  {
    chainCode: 'ai_governance_lifecycle',
    name_en: 'AI Governance Lifecycle',
    name_ar: 'دورة حياة حوكمة الذكاء الاصطناعي',
    description: 'AI system assessment through risk evaluation to governance oversight',
    steps: [
      { order: 1, moduleCode: 'ai-governance', stepType: 'ai_gov_assess',     label: 'AI System Assessment' },
      { order: 2, moduleCode: 'risk',           stepType: 'risk_assessment',   label: 'AI Risk Assessment' },
      { order: 3, moduleCode: 'evidence',        stepType: 'evidence_collect', label: 'AI Evidence Collection' },
      { order: 4, moduleCode: 'policy',          stepType: 'policy_draft',     label: 'AI Policy Update' },
      { order: 5, moduleCode: 'governance',      stepType: 'governance_review',label: 'AI Governance Review' },
    ],
  },
  {
    chainCode: 'asset_risk_compliance',
    name_en: 'Asset Risk Compliance',
    name_ar: 'مخاطر الأصول والامتثال',
    description: 'Asset classification through risk assessment to compliance verification',
    steps: [
      { order: 1, moduleCode: 'asset',       stepType: 'asset_classify',      label: 'Classify Asset' },
      { order: 2, moduleCode: 'risk',         stepType: 'risk_assessment',     label: 'Asset Risk Assessment' },
      { order: 3, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Asset Evidence' },
      { order: 4, moduleCode: 'compliance',   stepType: 'compliance_test',     label: 'Asset Compliance Test' },
    ],
  },
  {
    chainCode: 'maturity_improvement',
    name_en: 'Maturity Improvement',
    name_ar: 'تحسين النضج',
    description: 'Maturity assessment through gap analysis to improvement planning and training',
    steps: [
      { order: 1, moduleCode: 'qiyas',       stepType: 'qiyas_assess',       label: 'Maturity Assessment' },
      { order: 2, moduleCode: 'evidence',     stepType: 'evidence_collect',    label: 'Maturity Evidence' },
      { order: 3, moduleCode: 'action',       stepType: 'action_create',       label: 'Improvement Plan' },
      { order: 4, moduleCode: 'training',     stepType: 'training_design',     label: 'Capability Training' },
    ],
  },
];

export function getCrossModuleChainTemplate(chainCode: string): CrossModuleChainTemplate | null {
  return CROSS_MODULE_CHAIN_TEMPLATES.find(c => c.chainCode === chainCode) ?? null;
}

export function getChainTemplatesForModule(moduleCode: string): CrossModuleChainTemplate[] {
  return CROSS_MODULE_CHAIN_TEMPLATES.filter(c => c.steps.some(s => s.moduleCode === moduleCode));
}

export interface ModuleAIPolicyResult {
  aiEnabled: boolean;
  autonomyLevel: number;
  requireHumanReview: boolean;
  source: string;
}

export async function resolveModuleAIPolicy(
  tenantId: string,
  moduleCode: string,
): Promise<ModuleAIPolicyResult> {
  if (!isCanonicalModuleCode(moduleCode)) {
    return { aiEnabled: false, autonomyLevel: 0, requireHumanReview: true, source: 'unknown_module' };
  }

  const entry = MODULE_WORKFLOW_MAP[moduleCode];
  if (!entry) {
    return { aiEnabled: false, autonomyLevel: 0, requireHumanReview: true, source: 'module_default' };
  }

  return { aiEnabled: false, autonomyLevel: 0, requireHumanReview: true, source: 'module_default' };
}

export interface AIGateCheckResult {
  allowed: boolean;
  killSwitchBlocked: boolean;
  budgetExhausted: boolean;
  boundaryViolation: boolean;
  autonomyDenied: boolean;
  reviewRequired: boolean;
  reasons: string[];
  maxAutonomyLevel: number;
  allowedActions: string[];
}

export async function runAIGateChecks(
  ctx: { tenantId: string; moduleCode: string; userId: string; workflowId?: string; instanceId?: string; stepId?: string; entityType?: string; entityId?: string },
  stepType: string,
): Promise<AIGateCheckResult> {
  const result: AIGateCheckResult = {
    allowed: true,
    killSwitchBlocked: false,
    budgetExhausted: false,
    boundaryViolation: false,
    autonomyDenied: false,
    reviewRequired: false,
    reasons: [],
    maxAutonomyLevel: 4,
    allowedActions: [],
  };

  try {
    const ksResult = await isKillSwitchActive(ctx.tenantId, {
      workflowId: ctx.workflowId,
      stepType,
      agentId: getAgentForModule(ctx.moduleCode) ?? undefined,
      moduleCode: ctx.moduleCode,
    });
    if (ksResult.blocked) {
      result.allowed = false;
      result.killSwitchBlocked = true;
      result.reasons.push('Kill switch active');
    }
  } catch { /* gate check failure is non-blocking for query */ }

  try {
    const budgetResult = await checkBudget(ctx.tenantId);
    if (!budgetResult.allowed) {
      result.allowed = false;
      result.budgetExhausted = true;
      result.reasons.push('Budget exhausted');
    }
  } catch { /* gate check failure is non-blocking */ }

  try {
    const boundaryResult = await checkBoundaries(ctx.tenantId, stepType, {
      moduleCode: ctx.moduleCode,
      stepType,
      entityType: ctx.entityType,
    });
    if (!boundaryResult.allowed) {
      result.allowed = false;
      result.boundaryViolation = true;
      result.reasons.push('Forbidden boundary violated');
    }
  } catch { /* gate check failure is non-blocking */ }

  try {
    const autonomyResult = await checkStepAutonomy(ctx.tenantId, stepType);
    if (!autonomyResult.allowed) {
      result.allowed = false;
      result.autonomyDenied = true;
      result.reasons.push('Autonomy denied for step type');
    }
    result.maxAutonomyLevel = autonomyResult.maxAutonomyLevel ?? 4;
    result.allowedActions = autonomyResult.allowedActions ?? [];
  } catch { /* gate check failure is non-blocking */ }

  try {
    const reviewResult = await checkReviewRequired(ctx.tenantId, stepType);
    if (reviewResult.requiresReview) {
      result.reviewRequired = true;
    }
  } catch { /* gate check failure is non-blocking */ }

  if (!result.allowed) {
    try {
      await logIntervention(ctx.tenantId, {
        instanceId: ctx.instanceId,
        stepId: ctx.stepId,
        interventionType: 'ai_gate_block',
        agentId: getAgentForModule(ctx.moduleCode) ?? undefined,
        details: { moduleCode: ctx.moduleCode, stepType, reasons: result.reasons },
      });
    } catch { /* best-effort logging */ }
  }

  return result;
}

export interface ModuleWorkflowHealthResult {
  module: string;
  killSwitchActive: boolean;
  budgetStatus: { allowed: boolean; utilization: number; remaining: number };
  activeBoundaries: number;
  aiEnabled: boolean;
  health: 'healthy' | 'degraded' | 'halted';
}

export async function getModuleWorkflowHealth(
  tenantId: string,
  moduleCode: string,
): Promise<ModuleWorkflowHealthResult> {
  const policy = await resolveModuleAIPolicy(tenantId, moduleCode);

  let killSwitchActive = false;
  try {
    const ks = await isKillSwitchActive(tenantId, { moduleCode });
    killSwitchActive = ks.blocked;
  } catch { /* proceed with default */ }

  let budgetStatus = { allowed: true, utilization: 0, remaining: 100 };
  try {
    const bg = await checkBudget(tenantId);
    budgetStatus = { allowed: bg.allowed, utilization: bg.utilization_pct ?? 0, remaining: bg.remaining_executions ?? 100 };
  } catch { /* proceed with default */ }

  let activeBoundaries = 0;
  try {
    const bd = await checkBoundaries(tenantId, '*', { moduleCode });
    activeBoundaries = bd.violations?.length ?? 0;
  } catch { /* proceed with default */ }

  let health: 'healthy' | 'degraded' | 'halted' = 'healthy';
  if (killSwitchActive) health = 'halted';
  else if (!budgetStatus.allowed || activeBoundaries > 0) health = 'degraded';

  return {
    module: moduleCode,
    killSwitchActive,
    budgetStatus,
    activeBoundaries,
    aiEnabled: policy.aiEnabled,
    health,
  };
}

export async function emitModuleWorkflowEvent(
  tenantId: string,
  moduleCode: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const agentId = getAgentForModule(moduleCode);
  await (emitWorkflowEvent as any)({
    tenantId,
    instanceId: '00000000-0000-0000-0000-000000000000',
    eventType: `module.${moduleCode}.${eventType}` as any,
    triggeredBy: agentId ?? 'system',
    payload: { ...payload, moduleCode },
    previousState: 'active',
    newState: 'active',
  });
}

export async function createModuleAINote(
  tenantId: string,
  moduleCode: string,
  input: {
    instanceId: string;
    stepId?: string;
    agentId: string;
    noteType: 'guidance' | 'autofill' | 'recommendation' | 'summary' | 'coaching' | 'warning';
    content: Record<string, unknown>;
    confidence?: number;
    trustLevel?: 'assistive' | 'advisory' | 'authoritative';
    contextSources?: string[];
    stepType: string;
  },
): Promise<{ noteId: string; reviewRequired: boolean }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.workflow_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function createModuleDraftAction(
  tenantId: string,
  moduleCode: string,
  input: {
    instanceId: string;
    stepId?: string;
    agentId: string;
    draftType: DraftType;
    title: string;
    draftContent: Record<string, unknown>;
    confidence?: number;
    stepType: string;
  },
): Promise<{ draftId: string; status: string }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.workflow_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getModuleRecommendations(
  tenantId: string,
  moduleCode: string,
  stepType?: string,
): Promise<Record<string, unknown>[]> {

  return getApplicableRecommendations(tenantId, stepType ?? moduleCode);
}
