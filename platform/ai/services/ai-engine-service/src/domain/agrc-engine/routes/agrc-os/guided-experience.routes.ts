// @ts-nocheck
import { Request, Response, Router } from 'express';
// AGRC-OS — Guided Experience Layer + Agent Capabilities Playbook


import { asyncHandler } from '../../ports/middleware.port';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/guided/setup-progress', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const { getSetupProgress } = await import('../../../onboarding/services/journey/guided-experience.service');
  const progress = await getSetupProgress(req.tenantId);
  res.json(progress);
}));

router.get('/guided/next-actions', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const { getNextActions } = await import('../../../onboarding/services/journey/guided-experience.service');
  const systemRole = req.user?.role || 'user';
  const userId = req.user?.userId;
  const actions = await getNextActions(req.tenantId, userId, systemRole);
  res.json({ actions });
}));

// Route-path → page-help key aliases (frontend routes don't always match help keys)
const PAGE_HELP_ALIASES: Record<string, string> = {
  '/vendor-risk': '/vendor-hub',
  '/incidents': '/incident-hub',
  '/bcp': '/bcp-hub',
  '/training': '/training-hub',
};

router.get('/guided/page-help/:route', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const { getPageHelp } = await import('../../../onboarding/services/journey/guided-experience.service');
  let route = '/' + req.params.route;
  route = PAGE_HELP_ALIASES[route] || route;
  const help = getPageHelp(route) || getPageHelp(route + '-hub');
  if (!help) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(help);
}));

router.get('/guided/page-help', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const { getAllPageHelp } = await import('../../../onboarding/services/journey/guided-experience.service');
  res.json({ pages: getAllPageHelp() });
}));

router.get('/guided/team-setup', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const { getTeamSetupWizard } = await import('../../../onboarding/services/journey/guided-experience.service');
  const steps = await getTeamSetupWizard(req.tenantId);
  const completed = steps.filter(s => s.completed).length;
  res.json({ steps, completed, total: steps.length, percentage: Math.round((completed / steps.length) * 100) });
}));

router.get('/guided/faq', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {

  const { getCommonQuestions } = await import('../../../onboarding/services/journey/guided-experience.service');
  const questions = getCommonQuestions();
  const category = req.query.category as string;
  const filtered = category ? questions.filter(q => q.category === category) : questions;
  res.json({ questions: filtered, count: filtered.length });
}));

// ── Agent Capabilities Playbook ──────────────────────────────────────────────

