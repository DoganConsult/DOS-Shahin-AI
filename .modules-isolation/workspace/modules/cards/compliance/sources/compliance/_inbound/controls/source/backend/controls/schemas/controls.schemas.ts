/**
 * Controls Module Zod Schemas — Zod v4 Enterprise Grade
 * Validation schemas for controls API request bodies and query params.
 * Uses advanced features from common.schemas.
 *
 * @owner controls
 * @module controls
 * @since 2026-03-31
 */
import { z } from 'zod';
import {
  paginationQuery,
  grcSeverity,
  grcSanitizedText,
  grcISODate,
  grcSortDir as _grcSortDir,
  dateRange as _dateRange,
  queryBoolean,
  bulkIdsBody as _bulkIdsBody,
} from '../../../schemas/common.schemas';

// ── Domain Enums ─────────────────────────────────────────────────────

const controlType = z.enum(['preventive', 'detective', 'corrective', 'compensating']);
const automationLevel = z.enum(['manual', 'semi_automated', 'automated']);
const testType = z.enum([
  'design', 'operating', 'substantive', 'inspection',
  'observation', 'inquiry', 'reperformance', 'analytical', 'automated',
]);
const testResult = z.enum(['effective', 'partially_effective', 'ineffective', 'not_tested']);
const certificationResponse = z.enum(['attested', 'exception', 'remediation_needed']);
const reportFormat = z.enum(['pdf', 'xlsx', 'csv', 'json']);
const comparisonOperator = z.enum(['>', '<', '>=', '<=', '==', '!=']);

// ── Library ──────────────────────────────────────────────────────────
export const createControlBody = z.object({
  title: z.string().min(3).max(500).trim(),
  description: grcSanitizedText(5000).optional(),
  objective: grcSanitizedText(2000).optional(),
  statement: grcSanitizedText(5000).optional(),
  frameworkId: z.string().uuid().optional(),
  familyId: z.string().uuid().optional(),
  controlType: controlType.optional(),
  automationLevel: automationLevel.optional(),
  keyControl: z.boolean().optional(),
  frequency: z.string().max(100).optional(),
  owner: z.string().max(255).optional(),
  operatorUserId: z.string().uuid().optional(),
  reviewerUserId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
});

export const updateControlBody = createControlBody.partial();

export const listControlsQuery = paginationQuery.extend({
  frameworkId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
  owner: z.string().max(255).optional(),
  family: z.string().max(100).optional(),
  controlType: controlType.optional(),
  automationLevel: automationLevel.optional(),
  keyControl: queryBoolean.optional(),
  unmappedOnly: queryBoolean.optional(),
  failingOnly: queryBoolean.optional(),
  groupBy: z.enum(['family', 'owner']).optional(),
  scope: z.enum(['my', 'all']).optional(),
  testStatus: z.string().max(50).optional(),
});

// ── Testing ──────────────────────────────────────────────────────────
export const createControlTestBody = z.object({
  control_id: z.string().min(1),
  test_type: testType.optional(),
  result: testResult.optional(),
  notes: grcSanitizedText(5000).optional(),
  evidenceRef: z.string().max(500).optional(),
});

// ── Lifecycle ────────────────────────────────────────────────────────
export const transitionBody = z.object({
  toState: z.string().min(1).max(50),
  note: grcSanitizedText(2000).optional(),
});

// ── Mapping ──────────────────────────────────────────────────────────
export const linkRiskBody = z.object({ riskId: z.string().min(1) });
export const linkObligationBody = z.object({ obligationId: z.string().min(1) });
export const linkPolicyBody = z.object({ policyId: z.string().min(1) });

// ── Certifications ───────────────────────────────────────────────────
export const createCertificationCampaignBody = z.object({
  name: z.string().min(3).max(500).trim(),
  description: grcSanitizedText(2000).optional(),
  controlIds: z.array(z.string().min(1)).min(1).max(200),
  startDate: grcISODate,
  endDate: grcISODate,
}).refine(
  (d) => d.startDate <= d.endDate,
  { message: 'startDate must be on or before endDate', path: ['endDate'] },
);

export const submitCertificationResponseBody = z.object({
  response: certificationResponse,
  comments: grcSanitizedText(5000).optional(),
  evidenceRef: z.string().max(500).optional(),
});

// ── Deficiencies ─────────────────────────────────────────────────────
export const createDeficiencyBody = z.object({
  controlId: z.string().min(1),
  severity: grcSeverity,
  description: z.string().min(3).max(5000).trim(),
  rootCause: z.string().max(2000).trim().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: grcISODate.optional(),
});

export const createRemediationBody = z.object({
  title: z.string().min(3).max(500).trim(),
  description: grcSanitizedText(5000).optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: grcISODate.optional(),
});

export const closeDeficiencyBody = z.object({
  evidenceRef: z.string().max(500).optional(),
  notes: grcSanitizedText(2000).optional(),
});

// ── Monitoring ───────────────────────────────────────────────────────
export const createMonitoringRuleBody = z.object({
  controlId: z.string().min(1),
  ruleName: z.string().min(3).max(255).trim(),
  signalSource: z.string().max(255).optional(),
  metric: z.string().max(255).optional(),
  operator: comparisonOperator.optional(),
  threshold: z.coerce.number().optional(),
  severity: grcSeverity,
  autoCreateIssue: z.boolean().optional(),
});

