"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTokenError = void 0;
class InvalidTokenError extends Error {
    code;
    source;
    constructor(message, code, source) {
        super(message);
        this.code = code;
        this.source = source;
        this.name = 'InvalidTokenError';
    }
}
exports.InvalidTokenError = InvalidTokenError;
//# sourceMappingURL=token-verifier.port.js.map