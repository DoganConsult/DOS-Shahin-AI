import { z } from 'zod';

export const createBcpPlanBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  status: z.string().optional(),
  owner_id: z.string().optional(),
  priority: z.string().optional(),
  rto_hours: z.number().optional(),
  rpo_hours: z.number().optional(),
  last_tested_at: z.string().optional(),
  next_review_date: z.string().optional(),
});

export const updateBcpPlanBody = createBcpPlanBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createBcpPlanBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
