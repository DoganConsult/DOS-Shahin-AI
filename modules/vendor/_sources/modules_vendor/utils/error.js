"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ValidationError = exports.NotFoundError = exports.DomainError = void 0;
exports.toErrorMessage = toErrorMessage;
// Vendor utils/error — error helpers re-exported from @dos/types so the
// governance/services/misc/enforcement-gate.service can resolve a
// 4-up '../../../../utils/error' import after compile.
class DomainError extends Error {
    constructor(message, code = 'DOMAIN_ERROR', statusCode = 400, details) {
        super(message);
        this.name = 'DomainError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.DomainError = DomainError;
class NotFoundError extends DomainError {
    constructor(message, details) { super(message, 'NOT_FOUND', 404, details); this.name = 'NotFoundError'; }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends DomainError {
    constructor(message, details) { super(message, 'VALIDATION', 400, details); this.name = 'ValidationError'; }
}
exports.ValidationError = ValidationError;
class ConflictError extends DomainError {
    constructor(message, details) { super(message, 'CONFLICT', 409, details); this.name = 'ConflictError'; }
}
exports.ConflictError = ConflictError;
function toErrorMessage(err) {
    if (err instanceof Error)
        return err.message;
    if (typeof err === 'string')
        return err;
    return String(err);
}
