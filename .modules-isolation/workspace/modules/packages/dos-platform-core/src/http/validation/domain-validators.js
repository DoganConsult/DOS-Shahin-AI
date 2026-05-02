"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebhookPayload = exports.validateRunbook = exports.validateSOP = exports.validateGateOverride = exports.validateVendorGate = exports.validateReleaseGate = exports.validateTelemetryBatch = exports.validateTelemetryIngest = exports.validateEscalationThresholds = exports.validateAuthorityMatrix = exports.validateRiskAppetite = void 0;
exports.requireTenant = requireTenant;
function domainValidator(schemaName) {
    return (req, res, next) => {
        // Domain validators rely on the route-level Zod schemas.
        // This middleware serves as a named passthrough that can be
        // extended with domain-specific validation logic (e.g., cross-field
        // checks, tenant-aware constraints) beyond Zod's capabilities.
        next();
    };
}
exports.validateRiskAppetite = domainValidator('riskAppetite');
exports.validateAuthorityMatrix = domainValidator('authorityMatrix');
exports.validateEscalationThresholds = domainValidator('escalationThresholds');
exports.validateTelemetryIngest = domainValidator('telemetryIngest');
exports.validateTelemetryBatch = domainValidator('telemetryBatch');
exports.validateReleaseGate = domainValidator('releaseGate');
exports.validateVendorGate = domainValidator('vendorGate');
exports.validateGateOverride = domainValidator('gateOverride');
exports.validateSOP = domainValidator('sop');
exports.validateRunbook = domainValidator('runbook');
exports.validateWebhookPayload = domainValidator('webhookPayload');
/**
 * Middleware that requires a tenant_id on the request (from JWT or header).
 */
function requireTenant(req, res, next) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
        return;
    }
    req.tenantId = tenantId;
    next();
}
//# sourceMappingURL=domain-validators.js.map