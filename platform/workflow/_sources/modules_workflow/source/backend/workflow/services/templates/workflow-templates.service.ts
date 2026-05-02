// ============================================
// Shahin-Ai — Workflow Template Service
// 8 predefined workflow templates for GRC processes
// ============================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { MODULE_WORKFLOW_MAP, isPlatformOnly as _isPlatformOnly, isCanonicalModuleCode, CanonicalModuleCode } from '../../ports/config.port';

// === Types ===

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'approval' | 'notification' | 'decision' | 'action' | 'condition' | 'parallel_gateway';
  subType?: string;
  label_en: string;
  label_ar?: string;
  label?: string;
  swimlane?: string;
  slaHours?: number;
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  swimlanes: string[];
  escalationChain: string[];
}

export interface PredefinedTemplate {
  templateKey: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  definition: WorkflowDefinition;
}

// === Pure Functions ===

export function serializeTemplateDefinition(def: WorkflowDefinition): string {
  return JSON.stringify(def);
}

export function deserializeTemplateDefinition(json: string): WorkflowDefinition {
  return JSON.parse(json) as WorkflowDefinition;
}

export function validateTemplateStructure(def: WorkflowDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(def.nodes.map(n => n.id));
  const hasStart = def.nodes.some(n => n.type === 'start');
  const hasEnd = def.nodes.some(n => n.type === 'end');
  if (!hasStart) errors.push('Missing start node');
  if (!hasEnd) errors.push('Missing end node');
  for (const edge of def.edges) {
    if (!nodeIds.has(edge.from)) errors.push(`Edge references any node: ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge references any node: ${edge.to}`);
  }
  return { valid: errors.length === 0, errors };
}

// === Predefined Templates ===

