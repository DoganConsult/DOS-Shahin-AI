import { z } from 'zod';

export const VendorRiskChangedPayloadSchema = z.object({
  vendorId: z.string().uuid(),
  tenantId: z.string().uuid(),
  previousRiskScore: z.number().min(0).max(100).optional(),
  currentRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  changedAt: z.string().datetime(),
  changedBy: z.string().optional(),
});

export const RiskScoreChangedPayloadSchema = z.object({
  riskId: z.string().uuid(),
  tenantId: z.string().uuid(),
  previousScore: z.number().min(0).max(100).optional(),
  currentScore: z.number().min(0).max(100),
  previousRating: z.string().optional(),
  currentRating: z.string(),
  changedAt: z.string().datetime(),
  changedBy: z.string().optional(),
});

export const EvidenceSubmittedPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  submittedBy: z.string(),
  controlId: z.string().uuid().optional(),
  complianceObligationId: z.string().uuid().optional(),
  fileCount: z.number().int().min(0).default(0),
  submittedAt: z.string().datetime(),
  status: z.enum(['pending_review', 'accepted', 'rejected']).default('pending_review'),
});

export const RiskExceededAppetitePayloadSchema = z.object({
  riskId: z.string().uuid(),
  tenantId: z.string().uuid(),
  currentScore: z.number().min(0).max(100),
  appetiteThreshold: z.number().min(0).max(100),
  exceedanceAmount: z.number(),
  riskOwner: z.string().optional(),
  detectedAt: z.string().datetime(),
});

export const CompliancePosturePayloadSchema = z.object({
  tenantId: z.string().uuid(),
  frameworkCode: z.string(),
  overallScore: z.number().min(0).max(100),
  compliantControls: z.number().int().min(0),
  nonCompliantControls: z.number().int().min(0),
  partialControls: z.number().int().min(0),
  calculatedAt: z.string().datetime(),
});

export const ComplianceGapPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  gapId: z.string().uuid(),
  frameworkCode: z.string(),
  controlId: z.string().uuid(),
  gapDescription: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  identifiedAt: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
});
