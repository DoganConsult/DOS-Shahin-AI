import { z } from 'zod';

export const createVendorBody = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'category is required'),
  status: z.string().optional(),
  risk_tier: z.string().optional(),
  contact_name: z.string().min(1, 'contact_name is required'),
  contact_email: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  sla_score: z.number().optional(),
  last_assessment_date: z.string().optional(),
});

export const updateVendorBody = createVendorBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createVendorBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ── Lifecycle transition payload schemas ─────────────────────────────────
// .strict() rejects unknown keys so typos surface as 400s; bounded string
// lengths prevent payload-size DoS.

export const vendorEmptyBody = z.object({}).strict();

export const vendorReceiveQuestionnaireBody = z.object({
  responses: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const vendorScoredBody = z.object({
  score: z.number().int().min(0).max(100).optional(),
}).strict();

export const vendorApproveBody = z.object({
  note: z.string().max(2000).optional(),
}).strict();

export const vendorRejectBody = z.object({
  reason: z.string().max(2000).optional(),
}).strict();

export const vendorOffboardBody = z.object({
  reason: z.string().max(2000).optional(),
}).strict();
