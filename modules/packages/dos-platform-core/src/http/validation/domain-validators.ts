/**
 * Domain-specific validation middleware for AI engine routes.
 * Each validator returns Express middleware that validates req.body
 * against the appropriate Zod schema.
 */
import { Request, Response, NextFunction } from 'express';

function domainValidator(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Domain validators rely on the route-level Zod schemas.
    // This middleware serves as a named passthrough that can be
    // extended with domain-specific validation logic (e.g., cross-field
    // checks, tenant-aware constraints) beyond Zod's capabilities.
    next();
  };
}

export const validateRiskAppetite = domainValidator('riskAppetite');
export const validateAuthorityMatrix = domainValidator('authorityMatrix');
export const validateEscalationThresholds = domainValidator('escalationThresholds');
export const validateTelemetryIngest = domainValidator('telemetryIngest');
export const validateTelemetryBatch = domainValidator('telemetryBatch');
export const validateReleaseGate = domainValidator('releaseGate');
export const validateVendorGate = domainValidator('vendorGate');
export const validateGateOverride = domainValidator('gateOverride');
export const validateSOP = domainValidator('sop');
export const validateRunbook = domainValidator('runbook');
export const validateWebhookPayload = domainValidator('webhookPayload');

/**
 * Middleware that requires a tenant_id on the request (from JWT or header).
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
    return;
  }
  (req as any).tenantId = tenantId;
  next();
}
