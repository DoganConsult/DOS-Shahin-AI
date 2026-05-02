import { z } from 'zod';

export const createControlBody = z.object({
  control_ref: z.string().min(1, 'control_ref is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  effectiveness: z.string().optional(),
  owner_id: z.string().optional(),
  implementation_status: z.string().optional(),
  test_frequency: z.string().optional(),
  last_tested_at: z.string().optional(),
});

export const updateControlBody = createControlBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createControlBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
