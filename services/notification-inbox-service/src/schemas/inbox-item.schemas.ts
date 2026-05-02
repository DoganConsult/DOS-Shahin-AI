import { z } from 'zod';

export const createInboxItemBody = z.object({
  user_id: z.string().min(1, 'user_id is required'),
  title: z.string().min(1, 'title is required'),
  body: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  category: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  source_module: z.string().optional(),
  entity_type: z.string().min(1, 'entity_type is required'),
  entity_id: z.string().optional(),
  action_url: z.string().optional(),
  read_at: z.string().optional(),
  dismissed_at: z.string().optional(),
});

export const updateInboxItemBody = createInboxItemBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createInboxItemBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
