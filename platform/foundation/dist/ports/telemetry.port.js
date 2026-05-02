"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = void 0;
exports.bindTelemetryPort = bindTelemetryPort;
const noopSpan = { end() { }, setAttribute() { }, recordException() { } };
const noopTracer = { startSpan: () => noopSpan };
const defaultAdapter = {
    counter: () => ({ inc() { } }),
    histogram: () => ({ observe() { } }),
    tracer: () => noopTracer,
};
let _adapter = defaultAdapter;
function bindTelemetryPort(impl) {
    if (impl.adapter)
        _adapter = impl.adapter;
}
exports.telemetry = {
    counter: (n, h, l) => _adapter.counter(n, h, l),
    histogram: (n, h, l) => _adapter.histogram(n, h, l),
    tracer: () => _adapter.tracer(),
};
//# sourceMappingURL=telemetry.port.js.map