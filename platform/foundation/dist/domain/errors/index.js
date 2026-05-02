"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.ValidationError = exports.DomainError = void 0;
class DomainError extends Error {
    code;
    status;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
exports.DomainError = DomainError;
exports.ValidationError = DomainError;
class NotFoundError extends DomainError {
    constructor(entityType, idOrMsg) {
        super('NOT_FOUND', idOrMsg ? `${entityType} ${idOrMsg} not found` : entityType, 404);
    }
}
exports.NotFoundError = NotFoundError;
exports.default = DomainError;
//# sourceMappingURL=index.js.map