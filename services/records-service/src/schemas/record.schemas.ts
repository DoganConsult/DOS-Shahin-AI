import { z } from 'zod';

export const createRecordBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  category: z.string().optional(),
  status: z.string().optional(),
  classification: z.string().optional(),
  retention_period_days: z.string().optional(),
  owner_id: z.string().optional(),
  file_path: z.string().optional(),
  file_size: z.number().optional(),
  version: z.string().optional(),
});

export const updateRecordBody = createRecordBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createRecordBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
