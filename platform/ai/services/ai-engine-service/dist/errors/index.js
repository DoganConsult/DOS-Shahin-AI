const REDACTION_KEYS = new Set([
    'token',
    'authorization',
    'password',
    'secret',
    'apiKey',
    'clientSecret',
]);
function redactValue(value, depth) {
    if (depth <= 0)
        return '[redacted]';
    if (value === null || value === undefined)
        return value;
    if (typeof value === 'string')
        return value.length > 2000 ? value.slice(0, 2000) : value;
    if (typeof value !== 'object')
        return value;
    if (Array.isArray(value))
        return value.slice(0, 50).map((v) => redactValue(v, depth - 1));
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        if (REDACTION_KEYS.has(k))
            out[k] = '[redacted]';
        else
            out[k] = redactValue(v, depth - 1);
    }
    return out;
}
export class ServiceError extends Error {
    status;
    code;
    details;
    constructor(opts) {
        super(opts.message);
        this.name = 'ServiceError';
        this.status = opts.status;
        this.code = opts.code;
        this.details = opts.details === undefined ? undefined : redactValue(opts.details, 4);
    }
}
export class NotFoundError extends ServiceError {
    constructor(entityType, entityId) {
        super({
            message: `${entityType} not found`,
            status: 404,
            code: 'NOT_FOUND',
            details: { entityType, entityId },
        });
        this.name = 'NotFoundError';
    }
}
export class ValidationError extends ServiceError {
    issues;
    constructor(issues = 'Validation error') {
        const normalized = typeof issues === 'string'
            ? [{ path: '', message: issues }]
            : issues;
        super({
            message: 'Validation error',
            status: 400,
            code: 'VALIDATION_ERROR',
            details: { issues: normalized },
        });
        this.name = 'ValidationError';
        this.issues = normalized;
    }
}
export function isAppError(err) {
    return typeof err === 'object' && err !== null && ('status' in err || 'code' in err);
}
//# sourceMappingURL=index.js.map