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
exports.governanceSchemas = exports.assetSchemas = exports.vendorSchemas = exports.auditSchemas = exports.complianceSchemas = exports.riskSchemas = exports.commonSchemas = exports.mandatoryFields = exports.automationMiddleware = exports.mutationEventHook = exports.apiVersionMiddleware = exports.i18nMiddleware = exports.requireHybridOrHigher = exports.blockInHumanOnlyMode = exports.moduleStack = exports.localKnowledgeAccessLogMiddleware = exports.requestLogger = exports.setAuditData = exports.auditMiddleware = exports.logSuperAdminFieldAccess = exports.logFieldDenial = exports.PII_VALUE_PATTERNS = exports.registerModuleSensitiveFields = exports.redactPIIValues = exports.fieldPermissionCode = exports.isSensitiveField = exports.isRestrictedField = exports.classifyFieldSensitivity = exports.requireOwnership = exports.fieldRbacFilter = exports.fieldRbac = exports.clearSubscriptionCache = exports.invalidateSubscriptionCache = exports.setSubscriptionLookup = exports.subscriptionStatusGuard = exports.clearModuleCache = exports.invalidateModuleCache = exports.setModuleLookup = exports.moduleGuard = exports.perTenantIpKey = exports.perTenantKey = exports.tenantGuard = exports.tenantRateLimiter = exports.moduleRateLimiter = exports.authRateLimiter = exports.rateLimiter = exports.createRateLimiter = exports.requestContext = exports.getCorrelationId = exports.correlationMiddleware = void 0;
exports.requireTenant = exports.validateWebhookPayload = exports.validateRunbook = exports.validateSOP = exports.validateGateOverride = exports.validateVendorGate = exports.validateReleaseGate = exports.validateTelemetryBatch = exports.validateTelemetryIngest = exports.validateEscalationThresholds = exports.validateAuthorityMatrix = exports.validateRiskAppetite = exports.createCorsConfig = exports.getAllCircuitStates = exports.createServiceClient = exports.ServiceClient = exports.generateServiceToken = exports.requireServiceToken = exports.interServiceGuard = exports.DEFAULT_TIER_LIMITS = exports.tenantAwareRateLimiter = exports.idempotencyMiddleware = exports.remediationFilterQuery = exports.incidentFilterQuery = exports.assetFilterQuery = exports.vendorFilterQuery = exports.auditFilterQuery = exports.complianceFilterQuery = exports.riskFilterQuery = exports.filterSchemas = exports.allSchemas = exports.onboardingSchemas = exports.qiyasSchemas = exports.analyticsSchemas = exports.userSchemas = exports.tenantSchemas = exports.notificationSchemas = exports.workflowSchemas = exports.incidentSchemas = exports.remediationSchemas = exports.doraSchemas = exports.privacySchemas = exports.trainingSchemas = exports.bcpSchemas = exports.evidenceSchemas = void 0;
exports.asyncHandler = asyncHandler;
exports.errorHandler = errorHandler;
exports.getValidationMetadata = getValidationMetadata;
exports.validate = validate;
exports.validateStrict = validateStrict;
exports.inputSanitization = inputSanitization;
exports.ok = ok;
exports.paginated = paginated;
exports.action = action;
exports.getTenantAllowedModules = getTenantAllowedModules;
const modules_1 = require("../modules");
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function errorHandler(err, _req, res, _next) {
    const status = err?.status || err?.statusCode || 500;
    res.status(status).json({
        error: err?.message || 'Internal server error',
        code: err?.code || 'INTERNAL_ERROR',
    });
}
const VALID_SOURCES = new Set(['body', 'query', 'params']);
function annotateValidationHandler(handler, metadata) {
    Object.defineProperty(handler, '__dosValidation', {
        value: metadata,
        configurable: false,
        enumerable: false,
        writable: false,
    });
    return handler;
}
function getValidationMetadata(handler) {
    if (!handler || typeof handler !== 'function') {
        return undefined;
    }
    return handler.__dosValidation;
}
function validate(schemaOrMap, options) {
    if (isSchemaMap(schemaOrMap)) {
        return validateMulti(schemaOrMap);
    }
    return validateSingle(schemaOrMap, options);
}
function isSchemaMap(v) {
    return v !== null && typeof v === 'object' && !('safeParse' in v);
}
function validateSingle(schema, options) {
    const source = options?.source && VALID_SOURCES.has(options.source) ? options.source : 'body';
    const strict = options?.strict ?? false;
    const handler = (req, res, next) => {
        const raw = req[source];
        const parseResult = strict
            ? schema.strict?.().safeParse(raw) ?? schema.safeParse(raw)
            : schema.safeParse(raw);
        if (!parseResult.success) {
            res.status(400).json(formatValidationError(parseResult.error, source));
            return;
        }
        req[source] = parseResult.data;
        next();
    };
    return annotateValidationHandler(handler, { [source]: schema, strict });
}
function validateMulti(map) {
    const strict = map.strict ?? false;
    const sources = ['body', 'query', 'params'];
    const handler = (req, res, next) => {
        for (const src of sources) {
            const schema = map[src];
            if (!schema)
                continue;
            const raw = req[src];
            const parseResult = strict
                ? schema.strict?.().safeParse(raw) ?? schema.safeParse(raw)
                : schema.safeParse(raw);
            if (!parseResult.success) {
                res.status(400).json(formatValidationError(parseResult.error, src));
                return;
            }
            req[src] = parseResult.data;
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
function formatValidationError(error, source) {
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
function validateStrict(schemas) {
    return validate({ ...schemas, strict: true });
}
function inputSanitization() {
    return (req, _res, next) => {
        if (req.body && typeof req.body === 'object') {
            sanitizeObject(req.body);
        }
        next();
    };
}
function sanitizeObject(obj) {
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
            obj[key] = val.replace(/\0/g, '').trim();
        }
        else if (val && typeof val === 'object' && !Array.isArray(val)) {
            sanitizeObject(val);
        }
    }
}
__exportStar(require("./platform-http"), exports);
function ok(res, data) {
    res.json({ success: true, data, meta: { requestId: res.req?.correlationId || 'unknown', timestamp: new Date().toISOString() } });
}
function paginated(res, data, total, page, pageSize) {
    res.json({
        success: true,
        data,
        meta: {
            requestId: res.req?.correlationId || 'unknown',
            timestamp: new Date().toISOString(),
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    });
}
function action(res, message) {
    res.json({ success: true, message, meta: { requestId: res.req?.correlationId || 'unknown', timestamp: new Date().toISOString() } });
}
var correlation_1 = require("./correlation");
Object.defineProperty(exports, "correlationMiddleware", { enumerable: true, get: function () { return correlation_1.correlationMiddleware; } });
Object.defineProperty(exports, "getCorrelationId", { enumerable: true, get: function () { return correlation_1.getCorrelationId; } });
Object.defineProperty(exports, "requestContext", { enumerable: true, get: function () { return correlation_1.requestContext; } });
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "createRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.createRateLimiter; } });
Object.defineProperty(exports, "rateLimiter", { enumerable: true, get: function () { return rate_limiter_1.rateLimiter; } });
Object.defineProperty(exports, "authRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.authRateLimiter; } });
Object.defineProperty(exports, "moduleRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.moduleRateLimiter; } });
Object.defineProperty(exports, "tenantRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.tenantRateLimiter; } });
var guards_1 = require("./guards");
Object.defineProperty(exports, "tenantGuard", { enumerable: true, get: function () { return guards_1.tenantGuard; } });
Object.defineProperty(exports, "perTenantKey", { enumerable: true, get: function () { return guards_1.perTenantKey; } });
Object.defineProperty(exports, "perTenantIpKey", { enumerable: true, get: function () { return guards_1.perTenantIpKey; } });
Object.defineProperty(exports, "moduleGuard", { enumerable: true, get: function () { return guards_1.moduleGuard; } });
Object.defineProperty(exports, "setModuleLookup", { enumerable: true, get: function () { return guards_1.setModuleLookup; } });
Object.defineProperty(exports, "invalidateModuleCache", { enumerable: true, get: function () { return guards_1.invalidateModuleCache; } });
Object.defineProperty(exports, "clearModuleCache", { enumerable: true, get: function () { return guards_1.clearModuleCache; } });
Object.defineProperty(exports, "subscriptionStatusGuard", { enumerable: true, get: function () { return guards_1.subscriptionStatusGuard; } });
Object.defineProperty(exports, "setSubscriptionLookup", { enumerable: true, get: function () { return guards_1.setSubscriptionLookup; } });
Object.defineProperty(exports, "invalidateSubscriptionCache", { enumerable: true, get: function () { return guards_1.invalidateSubscriptionCache; } });
Object.defineProperty(exports, "clearSubscriptionCache", { enumerable: true, get: function () { return guards_1.clearSubscriptionCache; } });
var guards_2 = require("./guards");
Object.defineProperty(exports, "fieldRbac", { enumerable: true, get: function () { return guards_2.fieldRbac; } });
Object.defineProperty(exports, "fieldRbacFilter", { enumerable: true, get: function () { return guards_2.fieldRbacFilter; } });
var guards_3 = require("./guards");
Object.defineProperty(exports, "requireOwnership", { enumerable: true, get: function () { return guards_3.requireOwnership; } });
var guards_4 = require("./guards");
Object.defineProperty(exports, "classifyFieldSensitivity", { enumerable: true, get: function () { return guards_4.classifyFieldSensitivity; } });
Object.defineProperty(exports, "isRestrictedField", { enumerable: true, get: function () { return guards_4.isRestrictedField; } });
Object.defineProperty(exports, "isSensitiveField", { enumerable: true, get: function () { return guards_4.isSensitiveField; } });
Object.defineProperty(exports, "fieldPermissionCode", { enumerable: true, get: function () { return guards_4.fieldPermissionCode; } });
Object.defineProperty(exports, "redactPIIValues", { enumerable: true, get: function () { return guards_4.redactPIIValues; } });
Object.defineProperty(exports, "registerModuleSensitiveFields", { enumerable: true, get: function () { return guards_4.registerModuleSensitiveFields; } });
Object.defineProperty(exports, "PII_VALUE_PATTERNS", { enumerable: true, get: function () { return guards_4.PII_VALUE_PATTERNS; } });
Object.defineProperty(exports, "logFieldDenial", { enumerable: true, get: function () { return guards_4.logFieldDenial; } });
Object.defineProperty(exports, "logSuperAdminFieldAccess", { enumerable: true, get: function () { return guards_4.logSuperAdminFieldAccess; } });
var audit_1 = require("./middleware/audit");
Object.defineProperty(exports, "auditMiddleware", { enumerable: true, get: function () { return audit_1.auditMiddleware; } });
Object.defineProperty(exports, "setAuditData", { enumerable: true, get: function () { return audit_1.setAuditData; } });
Object.defineProperty(exports, "requestLogger", { enumerable: true, get: function () { return audit_1.requestLogger; } });
Object.defineProperty(exports, "localKnowledgeAccessLogMiddleware", { enumerable: true, get: function () { return audit_1.localKnowledgeAccessLogMiddleware; } });
var module_stack_1 = require("./middleware/module-stack");
Object.defineProperty(exports, "moduleStack", { enumerable: true, get: function () { return module_stack_1.moduleStack; } });
Object.defineProperty(exports, "blockInHumanOnlyMode", { enumerable: true, get: function () { return module_stack_1.blockInHumanOnlyMode; } });
Object.defineProperty(exports, "requireHybridOrHigher", { enumerable: true, get: function () { return module_stack_1.requireHybridOrHigher; } });
Object.defineProperty(exports, "i18nMiddleware", { enumerable: true, get: function () { return module_stack_1.i18nMiddleware; } });
Object.defineProperty(exports, "apiVersionMiddleware", { enumerable: true, get: function () { return module_stack_1.apiVersionMiddleware; } });
var mutation_event_hook_1 = require("./middleware/mutation-event-hook");
Object.defineProperty(exports, "mutationEventHook", { enumerable: true, get: function () { return mutation_event_hook_1.mutationEventHook; } });
var automation_1 = require("./middleware/automation");
Object.defineProperty(exports, "automationMiddleware", { enumerable: true, get: function () { return automation_1.automationMiddleware; } });
var mandatory_fields_1 = require("./validation/mandatory-fields");
Object.defineProperty(exports, "mandatoryFields", { enumerable: true, get: function () { return mandatory_fields_1.mandatoryFields; } });
var schemas_1 = require("./validation/schemas");
Object.defineProperty(exports, "commonSchemas", { enumerable: true, get: function () { return schemas_1.commonSchemas; } });
Object.defineProperty(exports, "riskSchemas", { enumerable: true, get: function () { return schemas_1.riskSchemas; } });
Object.defineProperty(exports, "complianceSchemas", { enumerable: true, get: function () { return schemas_1.complianceSchemas; } });
Object.defineProperty(exports, "auditSchemas", { enumerable: true, get: function () { return schemas_1.auditSchemas; } });
Object.defineProperty(exports, "vendorSchemas", { enumerable: true, get: function () { return schemas_1.vendorSchemas; } });
Object.defineProperty(exports, "assetSchemas", { enumerable: true, get: function () { return schemas_1.assetSchemas; } });
Object.defineProperty(exports, "governanceSchemas", { enumerable: true, get: function () { return schemas_1.governanceSchemas; } });
Object.defineProperty(exports, "evidenceSchemas", { enumerable: true, get: function () { return schemas_1.evidenceSchemas; } });
Object.defineProperty(exports, "bcpSchemas", { enumerable: true, get: function () { return schemas_1.bcpSchemas; } });
Object.defineProperty(exports, "trainingSchemas", { enumerable: true, get: function () { return schemas_1.trainingSchemas; } });
Object.defineProperty(exports, "privacySchemas", { enumerable: true, get: function () { return schemas_1.privacySchemas; } });
Object.defineProperty(exports, "doraSchemas", { enumerable: true, get: function () { return schemas_1.doraSchemas; } });
Object.defineProperty(exports, "remediationSchemas", { enumerable: true, get: function () { return schemas_1.remediationSchemas; } });
Object.defineProperty(exports, "incidentSchemas", { enumerable: true, get: function () { return schemas_1.incidentSchemas; } });
Object.defineProperty(exports, "workflowSchemas", { enumerable: true, get: function () { return schemas_1.workflowSchemas; } });
Object.defineProperty(exports, "notificationSchemas", { enumerable: true, get: function () { return schemas_1.notificationSchemas; } });
Object.defineProperty(exports, "tenantSchemas", { enumerable: true, get: function () { return schemas_1.tenantSchemas; } });
Object.defineProperty(exports, "userSchemas", { enumerable: true, get: function () { return schemas_1.userSchemas; } });
Object.defineProperty(exports, "analyticsSchemas", { enumerable: true, get: function () { return schemas_1.analyticsSchemas; } });
Object.defineProperty(exports, "qiyasSchemas", { enumerable: true, get: function () { return schemas_1.qiyasSchemas; } });
Object.defineProperty(exports, "onboardingSchemas", { enumerable: true, get: function () { return schemas_1.onboardingSchemas; } });
Object.defineProperty(exports, "allSchemas", { enumerable: true, get: function () { return schemas_1.allSchemas; } });
Object.defineProperty(exports, "filterSchemas", { enumerable: true, get: function () { return schemas_1.filterSchemas; } });
Object.defineProperty(exports, "riskFilterQuery", { enumerable: true, get: function () { return schemas_1.riskFilterQuery; } });
Object.defineProperty(exports, "complianceFilterQuery", { enumerable: true, get: function () { return schemas_1.complianceFilterQuery; } });
Object.defineProperty(exports, "auditFilterQuery", { enumerable: true, get: function () { return schemas_1.auditFilterQuery; } });
Object.defineProperty(exports, "vendorFilterQuery", { enumerable: true, get: function () { return schemas_1.vendorFilterQuery; } });
Object.defineProperty(exports, "assetFilterQuery", { enumerable: true, get: function () { return schemas_1.assetFilterQuery; } });
Object.defineProperty(exports, "incidentFilterQuery", { enumerable: true, get: function () { return schemas_1.incidentFilterQuery; } });
Object.defineProperty(exports, "remediationFilterQuery", { enumerable: true, get: function () { return schemas_1.remediationFilterQuery; } });
var idempotency_1 = require("./idempotency");
Object.defineProperty(exports, "idempotencyMiddleware", { enumerable: true, get: function () { return idempotency_1.idempotencyMiddleware; } });
var tenant_rate_limiter_1 = require("./tenant-rate-limiter");
Object.defineProperty(exports, "tenantAwareRateLimiter", { enumerable: true, get: function () { return tenant_rate_limiter_1.tenantAwareRateLimiter; } });
Object.defineProperty(exports, "DEFAULT_TIER_LIMITS", { enumerable: true, get: function () { return tenant_rate_limiter_1.DEFAULT_TIER_LIMITS; } });
var inter_service_auth_1 = require("./inter-service-auth");
Object.defineProperty(exports, "interServiceGuard", { enumerable: true, get: function () { return inter_service_auth_1.interServiceGuard; } });
Object.defineProperty(exports, "requireServiceToken", { enumerable: true, get: function () { return inter_service_auth_1.requireServiceToken; } });
Object.defineProperty(exports, "generateServiceToken", { enumerable: true, get: function () { return inter_service_auth_1.generateServiceToken; } });
var service_client_1 = require("./service-client");
Object.defineProperty(exports, "ServiceClient", { enumerable: true, get: function () { return service_client_1.ServiceClient; } });
Object.defineProperty(exports, "createServiceClient", { enumerable: true, get: function () { return service_client_1.createServiceClient; } });
Object.defineProperty(exports, "getAllCircuitStates", { enumerable: true, get: function () { return service_client_1.getAllCircuitStates; } });
var cors_config_1 = require("./cors-config");
Object.defineProperty(exports, "createCorsConfig", { enumerable: true, get: function () { return cors_config_1.createCorsConfig; } });
var domain_validators_1 = require("./validation/domain-validators");
Object.defineProperty(exports, "validateRiskAppetite", { enumerable: true, get: function () { return domain_validators_1.validateRiskAppetite; } });
Object.defineProperty(exports, "validateAuthorityMatrix", { enumerable: true, get: function () { return domain_validators_1.validateAuthorityMatrix; } });
Object.defineProperty(exports, "validateEscalationThresholds", { enumerable: true, get: function () { return domain_validators_1.validateEscalationThresholds; } });
Object.defineProperty(exports, "validateTelemetryIngest", { enumerable: true, get: function () { return domain_validators_1.validateTelemetryIngest; } });
Object.defineProperty(exports, "validateTelemetryBatch", { enumerable: true, get: function () { return domain_validators_1.validateTelemetryBatch; } });
Object.defineProperty(exports, "validateReleaseGate", { enumerable: true, get: function () { return domain_validators_1.validateReleaseGate; } });
Object.defineProperty(exports, "validateVendorGate", { enumerable: true, get: function () { return domain_validators_1.validateVendorGate; } });
Object.defineProperty(exports, "validateGateOverride", { enumerable: true, get: function () { return domain_validators_1.validateGateOverride; } });
Object.defineProperty(exports, "validateSOP", { enumerable: true, get: function () { return domain_validators_1.validateSOP; } });
Object.defineProperty(exports, "validateRunbook", { enumerable: true, get: function () { return domain_validators_1.validateRunbook; } });
Object.defineProperty(exports, "validateWebhookPayload", { enumerable: true, get: function () { return domain_validators_1.validateWebhookPayload; } });
Object.defineProperty(exports, "requireTenant", { enumerable: true, get: function () { return domain_validators_1.requireTenant; } });
async function getTenantAllowedModules(tenantId) {
    return (0, modules_1.getActiveModules)(tenantId);
}
//# sourceMappingURL=index.js.map