import { z } from 'zod';

export const createDashboardBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  layout: z.any().optional(),
  owner_id: z.string().optional(),
  is_default: z.boolean().optional(),
  shared: z.boolean().optional(),
  widgets: z.any().optional(),
});

export const updateDashboardBody = createDashboardBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createDashboardBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
