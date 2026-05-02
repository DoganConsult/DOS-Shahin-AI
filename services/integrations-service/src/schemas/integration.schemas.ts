import { z } from 'zod';

export const createIntegrationBody = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  provider: z.string().min(1, 'provider is required'),
  status: z.string().optional(),
  config: z.any().optional(),
  credentials_ref: z.string().optional(),
  sync_frequency: z.string().optional(),
  last_sync_at: z.string().optional(),
  error_count: z.number().optional(),
  owner_id: z.string().optional(),
});

export const updateIntegrationBody = createIntegrationBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createIntegrationBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
