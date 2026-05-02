/**
 * DSOC event subscriber.
 *
 * Listens on the DOS event backbone for every dsoc.audit.* and
 * dsoc.alert.* topic. Every event published by DAuth (and, in the
 * future, by other platform modules / products) routed through
 * publishDAuthEvent → DSOCPort.recordAuditEvent / raiseAlert lands
 * on these topics. Here we re-route them into the persistent
 * DSOCPort impl so they are durably stored.
 *
 * Topic shape:
 *   dsoc.audit.<category>     → recordAuditEvent
 *   dsoc.alert.<severity>     → raiseAlert
 *
 * Idempotency: the audit_log table allows duplicate (tenant_id, action,
 * occurred_at) tuples; deduping is the publisher's responsibility (or
 * a follow-on backbone outbox guarantee).
 */

import type { DSOCAuditEvent, DSOCEventCategory, DSOCSeverity } from '@dos/ports/dsoc';
import type { DSOCPort } from '@dos/ports/dsoc';

const AUDIT_CATEGORIES: readonly DSOCEventCategory[] = [
  'authn', 'authz', 'session', 'mfa', 'sod', 'delegation',
  'config_change', 'data_access', 'threat', 'posture',
];

const ALERT_SEVERITIES: readonly DSOCSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];

export interface BackboneSubscriber {
  subscribe(
    eventType: string,
    subscriberId: string,
    handler: (event: { tenantId: string; payload: unknown }) => Promise<void>,
  ): void;
}

export interface RegisterSubscribersDeps {
  readonly backbone: BackboneSubscriber;
  readonly port: DSOCPort;
}

/**
 * Register one subscriber per dsoc.audit.<category> and
 * dsoc.alert.<severity> topic. Returns the count of subscribers
 * registered for sanity logging.
 */
export function registerDSOCSubscribers(deps: RegisterSubscribersDeps): number {
  let n = 0;

  for (const category of AUDIT_CATEGORIES) {
    deps.backbone.subscribe(
      `dsoc.audit.${category}`,
      `dsoc:audit-ingest-${category}`,
      async (event) => {
        const payload = event.payload as Partial<DSOCAuditEvent>;
        await deps.port.recordAuditEvent(materialize(event.tenantId, payload, category));
      },
    );
    n++;
  }

  for (const severity of ALERT_SEVERITIES) {
    deps.backbone.subscribe(
      `dsoc.alert.${severity}`,
      `dsoc:alert-ingest-${severity}`,
      async (event) => {
        const payload = event.payload as Partial<DSOCAuditEvent>;
        await deps.port.raiseAlert(materialize(event.tenantId, payload, payload.category ?? 'threat', severity));
      },
    );
    n++;
  }

  return n;
}

function materialize(
  tenantId: string,
  payload: Partial<DSOCAuditEvent>,
  defaultCategory: DSOCEventCategory,
  defaultSeverity?: DSOCSeverity,
): DSOCAuditEvent {
  return {
    tenantId,
    category: payload.category ?? defaultCategory,
    severity: payload.severity ?? defaultSeverity ?? 'info',
    actor: payload.actor ?? { type: 'service', id: 'unknown' },
    action: payload.action ?? 'unknown',
    resource: payload.resource,
    outcome: payload.outcome ?? 'success',
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    attributes: payload.attributes ?? {},
    correlationId: payload.correlationId,
  };
}
