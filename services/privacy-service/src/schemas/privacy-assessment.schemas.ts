import { z } from 'zod';

export const createPrivacyAssessmentBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  status: z.string().optional(),
  data_category: z.string().optional(),
  processing_purpose: z.string().optional(),
  legal_basis: z.string().optional(),
  risk_level: z.number().optional(),
  dpo_review: z.boolean().optional(),
  assessor_id: z.string().optional(),
});

export const updatePrivacyAssessmentBody = createPrivacyAssessmentBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createPrivacyAssessmentBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