function makeTemplate(key: string, nameEn: string, nameAr: string, descEn: string, swimlanes: string[], nodes: WorkflowNode[], edges: WorkflowEdge[]): PredefinedTemplate {
  return { templateKey: key, name_en: nameEn, name_ar: nameAr, description_en: descEn, definition: { nodes, edges, swimlanes, escalationChain: ['manager', 'admin'] } };
}

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  makeTemplate('policy_lifecycle', 'Policy Lifecycle', 'دورة حياة السياسة', 'End-to-end policy creation, review, approval, and publication',
    ['author', 'reviewer', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'draft', type: 'task', label_en: 'Draft Policy', label_ar: 'مسودة السياسة', swimlane: 'author' },
      { id: 'review', type: 'approval', label_en: 'Review', label_ar: 'مراجعة', swimlane: 'reviewer', slaHours: 72 },
      { id: 'approve', type: 'approval', label_en: 'Approve', label_ar: 'موافقة', swimlane: 'approver', slaHours: 48 },
      { id: 'publish', type: 'task', label_en: 'Publish', label_ar: 'نشر', swimlane: 'author' },
      { id: 'notify', type: 'notification', label_en: 'Notify Stakeholders', label_ar: 'إخطار أصحاب المصلحة' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'draft' }, { from: 'draft', to: 'review' }, { from: 'review', to: 'approve', condition: 'approved' }, { from: 'review', to: 'draft', condition: 'rejected' }, { from: 'approve', to: 'publish', condition: 'approved' }, { from: 'approve', to: 'draft', condition: 'rejected' }, { from: 'publish', to: 'notify' }, { from: 'notify', to: 'end' }]
  ),
  makeTemplate('risk_treatment', 'Risk Treatment', 'معالجة المخاطر', 'Risk assessment, treatment planning, and monitoring',
    ['risk_owner', 'risk_manager', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'assess', type: 'task', label_en: 'Assess Risk', label_ar: 'تقييم المخاطر', swimlane: 'risk_owner' },
      { id: 'plan', type: 'task', label_en: 'Treatment Plan', label_ar: 'خطة المعالجة', swimlane: 'risk_manager', slaHours: 120 },
      { id: 'approve', type: 'approval', label_en: 'Approve Plan', label_ar: 'موافقة الخطة', swimlane: 'approver', slaHours: 48 },
      { id: 'implement', type: 'task', label_en: 'Implement', label_ar: 'تنفيذ', swimlane: 'risk_owner' },
      { id: 'verify', type: 'task', label_en: 'Verify', label_ar: 'تحقق', swimlane: 'risk_manager' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'assess' }, { from: 'assess', to: 'plan' }, { from: 'plan', to: 'approve' }, { from: 'approve', to: 'implement', condition: 'approved' }, { from: 'approve', to: 'plan', condition: 'rejected' }, { from: 'implement', to: 'verify' }, { from: 'verify', to: 'end' }]
  ),
  makeTemplate('incident_response', 'Incident Response', 'الاستجابة للحوادث', 'Incident triage, investigation, containment, and resolution',
    ['reporter', 'responder', 'manager'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'triage', type: 'task', label_en: 'Triage', label_ar: 'فرز', swimlane: 'responder', slaHours: 4 },
      { id: 'decide', type: 'decision', label_en: 'Severity Check', label_ar: 'فحص الخطورة' },
      { id: 'contain', type: 'task', label_en: 'Contain', label_ar: 'احتواء', swimlane: 'responder', slaHours: 24 },
      { id: 'investigate', type: 'task', label_en: 'Investigate', label_ar: 'تحقيق', swimlane: 'responder' },
      { id: 'resolve', type: 'task', label_en: 'Resolve', label_ar: 'حل', swimlane: 'responder' },
      { id: 'review', type: 'approval', label_en: 'Post-Incident Review', label_ar: 'مراجعة ما بعد الحادث', swimlane: 'manager', slaHours: 72 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'triage' }, { from: 'triage', to: 'decide' }, { from: 'decide', to: 'contain', condition: 'high' }, { from: 'decide', to: 'investigate', condition: 'low' }, { from: 'contain', to: 'investigate' }, { from: 'investigate', to: 'resolve' }, { from: 'resolve', to: 'review' }, { from: 'review', to: 'end' }]
  ),
  makeTemplate('audit_cycle', 'Audit Cycle', 'دورة التدقيق', 'Audit planning, execution, reporting, and follow-up',
    ['auditor', 'auditee', 'audit_manager'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'plan', type: 'task', label_en: 'Plan Audit', label_ar: 'تخطيط التدقيق', swimlane: 'audit_manager' },
      { id: 'execute', type: 'task', label_en: 'Execute Audit', label_ar: 'تنفيذ التدقيق', swimlane: 'auditor', slaHours: 240 },
      { id: 'report', type: 'task', label_en: 'Draft Report', label_ar: 'مسودة التقرير', swimlane: 'auditor' },
      { id: 'review', type: 'approval', label_en: 'Review Report', label_ar: 'مراجعة التقرير', swimlane: 'audit_manager', slaHours: 48 },
      { id: 'followup', type: 'task', label_en: 'Follow-up', label_ar: 'متابعة', swimlane: 'auditee' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'plan' }, { from: 'plan', to: 'execute' }, { from: 'execute', to: 'report' }, { from: 'report', to: 'review' }, { from: 'review', to: 'followup', condition: 'approved' }, { from: 'review', to: 'report', condition: 'rejected' }, { from: 'followup', to: 'end' }]
  ),
  makeTemplate('vendor_assessment', 'Vendor Assessment', 'تقييم المورد', 'Vendor due diligence, risk assessment, and approval',
    ['vendor_manager', 'risk_team', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'collect', type: 'task', label_en: 'Collect Info', label_ar: 'جمع المعلومات', swimlane: 'vendor_manager' },
      { id: 'assess', type: 'task', label_en: 'Risk Assessment', label_ar: 'تقييم المخاطر', swimlane: 'risk_team', slaHours: 120 },
      { id: 'approve', type: 'approval', label_en: 'Approve Vendor', label_ar: 'موافقة المورد', swimlane: 'approver', slaHours: 48 },
      { id: 'onboard', type: 'task', label_en: 'Onboard', label_ar: 'تأهيل', swimlane: 'vendor_manager' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'collect' }, { from: 'collect', to: 'assess' }, { from: 'assess', to: 'approve' }, { from: 'approve', to: 'onboard', condition: 'approved' }, { from: 'approve', to: 'collect', condition: 'rejected' }, { from: 'onboard', to: 'end' }]
  ),
  makeTemplate('evidence_collection', 'Evidence Collection', 'جمع الأدلة', 'Evidence request, submission, review, and acceptance',
    ['requester', 'submitter', 'reviewer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'request', type: 'task', label_en: 'Request Evidence', label_ar: 'طلب الأدلة', swimlane: 'requester' },
      { id: 'submit', type: 'task', label_en: 'Submit Evidence', label_ar: 'تقديم الأدلة', swimlane: 'submitter', slaHours: 168 },
      { id: 'review', type: 'approval', label_en: 'Review Evidence', label_ar: 'مراجعة الأدلة', swimlane: 'reviewer', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'request' }, { from: 'request', to: 'submit' }, { from: 'submit', to: 'review' }, { from: 'review', to: 'end', condition: 'approved' }, { from: 'review', to: 'submit', condition: 'rejected' }]
  ),
  makeTemplate('compliance_remediation', 'Compliance Remediation', 'معالجة الامتثال', 'Gap identification, remediation planning, and verification',
    ['compliance_officer', 'implementer', 'verifier'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'identify', type: 'task', label_en: 'Identify Gap', label_ar: 'تحديد الفجوة', swimlane: 'compliance_officer' },
      { id: 'plan', type: 'task', label_en: 'Remediation Plan', label_ar: 'خطة المعالجة', swimlane: 'compliance_officer', slaHours: 72 },
      { id: 'implement', type: 'task', label_en: 'Implement Fix', label_ar: 'تنفيذ الإصلاح', swimlane: 'implementer', slaHours: 240 },
      { id: 'verify', type: 'approval', label_en: 'Verify Fix', label_ar: 'التحقق من الإصلاح', swimlane: 'verifier', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'identify' }, { from: 'identify', to: 'plan' }, { from: 'plan', to: 'implement' }, { from: 'implement', to: 'verify' }, { from: 'verify', to: 'end', condition: 'approved' }, { from: 'verify', to: 'implement', condition: 'rejected' }]
  ),
  makeTemplate('bcp_testing', 'BCP Testing', 'اختبار استمرارية الأعمال', 'Business continuity plan testing and validation',
    ['bcp_coordinator', 'tester', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'prepare', type: 'task', label_en: 'Prepare Test', label_ar: 'إعداد الاختبار', swimlane: 'bcp_coordinator' },
      { id: 'execute', type: 'task', label_en: 'Execute Test', label_ar: 'تنفيذ الاختبار', swimlane: 'tester', slaHours: 48 },
      { id: 'report', type: 'task', label_en: 'Test Report', label_ar: 'تقرير الاختبار', swimlane: 'tester' },
      { id: 'approve', type: 'approval', label_en: 'Approve Results', label_ar: 'موافقة النتائج', swimlane: 'approver', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'prepare' }, { from: 'prepare', to: 'execute' }, { from: 'execute', to: 'report' }, { from: 'report', to: 'approve' }, { from: 'approve', to: 'end', condition: 'approved' }, { from: 'approve', to: 'execute', condition: 'rejected' }]
  ),
  makeTemplate('team_member_onboarding', 'Team Member Onboarding', 'تأهيل عضو الفريق', 'End-to-end GRC team member onboarding: invitation, access provisioning, RACI briefing, role assignment, and activation',
    ['hr_admin', 'team_lead', 'new_member', 'compliance_officer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'invite', type: 'task', label_en: 'Send Invitation', label_ar: 'إرسال الدعوة', swimlane: 'hr_admin', slaHours: 4 },
      { id: 'accept', type: 'task', label_en: 'Accept Invitation', label_ar: 'قبول الدعوة', swimlane: 'new_member', slaHours: 168 },
      { id: 'provision_access', type: 'task', label_en: 'Provision Access & Credentials', label_ar: 'تزويد الوصول والصلاحيات', swimlane: 'hr_admin', slaHours: 24 },
      { id: 'assign_role', type: 'task', label_en: 'Assign GRC Role Profile', label_ar: 'تعيين ملف الدور', swimlane: 'team_lead', slaHours: 48 },
      { id: 'raci_briefing', type: 'task', label_en: 'RACI Matrix Briefing', label_ar: 'إحاطة مصفوفة RACI', swimlane: 'team_lead', slaHours: 72 },
      { id: 'compliance_training', type: 'task', label_en: 'Compliance & Security Training', label_ar: 'تدريب الامتثال والأمن', swimlane: 'new_member', slaHours: 240 },
      { id: 'verify_onboarding', type: 'approval', label_en: 'Verify Onboarding Complete', label_ar: 'التحقق من اكتمال التأهيل', swimlane: 'compliance_officer', slaHours: 48 },
      { id: 'activate', type: 'task', label_en: 'Activate Member', label_ar: 'تفعيل العضو', swimlane: 'team_lead' },
      { id: 'notify_team', type: 'notification', label_en: 'Notify Team', label_ar: 'إخطار الفريق' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [
      { from: 'start', to: 'invite' },
      { from: 'invite', to: 'accept' },
      { from: 'accept', to: 'provision_access' },
      { from: 'provision_access', to: 'assign_role' },
      { from: 'assign_role', to: 'raci_briefing' },
      { from: 'raci_briefing', to: 'compliance_training' },
      { from: 'compliance_training', to: 'verify_onboarding' },
      { from: 'verify_onboarding', to: 'activate', condition: 'approved' },
      { from: 'verify_onboarding', to: 'compliance_training', condition: 'rejected' },
      { from: 'activate', to: 'notify_team' },
      { from: 'notify_team', to: 'end' },
    ]
  ),
  makeTemplate('grc_role_activation', 'GRC Role Activation', 'تفعيل دور GRC', 'Role staffing activation: candidate selection, background verification, access provisioning, and RACI assignment',
    ['hr_admin', 'hiring_manager', 'compliance_officer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'identify', type: 'task', label_en: 'Identify Candidate', label_ar: 'تحديد المرشح', swimlane: 'hiring_manager', slaHours: 72 },
      { id: 'verify', type: 'task', label_en: 'Background Verification', label_ar: 'التحقق من الخلفية', swimlane: 'hr_admin', slaHours: 120 },
      { id: 'approve_role', type: 'approval', label_en: 'Approve Role Assignment', label_ar: 'موافقة تعيين الدور', swimlane: 'compliance_officer', slaHours: 48 },
      { id: 'provision', type: 'task', label_en: 'Provision Permissions', label_ar: 'تزويد الصلاحيات', swimlane: 'hr_admin', slaHours: 24 },
      { id: 'assign_raci', type: 'task', label_en: 'Assign RACI Responsibilities', label_ar: 'تعيين مسؤوليات RACI', swimlane: 'hiring_manager', slaHours: 48 },
      { id: 'notify_stakeholders', type: 'notification', label_en: 'Notify Stakeholders', label_ar: 'إخطار أصحاب المصلحة' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [
      { from: 'start', to: 'identify' },
      { from: 'identify', to: 'verify' },
      { from: 'verify', to: 'approve_role' },
      { from: 'approve_role', to: 'provision', condition: 'approved' },
      { from: 'approve_role', to: 'identify', condition: 'rejected' },
      { from: 'provision', to: 'assign_raci' },
      { from: 'assign_raci', to: 'notify_stakeholders' },
      { from: 'notify_stakeholders', to: 'end' },
    ]
  ),
  makeTemplate('control_testing', 'Control Testing', 'اختبار الضوابط', 'Control effectiveness testing: design assessment, operating effectiveness testing, and remediation',
    ['control_owner', 'tester', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'select', type: 'task', label_en: 'Select Controls', label_ar: 'اختيار الضوابط', swimlane: 'tester' },
      { id: 'design', type: 'task', label_en: 'Design Assessment', label_ar: 'تقييم التصميم', swimlane: 'tester', slaHours: 72 },
      { id: 'operate', type: 'task', label_en: 'Operating Effectiveness Test', label_ar: 'اختبار الفعالية التشغيلية', swimlane: 'tester', slaHours: 120 },
      { id: 'decide', type: 'decision', label_en: 'Pass/Fail', label_ar: 'ناجح/فاشل' },
      { id: 'remediate', type: 'task', label_en: 'Remediate Deficiency', label_ar: 'معالجة القصور', swimlane: 'control_owner', slaHours: 168 },
      { id: 'approve', type: 'approval', label_en: 'Approve Results', label_ar: 'موافقة النتائج', swimlane: 'approver', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'select' }, { from: 'select', to: 'design' }, { from: 'design', to: 'operate' }, { from: 'operate', to: 'decide' }, { from: 'decide', to: 'approve', condition: 'pass' }, { from: 'decide', to: 'remediate', condition: 'fail' }, { from: 'remediate', to: 'operate' }, { from: 'approve', to: 'end' }]
  ),
  makeTemplate('exception_management', 'Exception Management', 'إدارة الاستثناءات', 'Exception request, risk assessment, approval, monitoring, and expiry',
    ['requester', 'risk_manager', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'request', type: 'task', label_en: 'Request Exception', label_ar: 'طلب استثناء', swimlane: 'requester' },
      { id: 'assess', type: 'task', label_en: 'Risk Assessment', label_ar: 'تقييم المخاطر', swimlane: 'risk_manager', slaHours: 48 },
      { id: 'approve', type: 'approval', label_en: 'Approve Exception', label_ar: 'موافقة الاستثناء', swimlane: 'approver', slaHours: 72 },
      { id: 'monitor', type: 'task', label_en: 'Monitor Compliance', label_ar: 'مراقبة الامتثال', swimlane: 'risk_manager', slaHours: 720 },
      { id: 'expire', type: 'task', label_en: 'Expiry Review', label_ar: 'مراجعة الانتهاء', swimlane: 'approver' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'request' }, { from: 'request', to: 'assess' }, { from: 'assess', to: 'approve' }, { from: 'approve', to: 'monitor', condition: 'approved' }, { from: 'approve', to: 'end', condition: 'rejected' }, { from: 'monitor', to: 'expire' }, { from: 'expire', to: 'end' }]
  ),
  makeTemplate('risk_acceptance', 'Risk Acceptance', 'قبول المخاطر', 'Formal risk acceptance: justification, multi-level approval, documentation, and periodic review',
    ['risk_owner', 'risk_manager', 'executive_approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'justify', type: 'task', label_en: 'Document Justification', label_ar: 'توثيق المبررات', swimlane: 'risk_owner', slaHours: 48 },
      { id: 'review', type: 'approval', label_en: 'Risk Manager Review', label_ar: 'مراجعة مدير المخاطر', swimlane: 'risk_manager', slaHours: 48 },
      { id: 'approve', type: 'approval', label_en: 'Executive Approval', label_ar: 'الموافقة التنفيذية', swimlane: 'executive_approver', slaHours: 72 },
      { id: 'document', type: 'task', label_en: 'Document Acceptance', label_ar: 'توثيق القبول', swimlane: 'risk_manager' },
      { id: 'notify', type: 'notification', label_en: 'Notify Stakeholders', label_ar: 'إخطار أصحاب المصلحة' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'justify' }, { from: 'justify', to: 'review' }, { from: 'review', to: 'approve', condition: 'approved' }, { from: 'review', to: 'justify', condition: 'rejected' }, { from: 'approve', to: 'document', condition: 'approved' }, { from: 'approve', to: 'end', condition: 'rejected' }, { from: 'document', to: 'notify' }, { from: 'notify', to: 'end' }]
  ),
  makeTemplate('privacy_impact_assessment', 'Privacy Impact Assessment', 'تقييم أثر الخصوصية', 'DPIA workflow: data mapping, impact analysis, mitigation planning, DPO review, and approval',
    ['data_owner', 'privacy_officer', 'dpo'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'map', type: 'task', label_en: 'Data Mapping', label_ar: 'خريطة البيانات', swimlane: 'data_owner', slaHours: 72 },
      { id: 'analyze', type: 'task', label_en: 'Impact Analysis', label_ar: 'تحليل الأثر', swimlane: 'privacy_officer', slaHours: 120 },
      { id: 'mitigate', type: 'task', label_en: 'Mitigation Plan', label_ar: 'خطة التخفيف', swimlane: 'privacy_officer', slaHours: 72 },
      { id: 'review', type: 'approval', label_en: 'DPO Review', label_ar: 'مراجعة مسؤول حماية البيانات', swimlane: 'dpo', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'map' }, { from: 'map', to: 'analyze' }, { from: 'analyze', to: 'mitigate' }, { from: 'mitigate', to: 'review' }, { from: 'review', to: 'end', condition: 'approved' }, { from: 'review', to: 'mitigate', condition: 'rejected' }]
  ),
  makeTemplate('framework_adoption', 'Framework Adoption', 'اعتماد الإطار', 'Regulatory framework adoption: gap analysis, control mapping, implementation planning, and certification readiness',
    ['compliance_officer', 'implementer', 'auditor'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'gap', type: 'task', label_en: 'Gap Analysis', label_ar: 'تحليل الفجوات', swimlane: 'compliance_officer', slaHours: 240 },
      { id: 'map', type: 'task', label_en: 'Control Mapping', label_ar: 'تخطيط الضوابط', swimlane: 'compliance_officer', slaHours: 120 },
      { id: 'plan', type: 'task', label_en: 'Implementation Plan', label_ar: 'خطة التنفيذ', swimlane: 'implementer', slaHours: 120 },
      { id: 'implement', type: 'task', label_en: 'Implement Controls', label_ar: 'تنفيذ الضوابط', swimlane: 'implementer', slaHours: 480 },
      { id: 'assess', type: 'approval', label_en: 'Readiness Assessment', label_ar: 'تقييم الجاهزية', swimlane: 'auditor', slaHours: 120 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'gap' }, { from: 'gap', to: 'map' }, { from: 'map', to: 'plan' }, { from: 'plan', to: 'implement' }, { from: 'implement', to: 'assess' }, { from: 'assess', to: 'end', condition: 'approved' }, { from: 'assess', to: 'implement', condition: 'rejected' }]
  ),
  makeTemplate('change_management', 'Change Management', 'إدارة التغيير', 'IT/GRC change request: impact assessment, approval routing, implementation, and post-change validation',
    ['requester', 'change_manager', 'cab'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'request', type: 'task', label_en: 'Submit Change Request', label_ar: 'تقديم طلب تغيير', swimlane: 'requester' },
      { id: 'impact', type: 'task', label_en: 'Impact Assessment', label_ar: 'تقييم الأثر', swimlane: 'change_manager', slaHours: 48 },
      { id: 'approve', type: 'approval', label_en: 'CAB Approval', label_ar: 'موافقة لجنة التغيير', swimlane: 'cab', slaHours: 72 },
      { id: 'implement', type: 'task', label_en: 'Implement Change', label_ar: 'تنفيذ التغيير', swimlane: 'requester', slaHours: 168 },
      { id: 'validate', type: 'task', label_en: 'Post-Change Validation', label_ar: 'التحقق بعد التغيير', swimlane: 'change_manager', slaHours: 24 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'request' }, { from: 'request', to: 'impact' }, { from: 'impact', to: 'approve' }, { from: 'approve', to: 'implement', condition: 'approved' }, { from: 'approve', to: 'end', condition: 'rejected' }, { from: 'implement', to: 'validate' }, { from: 'validate', to: 'end' }]
  ),
  makeTemplate('governance_review', 'Governance Review', 'مراجعة الحوكمة', 'Periodic governance review: mandate verification, committee effectiveness, accountability assessment, and reporting',
    ['governance_officer', 'committee_chair', 'board_secretary'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'mandates', type: 'task', label_en: 'Review Mandates', label_ar: 'مراجعة التفويضات', swimlane: 'governance_officer', slaHours: 72 },
      { id: 'committees', type: 'task', label_en: 'Committee Effectiveness', label_ar: 'فعالية اللجان', swimlane: 'committee_chair', slaHours: 72 },
      { id: 'accountability', type: 'task', label_en: 'Accountability Assessment', label_ar: 'تقييم المساءلة', swimlane: 'governance_officer', slaHours: 48 },
      { id: 'report', type: 'task', label_en: 'Governance Report', label_ar: 'تقرير الحوكمة', swimlane: 'board_secretary' },
      { id: 'approve', type: 'approval', label_en: 'Board Approval', label_ar: 'موافقة المجلس', swimlane: 'committee_chair', slaHours: 168 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'mandates' }, { from: 'mandates', to: 'committees' }, { from: 'committees', to: 'accountability' }, { from: 'accountability', to: 'report' }, { from: 'report', to: 'approve' }, { from: 'approve', to: 'end' }]
  ),
  makeTemplate('threat_intelligence', 'Threat Intelligence', 'استخبارات التهديدات', 'Threat intake, analysis, risk correlation, advisory issuance, and control hardening',
    ['threat_analyst', 'risk_manager', 'ciso'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'intake', type: 'task', label_en: 'Threat Intake', label_ar: 'استقبال التهديد', swimlane: 'threat_analyst', slaHours: 4 },
      { id: 'analyze', type: 'task', label_en: 'Threat Analysis', label_ar: 'تحليل التهديد', swimlane: 'threat_analyst', slaHours: 24 },
      { id: 'correlate', type: 'task', label_en: 'Risk Correlation', label_ar: 'ربط المخاطر', swimlane: 'risk_manager', slaHours: 48 },
      { id: 'advisory', type: 'task', label_en: 'Issue Advisory', label_ar: 'إصدار استشارة', swimlane: 'ciso' },
      { id: 'harden', type: 'task', label_en: 'Control Hardening', label_ar: 'تعزيز الضوابط', swimlane: 'risk_manager', slaHours: 168 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'intake' }, { from: 'intake', to: 'analyze' }, { from: 'analyze', to: 'correlate' }, { from: 'correlate', to: 'advisory' }, { from: 'advisory', to: 'harden' }, { from: 'harden', to: 'end' }]
  ),
  makeTemplate('regulatory_reporting', 'Regulatory Reporting', 'التقارير التنظيمية', 'Regulatory report preparation, data aggregation, quality review, submission, and acknowledgement tracking',
    ['report_preparer', 'quality_reviewer', 'compliance_officer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'aggregate', type: 'task', label_en: 'Aggregate Data', label_ar: 'تجميع البيانات', swimlane: 'report_preparer', slaHours: 72 },
      { id: 'prepare', type: 'task', label_en: 'Prepare Report', label_ar: 'إعداد التقرير', swimlane: 'report_preparer', slaHours: 48 },
      { id: 'review', type: 'approval', label_en: 'Quality Review', label_ar: 'مراجعة الجودة', swimlane: 'quality_reviewer', slaHours: 48 },
      { id: 'submit', type: 'task', label_en: 'Submit to Regulator', label_ar: 'تقديم للجهة الرقابية', swimlane: 'compliance_officer' },
      { id: 'track', type: 'task', label_en: 'Track Acknowledgement', label_ar: 'متابعة التأكيد', swimlane: 'compliance_officer', slaHours: 168 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'aggregate' }, { from: 'aggregate', to: 'prepare' }, { from: 'prepare', to: 'review' }, { from: 'review', to: 'submit', condition: 'approved' }, { from: 'review', to: 'prepare', condition: 'rejected' }, { from: 'submit', to: 'track' }, { from: 'track', to: 'end' }]
  ),
  makeTemplate('access_review', 'Access Review', 'مراجعة الوصول', 'Periodic access review: user access extraction, manager certification, remediation, and attestation',
    ['it_admin', 'manager', 'compliance_officer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'extract', type: 'task', label_en: 'Extract Access Data', label_ar: 'استخراج بيانات الوصول', swimlane: 'it_admin', slaHours: 24 },
      { id: 'certify', type: 'approval', label_en: 'Manager Certification', label_ar: 'شهادة المدير', swimlane: 'manager', slaHours: 168 },
      { id: 'remediate', type: 'task', label_en: 'Remediate Excess', label_ar: 'معالجة التجاوزات', swimlane: 'it_admin', slaHours: 48 },
      { id: 'attest', type: 'approval', label_en: 'Attestation', label_ar: 'التصديق', swimlane: 'compliance_officer', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'extract' }, { from: 'extract', to: 'certify' }, { from: 'certify', to: 'remediate', condition: 'revoke' }, { from: 'certify', to: 'attest', condition: 'approved' }, { from: 'remediate', to: 'attest' }, { from: 'attest', to: 'end' }]
  ),
  makeTemplate('data_classification', 'Data Classification', 'تصنيف البيانات', 'Data discovery, classification, labeling, and knowledge base update',
    ['data_owner', 'classification_officer', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'discover', type: 'task', label_en: 'Discover Data Assets', label_ar: 'اكتشاف أصول البيانات', swimlane: 'data_owner', slaHours: 72 },
      { id: 'classify', type: 'task', label_en: 'Classify & Label', label_ar: 'التصنيف والتسمية', swimlane: 'classification_officer', slaHours: 48 },
      { id: 'review', type: 'approval', label_en: 'Review Classification', label_ar: 'مراجعة التصنيف', swimlane: 'approver', slaHours: 48 },
      { id: 'publish', type: 'task', label_en: 'Publish to Knowledge Base', label_ar: 'نشر في قاعدة المعرفة', swimlane: 'classification_officer' },
      { id: 'notify', type: 'notification', label_en: 'Notify Stakeholders', label_ar: 'إخطار أصحاب المصلحة' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'discover' }, { from: 'discover', to: 'classify' }, { from: 'classify', to: 'review' }, { from: 'review', to: 'publish', condition: 'approved' }, { from: 'review', to: 'classify', condition: 'rejected' }, { from: 'publish', to: 'notify' }, { from: 'notify', to: 'end' }]
  ),
  makeTemplate('integration_onboarding', 'Integration Onboarding', 'تأهيل التكامل', 'Connector setup: API registration, credential provisioning, data mapping, testing, and activation',
    ['integration_engineer', 'security_reviewer', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'register', type: 'task', label_en: 'Register API/Connector', label_ar: 'تسجيل واجهة API', swimlane: 'integration_engineer', slaHours: 24 },
      { id: 'credentials', type: 'task', label_en: 'Provision Credentials', label_ar: 'تزويد بيانات الاعتماد', swimlane: 'integration_engineer', slaHours: 24 },
      { id: 'security', type: 'approval', label_en: 'Security Review', label_ar: 'مراجعة الأمان', swimlane: 'security_reviewer', slaHours: 72 },
      { id: 'map', type: 'task', label_en: 'Data Mapping', label_ar: 'تعيين البيانات', swimlane: 'integration_engineer', slaHours: 48 },
      { id: 'test', type: 'task', label_en: 'Integration Testing', label_ar: 'اختبار التكامل', swimlane: 'integration_engineer', slaHours: 24 },
      { id: 'approve', type: 'approval', label_en: 'Activate Integration', label_ar: 'تفعيل التكامل', swimlane: 'approver', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'register' }, { from: 'register', to: 'credentials' }, { from: 'credentials', to: 'security' }, { from: 'security', to: 'map', condition: 'approved' }, { from: 'security', to: 'credentials', condition: 'rejected' }, { from: 'map', to: 'test' }, { from: 'test', to: 'approve' }, { from: 'approve', to: 'end' }]
  ),
  makeTemplate('automation_rule_deployment', 'Automation Rule Deployment', 'نشر قاعدة الأتمتة', 'Automation rule creation, testing in sandbox, approval, production deployment, and monitoring',
    ['rule_author', 'qa_tester', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'design', type: 'task', label_en: 'Design Rule', label_ar: 'تصميم القاعدة', swimlane: 'rule_author', slaHours: 48 },
      { id: 'sandbox', type: 'task', label_en: 'Sandbox Testing', label_ar: 'اختبار في بيئة آمنة', swimlane: 'qa_tester', slaHours: 24 },
      { id: 'review', type: 'approval', label_en: 'Review & Approve', label_ar: 'مراجعة وموافقة', swimlane: 'approver', slaHours: 48 },
      { id: 'deploy', type: 'task', label_en: 'Deploy to Production', label_ar: 'نشر في الإنتاج', swimlane: 'rule_author' },
      { id: 'monitor', type: 'task', label_en: 'Monitor Execution', label_ar: 'مراقبة التنفيذ', swimlane: 'qa_tester', slaHours: 168 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'design' }, { from: 'design', to: 'sandbox' }, { from: 'sandbox', to: 'review' }, { from: 'review', to: 'deploy', condition: 'approved' }, { from: 'review', to: 'design', condition: 'rejected' }, { from: 'deploy', to: 'monitor' }, { from: 'monitor', to: 'end' }]
  ),
  makeTemplate('kpi_analytics_review', 'KPI & Analytics Review', 'مراجعة مؤشرات الأداء والتحليلات', 'Periodic KPI collection, dashboard review, trend analysis, executive reporting, and action planning',
    ['analyst', 'department_head', 'executive'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'collect', type: 'task', label_en: 'Collect KPI Data', label_ar: 'جمع بيانات المؤشرات', swimlane: 'analyst', slaHours: 48 },
      { id: 'analyze', type: 'task', label_en: 'Trend Analysis', label_ar: 'تحليل الاتجاهات', swimlane: 'analyst', slaHours: 48 },
      { id: 'review', type: 'approval', label_en: 'Department Review', label_ar: 'مراجعة القسم', swimlane: 'department_head', slaHours: 72 },
      { id: 'report', type: 'task', label_en: 'Executive Report', label_ar: 'التقرير التنفيذي', swimlane: 'analyst' },
      { id: 'actions', type: 'task', label_en: 'Action Planning', label_ar: 'تخطيط الإجراءات', swimlane: 'executive', slaHours: 168 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'collect' }, { from: 'collect', to: 'analyze' }, { from: 'analyze', to: 'review' }, { from: 'review', to: 'report', condition: 'approved' }, { from: 'review', to: 'collect', condition: 'rejected' }, { from: 'report', to: 'actions' }, { from: 'actions', to: 'end' }]
  ),
  makeTemplate('compliance_assessment_cycle', 'Compliance Assessment Cycle', 'دورة تقييم الامتثال', 'End-to-end compliance assessment: scope definition, control evaluation, evidence collection, gap analysis, remediation, and certification',
    ['compliance_officer', 'control_owner', 'auditor', 'approver'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'scope', type: 'task', label_en: 'Define Assessment Scope', label_ar: 'تحديد نطاق التقييم', swimlane: 'compliance_officer', slaHours: 48 },
      { id: 'evaluate', type: 'task', label_en: 'Evaluate Controls', label_ar: 'تقييم الضوابط', swimlane: 'auditor', slaHours: 240 },
      { id: 'evidence', type: 'task', label_en: 'Collect Evidence', label_ar: 'جمع الأدلة', swimlane: 'control_owner', slaHours: 168 },
      { id: 'gap', type: 'task', label_en: 'Gap Analysis', label_ar: 'تحليل الفجوات', swimlane: 'compliance_officer', slaHours: 72 },
      { id: 'remediate', type: 'task', label_en: 'Remediation', label_ar: 'المعالجة', swimlane: 'control_owner', slaHours: 240 },
      { id: 'verify', type: 'approval', label_en: 'Verify & Certify', label_ar: 'التحقق والتصديق', swimlane: 'approver', slaHours: 72 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'scope' }, { from: 'scope', to: 'evaluate' }, { from: 'evaluate', to: 'evidence' }, { from: 'evidence', to: 'gap' }, { from: 'gap', to: 'remediate' }, { from: 'remediate', to: 'verify' }, { from: 'verify', to: 'end', condition: 'approved' }, { from: 'verify', to: 'remediate', condition: 'rejected' }]
  ),
  makeTemplate('board_reporting_cycle', 'Board Reporting Cycle', 'دورة تقارير المجلس', 'Board report preparation: data aggregation, risk summary, compliance status, executive review, and board presentation',
    ['report_preparer', 'ciso', 'board_secretary'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'aggregate', type: 'task', label_en: 'Aggregate GRC Data', label_ar: 'تجميع بيانات GRC', swimlane: 'report_preparer', slaHours: 72 },
      { id: 'risk_summary', type: 'task', label_en: 'Risk Summary', label_ar: 'ملخص المخاطر', swimlane: 'report_preparer', slaHours: 48 },
      { id: 'compliance_status', type: 'task', label_en: 'Compliance Status', label_ar: 'حالة الامتثال', swimlane: 'report_preparer', slaHours: 48 },
      { id: 'review', type: 'approval', label_en: 'Executive Review', label_ar: 'المراجعة التنفيذية', swimlane: 'ciso', slaHours: 72 },
      { id: 'present', type: 'task', label_en: 'Board Presentation', label_ar: 'عرض المجلس', swimlane: 'board_secretary' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'aggregate' }, { from: 'aggregate', to: 'risk_summary' }, { from: 'risk_summary', to: 'compliance_status' }, { from: 'compliance_status', to: 'review' }, { from: 'review', to: 'present', condition: 'approved' }, { from: 'review', to: 'aggregate', condition: 'rejected' }, { from: 'present', to: 'end' }]
  ),
  makeTemplate('vendor_offboarding', 'Vendor Offboarding', 'إنهاء خدمة المورد', 'Vendor offboarding: contract termination, data return/deletion, access revocation, and final audit',
    ['vendor_manager', 'it_admin', 'compliance_officer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'initiate', type: 'task', label_en: 'Initiate Offboarding', label_ar: 'بدء الإنهاء', swimlane: 'vendor_manager' },
      { id: 'data', type: 'task', label_en: 'Data Return/Deletion', label_ar: 'إرجاع/حذف البيانات', swimlane: 'it_admin', slaHours: 72 },
      { id: 'access', type: 'task', label_en: 'Revoke Access', label_ar: 'إلغاء الوصول', swimlane: 'it_admin', slaHours: 24 },
      { id: 'audit', type: 'task', label_en: 'Final Compliance Audit', label_ar: 'التدقيق النهائي', swimlane: 'compliance_officer', slaHours: 120 },
      { id: 'approve', type: 'approval', label_en: 'Confirm Offboarding', label_ar: 'تأكيد الإنهاء', swimlane: 'vendor_manager', slaHours: 48 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'initiate' }, { from: 'initiate', to: 'data' }, { from: 'data', to: 'access' }, { from: 'access', to: 'audit' }, { from: 'audit', to: 'approve' }, { from: 'approve', to: 'end' }]
  ),
  makeTemplate('security_awareness_training', 'Security Awareness Training', 'التوعية الأمنية', 'Training campaign: content creation, distribution, completion tracking, assessment, and reporting',
    ['training_coordinator', 'employee', 'compliance_officer'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'create', type: 'task', label_en: 'Create Training Content', label_ar: 'إنشاء محتوى التدريب', swimlane: 'training_coordinator', slaHours: 120 },
      { id: 'distribute', type: 'task', label_en: 'Distribute to Staff', label_ar: 'توزيع على الموظفين', swimlane: 'training_coordinator' },
      { id: 'complete', type: 'task', label_en: 'Complete Training', label_ar: 'إكمال التدريب', swimlane: 'employee', slaHours: 336 },
      { id: 'assess', type: 'task', label_en: 'Knowledge Assessment', label_ar: 'تقييم المعرفة', swimlane: 'employee', slaHours: 48 },
      { id: 'report', type: 'task', label_en: 'Compliance Report', label_ar: 'تقرير الامتثال', swimlane: 'compliance_officer' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'create' }, { from: 'create', to: 'distribute' }, { from: 'distribute', to: 'complete' }, { from: 'complete', to: 'assess' }, { from: 'assess', to: 'report' }, { from: 'report', to: 'end' }]
  ),
  makeTemplate('maturity_assessment', 'Maturity Assessment', 'تقييم النضج', 'GRC maturity assessment: capability mapping, scoring, gap identification, roadmap creation, and executive sign-off',
    ['assessor', 'domain_owner', 'executive'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'map', type: 'task', label_en: 'Map Capabilities', label_ar: 'تخطيط القدرات', swimlane: 'assessor', slaHours: 120 },
      { id: 'score', type: 'task', label_en: 'Score Domains', label_ar: 'تقييم المجالات', swimlane: 'assessor', slaHours: 72 },
      { id: 'validate', type: 'approval', label_en: 'Validate Scores', label_ar: 'التحقق من الدرجات', swimlane: 'domain_owner', slaHours: 72 },
      { id: 'roadmap', type: 'task', label_en: 'Create Improvement Roadmap', label_ar: 'إنشاء خارطة التحسين', swimlane: 'assessor', slaHours: 72 },
      { id: 'approve', type: 'approval', label_en: 'Executive Sign-off', label_ar: 'توقيع تنفيذي', swimlane: 'executive', slaHours: 168 },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'map' }, { from: 'map', to: 'score' }, { from: 'score', to: 'validate' }, { from: 'validate', to: 'roadmap', condition: 'approved' }, { from: 'validate', to: 'score', condition: 'rejected' }, { from: 'roadmap', to: 'approve' }, { from: 'approve', to: 'end' }]
  ),
  makeTemplate('nca_ecc_assessment', 'NCA-ECC Assessment', 'تقييم NCA-ECC', 'KSA NCA Essential Cybersecurity Controls assessment: domain scoping, control mapping, evidence, gap closure, and NCA submission',
    ['compliance_officer', 'control_owner', 'nca_liaison'],
    [
      { id: 'start', type: 'start', label_en: 'Start', label_ar: 'بداية' },
      { id: 'scope', type: 'task', label_en: 'Scope NCA Domains', label_ar: 'تحديد نطاق NCA', swimlane: 'compliance_officer', slaHours: 72 },
      { id: 'map', type: 'task', label_en: 'Map Controls to ECC', label_ar: 'تعيين الضوابط إلى ECC', swimlane: 'compliance_officer', slaHours: 120 },
      { id: 'evidence', type: 'task', label_en: 'Collect Evidence', label_ar: 'جمع الأدلة', swimlane: 'control_owner', slaHours: 240 },
      { id: 'gap', type: 'task', label_en: 'Gap Remediation', label_ar: 'معالجة الفجوات', swimlane: 'control_owner', slaHours: 480 },
      { id: 'review', type: 'approval', label_en: 'Internal Review', label_ar: 'مراجعة داخلية', swimlane: 'compliance_officer', slaHours: 72 },
      { id: 'submit', type: 'task', label_en: 'Submit to NCA', label_ar: 'تقديم إلى NCA', swimlane: 'nca_liaison' },
      { id: 'end', type: 'end', label_en: 'End', label_ar: 'نهاية' },
    ],
    [{ from: 'start', to: 'scope' }, { from: 'scope', to: 'map' }, { from: 'map', to: 'evidence' }, { from: 'evidence', to: 'gap' }, { from: 'gap', to: 'review' }, { from: 'review', to: 'submit', condition: 'approved' }, { from: 'review', to: 'gap', condition: 'rejected' }, { from: 'submit', to: 'end' }]
  ),
];

