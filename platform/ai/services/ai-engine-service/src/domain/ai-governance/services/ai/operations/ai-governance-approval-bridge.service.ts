// @ts-nocheck
import { logger } from '../../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../../../ports/events.port';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service';
import { createNotification } from '../../../../notification/services/notification.service';
import { swallow, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { Engine as RulesEngine } from 'json-rules-engine';
import prom from 'prom-client';

const _aiGovernanceActionsGauge = new prom.Gauge({
  name: 'shahin_ai_governance_pending_approvals',
  help: 'Pending AI governance approvals',
  labelNames: ['tenant_id'],
});

const aiRiskEngine = new RulesEngine();

aiRiskEngine.addRule({
  conditions: {
    any: [
      { fact: 'riskLevel', operator: 'equal', value: 'high' },
      { fact: 'riskLevel', operator: 'equal', value: 'unacceptable' },
      { fact: 'affectedUsers', operator: 'greaterThanInclusive', value: 1000 },
    ],
  },
  event: { type: 'requires_ethics_review' },
});

aiRiskEngine.addRule({
  conditions: {
    any: [
      { fact: 'dataClassification', operator: 'equal', value: 'restricted' },
      { fact: 'dataClassification', operator: 'equal', value: 'confidential' },
      { fact: 'processesPII', operator: 'equal', value: true },
    ],
  },
  event: { type: 'requires_privacy_review' },
});

aiRiskEngine.addRule({
  conditions: {
    all: [
      { fact: 'autonomyLevel', operator: 'greaterThanInclusive', value: 3 },
      { fact: 'decisionImpact', operator: 'in', value: ['financial', 'legal', 'safety'] },
    ],
  },
  event: { type: 'requires_board_approval' },
});

export interface AIGovernanceApprovalResult {
  requiresEthicsReview: boolean;
  requiresPrivacyReview: boolean;
  requiresBoardApproval: boolean;
  approvalChain: string[];
  riskAssessmentRequired: boolean;
  dpiaRequired: boolean;
}

export async function evaluateAIActionApproval(
  tenantId: string,
  actionId: string,
): Promise<AIGovernanceApprovalResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function enforceAIGovernanceWorkflow(
  tenantId: string,
  actionId: string,
  requestedBy: string,
): Promise<void> {
  const result = await evaluateAIActionApproval(tenantId, actionId);

  if (result.dpiaRequired) {
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'privacy.dpia_required' as any,

      tenantId, sourceService: 'ai-governance-approval', severity: 'warning',
      entityType: 'ai_governance_action', entityId: actionId,
      payload: { actionId, reason: 'AI action processes PII or restricted data' },
    }));
  }

  await createProcessTask(tenantId, {
    title: `AI Governance approval: ${result.requiresBoardApproval ? 'Board escalation' : result.requiresEthicsReview ? 'Ethics review' : 'Standard review'}`,
    description: `AI action ${actionId} submitted. Approval chain: ${result.approvalChain.join(' → ')}`,
    taskType: 'ai_governance_review',
    priority: result.requiresBoardApproval ? 'critical' : result.requiresEthicsReview ? 'high' : 'medium',
    entityType: 'ai_governance_action',
    entityId: actionId,
    triggerSource: 'ai-governance.action_submitted',
  });

  const firstApprover = result.approvalChain[0];
  const schema = tenantSchema(tenantId);
  try {
    const approverRes = await safeQuery(
      `SELECT user_id FROM "${schema}".user_roles WHERE role_code = $1 LIMIT 1`,
      [firstApprover],
    );
    const approverId = getFirstRow(approverRes)?.user_id;
    if (approverId) {
      await createNotification(tenantId, {
        userId: approverId,
        type: 'approval_required',
        title: `AI Governance: Action requires approval`,
        body: `AI action ${actionId} needs review. Chain: ${result.approvalChain.join(' → ')}`,
        link: `/ai-governance/actions/${actionId}`,
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch { /* non-fatal */ }

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'ai-governance.approval_requested' as any,

    tenantId, sourceService: 'ai-governance-approval', severity: result.requiresBoardApproval ? 'critical' : 'info',
    entityType: 'ai_governance_action', entityId: actionId,
    payload: { actionId, ...result, requestedBy },
  }));

  await swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: requestedBy, module: 'ai-governance', action: 'create',
    entityType: 'ai_governance_approval', entityId: actionId,
    afterState: { ...result },
  }));
}

export function registerAIGovernanceApprovalSubscribers(): void {
  eventBus.subscribe('ai-governance.action_submitted' as any, 'ai-gov-approval:submitted', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const actionId = event.payload?.actionId as string || event.entityId;
    const requestedBy = event.payload?.requestedBy as string || 'system';
    if (actionId) {
      try {
        await enforceAIGovernanceWorkflow(event.tenantId, actionId, requestedBy);
      } catch (err) {
        logger.error(`[AIGovernanceApproval] workflow failed: ${(err as Error).message}`);
      }
    }
  });

  eventBus.subscribe('ai-governance.model_deployed' as any, 'ai-gov-approval:model-audit', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const modelId = event.payload?.modelId as string || event.entityId;
    await swallow(EC.EVENT_BUS, recordAudit({
      tenantId: event.tenantId, userId: event.payload?.deployedBy as string || 'system',
      module: 'ai-governance', action: 'create',
      entityType: 'ai_model_deployment', entityId: modelId || '',
      afterState: { modelId, version: event.payload?.version, environment: event.payload?.environment },
    }));
  });

  logger.info('[AIGovernanceApproval] subscribers registered');
}
