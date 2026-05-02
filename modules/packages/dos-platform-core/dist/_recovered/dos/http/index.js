"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.asyncHandler = void 0;
exports.scopeContext = scopeContext;
var http_1 = require("@dos/platform-core/http");
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return http_1.asyncHandler; } });
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return http_1.validate; } });
function scopeContext(_req, _res, next) { next(); }
//# sourceMappingURL=index.js.map