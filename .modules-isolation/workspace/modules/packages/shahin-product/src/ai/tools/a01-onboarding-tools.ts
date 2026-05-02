// ================================================================
// A01 — Onboarding & Health Monitor
// Tools: scan org profile, check framework adoption, check workspace health
// ================================================================

import { tenantSchema } from '@dos/db';
import { AgentToolDefinition } from '@dos/module-sdk';
import { createProcessTask } from '@dos/platform-core/workflows';
import { safeRows } from '@dos/module-sdk';

export function buildA01Tools(): AgentToolDefinition[] {
  return [
    {
      name: 'scan_org_profile',
      description: 'Scan the organization profile for completeness. Returns all profile fields and flags missing critical fields.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const rows = await safeRows(
          `SELECT org_name, org_type, legal_form, listing_status, org_size, employee_count,
                  sector_ids, primary_sector_id, critical_infrastructure,
                  data_classification_level, cloud_providers, uses_ai_ml,
                  processes_payment_cards, has_ot_scada, has_ciso, has_dpo,
                  grc_maturity_level, settings, status, onboarding_step
           FROM tenants WHERE tenant_id = $1`, [tenantId]
        );
        if (rows.length === 0) return { error: 'Tenant not found' };
        const t = rows[0];
        const missing: string[] = [];
        if (!t.org_type) missing.push('org_type');
        if (!t.primary_sector_id) missing.push('primary_sector_id');
        if (!t.employee_count) missing.push('employee_count');
        if (!t.data_classification_level) missing.push('data_classification_level');
        if (t.has_ciso === null) missing.push('has_ciso');
        if (t.has_dpo === null) missing.push('has_dpo');
        return { profile: t, missingFields: missing, completeness: missing.length === 0 ? 'complete' : `${missing.length} fields missing` };
      },
    },
    {
      name: 'check_framework_adoption',
      description: 'Check which regulatory frameworks are adopted and identify gaps. Returns adopted frameworks with control counts.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const frameworks = await safeRows(`SELECT framework_id, name, status, controls_total, controls_compliant FROM "${schema}".frameworks ORDER BY name`);
        const controlCount = await safeRows(`SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls`);
        return { frameworks, totalControls: controlCount[0]?.n || 0, adoptedCount: frameworks.length };
      },
    },
    {
      name: 'check_workspace_health',
      description: 'Get overall workspace health: counts of risks, controls, policies, evidence, incidents, tasks, and recent activity.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const [risks, controls, policies, evidence, incidents, tasks, recentActivity] = await Promise.all([
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status != 'closed')::int AS open FROM "${schema}".risks`),
          safeRows(`SELECT COUNT(*)::int AS total FROM "${schema}".ucf_controls`),
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'draft')::int AS draft FROM "${schema}".policies`),
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE expires_at < NOW())::int AS expired FROM "${schema}".evidence`),
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'open')::int AS open FROM "${schema}".incidents`),
          safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'open')::int AS open FROM "${schema}".tasks`),
          safeRows(`SELECT COUNT(*)::int AS n FROM "${schema}".activity_feed WHERE created_at > NOW() - INTERVAL '24 hours'`),
        ]);
        return {
          risks: risks[0] || {}, controls: controls[0] || {},
          policies: policies[0] || {}, evidence: evidence[0] || {},
          incidents: incidents[0] || {}, tasks: tasks[0] || {},
          recentActivityCount: recentActivity[0]?.n || 0,
        };
      },
    },
    {
      name: 'create_onboarding_task',
      description: 'Create a task to address an onboarding gap (e.g., missing profile field, unadopted framework).',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'What needs to be done' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          assignToRole: { type: 'string', enum: ['admin', 'owner', 'compliance_officer'] },
        },
        required: ['title', 'description', 'priority'],
      },
      handler: async (tenantId, input) => {
        const task = await createProcessTask(tenantId, {
          title: `[A01] ${input.title as string}`,
          description: input.description as string | undefined,
          taskType: 'remediation',
          priority: (input.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
          entityType: 'onboarding',
          triggerSource: 'agent_A01',
          createdBy: 'agent-A01',
        });
        return { created: true, taskId: task.taskId };
      },
    },
  ];
}
