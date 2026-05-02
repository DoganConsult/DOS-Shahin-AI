/**
 * DSOC port registry.
 *
 * Holds the singleton `DSOCPort` implementation that every DAuth service
 * publishes security-relevant events through. On boot, `auth-service`
 * calls `setDSOCPort(createBackboneDSOCPort({...}))` so production code
 * gets a real implementation. Tests can inject an in-memory stub via
 * `setDSOCPort(...)` and reset with `resetDSOCPort()`.
 *
 * If no port was set, a default backbone port is built lazily from
 * `@dos/platform-core/events.publish`. That default never fails — it
 * just forwards to the existing event backbone — so legacy callers work
 * even before the service bootstrap wiring lands.
 */

import type { DSOCPort } from '@dos/ports/dsoc';
import { publish as backbonePublish } from '@dos/platform-core/events';
import { createBackboneDSOCPort } from './dsoc-port.publisher';

let current: DSOCPort | null = null;

function buildDefault(): DSOCPort {
  return createBackboneDSOCPort({
    publish: async (topic, tenantId, payload) => {
      await backbonePublish(topic, tenantId, payload);
    },
  });
}

export function getDSOCPort(): DSOCPort {
  if (!current) current = buildDefault();
  return current;
}

export function setDSOCPort(port: DSOCPort): void {
  current = port;
}

export function resetDSOCPort(): void {
  current = null;
}
