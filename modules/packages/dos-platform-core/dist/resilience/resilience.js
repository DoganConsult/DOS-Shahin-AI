"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EC = exports.ErrorCategory = void 0;
exports.setResilienceHandler = setResilienceHandler;
exports.swallow = swallow;
exports.swallowNull = swallowNull;
exports.swallowEmpty = swallowEmpty;
exports.swallowDefault = swallowDefault;
exports.swallowSync = swallowSync;
exports.catchHandler = catchHandler;
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["EVENT_BUS"] = "EVENT_BUS";
    ErrorCategory["AGENT_ACTION"] = "AGENT_ACTION";
    ErrorCategory["DB_CLEANUP"] = "DB_CLEANUP";
    ErrorCategory["CACHE_OP"] = "CACHE_OP";
    ErrorCategory["FALLBACK_QUERY"] = "FALLBACK_QUERY";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
exports.EC = ErrorCategory;
let _resilience = null;
function setResilienceHandler(impl) {
    _resilience = impl;
}
function getResilience() {
    if (!_resilience) {
        // Return a dummy implementation before initialization to avoid breaking early startups
        return {
            swallow: (cat, p) => { p.catch(() => { }); },
            swallowNull: async (cat, p) => p.catch(() => null),
            swallowEmpty: async (cat, p) => p.catch(() => []),
            swallowDefault: async (cat, fallback, p) => p.catch(() => fallback),
            swallowSync: (cat, fn) => { try {
                fn();
            }
            catch { } },
            catchHandler: () => () => { },
        };
    }
    return _resilience;
}
function swallow(category, promise, context) {
    return getResilience().swallow(category, promise, context);
}
function swallowNull(category, promise, context) {
    return getResilience().swallowNull(category, promise, context);
}
function swallowEmpty(category, promise, context) {
    return getResilience().swallowEmpty(category, promise, context);
}
function swallowDefault(category, fallback, promise, context) {
    return getResilience().swallowDefault(category, fallback, promise, context);
}
function swallowSync(category, fn, context) {
    return getResilience().swallowSync(category, fn, context);
}
function catchHandler(category, context) {
    return getResilience().catchHandler(category, context);
}
//# sourceMappingURL=resilience.js.map