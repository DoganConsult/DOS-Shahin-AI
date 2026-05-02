import { z } from 'zod';

export const createTrainingProgramBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'category is required'),
  type: z.string().optional(),
  status: z.string().optional(),
  duration_minutes: z.number().optional(),
  passing_score: z.number().optional(),
  max_attempts: z.number().optional(),
  mandatory: z.boolean().optional(),
  target_audience: z.string().optional(),
  owner_id: z.string().optional(),
});

export const updateTrainingProgramBody = createTrainingProgramBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createTrainingProgramBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
