/**
 * Common Zod schemas shared across all ai-engine-service domains.
 */
import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
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

// Phase 0.5: additional primitives / aliases the risk domain still imports.
// Kept permissive; Wave 2 will consolidate with the platform canonical schemas.

export const idParam = z.object({
  id: z.string().min(1).max(64),
});

export const bulkUuidsBody = bulkIdsBody;

export const grcISODate = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

export const grcSanitizedText = z.string().max(2000);

export const grcSeverity = z.enum(['low', 'medium', 'high', 'critical']);

export const grcReviewDecision = z.enum(['approved', 'rejected', 'changes_requested', 'pending']);

export const grcHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const grcConfidence = z.coerce.number().min(0).max(1);

export const grcPercentage = z.coerce.number().min(0).max(100);

// Risk-workspace payloads — permissive until strict shapes are re-authored in Wave 2.
export const createFinalizeBody = z.record(z.string(), z.unknown());
export const createRunBody = z.record(z.string(), z.unknown());
export const updateSettingsBody = z.record(z.string(), z.unknown());
