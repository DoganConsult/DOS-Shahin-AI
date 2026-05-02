"use strict";
/**
 * Response port — outbound interface for canonical HTTP response shaping.
 * Default impl produces a stable envelope so the module is usable standalone;
 * host can override (e.g. with @dos/module-sdk) via bindResponsePort.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.action = exports.ok = void 0;
exports.bindResponsePort = bindResponsePort;
let _ok = (data) => ({ ok: true, data });
let _action = (message) => ({ ok: true, message });
function bindResponsePort(impl) {
    if (impl.ok)
        _ok = impl.ok;
    if (impl.action)
        _action = impl.action;
}
const ok = (data, req) => _ok(data, req);
exports.ok = ok;
const action = (message, req) => _action(message, req);
exports.action = action;
//# sourceMappingURL=response.port.js.map