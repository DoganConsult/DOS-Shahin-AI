/**
 * Zod validation schemas for Risk Management module — Zod v4 Enterprise Grade.
 * Uses advanced features from common.schemas.
 *
 * @owner risk
 * @module risk
 * @since 2026-03-31
 */

import { z } from 'zod';
import {
  paginationQuery,
  statusFilter,
  grcISODate as _grcISODate,
  grcSanitizedText as _grcSanitizedText,
  grcSeverity as _grcSeverity,
  grcReviewDecision as _grcReviewDecision,
  grcHexColor as _grcHexColor,
  grcConfidence as _grcConfidence,
  grcPercentage as _grcPercentage,
  bulkUuidsBody as _bulkUuidsBody,
} from './common.schemas';

// ── Shared primitives ─────────────────────────────────────────────

const likelihoodScale = z.coerce.number().int().min(1).max(5);
const impactScale = z.coerce.number().int().min(1).max(5);

// ── Risk CRUD ─────────────────────────────────────────────────────

export const createRiskBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  likelihood: likelihoodScale,
  impact: impactScale,
  owner: z.string().optional(),
  treatment_plan: z.string().optional(),
  treatment_status: z.string().optional(),
  control_ids: z.array(z.string().uuid()).optional(),
});

export const updateRiskBody = createRiskBody.partial();

export const listRisksQuery = paginationQuery.merge(statusFilter).extend({
  owner: z.string().optional(),
  minScore: z.coerce.number().int().min(1).max(25).optional(),
  maxScore: z.coerce.number().int().min(1).max(25).optional(),
});

// ── Treatment CRUD ────────────────────────────────────────────────

export const createTreatmentBody = z.object({
  title: z.string().min(3).max(255),
  risk_id: z.string().uuid(),
  description: z.string().optional(),
  strategy: z.enum(['mitigate', 'accept', 'avoid', 'transfer']).default('mitigate'),
  owner: z.string().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.string().optional(),
  expected_reduction: z.coerce.number().min(0).max(100).optional(),
});

export const updateTreatmentBody = createTreatmentBody.partial();

// ── KRI CRUD ──────────────────────────────────────────────────────

export const createKRIBody = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  linked_risk_id: z.string().uuid().optional(),
  linked_category: z.string().optional(),
  owner: z.string().optional(),
  threshold_red: z.coerce.number().min(0),
  threshold_amber: z.coerce.number().min(0),
  threshold_green: z.coerce.number().min(0).optional(),
  collection_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
});

export const updateKRIBody = createKRIBody.partial();

// ── KRI Data Point ────────────────────────────────────────────────

export const addKRIDataPointBody = z.object({
  value: z.coerce.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().optional(),
});

// ── Scenario ──────────────────────────────────────────────────────

export const createScenarioBody = z.object({
  scenario_name: z.string().min(2).max(200),
  assumptions: z.array(z.string().max(1000)).optional(),
  baseline_score: z.coerce.number().optional(),
  scenario_score: z.coerce.number().optional(),
});

// ── Scoring Model ─────────────────────────────────────────────────

export const createScoringModelBody = z.object({
  model_id: z.string().min(1).max(100),
  name_en: z.string().min(1).max(200),
  name_ar: z.string().min(1).max(200),
  dimensions: z.array(z.object({
    key: z.string().min(1).max(100),
    label_en: z.string().max(200),
    label_ar: z.string().max(200).optional(),
    weight: z.coerce.number().min(0).max(1),
    scale_min: z.coerce.number().int().min(1).default(1),
    scale_max: z.coerce.number().int().min(1).default(5),
  })).min(1),
  thresholds: z.object({
    low: z.coerce.number(),
    medium: z.coerce.number(),
    high: z.coerce.number(),
    critical: z.coerce.number(),
  }),
  formula: z.enum(['multiply', 'weighted', 'additive']).default('weighted'),
  zone_definitions: z.array(z.object({
    zone: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    min_score: z.coerce.number(),
    max_score: z.coerce.number(),
  })).optional(),
});

export const updateScoringModelBody = createScoringModelBody.partial().omit({ model_id: true });

// ── Peer Review ───────────────────────────────────────────────────

export const createPeerReviewBody = z.object({
  risk_id: z.string().uuid(),
  agent_score: z.coerce.number(),
});

