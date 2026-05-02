"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessResolverError = void 0;
class AccessResolverError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AccessResolverError';
    }
}
exports.AccessResolverError = AccessResolverError;
//# sourceMappingURL=canonical-access.types.js.map