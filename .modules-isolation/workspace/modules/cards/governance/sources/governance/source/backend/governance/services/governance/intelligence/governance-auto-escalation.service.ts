import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';

function tenantSchema(tenantId: string): string {
  return `tenant_${tenantId.replace(/[^a-z0-9_]/gi, '')}`;
}

interface EscalationResult {
  escalated: number;
  boardFlagged: number;
  healthImpacted: number;
}

export async function autoEscalateOverdueActions(tenantId: string): Promise<EscalationResult> {
  const schema = tenantSchema(tenantId);
  const result: EscalationResult = { escalated: 0, boardFlagged: 0, healthImpacted: 0 };

  try {
    const overdue = await safeQuery(`
      SELECT ai.*, 
        EXTRACT(DAY FROM NOW() - COALESCE(ai.deadline, ai.due_date))::int AS days_overdue
      FROM "${schema}".governance_action_items ai
      WHERE ai.deleted_at IS NULL
        AND ai.status NOT IN ('completed','deleted','closed')
        AND COALESCE(ai.deadline, ai.due_date) IS NOT NULL
        AND COALESCE(ai.deadline, ai.due_date) < NOW()
    `);

    for (const action of overdue.rows) {
      const daysOverdue = action.days_overdue || 0;
      const id = action.item_id || action.action_item_id || action.id;
      const escalationRule = action.escalation_rule || '';

      let shouldEscalate = false;
      let newPriority = action.priority;

      if (escalationRule === '0d_committee') {
        shouldEscalate = true;
      } else if (escalationRule === '7d_manager' && daysOverdue >= 7) {
        shouldEscalate = true;
      } else if (escalationRule === '14d_director' && daysOverdue >= 14) {
        shouldEscalate = true;
      } else if (daysOverdue >= 14 && (action.priority === 'critical' || action.priority === 'high')) {
        shouldEscalate = true;
      } else if (daysOverdue >= 30) {
        shouldEscalate = true;
      }

      if (daysOverdue >= 7 && newPriority === 'low') newPriority = 'medium';
      if (daysOverdue >= 14 && newPriority === 'medium') newPriority = 'high';
      if (daysOverdue >= 30 && newPriority !== 'critical') newPriority = 'critical';

      if (shouldEscalate && action.escalation_state !== 'escalated') {
        await safeQuery(`
          UPDATE "${schema}".governance_action_items
          SET escalation_state = 'escalated',
              priority = $2,
              board_attention = CASE WHEN $3::int >= 30 THEN TRUE ELSE COALESCE(board_attention, FALSE) END,
              updated_at = NOW()
          WHERE (item_id = $1 OR action_item_id = $1 OR id = $1)
        `, [id, newPriority, daysOverdue]);
        result.escalated++;

        if (daysOverdue >= 30) {
          result.boardFlagged++;
        }

        await safeQuery(`
          INSERT INTO "${schema}".notifications (user_id, type, title, body, link, read, created_at)
          SELECT COALESCE(ai.assigned_to, ai.owner), 'escalation', $2, $3, '/governance/actions', FALSE, NOW()
          FROM "${schema}".governance_action_items ai
          WHERE (ai.item_id = $1 OR ai.action_item_id = $1 OR ai.id = $1)
            AND COALESCE(ai.assigned_to, ai.owner) IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".notifications n
              WHERE n.type = 'escalation' AND n.link = '/governance/actions'
                AND n.title = $2 AND n.created_at > NOW() - INTERVAL '24 hours'
            )
        `, [
          id,
          `Action escalated: ${action.title_en || action.title || 'Untitled'}`,
          `Action "${action.title_en || action.title || ''}" is ${daysOverdue} days overdue and has been auto-escalated.`,
        ]).catch(catchHandler(EC.EVENT_BUS, {}));

        result.healthImpacted++;
      } else if (newPriority !== action.priority) {
        await safeQuery(`
          UPDATE "${schema}".governance_action_items
          SET priority = $2, updated_at = NOW()
          WHERE (item_id = $1 OR action_item_id = $1 OR id = $1)
        `, [id, newPriority]);
      }
    }

    if (result.healthImpacted > 0) {
      try {

        const { eventBus } = await import('../../../../platform/services/event/event-bus.service.js');
        eventBus.publish(({
                  eventType: 'governance.actions_escalated' as string,
                  tenantId,
                  entityId: '',
                  severity: 'warning',
                  payload: { escalated: result.escalated, boardFlagged: result.boardFlagged },
                } as any));
      } catch (err: unknown) {
        logger.warn('[GovernanceAutoEscalation] Failed to publish escalation event', { 
          tenantId, 
          error: toErrorMessage(err) 
        });
      }
    }
  } catch (err: unknown) {
    logger.error('[GovernanceAutoEscalation] Failed to auto-escalate overdue actions', { 
      tenantId, 
      error: toErrorMessage(err) 
    });
  }

  return result;
}