export const humanReviewBody = z.object({
  human_score: z.coerce.number(),
  comments: z.string().optional(),
});

export const finalizeReviewBody = z.object({
  final_score: z.coerce.number(),
  final_method: z.string().min(1),
});

// ── Appetite ──────────────────────────────────────────────────────

export const updateAppetiteBody = z.object({
  model: z.string().optional(),
  thresholds: z.object({
    low: z.coerce.number(),
    medium: z.coerce.number(),
    high: z.coerce.number(),
    critical: z.coerce.number(),
  }).optional(),
  approving_authority: z.string().optional(),
});

export const requestAcceptanceBody = z.object({
  reason: z.string().min(1).max(2000),
});

export const approveAcceptanceBody = z.object({
  decision: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

// ── RCSA Campaign ────────────────────────────────────────────────

export const createCampaignBody = z.object({
  title: z.string().min(3).max(500),
  description: z.string().optional(),
  campaign_type: z.enum(['rcsa', 'targeted', 'adhoc']).default('rcsa'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
});

// ── Assessment Response ─────────────────────────────────────────

export const submitAssessmentResponseBody = z.object({
  inherent_likelihood: likelihoodScale.optional(),
  inherent_impact: impactScale.optional(),
  residual_likelihood: likelihoodScale.optional(),
  residual_impact: impactScale.optional(),
  control_effectiveness: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

// ── Assessment Review ───────────────────────────────────────────

export const reviewAssessmentBody = z.object({
  decision: z.enum(['approved', 'rejected', 'needs_revision']),
  comments: z.string().max(5000).optional(),
});

// ── KRI Value Recording ─────────────────────────────────────────

export const recordKRIValueBody = z.object({
  value: z.coerce.number(),
});

// ── Treatment Close ─────────────────────────────────────────────

export const closeTreatmentBody = z.object({
  closure_notes: z.string().max(5000).optional(),
  evidence_id: z.string().uuid().optional(),
});

// ── Cross-Module Links ──────────────────────────────────────────

export const createLinkBody = z.object({
  risk_id: z.string().min(1).max(100),
  link_type: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export const createIncidentLinkBody = createLinkBody.extend({
  incident_id: z.string().uuid(),
  impact_on_risk: z.string().max(500).optional(),
});

export const createPolicyLinkBody = createLinkBody.extend({ policy_id: z.string().uuid() });
export const createEvidenceLinkBody = createLinkBody.extend({ evidence_id: z.string().uuid() });
export const createComplianceLinkBody = createLinkBody.extend({ obligation_id: z.string().uuid() });
export const createVendorLinkBody = createLinkBody.extend({ vendor_id: z.string().uuid() });
export const createAssetLinkBody = createLinkBody.extend({ asset_id: z.string().uuid() });

// ── Trend Analysis ────────────────────────────────────────────────

export const trendPeriodQuery = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
});

// ── Bulk Operations ───────────────────────────────────────────────

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkUpdateBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateRiskBody,
});


// ── Response Schemas ──────────────────────────────────────────
export const riskResponseSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string(),
  updated_by: z.string().optional(),
});

export const riskListResponseSchema = z.object({
  data: z.array(riskResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const riskEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('risk'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const riskStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const riskImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const riskImportBatchSchema = z.object({
  rows: z.array(riskImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const riskExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const riskAdminConfigSchema = z.object({
  moduleCode: z.literal('risk'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const riskBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const riskBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createRootBody = z.object({
      name: z.string().min(1),
      description: z.unknown().optional(),
      model_type: z.unknown().optional(),
      version: z.unknown().optional(),
      owner: z.unknown().optional(),
      department: z.unknown().optional(),
      vendor: z.unknown().optional(),
      risk_tier: z.unknown().optional(),
      use_case: z.unknown().optional(),
      input_data_types: z.unknown().optional(),
      output_description: z.unknown().optional(),
      regulatory_frameworks: z.unknown().optional(),
      next_review_date: z.unknown().optional(),
    });

export type CreateRootBodyInput = z.infer<typeof createRootBody>;

export let updateIdBody = z.object({});

export type UpdateIdBodyInput = z.infer<typeof updateIdBody>;

export let createIdValidationsBody = z.object({
      validation_type: z.string().min(1),
      result: z.unknown().optional(),
      score: z.unknown().optional(),
      findings: z.unknown().optional(),
      notes: z.unknown().optional(),
      next_validation_date: z.unknown().optional(),
    });

export type CreateIdValidationsBodyInput = z.infer<typeof createIdValidationsBody>;

export let createIdScoresBody = z.object({
      inherent_risk: z.unknown().optional(),
      residual_risk: z.unknown().optional(),
      data_quality_score: z.unknown().optional(),
      performance_score: z.unknown().optional(),
      compliance_score: z.unknown().optional(),
    });

export type CreateIdScoresBodyInput = z.infer<typeof createIdScoresBody>;

export let createRiskIdSimulateBody = z.object({
      iterations: z.unknown().optional(),
    });

export type CreateRiskIdSimulateBodyInput = z.infer<typeof createRiskIdSimulateBody>;

export let createRiskIdMontecarloBody = z.object({
      iterations: z.unknown().optional(),
    });

export type CreateRiskIdMontecarloBodyInput = z.infer<typeof createRiskIdMontecarloBody>;

export let createRiskIdScenarioBody = z.object({});

export type CreateRiskIdScenarioBodyInput = z.infer<typeof createRiskIdScenarioBody>;

export let createRiskIdFairBody = z.object({});

export type CreateRiskIdFairBodyInput = z.infer<typeof createRiskIdFairBody>;

export let createRiskIdThreatsBody = z.object({});

export type CreateRiskIdThreatsBodyInput = z.infer<typeof createRiskIdThreatsBody>;

export let createRiskIdConsequencesBody = z.object({});

export type CreateRiskIdConsequencesBodyInput = z.infer<typeof createRiskIdConsequencesBody>;

export let createThreatsthreatIdPreventivecontrolsBody = z.object({});

export type CreateThreatsthreatIdPreventivecontrolsBodyInput = z.infer<typeof createThreatsthreatIdPreventivecontrolsBody>;

export let createConsequencesconsequenceIdMitigatingcontrolsBody = z.object({});

export type CreateConsequencesconsequenceIdMitigatingcontrolsBodyInput = z.infer<typeof createConsequencesconsequenceIdMitigatingcontrolsBody>;

export let createMultiframeworkgapBody = z.object({
      frameworkIds: z.unknown().optional(),
    });

export type CreateMultiframeworkgapBodyInput = z.infer<typeof createMultiframeworkgapBody>;

export let createSuggestownerBody = z.object({
      departmentId: z.unknown().optional(),
      categoryCode: z.unknown().optional(),
    });

export type CreateSuggestownerBodyInput = z.infer<typeof createSuggestownerBody>;

export let createCalculatescoreBody = z.object({
      likelihood: z.unknown().optional(),
      impact: z.unknown().optional(),
      controlEffectiveness: z.unknown().optional(),
    });

export type CreateCalculatescoreBodyInput = z.infer<typeof createCalculatescoreBody>;

export let createProposevendorIdBody = z.object({});

export type CreateProposevendorIdBodyInput = z.infer<typeof createProposevendorIdBody>;

export let createCalibrationIdSubmitBody = z.object({
      calibratedWeights: z.unknown().optional(),
      overrides: z.unknown().optional(),
    });

export type CreateCalibrationIdSubmitBodyInput = z.infer<typeof createCalibrationIdSubmitBody>;

export let createCalibrationIdAcceptBody = z.object({});

export type CreateCalibrationIdAcceptBodyInput = z.infer<typeof createCalibrationIdAcceptBody>;

export let createIdApplyassessmentIdBody = z.object({});

export type CreateIdApplyassessmentIdBodyInput = z.infer<typeof createIdApplyassessmentIdBody>;

// ── Auto-generated validation schemas (enterprise hardening) ──

export const updateConfigBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReseedBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReindexBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createBackfillBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createFinalizeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRunBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSettingsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createDialogueBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateModelsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createScoreBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAssessBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createLinkControlBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createLinkEvidenceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEscalateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createValidateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBulkUpdateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const importImportBody = z.object({
  data: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
  options: z.object({ overwrite: z.boolean().default(false) }).optional(),
});


export const createEstimateMagnitudeBody = (..._args: any[]): any => { return {} as any; };
