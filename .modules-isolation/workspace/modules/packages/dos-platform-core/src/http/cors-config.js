"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorsConfig = createCorsConfig;
function createCorsConfig(options) {
    const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const productShellUrl = process.env.PRODUCT_SHELL_URL || 'http://localhost:3000';
    let allowedOrigins;
    if (process.env.NODE_ENV === 'production') {
        const origins = new Set();
        origins.add(frontendUrl);
        origins.add(productShellUrl);
        if (envOrigins) {
            envOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.add(o));
        }
        if (options?.additionalOrigins) {
            options.additionalOrigins.forEach(o => origins.add(o));
        }
        allowedOrigins = [...origins];
    }
    else {
        allowedOrigins = true;
    }
    return {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'x-tenant-id',
            'x-correlation-id',
            'x-service-token',
            'x-source-service',
            'x-api-version',
            'x-module-code',
            'x-request-id',
            'Accept-Language',
        ],
        exposedHeaders: [
            'x-correlation-id',
            'x-ratelimit-limit',
            'x-ratelimit-remaining',
            'retry-after',
            'x-request-id',
        ],
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
}
//# sourceMappingURL=cors-config.js.map