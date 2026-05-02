"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDSOCPort = getDSOCPort;
exports.setDSOCPort = setDSOCPort;
exports.resetDSOCPort = resetDSOCPort;
const events_1 = require("@dos/platform-core/events");
const dsoc_port_publisher_1 = require("./dsoc-port.publisher");
let current = null;
function buildDefault() {
    return (0, dsoc_port_publisher_1.createBackboneDSOCPort)({
        publish: async (topic, tenantId, payload) => {
            await (0, events_1.publish)(topic, tenantId, payload);
        },
    });
}
function getDSOCPort() {
    if (!current)
        current = buildDefault();
    return current;
}
function setDSOCPort(port) {
    current = port;
}
function resetDSOCPort() {
    current = null;
}
//# sourceMappingURL=dsoc-port.registry.js.map