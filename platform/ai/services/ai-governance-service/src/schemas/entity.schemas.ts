import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createEntityBody = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.string().max(64).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateEntityBody = createEntityBody.partial();
