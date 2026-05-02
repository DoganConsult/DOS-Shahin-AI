"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toErrorMessage = exports.UnauthorizedError = exports.ConflictError = exports.ForbiddenError = exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
__exportStar(require("@dos/module-auth"), exports);
// Canonical domain error classes used by workflow services (template CRUD,
// versioning, comparison). Defined locally to avoid pulling the full
// @dos/module-sdk barrel into the workflow runtime — the SDK transitively
// depends on @dos/contracts dist which is not always present in the
// unit-test sandbox. Shape mirrors @dos/module-sdk/errors 1:1 so consumers
// that check `err.code === 'VALIDATION_ERROR'` etc. behave identically.
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
exports.toErrorMessage = toErrorMessage;
