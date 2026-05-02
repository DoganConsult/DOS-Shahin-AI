"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishUserDeactivated = exports.publishUserUpdated = exports.publishUserCreated = void 0;
/**
 * Backwards-compat alias — forwards to ./publisher which is now the canonical
 * implementation with error logging and no swallowed failures.
 */
var publisher_1 = require("./publisher");
Object.defineProperty(exports, "publishUserCreated", { enumerable: true, get: function () { return publisher_1.publishUserCreated; } });
Object.defineProperty(exports, "publishUserUpdated", { enumerable: true, get: function () { return publisher_1.publishUserUpdated; } });
Object.defineProperty(exports, "publishUserDeactivated", { enumerable: true, get: function () { return publisher_1.publishUserDeactivated; } });
//# sourceMappingURL=user.publishers.js.map