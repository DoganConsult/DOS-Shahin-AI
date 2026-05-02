import { eventBus } from '../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type LocalKnowledgeEntityType = 'document' | 'chunk' | 'index' | 'query' | 'source';
export type LocalKnowledgeAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'document_ingested' | 'document_indexed' | 'chunk_created' | 'chunk_updated'
  | 'index_rebuilt' | 'index_failed' | 'query_executed' | 'source_connected' | 'source_disconnected'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface LocalKnowledgeEventOptions {
  tenantId: string;
  entityType: LocalKnowledgeEntityType;
  entityId: string;
  action: LocalKnowledgeAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: LocalKnowledgeAction): 'info' | 'warning' | 'critical' {
  if (act === 'index_failed' || act === 'source_disconnected') return 'critical';
  if (act === 'escalated' || act === 'deleted') return 'warning';
  return 'info';
}

export function emitLocalKnowledgeEvent(opts: LocalKnowledgeEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `local_knowledge.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'local-knowledge',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitLocalKnowledgeStatusChange(
  tenantId: string, entityType: LocalKnowledgeEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitLocalKnowledgeEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitDocumentIngested(tenantId: string, documentId: string, sourceType: string, triggeredBy: string): void {
  emitLocalKnowledgeEvent({ tenantId, entityType: 'document', entityId: documentId, action: 'document_ingested', triggeredBy, data: { sourceType } });
}

export function emitIndexRebuilt(tenantId: string, indexId: string, documentCount: number, triggeredBy: string): void {
  emitLocalKnowledgeEvent({ tenantId, entityType: 'index', entityId: indexId, action: 'index_rebuilt', triggeredBy, data: { documentCount } });
}

export function emitIndexFailed(tenantId: string, indexId: string, errorReason: string, triggeredBy: string): void {
  emitLocalKnowledgeEvent({ tenantId, entityType: 'index', entityId: indexId, action: 'index_failed', triggeredBy, data: { errorReason } });
}
