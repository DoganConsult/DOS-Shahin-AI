import { z } from 'zod';

export const createRiskBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'category is required'),
  likelihood: z.string().optional(),
  impact: z.string().optional(),
  risk_score: z.number().optional(),
  status: z.string().optional(),
  owner_id: z.string().optional(),
  mitigation_plan: z.string().optional(),
  residual_risk: z.string().optional(),
  review_date: z.string().optional(),
});

export const updateRiskBody = createRiskBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createRiskBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ── Lifecycle transition payload schemas ─────────────────────────────────
// .strict() rejects unknown keys; bounded lengths prevent payload-size DoS.

export const riskEmptyBody = z.object({}).strict();

export const riskReturnBody = z.object({
  reason: z.string().max(2000).optional(),
}).strict();

export const riskAssessBody = z.object({
  score: z.number().int().min(0).max(100).optional(),
}).strict();

export const riskPlanTreatmentBody = z.object({
  treatmentType: z.enum(['mitigate', 'transfer', 'accept', 'avoid']),
  plan: z.string().max(4000).optional(),
}).strict();

export const riskApproveTreatmentBody = z.object({
  note: z.string().max(2000).optional(),
}).strict();

export const riskAcceptBody = z.object({
  signoffActorId: z.string().min(1).max(128),
  rationale: z.string().max(4000).optional(),
}).strict();

export const riskCloseBody = z.object({
  reason: z.string().max(2000).optional(),
}).strict();
