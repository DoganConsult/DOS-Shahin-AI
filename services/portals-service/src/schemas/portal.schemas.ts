import { z } from 'zod';

export const createPortalBody = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  status: z.string().optional(),
  config: z.any().optional(),
  theme: z.string().optional(),
  access_policy: z.any().optional(),
  allowed_domains: z.any().optional(),
  owner_id: z.string().optional(),
});

export const updatePortalBody = createPortalBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createPortalBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
