"use strict";
/**
 * Logger port — outbound interface for structured logging.
 * Default: thin console adapter so the module is self-sufficient. Host can
 * override with platform observability via bindLoggerPort().
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.bindLoggerPort = bindLoggerPort;
const consoleLogger = {
    /* eslint-disable no-console */
    debug: (m, meta) => console.debug('[foundation]', m, meta ?? ''),
    info: (m, meta) => console.log('[foundation]', m, meta ?? ''),
    warn: (m, meta) => console.warn('[foundation]', m, meta ?? ''),
    error: (m, meta) => console.error('[foundation]', m, meta ?? ''),
};
let _logger = consoleLogger;
function bindLoggerPort(impl) {
    if (impl.logger)
        _logger = impl.logger;
}
exports.logger = {
    debug: (m, meta) => _logger.debug(m, meta),
    info: (m, meta) => _logger.info(m, meta),
    warn: (m, meta) => _logger.warn(m, meta),
    error: (m, meta) => _logger.error(m, meta),
};
//# sourceMappingURL=logger.port.js.map