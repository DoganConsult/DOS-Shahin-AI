import { z } from 'zod';

export const createFindingBody = z.object({
  audit_id: z.string().optional(),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  severity: z.string().min(1, 'severity is required'),
  status: z.string().optional(),
  category: z.string().optional(),
  control_ref: z.string().optional(),
  recommendation: z.string().optional(),
  assignee_id: z.string().optional(),
  due_date: z.string().optional(),
});

export const updateFindingBody = createFindingBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createFindingBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
