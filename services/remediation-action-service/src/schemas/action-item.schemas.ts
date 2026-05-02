import { z } from 'zod';

export const createActionItemBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().min(1, 'priority is required'),
  assignee_id: z.string().optional(),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  due_date: z.string().optional(),
  completed_at: z.string().optional(),
});

export const updateActionItemBody = createActionItemBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createActionItemBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
