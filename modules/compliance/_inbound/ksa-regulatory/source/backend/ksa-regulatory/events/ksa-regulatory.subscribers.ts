/**
 * KsaRegulatory Module — Event Subscribers
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
  'compliance.framework_updated',
  'compliance.assessment_completed',
  'risk.assessment_completed',
  'policy.status_changed',
  'incident.created',
  'audit.finding_created',
  'governance.mandate_updated',
];

// ── Handlers ─────────────────────────────────────────────────────


async function handle_compliance_framework_updated(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[KsaRegulatory] Processing compliance.framework_updated', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'compliance',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'compliance_framework_updated',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'compliance.framework_updated', sourceModule: 'compliance', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.framework_updated_processed',
          entityType: 'compliance_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'compliance.framework_updated', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process compliance.framework_updated', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_compliance_assessment_completed(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[KsaRegulatory] Processing compliance.assessment_completed', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'compliance',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'compliance_assessment_completed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'compliance.assessment_completed', sourceModule: 'compliance', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.assessment_completed_processed',
          entityType: 'compliance_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'compliance.assessment_completed', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process compliance.assessment_completed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_risk_assessment_completed(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[KsaRegulatory] Processing risk.assessment_completed', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'risk',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'risk_assessment_completed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'risk.assessment_completed', sourceModule: 'risk', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.assessment_completed_processed',
          entityType: 'risk_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'risk.assessment_completed', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process risk.assessment_completed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_policy_status_changed(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[KsaRegulatory] Processing policy.status_changed', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'policy',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'policy_status_changed',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'policy.status_changed', sourceModule: 'policy', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.status_changed_processed',
          entityType: 'policy_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'policy.status_changed', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process policy.status_changed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_incident_created(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[KsaRegulatory] Processing incident.created', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'incident',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'incident_created',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'incident.created', sourceModule: 'incident', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.created_processed',
          entityType: 'incident_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'incident.created', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process incident.created', {
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
    logger.info('[KsaRegulatory] Processing audit.finding_created', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'audit',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'audit_finding_created',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'audit.finding_created', sourceModule: 'audit', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.finding_created_processed',
          entityType: 'audit_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'audit.finding_created', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process audit.finding_created', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle_governance_mandate_updated(event: PlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);

  try {
    logger.info('[KsaRegulatory] Processing governance.mandate_updated', {
      tenantId,
      entityId: event.payload?.entityId || event.entityId,
      source: 'governance',
    });

    // Record cross-module event for ksa-regulatory domain awareness
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, module, action, entity_type, entity_id, before_state, after_state, created_at)
       VALUES ($1, 'ksa-regulatory', 'event_received', 'governance_mandate_updated',
               $2, '{}', $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, event.payload?.entityId || event.entityId || 'unknown',
       JSON.stringify({ sourceEvent: 'governance.mandate_updated', sourceModule: 'governance', receivedAt: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS));

    // Emit acknowledgment event for bidirectional traceability
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'ksa-regulatory',
          event: 'ksa_regulatory.mandate_updated_processed',
          entityType: 'governance_event',
          entityId: event.payload?.entityId || event.entityId || 'unknown',
          data: { sourceEvent: 'governance.mandate_updated', processedAt: new Date().toISOString() },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

  } catch (err) {
    logger.warn('[KsaRegulatory] Failed to process governance.mandate_updated', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Registration ─────────────────────────────────────────────────

/**
 * Register all event subscribers for the ksa-regulatory module.
 * Called during server startup from agrc-event-subscribers.ts.
 */
export function registerKsaRegulatoryEventSubscribers(): void {
  const handlers: Record<string, (event: PlatformEvent) => Promise<void>> = {
    'compliance.framework_updated': handle_compliance_framework_updated,
    'compliance.assessment_completed': handle_compliance_assessment_completed,
    'risk.assessment_completed': handle_risk_assessment_completed,
    'policy.status_changed': handle_policy_status_changed,
    'incident.created': handle_incident_created,
    'audit.finding_created': handle_audit_finding_created,
    'governance.mandate_updated': handle_governance_mandate_updated,
  };

  for (const [eventName, handler] of Object.entries(handlers)) {
    try {
      eventBus.subscribe(
        eventName as string,
        `ksa-regulatory:${eventName}`,
        handler,
      );
    } catch {
      // Event type may not be registered yet — non-fatal
    }
  }

  logger.info('[KsaRegulatory] Registered ${Object.keys(handlers).length} event subscribers');
}
