/**
 * DSOC port bootstrap.
 *
 * Wires the persistent DSOCPort impl + the event-bus subscriber on
 * service startup. After this runs:
 *   - getDSOCPort() returns the Pg-backed port — REST handlers and
 *     in-process consumers query it.
 *   - 15 backbone subscribers (10 dsoc.audit.* + 5 dsoc.alert.*) are
 *     registered, so every dauth.* and (future) dsoc.* event flows
 *     into platform_dsoc.audit_log / platform_dsoc.alerts.
 */

import {
  createDSOCPort,
  setDSOCPort,
  PgAuditLogRepository,
  PgAlertsRepository,
  PgPostureRepository,
  registerDSOCSubscribers,
  type BackboneSubscriber,
} from '@dos/dsoc-core';
import { assertPortsCompatible } from '@dos/ports';

export interface BootstrapDeps {
  /** A query function with the @dos/db.safeQuery shape. */
  readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>;
  /** A backbone subscribe interface (provided by @dos/event-backbone wiring). */
  readonly backbone: BackboneSubscriber;
}

export function bootstrapDSOCPlatformPort(deps: BootstrapDeps): { subscriberCount: number } {
  assertPortsCompatible('dsoc', '1.0');

  const port = createDSOCPort({
    auditLog: new PgAuditLogRepository(deps.query),
    alerts: new PgAlertsRepository(deps.query),
    posture: new PgPostureRepository(deps.query),
  });
  setDSOCPort(port);

  const subscriberCount = registerDSOCSubscribers({ backbone: deps.backbone, port });
  return { subscriberCount };
}
