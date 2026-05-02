/**
 * Proactive Leadership Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner proactive-leadership
 * @module proactive-leadership
 * @since 2026-03-31
 */

import { z } from 'zod';
import {
  grcSeverity,
  grcSanitizedText,
  queryBoolean,
} from '../../../schemas/common.schemas';

// ── Domain Enums ─────────────────────────────────────────────────────

const insightType = z.enum([
  'risk_trend', 'compliance_drift', 'governance_gap', 'strategic_opportunity',
]);
const briefPeriod = z.enum(['daily', 'weekly', 'monthly']);

// ── Query Schemas ────────────────────────────────────────────────────

export const listInsightsQuery = z.object({
  severity: grcSeverity.optional(),
  insightType: insightType.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listAlertsQuery = z.object({
  acknowledged: queryBoolean.optional(),
  severity: grcSeverity.optional(),
});

export const executiveBriefQuery = z.object({
  period: briefPeriod.default('weekly'),
  includeRecommendations: queryBoolean.default(true),
});

// ── Body Schemas ─────────────────────────────────────────────────────

export const acknowledgeAlertBody = z.object({
  alertId: z.string().min(1),
  notes: grcSanitizedText(2000).optional(),
});

// ── Type Exports ─────────────────────────────────────────────────────

export type ListInsightsQuery = z.infer<typeof listInsightsQuery>;
export type AcknowledgeAlertBody = z.infer<typeof acknowledgeAlertBody>;
export const createEvaluateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateConfigBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

