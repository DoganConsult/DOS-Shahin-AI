import { z } from 'zod';

export const createPolicyBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  version: z.string().optional(),
  status: z.string().optional(),
  category: z.string().min(1, 'category is required'),
  owner_id: z.string().optional(),
  approver_id: z.string().optional(),
  effective_date: z.string().optional(),
  review_date: z.string().optional(),
  content: z.string().optional(),
});

export const updatePolicyBody = createPolicyBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createPolicyBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ── Lifecycle transition payload schemas ─────────────────────────────────
// All transitions accept either no body or a strict, bounded body. Bounded
// string lengths prevent payload-size DoS and keep audit-trail payloads
// readable. .strict() rejects unknown keys so typos surface as 400s.

export const policyReviewBody = z.object({
  reviewerId: z.string().uuid().optional(),
}).strict();

export const policyRequestRevisionBody = z.object({
  reason: z.string().max(2000).optional(),
}).strict();

export const policyApproveBody = z.object({
  approverNote: z.string().max(2000).optional(),
}).strict();

export const policyPublishBody = z.object({
  effectiveDate: z.string().datetime().optional(),
}).strict();

export const policyRetireBody = z.object({
  reason: z.string().max(2000).optional(),
}).strict();

export const policyEmptyBody = z.object({}).strict();
