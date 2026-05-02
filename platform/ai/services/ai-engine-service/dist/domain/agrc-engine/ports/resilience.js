export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["EVENT_BUS"] = "EVENT_BUS";
    ErrorCategory["AGENT_ACTION"] = "AGENT_ACTION";
    ErrorCategory["DB_CLEANUP"] = "DB_CLEANUP";
    ErrorCategory["CACHE_OP"] = "CACHE_OP";
    ErrorCategory["FALLBACK_QUERY"] = "FALLBACK_QUERY";
})(ErrorCategory || (ErrorCategory = {}));
export const EC = ErrorCategory;
let _resilience = null;
export function setResilienceHandler(impl) {
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
export function swallow(category, promise, context) {
    return getResilience().swallow(category, promise, context);
}
export function swallowNull(category, promise, context) {
    return getResilience().swallowNull(category, promise, context);
}
export function swallowEmpty(category, promise, context) {
    return getResilience().swallowEmpty(category, promise, context);
}
export function swallowDefault(category, fallback, promise, context) {
    return getResilience().swallowDefault(category, fallback, promise, context);
}
export function swallowSync(category, fn, context) {
    return getResilience().swallowSync(category, fn, context);
}
export function catchHandler(category, context) {
    return getResilience().catchHandler(category, context);
}
//# sourceMappingURL=resilience.js.map