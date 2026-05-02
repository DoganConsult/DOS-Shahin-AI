/**
 * Canonical Event Envelope
 * Source: DOS-AIO-Specs/Global-Platform-Operating-Constitution-v1.md
 * Rule: All events across all services MUST use this envelope format.
 */

export interface DosEventEnvelope<T = unknown> {
  /** Unique event ID (UUID). Used as idempotency key for consumers. */
  event_id: string;

  /** Dot-separated event type: <domain>.<entity>.<action>  e.g., 'risk.assessment.completed' */
  event_type: string;

  /** Schema version of this event type. Increment on breaking payload changes. */
  version: number;

  /** Module that owns and published this event. */
  module_code: string;

  /** Entity type this event relates to. */
  entity_type: string;

  /** ID of the entity this event relates to. */
  entity_id: string;

  /** Tenant context. All events are tenant-scoped. */
  tenant_id: string;

  /** Actor who triggered the event. */
  actor_type: 'user' | 'system' | 'agent' | 'scheduler';

  /** Actor ID (userId, agentCode, 'system', etc.) */
  actor_id: string;

  /** How the event was triggered. */
  source: 'api' | 'event' | 'scheduler' | 'migration' | 'seed' | 'agent';

  /** Distributed trace ID. Propagated from inbound request. */
  correlation_id: string;

  /** ISO 8601 timestamp when the event occurred. */
  occurred_at: string;

  /** Service that published this event. */
  published_by: string;

  /** Typed event payload. */
  payload: T;

  /** Optional metadata (before/after summary for audit, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Dead Letter Queue entry for failed event processing.
 */
export interface DosDeadLetterEntry {
  envelope: DosEventEnvelope;
  error: string;
  failed_at: string;
  delivery_count: number;
  original_stream: string;
  consumer_group: string;
}
