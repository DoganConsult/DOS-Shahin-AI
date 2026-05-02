/**
 * Governance AI Validation Schemas — Zod v4 Enterprise Grade
 * ============================================================
 * Full Zod schemas for all governance-ai route request bodies,
 * query params, and URL params.
 *
 * Uses advanced features from common.schemas:
 * - Branded IDs (tenantId, userId, entityId)
 * - GRC domain enums (grcSeverity, grcConfidence)
 * - Pagination (paginationQuery)
 * - Cross-field refinements
 * - Query coercion helpers
 *
 * MP-26 §6: All route request bodies must be validated.
 *
 * @owner governance-ai
 * @module governance-ai
 * @since 2026-03-31
 */

import { z } from 'zod';
import {
  paginationQuery,
  grcSeverity,
  grcConfidence,
  grcSanitizedText,
  grcPositiveInt,
  queryBoolean,
  entityId as _entityId,
} from '../../../schemas/common.schemas';

// ══════════════════════════════════════════════════════════════════════
// Domain Enums
// ══════════════════════════════════════════════════════════════════════

const pipelineStage = z.enum([
  'signal_scan', 'interpretation', 'escalation',
  'recommendations', 'score_explanation', 'narrative',
]);

const escalationItemType = z.enum(['signal', 'process_task', 'risk', 'remediation']);
const escalationLevel = z.enum(['team_lead', 'department_head', 'executive', 'board']);
const feedbackSourceType = z.enum(['signal', 'interpretation', 'recommendation', 'narrative', 'pipeline']);
const feedbackType = z.enum(['positive', 'negative', 'correction', 'suggestion']);

const signalStatus = z.enum([
  'detected', 'interpreting', 'interpreted', 'escalated',
  'resolved', 'dismissed', 'archived',
]);

// ══════════════════════════════════════════════════════════════════════
// URL Param Schemas
// ══════════════════════════════════════════════════════════════════════

export const signalIdParam = z.object({
  signalId: z.string().uuid(),
});

export const escalationIdParam = z.object({
  escalationId: z.string().uuid(),
});

export const issueIdParam = z.object({
  issueId: z.string().uuid(),
});

export const recIdParam = z.object({
  recId: z.string().uuid(),
});

// ══════════════════════════════════════════════════════════════════════
// Request Body Schemas
// ══════════════════════════════════════════════════════════════════════

/** POST /pipeline/run */
export const pipelineRunBody = z.object({
  stages: z.array(pipelineStage).optional(),
  maxSignals: grcPositiveInt.optional(),
  dryRun: z.boolean().optional(),
});

/** POST /escalation/escalate */
export const escalateItemBody = z.object({
  itemType: escalationItemType,
  itemId: z.string().min(1, 'itemId is required'),
  targetLevel: escalationLevel,
  reason: z.string().min(1, 'reason is required').max(2000).trim(),
});

/** POST /escalation/:escalationId/deescalate */
export const deescalateBody = z.object({
  reason: grcSanitizedText(2000).default(''),
});

/** POST /feedback */
export const feedbackBody = z.object({
  sourceType: feedbackSourceType,
  sourceId: z.string().min(1, 'sourceId is required'),
  feedbackType: feedbackType,
  feedbackText: grcSanitizedText(5000),
});

/** PUT /signals/detectors — upsert detector config */
export const upsertDetectorBody = z.object({
  detector_code: z.string().min(1, 'detector_code is required').max(100),
  display_name_en: z.string().min(1, 'display_name_en is required').max(255),
  display_name_ar: z.string().max(255).optional(),
  description_en: z.string().max(2000).optional(),
  module_code: z.string().min(1, 'module_code is required').max(50),
  enabled: z.boolean().optional(),
  detection_query: z.string().min(1, 'detection_query is required').max(10000)
    .refine(
      (q) => q.trim().toUpperCase().startsWith('SELECT'),
      { message: 'detection_query must be a SELECT statement' },
    ),
  signal_type: z.string().min(1, 'signal_type is required').max(100),
  severity: grcSeverity.optional(),
  confidence_base: grcConfidence.optional(),
  ai_confidence_tuning_enabled: z.boolean().optional(),
  ai_tuning_prompt: z.string().max(5000).optional(),
  dedup_window_hours: z.coerce.number().int().min(0).max(8760).optional(),
  cooldown_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  board_attention_threshold: grcConfidence.optional(),
  recommended_action_type: z.string().max(100).optional(),
  recommended_escalation_level: z.coerce.number().int().min(0).max(5).optional(),
});

/** PATCH /signals/:signalId/status */
export const updateSignalStatusBody = z.object({
  status: signalStatus,
});

/** PUT /settings/:key */
export const updateSettingBody = z.object({
  key: z.string().min(1, 'key is required').max(255),
  value: z.preprocess((v) => (v === null || v === undefined ? undefined : String(v)), z.string()),
});

/** POST /recommendations/:recId/reject */
export const rejectRecommendationBody = z.object({
  reason: grcSanitizedText(2000).optional(),
});

// ══════════════════════════════════════════════════════════════════════
// Query Schemas
// ══════════════════════════════════════════════════════════════════════

/** GET /pipeline/history */
export const pipelineHistoryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /interpretation/history */
export const interpretationHistoryQuery = paginationQuery.extend({
  signalId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
});

/** GET /health/trend */
export const healthTrendQuery = z.object({
  dimension: z.string().max(100).optional(),
  range: z.coerce.number().int().min(1).max(365).default(30),
});

/** GET /recommendations/history */
export const recommendationHistoryQuery = paginationQuery.extend({
  status: z.string().max(50).optional(),
  issueId: z.string().uuid().optional(),
});

/** GET /signals/detectors (list) */
export const detectorListQuery = paginationQuery.extend({
  enabled: queryBoolean.optional(),
  module_code: z.string().max(50).optional(),
});

// ══════════════════════════════════════════════════════════════════════
// Type Exports
// ══════════════════════════════════════════════════════════════════════

export type PipelineRunInput = z.infer<typeof pipelineRunBody>;
export type EscalateItemInput = z.infer<typeof escalateItemBody>;
export type DeescalateInput = z.infer<typeof deescalateBody>;
export type FeedbackInput = z.infer<typeof feedbackBody>;
export type UpsertDetectorInput = z.infer<typeof upsertDetectorBody>;
export type UpdateSignalStatusInput = z.infer<typeof updateSignalStatusBody>;
export type UpdateSettingInput = z.infer<typeof updateSettingBody>;
export type RejectRecommendationInput = z.infer<typeof rejectRecommendationBody>;
export const createScanBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createBatchBody = z.object({
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

export const createGenerateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEvaluateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

