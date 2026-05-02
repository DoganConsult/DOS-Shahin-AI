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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupServiceOpenApi = setupServiceOpenApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zod_to_json_schema_1 = require("zod-to-json-schema");
const http_1 = require("@dos/platform-core/http");
function loadManifest(serviceCode) {
    const candidates = [
        path.resolve(process.cwd(), 'service.manifest.json'),
        path.resolve(process.cwd(), '..', serviceCode, 'service.manifest.json'),
    ];
    for (const p of candidates) {
        try {
            return JSON.parse(fs.readFileSync(p, 'utf-8'));
        }
        catch { /* skip */ }
    }
    return null;
}
function extractRoutePaths(app) {
    const paths = {};
    const componentSchemas = {};
    function toComponentName(method, normalizedPath, source) {
        return `${method}_${source}_${normalizedPath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'root'}`;
    }
    function normalizeJsonSchema(schemaName, schema) {
        if (!schema || typeof schema !== 'object') {
            return { type: 'object' };
        }
        const raw = schema;
        const definitions = (raw.definitions || raw.$defs);
        if (definitions) {
            for (const [name, definition] of Object.entries(definitions)) {
                if (!componentSchemas[name]) {
                    componentSchemas[name] = definition;
                }
            }
        }
        if (raw.$ref && typeof raw.$ref === 'string') {
            const refName = raw.$ref.split('/').pop() || schemaName;
            return { $ref: `#/components/schemas/${refName}` };
        }
        const cloned = { ...raw };
        delete cloned.definitions;
        delete cloned.$defs;
        return cloned;
    }
    function buildSchemaObject(schemaName, schemaLike) {
        try {
            const jsonSchema = (0, zod_to_json_schema_1.zodToJsonSchema)(schemaLike, {
                name: schemaName,
                target: 'openApi3',
                $refStrategy: 'root',
            });
            return normalizeJsonSchema(schemaName, jsonSchema);
        }
        catch {
            return { type: 'object' };
        }
    }
    function applyValidationMetadata(operation, method, normalizedPath, validation) {
        if (!validation) {
            return;
        }
        const parameters = Array.isArray(operation.parameters)
            ? [...operation.parameters]
            : [];
        if (validation.params) {
            const schema = buildSchemaObject(toComponentName(method, normalizedPath, 'params'), validation.params);
            const paramProps = schema.properties || {};
            const required = new Set(Array.isArray(schema.required) ? schema.required : []);
            for (const [name, paramSchema] of Object.entries(paramProps)) {
                const existingIndex = parameters.findIndex((parameter) => parameter.in === 'path' && parameter.name === name);
                const parameterDef = {
                    name,
                    in: 'path',
                    required: true,
                    schema: paramSchema,
                };
                if (existingIndex >= 0) {
                    parameters[existingIndex] = parameterDef;
                }
                else {
                    parameters.push(parameterDef);
                }
                required.delete(name);
            }
            for (const requiredName of required) {
                if (!parameters.some((parameter) => parameter.in === 'path' && parameter.name === requiredName)) {
                    parameters.push({
                        name: requiredName,
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                    });
                }
            }
        }
        if (validation.query) {
            const schema = buildSchemaObject(toComponentName(method, normalizedPath, 'query'), validation.query);
            const paramProps = schema.properties || {};
            const required = new Set(Array.isArray(schema.required) ? schema.required : []);
            for (const [name, paramSchema] of Object.entries(paramProps)) {
                const existingIndex = parameters.findIndex((parameter) => parameter.in === 'query' && parameter.name === name);
                const parameterDef = {
                    name,
                    in: 'query',
                    required: required.has(name),
                    schema: paramSchema,
                };
                if (existingIndex >= 0) {
                    parameters[existingIndex] = parameterDef;
                }
                else {
                    parameters.push(parameterDef);
                }
            }
        }
        if (parameters.length > 0) {
            operation.parameters = parameters;
        }
        if (validation.body) {
            operation.requestBody = {
                required: true,
                content: {
                    'application/json': {
                        schema: buildSchemaObject(toComponentName(method, normalizedPath, 'body'), validation.body),
                    },
                },
            };
        }
    }
    function walk(stack, prefix) {
        if (!stack)
            return;
        for (const layer of stack) {
            if (layer.route) {
                const routePath = prefix + (layer.route.path || '');
                const normalized = routePath.replace(/\/:[^/]+/g, '/{id}').replace(/\/+/g, '/') || '/';
                if (!paths[normalized])
                    paths[normalized] = {};
                for (const method of Object.keys(layer.route.methods)) {
                    if (method === '_all')
                        continue;
                    const operation = {
                        operationId: `${method}${normalized.replace(/[/{}-]/g, '_').replace(/_+/g, '_')}`,
                        tags: [prefix.split('/').filter(Boolean)[1] || 'default'],
                        parameters: [],
                        responses: {
                            '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object' } } } },
                            '400': { description: 'Validation Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
                            '401': { description: 'Unauthorized — missing or invalid bearer token' },
                            '403': { description: 'Forbidden — insufficient permissions or invalid service token' },
                            '404': { description: 'Not Found' },
                            '429': { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/RateLimitError' } } } },
                            '500': { description: 'Internal Server Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        },
                    };
                    paths[normalized][method] = operation;
                    // Add path params
                    const paramMatches = normalized.matchAll(/\{([^}]+)\}/g);
                    for (const m of paramMatches) {
                        operation.parameters.push({
                            name: m[1], in: 'path', required: true, schema: { type: 'string' },
                        });
                    }
                    // Add query params for GET
                    if (method === 'get' && normalized.endsWith('/')) {
                        operation.parameters.push({ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'sortBy', in: 'query', schema: { type: 'string' } }, { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } });
                    }
                    // Add request body for POST/PUT/PATCH
                    if (['post', 'put', 'patch'].includes(method)) {
                        operation.requestBody = {
                            required: true,
                            content: { 'application/json': { schema: { type: 'object' } } },
                        };
                    }
                    const validationLayer = Array.isArray(layer.route.stack)
                        ? layer.route.stack.find((routeLayer) => (0, http_1.getValidationMetadata)(routeLayer?.handle))
                        : undefined;
                    applyValidationMetadata(operation, method, normalized, (0, http_1.getValidationMetadata)(validationLayer?.handle));
                }
            }
            else if (layer.name === 'router' && layer.handle?.stack) {
                const regSrc = layer.regexp?.toString() || '';
                const re = new RegExp('^/\\^\\\\\\/([a-z0-9_-]+)', 'i');
                const match = regSrc.match(re);
                const mountPath = match ? `${prefix}/${match[1]}` : prefix;
                walk(layer.handle.stack, mountPath);
            }
        }
    }
    try {
        walk(app._router?.stack || [], '');
    }
    catch { /* non-fatal */ }
    if (Object.keys(componentSchemas).length > 0) {
        if (!app.__dosOpenApiSchemas) {
            app.__dosOpenApiSchemas = {};
        }
        Object.assign(app.__dosOpenApiSchemas, componentSchemas);
    }
    return paths;
}
function setupServiceOpenApi(app, config) {
    const manifest = loadManifest(config.serviceCode);
    const displayName = manifest?.displayName || config.serviceCode;
    const spec = {
        openapi: '3.0.3',
        info: {
            title: `${displayName} API`,
            version: config.version || process.env.PLATFORM_VERSION || '1.0.0',
            description: config.description || `DOS Platform — ${displayName} microservice API`,
            contact: { name: 'DOS Platform Team', email: 'platform@doganconsult.com' },
            license: { name: 'Proprietary' },
        },
        servers: [
            { url: '/', description: 'Service root' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                serviceToken: { type: 'apiKey', in: 'header', name: 'x-service-token', description: 'Inter-service JWT for service-to-service calls' },
                tenantId: { type: 'apiKey', in: 'header', name: 'x-tenant-id', description: 'Tenant context identifier' },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Validation failed' },
                        code: { type: 'string', example: 'VALIDATION_ERROR' },
                        service: { type: 'string', example: displayName },
                    },
                    required: ['error', 'code'],
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Validation failed' },
                        code: { type: 'string', example: 'VALIDATION_ERROR' },
                        source: { type: 'string', example: 'body' },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' },
                                    code: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'array', items: { type: 'object' } },
                        meta: {
                            type: 'object',
                            properties: {
                                requestId: { type: 'string', format: 'uuid' },
                                timestamp: { type: 'string', format: 'date-time' },
                                page: { type: 'integer', example: 1 },
                                pageSize: { type: 'integer', example: 20 },
                                total: { type: 'integer', example: 150 },
                                totalPages: { type: 'integer', example: 8 },
                            },
                        },
                    },
                },
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['ok', 'degraded'] },
                        service: { type: 'string' },
                        checks: { type: 'object', additionalProperties: { type: 'string' } },
                        uptime: { type: 'number' },
                        memoryMB: { type: 'integer' },
                        timestamp: { type: 'string', format: 'date-time' },
                    },
                },
                RateLimitError: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Too many requests' },
                        code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                        retryAfterSeconds: { type: 'integer', example: 30 },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }, { tenantId: [] }],
        paths: {},
        tags: (manifest?.modules || []).map(m => ({ name: m, description: `${m} module` })),
    };
    // Delayed path extraction — routes are registered after setupServiceOpenApi
    let pathsExtracted = false;
    app.get('/api-docs.json', (_req, res) => {
        if (!pathsExtracted) {
            spec.paths = extractRoutePaths(app);
            Object.assign(spec.components.schemas, app.__dosOpenApiSchemas || {});
            pathsExtracted = true;
        }
        res.setHeader('Content-Type', 'application/json');
        res.json(spec);
    });
    app.get('/api-docs', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send(`<!DOCTYPE html>
<html><head><title>${displayName} API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api-docs.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis] });</script>
</body></html>`);
    });
}
//# sourceMappingURL=openapi.js.map