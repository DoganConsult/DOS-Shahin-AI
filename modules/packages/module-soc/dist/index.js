"use strict";
/**
 * @dos/module-soc — module-facing security-ops surface.
 *
 * Modules import `emitAudit()` / `raiseAlert()` from this package. The
 * implementation is wired by the product shell at bootstrap — typically
 * a thin HTTP client pointed at /api/dsoc/port/v1, or a test-time stub.
 *
 * A module NEVER imports from @dos/dsoc-*. Enforced by
 * `modules-cannot-import-dsoc-direct` in .dependency-cruiser.cjs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindModuleSOC = bindModuleSOC;
exports.resetModuleSOC = resetModuleSOC;
exports.emitAudit = emitAudit;
exports.raiseAlert = raiseAlert;
let bound = null;
/** Product shell calls this once at bootstrap to wire a DSOCPort impl. */
function bindModuleSOC(port) {
    bound = port;
}
/** Tests / hot-reload — unbinds the port. */
function resetModuleSOC() {
    bound = null;
}
function requirePort() {
    if (!bound) {
        throw new Error('[@dos/module-soc] not bound. Product shell must call bindModuleSOC(port) during bootstrap before any module emits audit events.');
    }
    return bound;
}
async function emitAudit(event) {
    await requirePort().recordAuditEvent(event);
}
async function raiseAlert(event) {
    await requirePort().raiseAlert(event);
}
//# sourceMappingURL=index.js.map