/**
 * Knowledge Module Event Subscribers
 * @owner knowledge
 */
import { onEvent } from '../ports/events.port';
import { createProcessTask } from '../ports/lifecycle.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

// -- foundation.scope_changed (Phase 3, F-024) ------------------------------
//
// When Foundation org scope changes (org/department/business-unit reparented),
// knowledge access for articles linked to that scope must be recomputed.
// We surface a recompute task per event; idempotency on (triggerSource,
// entityId) is enforced by the task store.
async function handleFoundationScopeChanged(event: any): Promise<void> {
  const { tenantId, payload } = event ?? {};
  if (!tenantId || !payload) return;
  const entityId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!entityId) return;
  const entityType = (payload.entityType as string | undefined) ?? 'org_unit';

  await createProcessTask(tenantId, {
    title: 'Recompute knowledge access — Foundation scope changed',
    description: `Recompute knowledge article access for ${entityType} ${entityId} after parent change.`,
    taskType: 'knowledge_access_recompute',
    priority: 'medium',
    entityType,
    entityId,
    triggerSource: 'foundation.scope_changed',
  });
}

handlers.set('foundation.scope_changed', handleFoundationScopeChanged as EventHandler);

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function registerKnowledgeEventSubscribers(): void {
  onEvent('knowledge.article_created', async (_payload: any) => {
    // Process article creation events
  });

  onEvent('knowledge.article_published', async (_payload: any) => {
    // Process publication events, e.g. notify authors, generate vector embeddings
  });

  for (const [eventName, handler] of handlers) {
    onEvent(eventName, async (payload: any) => {
      await handler(payload);
    });
  }
}
