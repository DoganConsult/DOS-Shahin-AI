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
import type { DSOCPort } from '@dos/ports/dsoc';
export interface BackbonePublisher {
    publish(eventType: string, tenantId: string, payload: Record<string, unknown>): Promise<void>;
}
/**
 * Build a `DSOCPort` implementation that publishes to the DOS event backbone.
 *
 * When DSOC lands, its service subscribes to `dsoc.audit.*` / `dsoc.alert.*`
 * topics and this publisher is swapped for a direct DSOC client — call sites
 * keep the exact same `DSOCPort` contract.
 */
export declare function createBackboneDSOCPort(backbone: BackbonePublisher): DSOCPort;
