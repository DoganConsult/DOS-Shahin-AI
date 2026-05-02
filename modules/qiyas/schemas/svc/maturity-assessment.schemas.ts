import { z } from 'zod';

export const createMaturityAssessmentBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  framework: z.string().min(1, 'framework is required'),
  domain_area: z.string().optional(),
  status: z.string().optional(),
  current_level: z.number().optional(),
  target_level: z.number().optional(),
  assessor_id: z.string().optional(),
  assessment_date: z.string().optional(),
  next_review_date: z.string().optional(),
});

export const updateMaturityAssessmentBody = createMaturityAssessmentBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createMaturityAssessmentBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
