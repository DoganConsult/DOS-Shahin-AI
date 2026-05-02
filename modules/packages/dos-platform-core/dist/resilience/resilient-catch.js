"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCategory = exports.EC = exports.catchHandler = exports.swallowSync = exports.swallowDefault = exports.swallowEmpty = exports.swallowNull = exports.swallow = void 0;
exports.resilientCatch = resilientCatch;
var resilience_1 = require("./resilience");
Object.defineProperty(exports, "swallow", { enumerable: true, get: function () { return resilience_1.swallow; } });
Object.defineProperty(exports, "swallowNull", { enumerable: true, get: function () { return resilience_1.swallowNull; } });
Object.defineProperty(exports, "swallowEmpty", { enumerable: true, get: function () { return resilience_1.swallowEmpty; } });
Object.defineProperty(exports, "swallowDefault", { enumerable: true, get: function () { return resilience_1.swallowDefault; } });
Object.defineProperty(exports, "swallowSync", { enumerable: true, get: function () { return resilience_1.swallowSync; } });
Object.defineProperty(exports, "catchHandler", { enumerable: true, get: function () { return resilience_1.catchHandler; } });
Object.defineProperty(exports, "EC", { enumerable: true, get: function () { return resilience_1.EC; } });
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return resilience_1.ErrorCategory; } });
function resilientCatch(category) {
    return function (_target, _key, descriptor) {
        const original = descriptor.value;
        descriptor.value = async function (...args) {
            try {
                return await original.apply(this, args);
            }
            catch {
                return null;
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=resilient-catch.js.map