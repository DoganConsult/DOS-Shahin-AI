"use strict";
/**
 * Resilience port — outbound interface for error/retry handling.
 * Mirrors `@dos/platform-core/resilience` (catchHandler, EC) but bindable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchHandler = exports.EC = void 0;
exports.bindResiliencePort = bindResiliencePort;
exports.EC = {
    EVENT_BUS: 'event_bus',
    DB: 'database',
    HTTP: 'http',
    AI: 'ai',
    WORKFLOW: 'workflow',
    AUDIT: 'audit',
    UNKNOWN: 'unknown',
};
let _catchHandler = (category) => (err) => {
    // Default: log and swallow so callers stay non-blocking. Host can override.
    // eslint-disable-next-line no-console
    console.warn(`[foundation:${category}]`, err instanceof Error ? err.message : String(err));
};
function bindResiliencePort(impl) {
    if (impl.catchHandler)
        _catchHandler = impl.catchHandler;
}
const catchHandler = (cat, ctx) => _catchHandler(cat, ctx);
exports.catchHandler = catchHandler;
//# sourceMappingURL=resilience.port.js.map