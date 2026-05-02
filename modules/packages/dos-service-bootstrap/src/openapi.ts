import { Express, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getValidationMetadata, type ValidationMetadata } from '@dos/platform-core/http';

export interface OpenApiConfig {
  serviceCode: string;
  version?: string;
  description?: string;
  apiBase?: string;
}

interface ServiceManifest {
  serviceCode: string;
  displayName?: string;
  modules?: string[];
  exposes?: { apiBase?: string };
}

function loadManifest(serviceCode: string): ServiceManifest | null {
  const candidates = [
    path.resolve(process.cwd(), 'service.manifest.json'),
    path.resolve(process.cwd(), '..', serviceCode, 'service.manifest.json'),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch { /* skip */ }
  }
  return null;
}

function extractRoutePaths(app: Express): Record<string, Record<string, unknown>> {
  const paths: Record<string, Record<string, unknown>> = {};
  const componentSchemas: Record<string, unknown> = {};

  function toComponentName(method: string, normalizedPath: string, source: 'body' | 'query' | 'params'): string {
    return `${method}_${source}_${normalizedPath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'root'}`;
  }

  function normalizeJsonSchema(schemaName: string, schema: unknown): unknown {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object' };
    }

    const raw = schema as Record<string, unknown>;
    const definitions = (raw.definitions || raw.$defs) as Record<string, unknown> | undefined;
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

  function buildSchemaObject(schemaName: string, schemaLike: unknown): unknown {
    try {
      const jsonSchema = zodToJsonSchema(schemaLike as any, {
        name: schemaName,
        target: 'openApi3',
        $refStrategy: 'root',
      } as any);
      return normalizeJsonSchema(schemaName, jsonSchema as unknown);
    } catch {
      return { type: 'object' };
    }
  }

  function applyValidationMetadata(
    operation: Record<string, unknown>,
    method: string,
    normalizedPath: string,
    validation: ValidationMetadata | undefined,
  ): void {
    if (!validation) {
      return;
    }

    const parameters = Array.isArray(operation.parameters)
      ? [...(operation.parameters as Array<Record<string, unknown>>)]
      : [];

    if (validation.params) {
      const schema = buildSchemaObject(toComponentName(method, normalizedPath, 'params'), validation.params);
      const paramProps = (schema as Record<string, any>).properties || {};
      const required = new Set<string>(Array.isArray((schema as Record<string, any>).required) ? ((schema as Record<string, any>).required as string[]) : []);
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
        } else {
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
      const paramProps = (schema as Record<string, any>).properties || {};
      const required = new Set<string>(Array.isArray((schema as Record<string, any>).required) ? ((schema as Record<string, any>).required as string[]) : []);
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
        } else {
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

  function walk(stack: any[], prefix: string) {
    if (!stack) return;
    for (const layer of stack) {
      if (layer.route) {
        const routePath = prefix + (layer.route.path || '');
        const normalized = routePath.replace(/\/:[^/]+/g, '/{id}').replace(/\/+/g, '/') || '/';
        if (!paths[normalized]) paths[normalized] = {};
        for (const method of Object.keys(layer.route.methods)) {
          if (method === '_all') continue;
          const operation: Record<string, unknown> = {
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
            (operation.parameters as Array<Record<string, unknown>>).push({
              name: m[1], in: 'path', required: true, schema: { type: 'string' },
            });
          }
          // Add query params for GET
          if (method === 'get' && normalized.endsWith('/')) {
            (operation.parameters as Array<Record<string, unknown>>).push(
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
              { name: 'search', in: 'query', schema: { type: 'string' } },
              { name: 'sortBy', in: 'query', schema: { type: 'string' } },
              { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
            );
          }
          // Add request body for POST/PUT/PATCH
          if (['post', 'put', 'patch'].includes(method)) {
            operation.requestBody = {
              required: true,
              content: { 'application/json': { schema: { type: 'object' } } },
            };
          }

          const validationLayer = Array.isArray(layer.route.stack)
            ? layer.route.stack.find((routeLayer: any) => getValidationMetadata(routeLayer?.handle))
            : undefined;
          applyValidationMetadata(operation, method, normalized, getValidationMetadata(validationLayer?.handle));
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const regSrc = layer.regexp?.toString() || '';
        const re = new RegExp('^/\\^\\\\\\/([a-z0-9_-]+)', 'i');
        const match = regSrc.match(re);
        const mountPath = match ? `${prefix}/${match[1]}` : prefix;
        walk(layer.handle.stack, mountPath);
      }
    }
  }

  try {
    walk((app as any)._router?.stack || [], '');
  } catch { /* non-fatal */ }

  if (Object.keys(componentSchemas).length > 0) {
    if (!(app as any).__dosOpenApiSchemas) {
      (app as any).__dosOpenApiSchemas = {};
    }
    Object.assign((app as any).__dosOpenApiSchemas, componentSchemas);
  }

  return paths;
}

export function setupServiceOpenApi(app: Express, config: OpenApiConfig): void {
  const manifest = loadManifest(config.serviceCode);
  const displayName = manifest?.displayName || config.serviceCode;

  const spec: any = {
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
        bearerAuth: { type: 'http' as const, scheme: 'bearer', bearerFormat: 'JWT' },
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
    paths: {} as Record<string, unknown>,
    tags: (manifest?.modules || []).map(m => ({ name: m, description: `${m} module` })),
  };

  // Delayed path extraction — routes are registered after setupServiceOpenApi
  let pathsExtracted = false;

  app.get('/api-docs.json', (_req: Request, res: Response) => {
    if (!pathsExtracted) {
      spec.paths = extractRoutePaths(app);
      Object.assign(spec.components.schemas, (app as any).__dosOpenApiSchemas || {});
      pathsExtracted = true;
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
  });

  app.get('/api-docs', (_req: Request, res: Response) => {
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
