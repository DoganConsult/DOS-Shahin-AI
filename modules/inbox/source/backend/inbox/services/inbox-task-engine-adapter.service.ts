/**
 * Inbox Task Engine Adapter
 *
 * Registers the Inbox module as the Platform Task Engine handler.
 * Call registerInboxTaskHandler() during inbox module bootstrap.
 *
 * This is the critical decoupling link: Platform Task Engine doesn't know
 * about inbox, but inbox registers itself as the task resolver.
 * Domain modules call submitTask() without any inbox import.
 */

import { registerTaskHandler, PlatformTaskPayload, PlatformTaskResult } from '../ports/platform.port';
import { InboxRepository } from '../repositories/inbox.repository';
import { logger } from '../ports/logger.port';
import { safeQuery } from "@dos/db";

/**
 * Maps a platform task priority to inbox item priority value.
 */
function mapPriority(priority?: string): string {
  switch (priority) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'low': return 'low';
    default: return 'medium';
  }
}

/**
 * The inbox task handler — creates an inbox item from a platform task payload.
 * Registered as the default Platform Task Engine resolver.
 */
async function inboxTaskHandler(payload: PlatformTaskPayload): Promise<PlatformTaskResult> {
  try {
    const repo = new InboxRepository(payload.tenantId);
    const item = await repo.create({
      tenant_id: payload.tenantId,
      title: payload.title,
      title_ar: payload.titleAr,
      description: payload.description,
      item_type: payload.taskType,
      source_module: payload.sourceModule,
      source_entity_id: payload.sourceEntityId,
      source_entity_type: payload.sourceEntityType,
      assigned_to: payload.assignedTo,
      assigned_role: payload.assignedRole,
      priority: mapPriority(payload.priority),
      due_date: payload.dueDate,
      metadata: payload.metadata,
      status: 'pending',
    });

    return {
      taskId: (item as any)?.id || `inbox-${Date.now()}`,
      status: 'submitted',
    };
  } catch (err: unknown) {
    logger.error('[InboxTaskAdapter] Failed to create inbox item', {
      tenantId: payload.tenantId,
      taskType: payload.taskType,
      error: String(err),
    });
    return { taskId: `failed-${Date.now()}`, status: 'failed' };
  }
}

/**
 * Call this during inbox module bootstrap in server-startup.ts.
 * Registers the inbox as the default Platform Task Engine handler.
 */
export function registerInboxTaskHandler(): void {
  registerTaskHandler(inboxTaskHandler);
  logger.info('[InboxTaskAdapter] Inbox registered as Platform Task Engine handler');
}
