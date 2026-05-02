// ============================================
// Workflow Automation Service — bootstrap default templates / activate existing
// Ported from modules/workflow/source/backend/workflow/services/ops/workflow-automation.service.ts
// Adaptation: getWorkflowTemplatesFromDB / saveWorkflow / instantiateTemplate
// helpers do not exist inside ai-engine-service. The same SQL the monolith
// helpers run is inlined here via withTenantClient.
// ============================================

import { withTenantClient, getFirstRow } from '@dos/db';

export interface ActionExecutionResult {
  actionId: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const BASIC_WORKFLOWS = [
  {
    templateKey: 'policy_review_approval',
    name: 'Policy Review & Approval',
    definition: {
      nodes: [
        { id: 'n1', type: 'governance', subType: 'approval', config: {}, position: { x: 0, y: 0 } },
      ],
      edges: [],
      swimlanes: [],
      triggers: [{ type: 'policy_update' }],
    },
  },
  {
    templateKey: 'risk_assessment_review',
    name: 'Risk Assessment Review',
    definition: {
      nodes: [
        { id: 'n1', type: 'governance', subType: 'approval', config: {}, position: { x: 0, y: 0 } },
      ],
      edges: [],
      swimlanes: [],
      triggers: [{ type: 'risk_created' }],
    },
  },
  {
    templateKey: 'incident_response',
    name: 'Incident Response',
    definition: {
      nodes: [
        { id: 'n1', type: 'action', subType: 'notification', config: {}, position: { x: 0, y: 0 } },
      ],
      edges: [],
      swimlanes: [],
      triggers: [{ type: 'incident_created' }],
    },
  },
];

export async function executeWorkflowAutomation(
  tenantId: string,
  userId: string,
): Promise<ActionExecutionResult> {
  return withTenantClient(tenantId, async (client) => {
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM workflow_templates`,
    );
    const templatesCount = (getFirstRow(countResult) as { count?: number } | undefined)?.count ?? 0;

    if (templatesCount === 0) {
      let created = 0;
      for (const wf of BASIC_WORKFLOWS) {
        try {
          await client.query(
            `INSERT INTO workflow_templates (template_key, name, definition, created_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (template_key) DO NOTHING`,
            [wf.templateKey, wf.name, JSON.stringify(wf.definition), userId],
          );
          created++;
        } catch {
          // skip on error — best-effort bootstrap
        }
      }
      return {
        actionId: 'workflow-automation',
        success: true,
        message: `Created ${created} workflow definitions`,
        details: { created },
      };
    }

    const activateResult = await client.query(
      `INSERT INTO workflow_instances (template_key, status, created_by)
       SELECT template_key, 'active', $1 FROM workflow_templates LIMIT 5
       RETURNING instance_id`,
      [userId],
    );
    const activated = activateResult.rowCount ?? activateResult.rows?.length ?? 0;

    return {
      actionId: 'workflow-automation',
      success: true,
      message: `Activated ${activated} workflow templates`,
      details: { activated, totalTemplates: templatesCount },
    };
  });
}

export async function getAutomationStatus(
  tenantId: string,
): Promise<{ templatesCount: number; instancesCount: number }> {
  return withTenantClient(tenantId, async (client) => {
    const [tplResult, instResult] = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS count FROM workflow_templates`),
      client.query(`SELECT COUNT(*)::int AS count FROM workflow_instances`),
    ]);
    const templatesCount = (getFirstRow(tplResult) as { count?: number } | undefined)?.count ?? 0;
    const instancesCount = (getFirstRow(instResult) as { count?: number } | undefined)?.count ?? 0;
    return { templatesCount, instancesCount };
  });
}
