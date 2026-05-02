"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackboneDSOCPort = createBackboneDSOCPort;
/**
 * Build a `DSOCPort` implementation that publishes to the DOS event backbone.
 *
 * When DSOC lands, its service subscribes to `dsoc.audit.*` / `dsoc.alert.*`
 * topics and this publisher is swapped for a direct DSOC client — call sites
 * keep the exact same `DSOCPort` contract.
 */
function createBackboneDSOCPort(backbone) {
    return {
        async recordAuditEvent(event) {
            await backbone.publish(topicForAudit(event), event.tenantId, event);
        },
        async getLatestPosture(_tenantId) {
            // Posture queries require the DSOC read path; return null until DSOC lands.
            return null;
        },
        async raiseAlert(event) {
            await backbone.publish(topicForAlert(event), event.tenantId, event);
        },
    };
}
function topicForAudit(event) {
    return `dsoc.audit.${event.category}`;
}
function topicForAlert(event) {
    const sev = event.severity;
    return `dsoc.alert.${sev}`;
}
//# sourceMappingURL=dsoc-port.publisher.js.map