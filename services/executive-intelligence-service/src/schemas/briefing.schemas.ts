import { z } from 'zod';

export const createBriefingBody = z.object({
  title: z.string().min(1, 'title is required'),
  summary: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  status: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  risk_posture: z.string().optional(),
  compliance_score: z.number().optional(),
  key_metrics: z.any().optional(),
  recommendations: z.any().optional(),
  author_id: z.string().optional(),
});

export const updateBriefingBody = createBriefingBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createBriefingBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
