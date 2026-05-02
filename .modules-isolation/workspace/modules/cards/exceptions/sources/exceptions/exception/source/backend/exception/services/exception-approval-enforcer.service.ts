import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { createNotification } from '../../notification/services/notification.service';
import { swallow, EC, catchHandler } from '@dos/platform-core/resilience';
import { Engine as RulesEngine } from 'json-rules-engine';
import { tryLifecycleTransition, SYSTEM_JOB_ACTOR } from '../ports/platform.port';

const exceptionRulesEngine = new RulesEngine();

exceptionRulesEngine.addRule({
  conditions: {
    all: [
      { fact: 'riskImpact', operator: 'in', value: ['critical', 'high'] },
      { fact: 'requestedDuration', operator: 'greaterThanInclusive', value: 90 },
    ],
  },
  event: { type: 'requires_ciso_approval' },
});

exceptionRulesEngine.addRule({
  conditions: {
    any: [
      { fact: 'linkedEntityType', operator: 'equal', value: 'compliance_gap' },
      { fact: 'riskImpact', operator: 'equal', value: 'critical' },
    ],
  },
  event: { type: 'requires_compliance_review' },
});

exceptionRulesEngine.addRule({
  conditions: {
    all: [
      { fact: 'renewalCount', operator: 'greaterThanInclusive', value: 2 },
    ],
  },
  event: { type: 'escalate_to_board' },
});

export interface ExceptionApprovalResult {
  requiresCiso: boolean;
  requiresComplianceReview: boolean;
  escalateToBoard: boolean;
  approvalChain: string[];
  autoApprovalEligible: boolean;
}

export async function evaluateExceptionApproval(
  tenantId: string,
  exceptionId: string,
): Promise<ExceptionApprovalResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function enforceExceptionApprovalWorkflow(
  tenantId: string,
  exceptionId: string,
  requestedBy: string,
): Promise<void> {
  const result = await evaluateExceptionApproval(tenantId, exceptionId);
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".exceptions
     SET approval_chain = $1, requires_ciso = $2, requires_board = $3, updated_at = NOW()
     WHERE exception_id = $4`,
    [JSON.stringify(result.approvalChain), result.requiresCiso, result.escalateToBoard, exceptionId],
  );

  if (result.autoApprovalEligible) {
    const lifecycle = await tryLifecycleTransition(tenantId, {
      moduleCode: 'exception', entityId: exceptionId,
      fromStatus: 'under_review', toStatus: 'approved', actorUserId: SYSTEM_JOB_ACTOR,
    });
    if (lifecycle.handled && lifecycle.denied) {
      logger.warn(`[ExceptionApproval] auto-approval denied by lifecycle: ${lifecycle.result?.reason}`);
      return;
    }
    await safeQuery(
      `UPDATE "${schema}".exceptions SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE exception_id = $1 AND status IN ('under_review', 'submitted')`,
      [exceptionId],
    );
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'exception.auto_approved' as any,

      tenantId, sourceService: 'exception-approval', severity: 'info',
      entityType: 'exception', entityId: exceptionId,
      payload: { exceptionId, autoApproved: true },
    }));
    await swallow(EC.EVENT_BUS, recordAudit({
      tenantId, userId: SYSTEM_JOB_ACTOR, module: 'exception', action: 'update',
      entityType: 'exception', entityId: exceptionId,
      afterState: { status: 'approved', autoApproved: true },
    }));
    return;
  }

  const firstApprover = result.approvalChain[0];
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
        title: `Exception approval required${result.requiresCiso ? ' (CISO escalation)' : ''}`,
        body: `Exception ${exceptionId} requires your approval. Chain: ${result.approvalChain.join(' → ')}`,
        link: `/exceptions/${exceptionId}`,
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch { /* approver resolution non-fatal */ }

  await createProcessTask(tenantId, {
    title: `Exception approval: ${result.escalateToBoard ? 'Board escalation' : result.requiresCiso ? 'CISO review' : 'Standard review'}`,
    description: `Exception ${exceptionId} submitted. Approval chain: ${result.approvalChain.join(' → ')}`,
    taskType: 'exception_review',
    priority: result.requiresCiso ? 'critical' : 'high',
    entityType: 'exception',
    entityId: exceptionId,
    triggerSource: 'exception.submitted',
  });

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'exception.approval_requested' as any,

    tenantId, sourceService: 'exception-approval', severity: result.requiresCiso ? 'warning' : 'info',
    entityType: 'exception', entityId: exceptionId,
    payload: { exceptionId, ...result, requestedBy },
  }));
}

export function registerExceptionApprovalSubscribers(): void {
  eventBus.subscribe('exception.submitted' as any, 'exception.approval.submit', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const exceptionId = event.payload?.entityId as string || event.entityId;
    const requestedBy = event.payload?.requestedBy as string || 'system';
    if (exceptionId) {
      try {
        await enforceExceptionApprovalWorkflow(event.tenantId, exceptionId, requestedBy);
      } catch (err) {
        logger.error(`[ExceptionApproval] workflow failed: ${(err as Error).message}`);
      }
    }
  });

  eventBus.subscribe('exception.expiry_approaching' as any, 'exception-approval:expiry-warn', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const exceptionId = event.payload?.exceptionId as string || event.entityId;
    if (exceptionId) {
      await createProcessTask(event.tenantId, {
        title: `Exception expiring soon: ${exceptionId}`,
        description: `Exception is approaching expiry. Review and decide on renewal or closure.`,
        taskType: 'exception_review',
        priority: 'high',
        entityType: 'exception',
        entityId: exceptionId,
        triggerSource: 'exception.expiry_approaching',
      });
    }
  });

  logger.info('[ExceptionApproval] subscribers registered');
}
