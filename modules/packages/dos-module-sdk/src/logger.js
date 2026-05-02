"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.setLogger = setLogger;
exports.getLogger = getLogger;
const consoleFallback = {
    debug: (msg, meta) => console.debug(msg, meta),
    info: (msg, meta) => console.info(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
};
const GLOBAL_LOGGER_KEY = Symbol.for('__dos_sdk_logger__');
if (!globalThis[GLOBAL_LOGGER_KEY]) {
    globalThis[GLOBAL_LOGGER_KEY] = consoleFallback;
}
function setLogger(l) {
    globalThis[GLOBAL_LOGGER_KEY] = l;
}
exports.logger = {
    debug: (msg, meta) => globalThis[GLOBAL_LOGGER_KEY].debug(msg, meta),
    info: (msg, meta) => globalThis[GLOBAL_LOGGER_KEY].info(msg, meta),
    warn: (msg, meta) => globalThis[GLOBAL_LOGGER_KEY].warn(msg, meta),
    error: (msg, meta) => globalThis[GLOBAL_LOGGER_KEY].error(msg, meta),
};
function getLogger() {
    return globalThis[GLOBAL_LOGGER_KEY];
}
//# sourceMappingURL=logger.js.map