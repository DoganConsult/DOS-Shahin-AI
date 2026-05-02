import { Request, Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';
/** Minimal structural contract — any object with parse + safeParse (Zod v3/v4, custom) */
export type ZodSchemaLike = {
    parse(data: unknown): unknown;
    safeParse(data: unknown): unknown;
};
export declare function asyncHandler<TReq = Request>(fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler;
export declare function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void;
interface ValidateOptions {
    source?: 'body' | 'query' | 'params';
    strict?: boolean;
}
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
export declare function getValidationMetadata(handler: unknown): ValidationMetadata | undefined;
export declare function validate(schemaOrMap: ZodSchemaLike | SchemaMap, options?: ValidateOptions): RequestHandler;
export declare function validateStrict(schemas: {
    body?: ZodSchemaLike;
    query?: ZodSchemaLike;
    params?: ZodSchemaLike;
}): RequestHandler;
export declare function inputSanitization(): (req: Request, _res: Response, next: NextFunction) => void;
export * from './platform-http';
export declare function ok(res: Response, data: unknown): void;
export declare function paginated(res: Response, data: unknown[], total: number, page: number, pageSize: number): void;
export declare function action(res: Response, message: string): void;
export { correlationMiddleware, getCorrelationId, requestContext } from './correlation';
export type { RequestContext } from './correlation';
export { createRateLimiter, rateLimiter, authRateLimiter, moduleRateLimiter, tenantRateLimiter } from './rate-limiter';
export type { RateLimiterOptions } from './rate-limiter';
export { tenantGuard, perTenantKey, perTenantIpKey, moduleGuard, setModuleLookup, invalidateModuleCache, clearModuleCache, subscriptionStatusGuard, setSubscriptionLookup, invalidateSubscriptionCache, clearSubscriptionCache, } from './guards';
export type { TenantGuardOptions, ModuleGuardOptions, SubscriptionStatus, SubscriptionInfo, SubscriptionStatusGuardOptions, } from './guards';
export { fieldRbac, fieldRbacFilter } from './guards';
export { requireOwnership } from './guards';
export { classifyFieldSensitivity, isRestrictedField, isSensitiveField, fieldPermissionCode, redactPIIValues, registerModuleSensitiveFields, PII_VALUE_PATTERNS, logFieldDenial, logSuperAdminFieldAccess, } from './guards';
export type { SensitivityLevel, SensitiveFieldEntry, FieldDenialAuditEntry } from './guards';
export { auditMiddleware, setAuditData, requestLogger, localKnowledgeAccessLogMiddleware } from './middleware/audit';
export { moduleStack, blockInHumanOnlyMode, requireHybridOrHigher, i18nMiddleware, apiVersionMiddleware } from './middleware/module-stack';
export { mutationEventHook } from './middleware/mutation-event-hook';
export { automationMiddleware } from './middleware/automation';
export { mandatoryFields } from './validation/mandatory-fields';
export { commonSchemas, riskSchemas, complianceSchemas, auditSchemas, vendorSchemas, assetSchemas, governanceSchemas, evidenceSchemas, bcpSchemas, trainingSchemas, privacySchemas, doraSchemas, remediationSchemas, incidentSchemas, workflowSchemas, notificationSchemas, tenantSchemas, userSchemas, analyticsSchemas, qiyasSchemas, onboardingSchemas, allSchemas, filterSchemas, riskFilterQuery, complianceFilterQuery, auditFilterQuery, vendorFilterQuery, assetFilterQuery, incidentFilterQuery, remediationFilterQuery, } from './validation/schemas';
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
export { validateRiskAppetite, validateAuthorityMatrix, validateEscalationThresholds, validateTelemetryIngest, validateTelemetryBatch, validateReleaseGate, validateVendorGate, validateGateOverride, validateSOP, validateRunbook, validateWebhookPayload, requireTenant, } from './validation/domain-validators';
export declare function getTenantAllowedModules(tenantId: string): Promise<string[]>;
