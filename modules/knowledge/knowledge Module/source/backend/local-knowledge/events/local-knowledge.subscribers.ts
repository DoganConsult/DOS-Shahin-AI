/**
 * LocalKnowledge Module — Event Subscribers
 *
 * Bidirectional integration: subscribes to cross-module events to maintain
 * module state consistency and trigger domain-specific reactions.
 *
 * Law 12: All event-driven actions are auditable.
 * Law 2: Consumes events via DOS event bus, does not own other modules' truth.
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { eventBus, type PlatformEvent, emitEvent } from '../ports/events.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Consumed Events ──────────────────────────────────────────────

const _CONSUMED_EVENTS = [
  'policy.published',
  'compliance.framework_updated',
  'evidence.document_ingested',
  'audit.finding_created',
  'governance.charter_approved',
  'training.content_updated',
  'reporting.report_generated',
];

// ── Handlers ─────────────────────────────────────────────────────


async function handle_policy_published(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing policy.published', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'policy',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'policy_published',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'policy.published', sourceModule: 'policy', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.published_processed',
          entityType: 'policy_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'policy.published', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process policy.published', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_compliance_framework_updated(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing compliance.framework_updated', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'compliance',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'compliance_framework_updated',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'compliance.framework_updated', sourceModule: 'compliance', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.framework_updated_processed',
          entityType: 'compliance_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'compliance.framework_updated', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process compliance.framework_updated', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_evidence_document_ingested(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing evidence.document_ingested', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'evidence',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'evidence_document_ingested',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'evidence.document_ingested', sourceModule: 'evidence', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.document_ingested_processed',
          entityType: 'evidence_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'evidence.document_ingested', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process evidence.document_ingested', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_audit_finding_created(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing audit.finding_created', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'audit',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'audit_finding_created',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'audit.finding_created', sourceModule: 'audit', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.finding_created_processed',
          entityType: 'audit_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'audit.finding_created', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process audit.finding_created', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_governance_charter_approved(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing governance.charter_approved', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'governance',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'governance_charter_approved',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'governance.charter_approved', sourceModule: 'governance', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.charter_approved_processed',
          entityType: 'governance_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'governance.charter_approved', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process governance.charter_approved', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_training_content_updated(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing training.content_updated', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'training',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'training_content_updated',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'training.content_updated', sourceModule: 'training', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.content_updated_processed',
          entityType: 'training_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'training.content_updated', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process training.content_updated', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_reporting_report_generated(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[LocalKnowledge] Processing reporting.report_generated', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'reporting',
    });

    // Record cross-module event for local-knowledge domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'local-knowledge', 'event_received', 'reporting_report_generated',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'reporting.report_generated', sourceModule: 'reporting', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'local-knowledge',
          event: 'local_knowledge.report_generated_processed',
          entityType: 'reporting_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'reporting.report_generated', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[LocalKnowledge] Failed to process reporting.report_generated', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Registration ─────────────────────────────────────────────────

/**
 * Register all event subscribers for the local-knowledge module.
 * Called during server startup from agrc-event-subscribers.ts.
 */
export function registerLocalKnowledgeEventSubscribers(): void {
  const handlers: Record<string, (event: PlatformEvent) => Promise<void>> = {
    'policy.published': handle_policy_published,
    'compliance.framework_updated': handle_compliance_framework_updated,
    'evidence.document_ingested': handle_evidence_document_ingested,
    'audit.finding_created': handle_audit_finding_created,
    'governance.charter_approved': handle_governance_charter_approved,
    'training.content_updated': handle_training_content_updated,
    'reporting.report_generated': handle_reporting_report_generated,
  };

  for (const [eventName, handler] of Object.entries(handlers)) {
    try {
      eventBus.subscribe(
        eventName as string,
        `local-knowledge:${eventName}`,
        handler,
      );
    } catch {
      // Event type may not be registered yet — non-fatal
    }
  }

  logger.info('[LocalKnowledge] Registered ${Object.keys(handlers).length} event subscribers');
}
