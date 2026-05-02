import { z } from 'zod';

export const createIncidentBody = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  severity: z.string().min(1, 'severity is required'),
  status: z.string().optional(),
  reporter_id: z.string().optional(),
  assignee_id: z.string().optional(),
  category: z.string().optional(),
  impact_assessment: z.string().optional(),
  root_cause: z.string().optional(),
  resolution: z.string().optional(),
  detected_at: z.string().optional(),
  resolved_at: z.string().optional(),
});

export const updateIncidentBody = createIncidentBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createIncidentBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
