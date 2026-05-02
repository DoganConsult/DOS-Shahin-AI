import { z } from 'zod';

export const createWidgetBody = z.object({
  title: z.string().min(1, 'title is required'),
  type: z.string().min(1, 'type is required'),
  category: z.string().optional(),
  data_source: z.string().min(1, 'data_source is required'),
  query_config: z.any().optional(),
  display_config: z.any().optional(),
  refresh_interval_sec: z.number().optional(),
  owner_id: z.string().optional(),
  shared: z.boolean().optional(),
});

export const updateWidgetBody = createWidgetBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createWidgetBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
