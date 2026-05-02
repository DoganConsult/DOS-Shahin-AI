"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
exports.sendError = sendError;
exports.toErrorMessage = toErrorMessage;
class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(404, message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(400, message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
function sendError(res, ...args) {
    const statusCode = typeof args[0] === 'number' ? args[0] : 500;
    const message = typeof args[0] === 'string' ? args[0] : (args[1] || 'Error');
    res.status(statusCode).json({ success: false, error: message, statusCode });
}
function toErrorMessage(err) {
    if (err instanceof Error)
        return err.message;
    return String(err);
}
//# sourceMappingURL=errors.port.js.map