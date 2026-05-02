import { Request, Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';
import { getActiveModules } from '../modules';

interface ValidationIssueLike {
  path: Array<string | number>;
  message: string;
  code: string;
}

interface ValidationErrorLike {
  issues: ValidationIssueLike[];
}

/** Minimal structural contract — any object with parse + safeParse (Zod v3/v4, custom) */
export type ZodSchemaLike = {
  parse(data: unknown): unknown;
  safeParse(data: unknown): unknown;
};

export function asyncHandler<TReq = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next): void => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next);
  };
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    error: err?.message || 'Internal server error',
    code: err?.code || 'INTERNAL_ERROR',
  });
}

interface ValidateOptions {
  source?: 'body' | 'query' | 'params';
  strict?: boolean;
}

type SourceKey = 'body' | 'query' | 'params';

interface SchemaMap {
  body?: ZodSchemaLike;
  query?: ZodSchemaLike;
  params?: ZodSchemaLike;
  strict?: boolean;
}

export interface ValidationMetadata {
  body?: ZodSchemaLike;
  query?: ZodSchemaLike;
  params?: ZodSchemaLike;
  strict?: boolean;
}

export interface ValidationAnnotatedHandler extends RequestHandler {
  __dosValidation?: ValidationMetadata;
}

const VALID_SOURCES: ReadonlySet<string> = new Set(['body', 'query', 'params']);

function annotateValidationHandler(handler: RequestHandler, metadata: ValidationMetadata): RequestHandler {
  Object.defineProperty(handler, '__dosValidation', {
    value: metadata,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  return handler;
}

export function getValidationMetadata(handler: unknown): ValidationMetadata | undefined {
  if (!handler || typeof handler !== 'function') {
    return undefined;
  }
  return (handler as ValidationAnnotatedHandler).__dosValidation;
}

export function validate(
  schemaOrMap: ZodSchemaLike | SchemaMap,
  options?: ValidateOptions,
): RequestHandler {
  if (isSchemaMap(schemaOrMap)) {
    return validateMulti(schemaOrMap);
  }
  return validateSingle(schemaOrMap, options);
}

function isSchemaMap(v: ZodSchemaLike | SchemaMap): v is SchemaMap {
  return v !== null && typeof v === 'object' && !('safeParse' in v);
}

function validateSingle(schema: ZodSchemaLike, options?: ValidateOptions): RequestHandler {
  const source: SourceKey =
    options?.source && VALID_SOURCES.has(options.source) ? options.source : 'body';
  const strict = options?.strict ?? false;

  const handler: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const raw = req[source];
    const parseResult = strict
      ? (schema as any).strict?.().safeParse(raw) ?? schema.safeParse(raw)
      : schema.safeParse(raw);

    if (!parseResult.success) {
      res.status(400).json(formatValidationError(parseResult.error, source));
      return;
    }
    (req as any)[source] = parseResult.data;
    next();
  };

  return annotateValidationHandler(handler, { [source]: schema, strict });
}

function validateMulti(map: SchemaMap) {
  const strict = map.strict ?? false;
  const sources: SourceKey[] = ['body', 'query', 'params'];

  const handler: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    for (const src of sources) {
      const schema = map[src];
      if (!schema) continue;

      const raw = req[src];
      const parseResult = strict
        ? (schema as any).strict?.().safeParse(raw) ?? schema.safeParse(raw)
        : schema.safeParse(raw);

      if (!parseResult.success) {
        res.status(400).json(formatValidationError(parseResult.error, src));
        return;
      }
      (req as any)[src] = parseResult.data;
    }
    next();
  };

  return annotateValidationHandler(handler, {
    body: map.body,
    query: map.query,
    params: map.params,
    strict,
  });
}

function formatValidationError(error: ValidationErrorLike, source: string) {
  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    source,
    details: error.issues.map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    })),
  };
}

export function validateStrict(schemas: { body?: ZodSchemaLike; query?: ZodSchemaLike; params?: ZodSchemaLike }): RequestHandler {
  return validate({ ...schemas, strict: true });
}

export function inputSanitization() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    next();
  };
}

function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = val.replace(/\0/g, '').trim();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitizeObject(val as Record<string, unknown>);
    }
  }
}

export * from './platform-http';

