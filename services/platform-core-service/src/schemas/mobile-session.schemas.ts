import { z } from 'zod';

export const createMobileSessionBody = z.object({
  user_id: z.string().min(1, 'user_id is required'),
  device_type: z.string().min(1, 'device_type is required'),
  device_id: z.string().optional(),
  push_token: z.string().optional(),
  app_version: z.string().optional(),
  os_version: z.string().optional(),
  status: z.string().optional(),
  last_active_at: z.string().optional(),
});

export const updateMobileSessionBody = createMobileSessionBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createMobileSessionBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
