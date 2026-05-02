/**
 * Common Zod schemas shared across all ai-engine-service domains.
 */
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

// Strips control chars / zero-width, trims, caps length. Used across GRC bodies.
export const grcSanitizedText = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '').trim())
    .pipe(z.string().max(max));

export const grcSeverity = z.enum(['info', 'low', 'medium', 'high', 'critical']);

export const grcISODate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/, 'ISO-8601 required');

export const grcSortDir = z.enum(['asc', 'desc']);

export const dateRange = z.object({
  from: grcISODate.optional(),
  to: grcISODate.optional(),
});

export const queryBoolean = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'));

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type StatusFilter = z.infer<typeof statusFilter>;
export type SearchQuery = z.infer<typeof searchQuery>;

export const idParam = z.object({ id: z.string().min(1) });

export const grcConfidence = z.coerce.number().min(0).max(1);