export function ok(res: Response, data: unknown): void {
  res.json({ success: true, data, meta: { requestId: (res.req as any)?.correlationId || 'unknown', timestamp: new Date().toISOString() } });
}

export function paginated(res: Response, data: unknown[], total: number, page: number, pageSize: number): void {
  res.json({
    success: true,
    data,
    meta: {
      requestId: (res.req as any)?.correlationId || 'unknown',
      timestamp: new Date().toISOString(),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export function action(res: Response, message: string): void {
  res.json({ success: true, message, meta: { requestId: (res.req as any)?.correlationId || 'unknown', timestamp: new Date().toISOString() } });
}

export { correlationMiddleware, getCorrelationId, requestContext } from './correlation';
export type { RequestContext } from './correlation';
export { createRateLimiter, rateLimiter, authRateLimiter, moduleRateLimiter, tenantRateLimiter } from './rate-limiter';
export type { RateLimiterOptions } from './rate-limiter';
export {
  tenantGuard,
  perTenantKey,
  perTenantIpKey,
  moduleGuard,
  setModuleLookup,
  invalidateModuleCache,
  clearModuleCache,
  subscriptionStatusGuard,
  setSubscriptionLookup,
  invalidateSubscriptionCache,
  clearSubscriptionCache,
} from './guards';
export type {
  TenantGuardOptions,
  ModuleGuardOptions,
  SubscriptionStatus,
  SubscriptionInfo,
  SubscriptionStatusGuardOptions,
} from './guards';
export { fieldRbac, fieldRbacFilter } from './guards';
export { requireOwnership } from './guards';

export {
  classifyFieldSensitivity,
  isRestrictedField,
  isSensitiveField,
  fieldPermissionCode,
  redactPIIValues,
  registerModuleSensitiveFields,
  PII_VALUE_PATTERNS,
  logFieldDenial,
  logSuperAdminFieldAccess,
} from './guards';
export type { SensitivityLevel, SensitiveFieldEntry, FieldDenialAuditEntry } from './guards';
export { auditMiddleware, setAuditData, requestLogger, localKnowledgeAccessLogMiddleware } from './middleware/audit';
export { moduleStack, blockInHumanOnlyMode, requireHybridOrHigher, i18nMiddleware, apiVersionMiddleware } from './middleware/module-stack';
export { mutationEventHook } from './middleware/mutation-event-hook';
export { automationMiddleware } from './middleware/automation';

export { mandatoryFields } from './validation/mandatory-fields';
export {
  commonSchemas, riskSchemas, complianceSchemas, auditSchemas, vendorSchemas,
  assetSchemas, governanceSchemas, evidenceSchemas, bcpSchemas, trainingSchemas,
  privacySchemas, doraSchemas, remediationSchemas, incidentSchemas, workflowSchemas,
  notificationSchemas, tenantSchemas, userSchemas, analyticsSchemas, qiyasSchemas,
  onboardingSchemas, allSchemas, filterSchemas,
  riskFilterQuery, complianceFilterQuery, auditFilterQuery, vendorFilterQuery,
  assetFilterQuery, incidentFilterQuery, remediationFilterQuery,
} from './validation/schemas';

export { idempotencyMiddleware } from './idempotency';
export type { IdempotencyOptions } from './idempotency';

export { tenantAwareRateLimiter, DEFAULT_TIER_LIMITS } from './tenant-rate-limiter';
export type { RateLimitTier, TierLimits, TenantRateLimitConfig } from './tenant-rate-limiter';

export { interServiceGuard, requireServiceToken, generateServiceToken } from './inter-service-auth';
export type { InterServiceToken } from './inter-service-auth';

export { ServiceClient, createServiceClient, getAllCircuitStates } from './service-client';
export type { ServiceClientOptions, ServiceResponse } from './service-client';

export { createCorsConfig } from './cors-config';
export type { CorsConfigOptions } from './cors-config';

export {
  validateRiskAppetite, validateAuthorityMatrix, validateEscalationThresholds,
  validateTelemetryIngest, validateTelemetryBatch, validateReleaseGate,
  validateVendorGate, validateGateOverride, validateSOP, validateRunbook,
  validateWebhookPayload, requireTenant,
} from './validation/domain-validators';

export async function getTenantAllowedModules(tenantId: string): Promise<string[]> {
  return getActiveModules(tenantId);
}