router.get('/guided/agent-capabilities', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (_req: Request, res: Response) => {

  const { getAgentRbacEntries, AGENT_RBAC_MAP: _AGENT_RBAC_MAP } = await import('@dos/platform-core/settings/platform-mode-gate.service');
  const { computeHyperRole, mapModeToAutonomy } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');

  const modes = ['human', 'hybrid', 'shadow_agent', 'full_autonomous'] as const;
  const actionTypes = [
    'CREATE_TASK', 'SEND_NOTIFICATION', 'PUBLISH_EVENT', 'FLAG_RISK',
    'REQUEST_EVIDENCE', 'CREATE_CONTROL', 'UPDATE_RISK_SCORE', 'CREATE_FINDING',
    'CLOSE_INCIDENT', 'UPDATE_CONTROL_STATUS', 'CREATE_REMEDIATION', 'ESCALATE', 'TRIGGER_SYNC',
  ];
  const alwaysRequireApproval = ['CHANGE_PATH', 'CLOSE_RISK', 'MODIFY_CONTROL', 'REASSIGN', 'ESCALATE', 'CREATE_POLICY'];

  const agents = getAgentRbacEntries().map(agent => {
    const modeCapabilities: Record<string, { canExecute: string[]; queued: string[]; blocked: string[] }> = {};
    for (const mode of modes) {
      const autonomy = mapModeToAutonomy(mode);
      const canExecute: string[] = [];
      const queued: string[] = [];
      const blocked: string[] = [];

      for (const action of actionTypes) {
        const result = computeHyperRole(agent.permissions, agent.agentId, action, autonomy, mode);
        if (result.canExecute) canExecute.push(action);
        else queued.push(action);
      }
      for (const action of alwaysRequireApproval) {
        if (!actionTypes.includes(action)) {
          const result = computeHyperRole(agent.permissions, agent.agentId, action, autonomy, mode);
          if (result.canExecute) canExecute.push(action);
          else queued.push(action);
        }
      }
      modeCapabilities[mode] = { canExecute, queued, blocked };
    }

    return {
      agentId: agent.agentId,
      name: agent.name,
      nameAr: agent.nameAr,
      grcRole: agent.grcRole,
      grcRoleAr: agent.grcRoleAr,
      domain: agent.domain,
      domainAr: agent.domainAr,
      permissions: agent.permissions,
      icon: agent.icon,
      color: agent.color,
      description: agent.description,
      descriptionAr: agent.descriptionAr,
      modeCapabilities,
    };
  });

  const modeDescriptions = {
    human: { label: 'Human Mode', labelAr: 'وضع الإنسان', autonomy: 'L0', behavior: 'All actions queued for human approval', behaviorAr: 'جميع الإجراءات تنتظر الموافقة البشرية' },
    hybrid: { label: 'Hybrid Mode', labelAr: 'الوضع الهجين', autonomy: 'L1', behavior: 'Low/medium auto-execute; high/critical queued', behaviorAr: 'منخفض/متوسط ينفذ تلقائياً؛ عالي/حرج ينتظر' },
    shadow_agent: { label: 'Shadow Agent', labelAr: 'وكيل الظل', autonomy: 'L2', behavior: 'All execute with full audit logging', behaviorAr: 'الكل ينفذ مع تسجيل تدقيقي كامل' },
    full_autonomous: { label: 'Full Autonomous', labelAr: 'ذاتي كامل', autonomy: 'L3', behavior: 'All execute including restricted actions', behaviorAr: 'الكل ينفذ بما في ذلك الإجراءات المقيدة' },
  };

  const safeguards = [
    { id: 'hyper_role', name: 'Hyper-Role Intersection', nameAr: 'تقاطع الدور الهجين', description: 'Human RBAC ∩ Agent capability ∩ Tenant policy', descriptionAr: 'صلاحيات الإنسان ∩ قدرات الوكيل ∩ سياسات المؤسسة' },
    { id: 'daily_limits', name: 'Daily Action Limits', nameAr: 'حدود الإجراءات اليومية', description: 'Max actions per day per shadow agent', descriptionAr: 'حد أقصى للإجراءات اليومية لكل وكيل ظل' },
    { id: 'delegation', name: 'Delegation Rules', nameAr: 'قواعد التفويض', description: 'Per-user action type + priority approval matrix', descriptionAr: 'مصفوفة موافقة نوع الإجراء + الأولوية لكل مستخدم' },
    { id: 'db_policies', name: 'DB Autonomy Policies', nameAr: 'سياسات الاستقلالية', description: 'Tenant-level action-type overrides', descriptionAr: 'تجاوزات نوع الإجراء على مستوى المستأجر' },
    { id: 'prompt_guard', name: 'Prompt Injection Guard', nameAr: 'حماية حقن الأوامر', description: 'Detects and blocks malicious prompt injection', descriptionAr: 'يكتشف ويمنع حقن الأوامر الخبيث' },
    { id: 'output_validation', name: 'Output Validation (Zod)', nameAr: 'تحقق المخرجات', description: 'Schema validation on all LLM outputs', descriptionAr: 'تحقق المخطط على جميع مخرجات نماذج اللغة' },
    { id: 'audit_trail', name: 'Full Audit Trail', nameAr: 'مسار تدقيق كامل', description: 'All 4 modes produce mode_operation_log entries', descriptionAr: 'جميع الأوضاع الأربعة تنتج سجلات عمليات' },
    { id: 'circuit_breaker', name: 'Circuit Breaker', nameAr: 'قاطع الدائرة', description: 'Graceful degradation on LLM failures', descriptionAr: 'تدهور سلس عند فشل نماذج اللغة' },
    { id: 'budget_caps', name: 'Tenant Budget Caps', nameAr: 'حدود ميزانية المستأجر', description: 'Monthly LLM cost limits per tenant', descriptionAr: 'حدود تكلفة شهرية لنماذج اللغة لكل مستأجر' },
    { id: 'pdpl_consent', name: 'PDPL Consent', nameAr: 'موافقة PDPL', description: 'Right-to-forget and data processing consent', descriptionAr: 'حق النسيان وموافقة معالجة البيانات' },
    { id: 'pii_redaction', name: 'PII Redaction', nameAr: 'تنقيح البيانات الشخصية', description: 'Automatic PII detection and masking', descriptionAr: 'كشف وإخفاء البيانات الشخصية تلقائياً' },
  ];

  res.json({
    agents,
    modes: modeDescriptions,
    alwaysRequireApproval,
    actionTypes,
    safeguards,
    executionPipeline: [
      { step: 1, gate: 'Shadow Daily Limit', gateAr: 'الحد اليومي للظل', description: 'If shadow user daily limit reached, action queued immediately' },
      { step: 2, gate: 'Delegation Rules', gateAr: 'قواعد التفويض', description: 'Per-user delegation rules checked (action type + priority)' },
      { step: 3, gate: 'Hyper-Role', gateAr: 'الدور الهجين', description: 'Human RBAC ∩ Agent capability ∩ Tenant policy intersection' },
      { step: 4, gate: 'Autonomy Policy', gateAr: 'سياسة الاستقلالية', description: 'DB-backed autonomy policy overrides (min_autonomy, requires_approval)' },
      { step: 5, gate: 'Mode Gate', gateAr: 'بوابة الوضع', description: 'Platform mode decision (execute/queue/log based on mode × priority)' },
    ],
  });
});

export default router;
