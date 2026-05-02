/**
 * DSOC audit-event publisher.
 *
 * DAuth-originating security events (login, MFA, access denials, SoD
 * conflicts, delegation grants, etc.) are forwarded to the DSOC platform
 * module via `DSOCPort.recordAuditEvent`. Until the DSOC service is
 * bootstrapped, a backbone-only implementation of this port publishes to
 * the `dsoc.audit.*` event topics where the future DSOC consumer will
 * subscribe — no code change required at the call sites when DSOC lands.
 */

import type { DSOCAuditEvent, DSOCPort, DSOCSeverity } from '@dos/ports/dsoc';

export interface BackbonePublisher {
  publish(
    eventType: string,
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void>;
}

/**
 * Build a `DSOCPort` implementation that publishes to the DOS event backbone.
 *
 * When DSOC lands, its service subscribes to `dsoc.audit.*` / `dsoc.alert.*`
 * topics and this publisher is swapped for a direct DSOC client — call sites
 * keep the exact same `DSOCPort` contract.
 */
export function createBackboneDSOCPort(backbone: BackbonePublisher): DSOCPort {
  return {
    async recordAuditEvent(event: DSOCAuditEvent): Promise<void> {
      await backbone.publish(topicForAudit(event), event.tenantId, event as unknown as Record<string, unknown>);
    },
    async getLatestPosture(_tenantId: string) {
      // Posture queries require the DSOC read path; return null until DSOC lands.
      return null;
    },
    async raiseAlert(event: DSOCAuditEvent): Promise<void> {
      await backbone.publish(topicForAlert(event), event.tenantId, event as unknown as Record<string, unknown>);
    },
  };
}

function topicForAudit(event: DSOCAuditEvent): string {
  return `dsoc.audit.${event.category}`;
}

function topicForAlert(event: DSOCAuditEvent): string {
  const sev: DSOCSeverity = event.severity;
  return `dsoc.alert.${sev}`;
}
