"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceGapPayloadSchema = exports.CompliancePosturePayloadSchema = exports.RiskExceededAppetitePayloadSchema = exports.EvidenceSubmittedPayloadSchema = exports.RiskScoreChangedPayloadSchema = exports.VendorRiskChangedPayloadSchema = void 0;
const zod_1 = require("zod");
exports.VendorRiskChangedPayloadSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    previousRiskScore: zod_1.z.number().min(0).max(100).optional(),
    currentRiskScore: zod_1.z.number().min(0).max(100),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    changedAt: zod_1.z.string().datetime(),
    changedBy: zod_1.z.string().optional(),
});
exports.RiskScoreChangedPayloadSchema = zod_1.z.object({
    riskId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    previousScore: zod_1.z.number().min(0).max(100).optional(),
    currentScore: zod_1.z.number().min(0).max(100),
    previousRating: zod_1.z.string().optional(),
    currentRating: zod_1.z.string(),
    changedAt: zod_1.z.string().datetime(),
    changedBy: zod_1.z.string().optional(),
});
exports.EvidenceSubmittedPayloadSchema = zod_1.z.object({
    evidenceId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    submittedBy: zod_1.z.string(),
    controlId: zod_1.z.string().uuid().optional(),
    complianceObligationId: zod_1.z.string().uuid().optional(),
    fileCount: zod_1.z.number().int().min(0).default(0),
    submittedAt: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['pending_review', 'accepted', 'rejected']).default('pending_review'),
});
exports.RiskExceededAppetitePayloadSchema = zod_1.z.object({
    riskId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    currentScore: zod_1.z.number().min(0).max(100),
    appetiteThreshold: zod_1.z.number().min(0).max(100),
    exceedanceAmount: zod_1.z.number(),
    riskOwner: zod_1.z.string().optional(),
    detectedAt: zod_1.z.string().datetime(),
});
exports.CompliancePosturePayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    frameworkCode: zod_1.z.string(),
    overallScore: zod_1.z.number().min(0).max(100),
    compliantControls: zod_1.z.number().int().min(0),
    nonCompliantControls: zod_1.z.number().int().min(0),
    partialControls: zod_1.z.number().int().min(0),
    calculatedAt: zod_1.z.string().datetime(),
});
exports.ComplianceGapPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    gapId: zod_1.z.string().uuid(),
    frameworkCode: zod_1.z.string(),
    controlId: zod_1.z.string().uuid(),
    gapDescription: zod_1.z.string(),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    identifiedAt: zod_1.z.string().datetime(),
    dueDate: zod_1.z.string().datetime().optional(),
    assignedTo: zod_1.z.string().optional(),
});
//# sourceMappingURL=platform-event-schemas.js.map