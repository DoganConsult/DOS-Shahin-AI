import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const statusFilter = z.object({
  status: z.string().max(50).optional(),
});

export const grcJsonMetadata = z.record(z.string(), z.unknown()).optional();

export const grcPositiveInt = z.coerce.number().int().min(1);

export const searchQuery = z.object({
  q: z.string().max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const bulkIdsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type StatusFilter = z.infer<typeof statusFilter>;
export type SearchQuery = z.infer<typeof searchQuery>;
