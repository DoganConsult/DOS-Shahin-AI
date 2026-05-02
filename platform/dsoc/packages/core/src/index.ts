/**
 * @dos/dsoc-core — DSOC Core (Security Operations Center) public surface.
 *
 * Imports flow through three port-style entry points:
 *   - createDSOCPort(deps) — builds the DSOCPort impl from injected
 *     repository adapters (Pg or in-memory).
 *   - getDSOCPort()        — singleton accessor used by REST handlers
 *     and other consumers; bound during dsoc-service bootstrap.
 *   - registerDSOCSubscribers({ backbone, port }) — wires the event
 *     bus to the persistent port so dsoc.audit.* and dsoc.alert.*
 *     topics emitted by every platform module land in platform_dsoc.*.
 */

// Port impl
export { createDSOCPort } from './dsoc-port.impl';
export type { DSOCPortDependencies } from './dsoc-port.impl';
export {
  getDSOCPort,
  tryGetDSOCPort,
  setDSOCPort,
  resetDSOCPort,
} from './dsoc-port.registry';

// Repositories
export {
  InMemoryAuditLogRepository,
  PgAuditLogRepository,
} from './audit-log.repository';
export type { AuditLogRepository } from './audit-log.repository';

export {
  InMemoryAlertsRepository,
  PgAlertsRepository,
} from './alerts.repository';
export type { AlertsRepository, AlertRecord } from './alerts.repository';

export {
  InMemoryPostureRepository,
  PgPostureRepository,
} from './posture.repository';
export type { PostureRepository } from './posture.repository';

// Subscriber
export { registerDSOCSubscribers } from './event-subscriber';
export type { BackboneSubscriber, RegisterSubscribersDeps } from './event-subscriber';

// AI agent tools
export { buildDSOCAgentTools } from './agent-tools';
export type { DSOCAgentToolsDeps } from './agent-tools';

// Retention
export { runDSOCRetention, startDSOCRetentionLoop } from './retention.job';
export type { RetentionDeps as DSOCRetentionDeps, RetentionResult as DSOCRetentionResult } from './retention.job';

// Posture computation
export { computePostureSnapshot, startPostureLoop } from './posture.job';
export type { PostureJobDeps, StartPostureLoopOptions } from './posture.job';

// Re-export the port types for downstream typed consumption.
export type {
  DSOCPort,
  DSOCAuditEvent,
  DSOCSeverity,
  DSOCEventCategory,
  DSOCPostureSnapshot,
} from '@dos/ports/dsoc';