// === API Functions ===

export function getWorkflowTemplates(): PredefinedTemplate[] {
  return PREDEFINED_TEMPLATES;
}

export async function getWorkflowTemplatesFromDB(tenantId: string): Promise<PredefinedTemplate[]> {
  const schema = tenantSchema(tenantId);
  const dbRows = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT w.workflow_id AS "templateKey", w.name AS name_en, w.name_ar, w.description, w.definition
     FROM "${schema}".workflows w
     WHERE w.status = 'template'
     ORDER BY w.created_at`,
    []
  ), { tenantId: tenantId, operation: 'query workflows' });

  const dbTemplates: PredefinedTemplate[] = dbRows.rows.map((r: GenericRow) => ({
    templateKey: r.templateKey,
    name_en: r.name_en,
    name_ar: r.name_ar || r.name_en,
    description_en: r.description || '',
    definition: (() => {
      try { return typeof r.definition === 'string' ? JSON.parse(r.definition) : r.definition || { nodes: [], edges: [], swimlanes: [], escalationChain: [] }; }
      catch { return { nodes: [], edges: [], swimlanes: [], escalationChain: [] }; }
    })(),
  }));

  const merged = new Map<string, PredefinedTemplate>();
  for (const t of PREDEFINED_TEMPLATES) merged.set(t.templateKey, t);
  for (const t of dbTemplates) if (!merged.has(t.templateKey)) merged.set(t.templateKey, t);

  return Array.from(merged.values());
}

export async function seedWorkflowTemplates(tenantId: string, createdBy: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  for (const tpl of PREDEFINED_TEMPLATES) {
    const existing = await safeQuery(
      `SELECT template_id FROM "${schema}".workflow_templates WHERE name = $1`,
      [tpl.name_en]
    );
    if (existing.rows.length === 0) {
      await safeQuery(
        `INSERT INTO "${schema}".workflow_templates (name, description, definition, parameters_schema, created_by)
         VALUES ($1, $2, $3, '{}', $4)`,
        [tpl.name_en, tpl.description_en, JSON.stringify(tpl.definition), createdBy]
      );
      seeded++;
    }
  }
  return seeded;
}

export interface WorkflowInstanceRef {
  instanceId: string;
  tenantId: string;
  templateKey: string;
  status: 'active' | 'draft' | 'completed' | 'cancelled';
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  initialStepIds: string[];
}

/**
 * Instantiate a template as a workflow_instances row.
 *
 * Resolution order (conservative; deterministic):
 *   1. Look up the template in the DB (`workflow_templates` by code).
 *   2. If not in DB, fall back to the in-repo PREDEFINED_TEMPLATES.
 *   3. If still not found, throw WorkflowTemplateNotFoundError.
 *
 * The instance is created with status='active' and carries:
 *   - templateKey / params under metadata for traceability
 *   - initialStepIds = all nodes whose in-degree is 0 (i.e. 'start' nodes
 *     or nodes with no incoming edges). Under the validated template
 *     structure that means the canonical 'start' node.
 */
export async function instantiateTemplate(
  tenantId: string,
  templateKey: string,
  params: Record<string, unknown>,
  createdBy: string,
): Promise<WorkflowInstanceRef> {
  if (!tenantId) {
    throw new Error('instantiateTemplate: tenantId is required');
  }
  if (!templateKey) {
    throw new Error('instantiateTemplate: templateKey is required');
  }

  const schema = tenantSchema(tenantId);

  // 1) Try the DB first (tenant-scoped).
  const dbResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT template_id, template_code, name_en, description_en, definition
       FROM "${schema}".workflow_templates
      WHERE template_code = $1 AND status = 'active'
      ORDER BY version DESC
      LIMIT 1`,
    [templateKey],
  ), { tenantId, operation: 'load template for instantiation' });

  const dbRow = dbResult.rows?.[0] as GenericRow | undefined;

  // 2) Fall back to the static predefined templates for module bootstrap.
  const predefined = PREDEFINED_TEMPLATES.find((t) => t.templateKey === templateKey);

  let definition: WorkflowDefinition | null = null;
  let resolvedName = '';
  let resolvedDescription = '';

  if (dbRow) {
    const raw = dbRow.definition;
    definition = typeof raw === 'string' ? JSON.parse(raw) as WorkflowDefinition : raw as WorkflowDefinition;
    resolvedName = String(dbRow.name_en ?? templateKey);
    resolvedDescription = String(dbRow.description_en ?? '');
  } else if (predefined) {
    definition = predefined.definition;
    resolvedName = predefined.name_en;
    resolvedDescription = predefined.description_en;
  }

  if (!definition) {
    throw new WorkflowTemplateNotFoundError(String(params?.moduleCode ?? 'unknown'), templateKey);
  }

  const structural = validateTemplateStructure(definition);
  if (!structural.valid) {
    throw new Error(
      `instantiateTemplate: template '${templateKey}' has invalid definition — ${structural.errors.join('; ')}`,
    );
  }

  const initialSteps = computeInitialStepIds(definition);

  const metadata = {
    templateKey,
    templateName: resolvedName,
    templateDescription: resolvedDescription,
    params,
    initialStepIds: initialSteps,
  };

  const insertRes = await safeQuery(
    `INSERT INTO "${schema}".workflow_instances (
       tenant_id, status, metadata, created_by, created_at, updated_at
     ) VALUES ($1, 'active', $2, $3, NOW(), NOW())
     RETURNING id, tenant_id, status, metadata, created_at`,
    [tenantId, JSON.stringify(metadata), createdBy],
  );

  const row = insertRes.rows?.[0] as GenericRow | undefined;
  if (!row) {
    throw new Error(`instantiateTemplate: failed to persist workflow_instance for '${templateKey}'`);
  }

  return {
    instanceId: String(row.id),
    tenantId,
    templateKey,
    status: 'active',
    metadata,
    createdBy,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    initialStepIds: initialSteps,
  };
}

