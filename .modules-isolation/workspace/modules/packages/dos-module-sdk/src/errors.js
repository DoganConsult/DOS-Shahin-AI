"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedError = exports.ConflictError = exports.ForbiddenError = exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
exports.toErrorMessage = toErrorMessage;
class AppError extends Error {
    statusCode;
    code;
    messageAr;
    details;
    constructor(statusCode, message, code, details, messageAr) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.messageAr = messageAr;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(entity, id) {
        super(404, `${entity} with id '${id}' not found`, 'NOT_FOUND', undefined, `${entity} بالمعرف '${id}' غير موجود`);
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(details) {
        super(400, 'Validation failed', 'VALIDATION_ERROR', details, 'فشل التحقق من الصحة');
    }
}
exports.ValidationError = ValidationError;
class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(403, message, 'FORBIDDEN', undefined, 'تم رفض الوصول');
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super(409, message, 'CONFLICT', undefined, 'تعارض في البيانات');
    }
}
exports.ConflictError = ConflictError;
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(401, message, 'UNAUTHORIZED', undefined, 'المصادقة مطلوبة');
    }
}
exports.UnauthorizedError = UnauthorizedError;
function toErrorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
//# sourceMappingURL=errors.js.map