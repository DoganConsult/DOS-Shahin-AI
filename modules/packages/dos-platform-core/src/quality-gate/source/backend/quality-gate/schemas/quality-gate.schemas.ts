/**
 * quality-gate — Zod Validation Schemas
 * Request body validation for all quality gate API routes.
 */

import { z } from 'zod';

// ── Run Schemas ──

export const createRunBody = z.object({
  releaseId: z.string().max(128).optional(),
  commitSha: z.string().max(40).optional(),
  triggerType: z.enum(['manual', 'ci', 'temporal', 'provisioning']).default('manual'),
  stages: z.array(z.enum(['devsecops', 'unit', 'integration', 'ai-guardrails', 'e2e-visual', 'performance', 'mutation'])).optional(),
  baseUrl: z.string().url().optional(),
});

export const overrideRunBody = z.object({
  reason: z.string().min(10, 'Override reason must be at least 10 characters').max(2000),
});

// ── Threshold Schemas ──

export const updateThresholdBody = z.object({
  metricCode: z.string().min(1).max(64).regex(/^[\w.-]+$/, 'metricCode must match pattern: stage.metric'),
  minValue: z.number().min(0).max(100000),
  overrideReason: z.string().max(500).optional(),
});

// ── Query Params ──

export const listRunsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'running', 'passed', 'failed', 'overridden', 'skipped']).optional(),
});

export const driftQuery = z.object({
  severity: z.enum(['critical', 'warning', 'info']).optional(),
});

export const aiEvalQuery = z.object({
  agentId: z.string().max(10).optional(),
});

export const trendsQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// ── Type Exports ──

export type CreateRunInput = z.infer<typeof createRunBody>;
export type OverrideRunInput = z.infer<typeof overrideRunBody>;
export type UpdateThresholdInput = z.infer<typeof updateThresholdBody>;
export const createRunsBody = createRunBody;

export const createOverrideBody = overrideRunBody;

export const updateThresholdsBody = updateThresholdBody;

export const createResolveBody = z.object({});

