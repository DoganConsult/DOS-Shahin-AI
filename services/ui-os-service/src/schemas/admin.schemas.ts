import { z } from 'zod';

export const DraftCreateSchema = z.object({
  draft_key: z.string().min(1).max(200),
  target_type: z.string().min(1).max(60),
  target_key: z.string().min(1).max(300),
  payload: z.record(z.unknown()).optional(),
});

export const DraftPatchSchema = z.object({
  payload: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'published']).optional(),
});

export const RollbackSchema = z.object({
  reason: z.string().max(500).optional(),
});
