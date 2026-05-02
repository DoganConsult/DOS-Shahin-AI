import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { v4 as uuid } from 'uuid';

export async function routeEventToInbox(
  tenantId: string,
  event: PlatformEvent,
  recipientUserIds: string[],
  priority: 'critical' | 'high' | 'medium' | 'low' = 'medium',
): Promise<number> {
  const schema = tenantSchema(tenantId);
  let routed = 0;

  for (const userId of recipientUserIds) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".inbox_items
         (item_id, user_id, source_module, source_event, entity_type, entity_id,
          title, body, priority, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unread', NOW())
         ON CONFLICT DO NOTHING`,
        [
          uuid(), userId,

          event.sourceService || 'platform',
          event.eventType,
          event.entityType || 'unknown',
          event.entityId || '',
          `[${event.severity?.toUpperCase() || 'INFO'}] ${event.eventType}`,
          JSON.stringify(event.payload || {}),
          priority,
        ],
      );
      routed++;
    } catch { /* individual routing non-fatal */ }
  }

  return routed;
}

export async function resolveRecipientsByRole(
  tenantId: string,
  roleCodes: string[],
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT DISTINCT user_id FROM "${schema}".user_roles WHERE role_code = ANY($1)`,
      [roleCodes],
    );
    return res.rows.map(( r: Record<string, unknown>) => r.user_id as string);
  } catch (error) {
    logger.error('[InboxCrossModuleRouterService] Failed to get available users', {
      error: (error as Error).message
    });
    return [];
  }
}

export function registerInboxCrossModuleRouter(): void {
  const criticalEvents = [
    'compliance.posture_critical',
    'bcp.exercise_failed',
    'vendor.risk_changed',
    'incident.created',
    'exception.expiry_approaching',
    'ai-governance.approval_requested',
  ];

  for (const eventType of criticalEvents) {
    eventBus.subscribe(eventType as string, `inbox-router:${eventType}`, async (event: PlatformEvent) => {
      if (!event.tenantId) return;
      try {
        const roles = event.severity === 'critical'
          ? ['ciso', 'risk_lead', 'compliance_lead', 'executive_owner']
          : ['module_lead', 'compliance_lead'];
        const recipients = await resolveRecipientsByRole(event.tenantId, roles);
        if (recipients.length > 0) {
          await routeEventToInbox(
            event.tenantId,
            event,
            recipients,
            event.severity === 'critical' ? 'critical' : 'high',
          );
        }
      } catch { /* non-fatal */ }
    });
  }

  eventBus.subscribe('process_task.completed' as any, 'inbox-router:task-complete', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const assignedTo = event.payload?.assignedTo as string;
    if (assignedTo) {
      await routeEventToInbox(event.tenantId, event, [assignedTo], 'medium');
    }
  });

  logger.info(`[InboxRouter] ${criticalEvents.length + 1} cross-module inbox routing subscribers registered`);
}
