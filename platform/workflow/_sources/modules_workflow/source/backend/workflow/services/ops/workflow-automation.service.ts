import type { ActionExecutionResult } from '../../ports/platform.port';
import { safeQuery } from "@dos/db";

export async function executeWorkflowAutomation(tenantId: string, userId: string): Promise<ActionExecutionResult> {
  const { getWorkflowTemplatesFromDB } = await import('../templates/workflow-templates.service.js');

  const { instantiateTemplate } = await import('../core/workflow.service.js');

  const templates = await getWorkflowTemplatesFromDB(tenantId);
  if (templates.length === 0) {

    const { saveWorkflow } = await import('../core/workflow.service.js');
    const basicWorkflows = [
      { name: 'Policy Review & Approval', nodes: [{ id: 'n1', type: 'governance' as const, subType: 'approval', config: {}, position: { x: 0, y: 0 } }], edges: [], swimlanes: [], triggers: [{ type: 'policy_update' }] },
      { name: 'Risk Assessment Review', nodes: [{ id: 'n1', type: 'governance' as const, subType: 'approval', config: {}, position: { x: 0, y: 0 } }], edges: [], swimlanes: [], triggers: [{ type: 'risk_created' }] },
      { name: 'Incident Response', nodes: [{ id: 'n1', type: 'action' as const, subType: 'notification', config: {}, position: { x: 0, y: 0 } }], edges: [], swimlanes: [], triggers: [{ type: 'incident_created' }] },
    ];

    let created = 0;
    for (const wf of basicWorkflows) {
      try {
        await saveWorkflow(tenantId, { name: wf.name, definition: { nodes: wf.nodes, edges: wf.edges, swimlanes: wf.swimlanes, triggers: wf.triggers }, createdBy: userId });
        created++;
      } catch { /* skip on error */ }
    }
    return { actionId: 'workflow-automation', success: true, message: `Created ${created} workflow definitions`, details: { created } };
  }

  let activated = 0;
  for (const tpl of templates.slice(0, 5)) {
    try {

      await instantiateTemplate(tenantId, ((tpl as Record<string, unknown>) as any).template_id ?? tpl.templateKey, {}, userId);
      activated++;
    } catch { /* skip on error */ }
  }

  return { actionId: 'workflow-automation', success: true, message: `Activated ${activated} workflow templates`, details: { activated, totalTemplates: templates.length } };
}
