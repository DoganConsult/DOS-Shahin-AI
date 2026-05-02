"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.setLogger = setLogger;
exports.setLogLevel = setLogLevel;
exports.getLogLevel = getLogLevel;
let _logger = null;
let _defaultPino = null;
function createDefaultPinoLogger() {
    if (_defaultPino)
        return _defaultPino;
    try {
        const pino = require('pino');
        const p = pino({
            level: process.env.LOG_LEVEL || 'info',
            name: process.env.SERVICE_CODE || 'dos-platform',
            formatters: {
                level: (label) => ({ level: label }),
            },
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
        });
        _pinoRaw = p;
        _defaultPino = {
            info: (msg, meta) => p.info(normMeta(meta), msg),
            warn: (msg, meta) => p.warn(normMeta(meta), msg),
            error: (msg, meta) => p.error(normMeta(meta), msg),
            debug: (msg, meta) => p.debug(normMeta(meta), msg),
            fatal: (msg, meta) => p.fatal(normMeta(meta), msg),
            child: (defaultMeta) => {
                const child = p.child(defaultMeta);
                return {
                    info: (msg, meta) => child.info(normMeta(meta), msg),
                    warn: (msg, meta) => child.warn(normMeta(meta), msg),
                    error: (msg, meta) => child.error(normMeta(meta), msg),
                    debug: (msg, meta) => child.debug(normMeta(meta), msg),
                    fatal: (msg, meta) => child.fatal(normMeta(meta), msg),
                    child: (m) => {
                        const c2 = child.child(m);
                        return { info: (msg, meta) => c2.info(normMeta(meta), msg), warn: (msg, meta) => c2.warn(normMeta(meta), msg), error: (msg, meta) => c2.error(normMeta(meta), msg), debug: (msg, meta) => c2.debug(normMeta(meta), msg), fatal: (msg, meta) => c2.fatal(normMeta(meta), msg) };
                    },
                };
            },
        };
        return _defaultPino;
    }
    catch {
        return {
            info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...normMeta(meta), time: new Date().toISOString() })),
            warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...normMeta(meta), time: new Date().toISOString() })),
            error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...normMeta(meta), time: new Date().toISOString() })),
            debug: (msg, meta) => console.debug(JSON.stringify({ level: 'debug', msg, ...normMeta(meta), time: new Date().toISOString() })),
            fatal: (msg, meta) => console.error(JSON.stringify({ level: 'fatal', msg, ...normMeta(meta), time: new Date().toISOString() })),
            child: () => createDefaultPinoLogger(),
        };
    }
}
function normMeta(meta) {
    const { redactPii, redactPiiInObject } = require('./pii-redact');
    if (!meta)
        return {};
    if (typeof meta === 'string')
        return { message: redactPii(meta) };
    if (meta instanceof Error)
        return { err: { message: redactPii(meta.message), stack: meta.stack, name: meta.name } };
    if (typeof meta === 'object')
        return redactPiiInObject(meta);
    return { value: redactPii(String(meta)) };
}
// Raw pino reference for runtime level changes
let _pinoRaw = null;
function setLogger(l) {
    _logger = l;
}
/** Change log level at runtime without restart. */
function setLogLevel(level) {
    if (_pinoRaw) {
        _pinoRaw.level = level;
    }
    // Also update env so child processes inherit the new level
    process.env.LOG_LEVEL = level;
}
/** Get the current effective log level. */
function getLogLevel() {
    if (_pinoRaw)
        return _pinoRaw.level;
    return (process.env.LOG_LEVEL || 'info');
}
function getLogger() {
    return _logger || createDefaultPinoLogger();
}
exports.logger = {
    info: (msg, meta) => getLogger().info(msg, meta),
    warn: (msg, meta) => getLogger().warn(msg, meta),
    error: (msg, meta) => getLogger().error(msg, meta),
    debug: (msg, meta) => getLogger().debug(msg, meta),
    fatal: (msg, meta) => getLogger().fatal(msg, meta),
    child: (meta) => getLogger().child ? getLogger().child(meta) : getLogger(),
};
//# sourceMappingURL=logger.js.map