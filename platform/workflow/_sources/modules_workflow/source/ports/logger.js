"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = exports.logger = exports.setLogger = void 0;
const consoleFallback = {
    debug: (msg, meta) => console.debug(msg, meta),
    info: (msg, meta) => console.info(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
};
let _logger = consoleFallback;
function setLogger(l) {
    _logger = l;
}
exports.setLogger = setLogger;
exports.logger = {
    debug: (msg, meta) => _logger.debug(msg, meta),
    info: (msg, meta) => _logger.info(msg, meta),
    warn: (msg, meta) => _logger.warn(msg, meta),
    error: (msg, meta) => _logger.error(msg, meta),
};
function getLogger() {
    return _logger;
}
exports.getLogger = getLogger;
