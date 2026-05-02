import { z } from 'zod';

export const createEvidenceBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  status: z.string().optional(),
  control_id: z.string().optional(),
  requirement_id: z.string().optional(),
  collector_id: z.string().optional(),
  file_path: z.string().optional(),
  file_size: z.number().optional(),
  hash: z.string().optional(),
  validity_start: z.string().optional(),
  validity_end: z.string().optional(),
});

export const updateEvidenceBody = createEvidenceBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createEvidenceBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
