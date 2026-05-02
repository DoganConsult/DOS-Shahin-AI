const consoleFallback = {
    debug: (msg, meta) => console.debug(msg, meta),
    info: (msg, meta) => console.info(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
};
let _logger = consoleFallback;
export function setLogger(l) {
    _logger = l;
}
export const logger = {
    debug: (msg, meta) => _logger.debug(msg, meta),
    info: (msg, meta) => _logger.info(msg, meta),
    warn: (msg, meta) => _logger.warn(msg, meta),
    error: (msg, meta) => _logger.error(msg, meta),
};
export function getLogger() {
    return _logger;
}
//# sourceMappingURL=logger.js.map