export const updateMonitoringRuleBody = createMonitoringRuleBody.partial();

// ── Admin ────────────────────────────────────────────────────────────
export const createFamilyBody = z.object({
  code: z.string().min(1).max(100),
  name_en: z.string().min(1).max(255).trim(),
  name_ar: z.string().max(255).trim().optional(),
  description: grcSanitizedText(2000).optional(),
  parentCategoryId: z.string().uuid().optional(),
});

export const updateFamilyBody = createFamilyBody.partial();

export const createTestTemplateBody = z.object({
  name: z.string().min(3).max(255).trim(),
  testType: testType.optional(),
  methodology: grcSanitizedText(5000).optional(),
  steps: z.array(z.string().max(1000)).optional(),
  expectedOutcome: grcSanitizedText(2000).optional(),
  passCriteria: grcSanitizedText(2000).optional(),
  failCriteria: grcSanitizedText(2000).optional(),
});

// ── Bulk Operations ──────────────────────────────────────────────────
export const bulkAssignTeamBody = z.object({
  controlIds: z.array(z.string().min(1)).min(1).max(200),
  teamId: z.string().min(1),
});

export const resolveFailureBody = z.object({
  resolution_note: z.string().min(1).max(5000).trim(),
});

// ── Reports ──────────────────────────────────────────────────────────
export const runReportBody = z.object({
  reportType: z.string().min(1).max(100),
  frameworkId: z.string().uuid().optional(),
  dateFrom: grcISODate.optional(),
  dateTo: grcISODate.optional(),
  format: reportFormat.optional(),
}).refine(
  (d) => !d.dateFrom || !d.dateTo || d.dateFrom <= d.dateTo,
  { message: 'dateFrom must be on or before dateTo', path: ['dateTo'] },
);

// ── Type Exports ─────────────────────────────────────────────────────

export type CreateControl = z.infer<typeof createControlBody>;
export type ListControlsQuery = z.infer<typeof listControlsQuery>;
export type CreateDeficiency = z.infer<typeof createDeficiencyBody>;

export let updateSettingsBody = z.object({
      taxonomy: z.record(z.string(), z.unknown()).optional(),
      testTemplates: z.record(z.string(), z.unknown()).optional(),
      scoringRules: z.record(z.string(), z.unknown()).optional(),
      certificationSettings: z.record(z.string(), z.unknown()).optional(),
    });

export type UpdateSettingsBodyInput = z.infer<typeof updateSettingsBody>;

export let createCampaignBody = z.object({
      name: z.string().min(1, "Campaign name is required"),
      description: z.string().optional(),
      dueDate: z.string().min(1, "Due date is required"),
      controlScope: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
    });

export type CreateCampaignBodyInput = z.infer<typeof createCampaignBody>;

export let attestationResponseBody = z.object({
      status: z.enum(["certified", "not_certified", "partially_certified", "exception_requested"]),
      comments: z.string().optional(),
      evidenceRefs: z.array(z.string()).optional(),
    });

export type AttestationResponseBodyInput = z.infer<typeof attestationResponseBody>;

export let signOffBody = z.object({
      comments: z.string().optional(),
      approved: z.boolean(),
    });

export type SignOffBodyInput = z.infer<typeof signOffBody>;

export let retestBody = z.object({
      reason: z.string().optional(),
      assigneeId: z.string().optional(),
    });

export type RetestBodyInput = z.infer<typeof retestBody>;

export let createRuleBody = z.object({
      name: z.string().min(1, "Rule name is required"),
      description: z.string().optional(),
      controlScope: z.array(z.string()).optional(),
      condition: z.string().min(1, "Condition expression is required"),
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      enabled: z.boolean().optional(),
    });

export type CreateRuleBodyInput = z.infer<typeof createRuleBody>;

export let updateRuleBody = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      controlScope: z.array(z.string()).optional(),
      condition: z.string().optional(),
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      enabled: z.boolean().optional(),
    });

export type UpdateRuleBodyInput = z.infer<typeof updateRuleBody>;

export let scheduleTestBody = z.object({
      controlId: z.string().min(1),
      testType: z.enum(["design", "operating", "substantive", "inspection", "observation", "inquiry", "reperformance", "analytical", "automated"]),
      scheduledAt: z.string().min(1),
      testerId: z.string().uuid(),
    });

export type ScheduleTestBodyInput = z.infer<typeof scheduleTestBody>;

export let assignTeamBody = z.object({
      controlId: z.string().min(1),
      teamId: z.string().min(1),
    });

export type AssignTeamBodyInput = z.infer<typeof assignTeamBody>;

export let requestEvidenceBody = z.object({
      controlId: z.string().min(1),
      evidenceTypeCode: z.string().min(1),
      assignedTo: z.string().uuid(),
    });

export type RequestEvidenceBodyInput = z.infer<typeof requestEvidenceBody>;

export let reviewRemediationBody = z.object({
      decision: z.enum(["approved", "rejected", "requires_retest"]),
      comments: z.string().optional(),
    });

export type ReviewRemediationBodyInput = z.infer<typeof reviewRemediationBody>;
export const createAcknowledgeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createScheduleTestBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAssignTeamBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRequestEvidenceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReviewBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createComputeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

