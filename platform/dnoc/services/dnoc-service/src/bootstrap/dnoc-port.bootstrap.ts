/**
 * DNOC port bootstrap.
 *
 * Wires the persistent DNOCPort impl on service startup. After this
 * runs, getDNOCPort() returns the Pg-backed port so REST handlers and
 * in-process consumers can emit metrics / logs / traces / routes
 * and query health.
 *
 * Unlike DSOC, DNOC does not register bulk topic subscribers on boot —
 * the high-volume inputs (metrics, logs, traces) are accepted via the
 * REST contract or direct port calls. If later operators decide to
 * also accept asynchronous ingestion via the event bus, subscribers
 * for dnoc.metric.recorded / dnoc.log.emitted / dnoc.span.emitted can
 * be added without changing the port shape.
 */

import {
  createDNOCPort,
  setDNOCPort,
  PgMetricsRepository,
  PgLogsRepository,
  PgTracesRepository,
  PgRoutesRepository,
  PgHealthRepository,
} from '@dos/dnoc-core';
import { assertPortsCompatible } from '@dos/ports';

export interface BootstrapDeps {
  /** @dos/db.safeQuery shape. */
  readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>;
}

export function bootstrapDNOCPlatformPort(deps: BootstrapDeps): void {
  assertPortsCompatible('dnoc', '1.0');

  const port = createDNOCPort({
    metrics: new PgMetricsRepository(deps.query),
    logs: new PgLogsRepository(deps.query),
    traces: new PgTracesRepository(deps.query),
    routes: new PgRoutesRepository(deps.query),
    health: new PgHealthRepository(deps.query),
  });
  setDNOCPort(port);
}
