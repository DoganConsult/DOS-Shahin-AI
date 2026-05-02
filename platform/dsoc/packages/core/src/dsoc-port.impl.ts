/**
 * DSOCPort implementation backed by Postgres repositories.
 *
 * - recordAuditEvent inserts into platform_dsoc.audit_log.
 * - raiseAlert inserts into platform_dsoc.audit_log AND
 *   platform_dsoc.alerts (alerts row links to the audit row id).
 * - getLatestPosture reads the most recent posture_snapshots row.
 *
 * Repositories are injected so tests use in-memory adapters and
 * production uses Postgres.
 */

import type {
  DSOCPort,
  DSOCAuditEvent,
  DSOCPostureSnapshot,
} from '@dos/ports/dsoc';
import type { AuditLogRepository } from './audit-log.repository';
import type { AlertsRepository } from './alerts.repository';
import type { PostureRepository } from './posture.repository';

export interface DSOCPortDependencies {
  readonly auditLog: AuditLogRepository;
  readonly alerts: AlertsRepository;
  readonly posture: PostureRepository;
}

export function createDSOCPort(deps: DSOCPortDependencies): DSOCPort {
  return {
    async recordAuditEvent(event: DSOCAuditEvent): Promise<void> {
      await deps.auditLog.insert(event);
    },

    async raiseAlert(event: DSOCAuditEvent): Promise<void> {
      const audit = await deps.auditLog.insert(event);
      await deps.alerts.raise(event, audit.id);
    },

    async getLatestPosture(tenantId: string): Promise<DSOCPostureSnapshot | null> {
      return deps.posture.latest(tenantId);
    },
  };
}
