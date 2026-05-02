import { z } from 'zod';

export const createDoraAssessmentBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  pillar: z.string().min(1, 'pillar is required'),
  status: z.string().optional(),
  score: z.number().optional(),
  assessor_id: z.string().optional(),
  ict_provider_id: z.string().optional(),
  assessment_date: z.string().optional(),
  next_review_date: z.string().optional(),
});

export const updateDoraAssessmentBody = createDoraAssessmentBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createDoraAssessmentBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