/**
 * Compute the starting step ids for a template definition.
 * Prefers explicit nodes whose `type === 'start'`. If none declared,
 * falls back to nodes with in-degree of zero (robust to non-canonical
 * templates). Never returns an empty array for a validated definition
 * because validateTemplateStructure requires a start node.
 */
function computeInitialStepIds(def: WorkflowDefinition): string[] {
  const starts = def.nodes.filter((n) => n.type === 'start').map((n) => n.id);
  if (starts.length > 0) return starts;

  const incoming = new Set<string>();
  for (const edge of def.edges) incoming.add(edge.to);
  return def.nodes.filter((n) => !incoming.has(n.id)).map((n) => n.id);
}

// ── R4: Module-Aware Workflow Start ─────────────────────────────────

/**
 * Typed error for template resolution failures (R4).
 * Must be a hard error — no silent fallbacks, no empty instances.
 */
export class WorkflowTemplateNotFoundError extends Error {
  readonly code = 'WORKFLOW_TEMPLATE_NOT_FOUND' as const;
  readonly moduleCode: string;
  readonly primaryTemplateCode: string;

  constructor(moduleCode: string, primaryTemplateCode: string) {
    super(`Template '${primaryTemplateCode}' not found for module '${moduleCode}'`);
    this.name = 'WorkflowTemplateNotFoundError';
    this.moduleCode = moduleCode;
    this.primaryTemplateCode = primaryTemplateCode;
  }
}

