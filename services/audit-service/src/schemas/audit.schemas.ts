import { z } from 'zod';

export const createAuditEntryBody = z.object({
  action: z.string().min(1, 'action is required'),
  actorId: z.string().optional(),
  userId: z.string().optional(),
  eventType: z.string().optional(),
  module: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  beforeState: z.unknown().optional(),
  afterState: z.unknown().optional(),
  ipAddress: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  details: z.record(z.unknown()).optional(),
});

export const listEntriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  userId: z.string().optional(),
  actorId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
