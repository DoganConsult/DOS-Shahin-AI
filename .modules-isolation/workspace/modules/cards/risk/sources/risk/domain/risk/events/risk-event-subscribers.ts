// ============================================
// Shahin — Risk Event Subscribers Registration
// Registers all risk event handlers with platform event bus
// ============================================

import { logger } from '@dos/module-sdk';
import { eventBus } from '../ports/events.port';
import { 
  emitRiskEvent, 
  emitRiskStatusChange 
} from '../services/integration/risk-event.service';
import { 
  onWorkflowTriggered, 
  onTaskCreated, 
  onApprovalRequired, 
  onEscalation, 
  onClosure, 
  onFailure 
} from '../services/workflow/risk-workflow.service';
import type { RiskWorkflowContext } from '../services/workflow/risk-workflow.service';

/**
 * Register all risk event subscribers with platform event bus
 */
export async function registerRiskEventSubscribers(): Promise<void> {
  try {
    // Register risk event handlers
    eventBus.subscribe('risk.created', 'risk-module', async (event) => {
      const eventData = event.data as any;
      logger.info('[risk-subscriber] Risk created', { riskId: eventData?.riskId });
      await emitRiskEvent({
        tenantId: eventData?.tenantId,
        entityType: 'risk',
        entityId: eventData?.riskId,
        action: 'created',
        triggeredBy: eventData?.triggeredBy || 'system',
        data: eventData
      });
    });

    eventBus.subscribe('risk.status.changed', 'risk-module', async (event) => {
      const eventData = event.data as any;
      logger.info('[risk-subscriber] Risk status changed', { 
        riskId: eventData?.riskId, 
        fromStatus: eventData?.fromStatus, 
        toStatus: eventData?.toStatus 
      });
      await emitRiskStatusChange(
        eventData?.tenantId,
        'risk',
        eventData?.riskId,
        eventData?.fromStatus,
        eventData?.toStatus,
        eventData?.triggeredBy || 'system'
      );
    });

    eventBus.subscribe('risk.score.changed', 'risk-module', async (event) => {
      const eventData = event.data as any;
      logger.info('[risk-subscriber] Risk score changed', { 
        riskId: eventData?.riskId, 
        oldScore: eventData?.oldScore, 
        newScore: eventData?.newScore 
      });
      await emitRiskEvent({
        tenantId: eventData?.tenantId,
        entityType: 'risk',
        entityId: eventData?.riskId,
        action: 'score_changed',
        triggeredBy: eventData?.triggeredBy || 'system',
        data: eventData
      });
    });

    eventBus.subscribe('risk.treatment.updated', 'risk-module', async (event) => {
      const eventData = event.data as any;
      logger.info('[risk-subscriber] Risk treatment updated', { 
        riskId: eventData?.riskId, 
        treatmentId: eventData?.treatmentId 
      });
      await emitRiskEvent({
        tenantId: eventData?.tenantId,
        entityType: 'risk',
        entityId: eventData?.riskId,
        action: 'treatment_started', // or updated
        triggeredBy: eventData?.triggeredBy || 'system',
        data: eventData
      });
    });

    eventBus.subscribe('risk.appetite.breached', 'risk-module', async (event) => {
      const eventData = event.data as any;
      logger.info('[risk-subscriber] Risk appetite breached', { 
        riskId: eventData?.riskId, 
        threshold: eventData?.threshold, 
        actualValue: eventData?.actualValue 
      });
      await emitRiskEvent({
        tenantId: eventData?.tenantId,
        entityType: 'risk',
        entityId: eventData?.riskId,
        action: 'appetite_exceeded',
        triggeredBy: eventData?.triggeredBy || 'system',
        data: eventData
      });
    });

    // Register workflow event handlers
    eventBus.subscribe('workflow.triggered', 'risk-module', async (event) => {
      const eventData = event.data as any;
      if (eventData?.entityType === 'risk') {
        logger.info('[risk-subscriber] Risk workflow triggered', { 
          entityId: eventData?.entityId, 
          triggeredBy: eventData?.triggeredBy 
        });
        await onWorkflowTriggered(eventData as RiskWorkflowContext);
      }
    });

    eventBus.subscribe('workflow.task.created', 'risk-module', async (event) => {
      const eventData = event.data as any;
      if (eventData?.entityType === 'risk') {
        logger.info('[risk-subscriber] Risk workflow task created', { 
          entityId: eventData?.entityId, 
          taskId: eventData?.taskId 
        });
        await onTaskCreated(eventData as RiskWorkflowContext, eventData?.taskId);
      }
    });

    eventBus.subscribe('workflow.approval.required', 'risk-module', async (event) => {
      const eventData = event.data as any;
      if (eventData?.entityType === 'risk') {
        logger.info('[risk-subscriber] Risk approval required', { 
          entityId: eventData?.entityId, 
          approverRole: eventData?.approverRole 
        });
        await onApprovalRequired(eventData as RiskWorkflowContext, eventData?.approverRole);
      }
    });

    eventBus.subscribe('workflow.escalated', 'risk-module', async (event) => {
      const eventData = event.data as any;
      if (eventData?.entityType === 'risk') {
        logger.info('[risk-subscriber] Risk workflow escalated', { 
          entityId: eventData?.entityId, 
          reason: eventData?.reason, 
          escalateTo: eventData?.escalateTo 
        });
        await onEscalation(eventData as RiskWorkflowContext, eventData?.reason, eventData?.escalateTo);
      }
    });

    eventBus.subscribe('workflow.closed', 'risk-module', async (event) => {
      const eventData = event.data as any;
      if (eventData?.entityType === 'risk') {
        logger.info('[risk-subscriber] Risk workflow closed', { 
          entityId: eventData?.entityId, 
          closureReason: eventData?.closureReason 
        });
        await onClosure(eventData as RiskWorkflowContext, eventData?.closureReason);
      }
    });

    eventBus.subscribe('workflow.failed', 'risk-module', async (event) => {
      const eventData = event.data as any;
      if (eventData?.entityType === 'risk') {
        logger.info('[risk-subscriber] Risk workflow failed', { 
          entityId: eventData?.entityId, 
          error: eventData?.error 
        });
        await onFailure(eventData as RiskWorkflowContext, eventData?.error);
      }
    });

    logger.info('[risk-subscribers] All risk event subscribers registered successfully');
  } catch (error) {
    logger.error('[risk-subscribers] Failed to register event subscribers', { error: (error as Error).message });
    throw error;
  }
}
