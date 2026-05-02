import { z } from 'zod';
export declare const VendorRiskChangedPayloadSchema: z.ZodObject<{
    vendorId: z.ZodString;
    tenantId: z.ZodString;
    previousRiskScore: z.ZodOptional<z.ZodNumber>;
    currentRiskScore: z.ZodNumber;
    riskLevel: z.ZodEnum<["low", "medium", "high", "critical"]>;
    changedAt: z.ZodString;
    changedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    vendorId?: string;
    previousRiskScore?: number;
    currentRiskScore?: number;
    riskLevel?: "low" | "medium" | "high" | "critical";
    changedAt?: string;
    changedBy?: string;
}, {
    tenantId?: string;
    vendorId?: string;
    previousRiskScore?: number;
    currentRiskScore?: number;
    riskLevel?: "low" | "medium" | "high" | "critical";
    changedAt?: string;
    changedBy?: string;
}>;
export declare const RiskScoreChangedPayloadSchema: z.ZodObject<{
    riskId: z.ZodString;
    tenantId: z.ZodString;
    previousScore: z.ZodOptional<z.ZodNumber>;
    currentScore: z.ZodNumber;
    previousRating: z.ZodOptional<z.ZodString>;
    currentRating: z.ZodString;
    changedAt: z.ZodString;
    changedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    changedAt?: string;
    changedBy?: string;
    riskId?: string;
    previousScore?: number;
    currentScore?: number;
    previousRating?: string;
    currentRating?: string;
}, {
    tenantId?: string;
    changedAt?: string;
    changedBy?: string;
    riskId?: string;
    previousScore?: number;
    currentScore?: number;
    previousRating?: string;
    currentRating?: string;
}>;
export declare const EvidenceSubmittedPayloadSchema: z.ZodObject<{
    evidenceId: z.ZodString;
    tenantId: z.ZodString;
    submittedBy: z.ZodString;
    controlId: z.ZodOptional<z.ZodString>;
    complianceObligationId: z.ZodOptional<z.ZodString>;
    fileCount: z.ZodDefault<z.ZodNumber>;
    submittedAt: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending_review", "accepted", "rejected"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "pending_review" | "accepted" | "rejected";
    tenantId?: string;
    evidenceId?: string;
    submittedBy?: string;
    controlId?: string;
    complianceObligationId?: string;
    fileCount?: number;
    submittedAt?: string;
}, {
    status?: "pending_review" | "accepted" | "rejected";
    tenantId?: string;
    evidenceId?: string;
    submittedBy?: string;
    controlId?: string;
    complianceObligationId?: string;
    fileCount?: number;
    submittedAt?: string;
}>;
export declare const RiskExceededAppetitePayloadSchema: z.ZodObject<{
    riskId: z.ZodString;
    tenantId: z.ZodString;
    currentScore: z.ZodNumber;
    appetiteThreshold: z.ZodNumber;
    exceedanceAmount: z.ZodNumber;
    riskOwner: z.ZodOptional<z.ZodString>;
    detectedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    riskId?: string;
    currentScore?: number;
    appetiteThreshold?: number;
    exceedanceAmount?: number;
    riskOwner?: string;
    detectedAt?: string;
}, {
    tenantId?: string;
    riskId?: string;
    currentScore?: number;
    appetiteThreshold?: number;
    exceedanceAmount?: number;
    riskOwner?: string;
    detectedAt?: string;
}>;
export declare const CompliancePosturePayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    frameworkCode: z.ZodString;
    overallScore: z.ZodNumber;
    compliantControls: z.ZodNumber;
    nonCompliantControls: z.ZodNumber;
    partialControls: z.ZodNumber;
    calculatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    frameworkCode?: string;
    overallScore?: number;
    compliantControls?: number;
    nonCompliantControls?: number;
    partialControls?: number;
    calculatedAt?: string;
}, {
    tenantId?: string;
    frameworkCode?: string;
    overallScore?: number;
    compliantControls?: number;
    nonCompliantControls?: number;
    partialControls?: number;
    calculatedAt?: string;
}>;
export declare const ComplianceGapPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    gapId: z.ZodString;
    frameworkCode: z.ZodString;
    controlId: z.ZodString;
    gapDescription: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    identifiedAt: z.ZodString;
    dueDate: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    controlId?: string;
    frameworkCode?: string;
    gapId?: string;
    gapDescription?: string;
    severity?: "low" | "medium" | "high" | "critical";
    identifiedAt?: string;
    dueDate?: string;
    assignedTo?: string;
}, {
    tenantId?: string;
    controlId?: string;
    frameworkCode?: string;
    gapId?: string;
    gapDescription?: string;
    severity?: "low" | "medium" | "high" | "critical";
    identifiedAt?: string;
    dueDate?: string;
    assignedTo?: string;
}>;