/**
 * Resolve a module's primary workflow template and instantiate it.
 *
 * Resolution chain: moduleCode → MODULE_WORKFLOW_MAP.primaryTemplateCode
 * → getWorkflowTemplateByCode() → instantiateTemplate()
 *
 * R4: Throws WorkflowTemplateNotFoundError if resolution fails.
 * R2: Platform modules throw — they have no workflow by design.
 */
/**
 * Resolve a template either from the tenant DB or from the static
 * predefined catalogue. Returns `null` when neither source has it — the
 * caller is expected to throw WorkflowTemplateNotFoundError.
 */
export async function getWorkflowTemplateByCode(
  tenantId: string,
  templateCode: string,
): Promise<{ templateKey: string; definition: WorkflowDefinition } | null> {
  if (!tenantId) throw new Error('getWorkflowTemplateByCode: tenantId is required');
  if (!templateCode) return null;

  const schema = tenantSchema(tenantId);
  const dbResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT template_code, definition FROM "${schema}".workflow_templates
      WHERE template_code = $1 AND status = 'active'
      ORDER BY version DESC
      LIMIT 1`,
    [templateCode],
  ), { tenantId, operation: 'resolve template by code' });

  const dbRow = dbResult.rows?.[0] as GenericRow | undefined;
  if (dbRow) {
    const raw = dbRow.definition;
    const definition = typeof raw === 'string'
      ? JSON.parse(raw) as WorkflowDefinition
      : raw as WorkflowDefinition;
    return { templateKey: String(dbRow.template_code), definition };
  }

  const predefined = PREDEFINED_TEMPLATES.find((t) => t.templateKey === templateCode);
  if (predefined) {
    return { templateKey: predefined.templateKey, definition: predefined.definition };
  }

  return null;
}

export async function startModuleWorkflow(
  tenantId: string,
  moduleCode: string,
  params: Record<string, unknown>,
  createdBy: string,
): Promise<WorkflowInstanceRef> {
  if (!tenantId) {
    throw new Error('startModuleWorkflow: tenantId is required');
  }

  // R2: Platform-only modules have no workflow by design — hard error.
  if (_isPlatformOnly(moduleCode)) {
    throw new WorkflowTemplateNotFoundError(moduleCode, '(platform-only)');
  }

  const mapping = MODULE_WORKFLOW_MAP[moduleCode];
  if (!mapping) {
    // Conservative default: if the module code isn't canonical, reject so
    // downstream code doesn't silently instantiate the wrong template.
    if (!isCanonicalModuleCode(moduleCode as CanonicalModuleCode)) {
      throw new WorkflowTemplateNotFoundError(moduleCode, '(unmapped module)');
    }
    throw new WorkflowTemplateNotFoundError(moduleCode, '(no template code)');
  }

  const templateCode = mapping.templateCode;
  const resolved = await getWorkflowTemplateByCode(tenantId, templateCode);
  if (!resolved) {
    throw new WorkflowTemplateNotFoundError(moduleCode, templateCode);
  }

  const enrichedParams = {
    ...params,
    moduleCode,
    resolvedTemplateCode: templateCode,
    slaHours: mapping.slaHours,
    autoAssign: mapping.autoAssign,
  };

  return instantiateTemplate(tenantId, templateCode, enrichedParams, createdBy);
}
