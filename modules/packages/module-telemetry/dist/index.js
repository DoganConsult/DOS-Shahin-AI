"use strict";
/**
 * @dos/module-telemetry — module-facing telemetry surface.
 *
 * Modules call recordMetric() / emitLog() / emitSpan() / registerRoute()
 * / getHealth() through this shim. The product shell binds the actual
 * DNOCPort implementation at bootstrap.
 *
 * A module NEVER imports from @dos/dnoc-*. Enforced by
 * `modules-cannot-import-dnoc-direct` in .dependency-cruiser.cjs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindModuleTelemetry = bindModuleTelemetry;
exports.resetModuleTelemetry = resetModuleTelemetry;
exports.recordMetric = recordMetric;
exports.emitLog = emitLog;
exports.emitSpan = emitSpan;
exports.registerRoute = registerRoute;
exports.getHealth = getHealth;
let bound = null;
function bindModuleTelemetry(port) {
    bound = port;
}
function resetModuleTelemetry() {
    bound = null;
}
function requirePort() {
    if (!bound) {
        throw new Error('[@dos/module-telemetry] not bound. Product shell must call bindModuleTelemetry(port) during bootstrap before any module emits telemetry.');
    }
    return bound;
}
function recordMetric(metric) {
    requirePort().recordMetric(metric);
}
function emitLog(entry) {
    requirePort().emitLog(entry);
}
function emitSpan(span) {
    requirePort().emitSpan(span);
}
function registerRoute(route) {
    requirePort().registerRoute(route);
}
async function getHealth(serviceCode) {
    return requirePort().getHealth(serviceCode);
}
//# sourceMappingURL=index.js.map