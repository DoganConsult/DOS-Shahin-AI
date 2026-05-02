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
export declare function getDSOCPort(): DSOCPort;
export declare function setDSOCPort(port: DSOCPort): void;
export declare function resetDSOCPort(): void;
