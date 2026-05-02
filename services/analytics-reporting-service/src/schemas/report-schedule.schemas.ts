import { z } from 'zod';

export const createReportScheduleBody = z.object({
  report_type: z.string().min(1, 'report_type is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  frequency: z.string().min(1, 'frequency is required'),
  recipients: z.any().optional(),
  filters: z.any().optional(),
  format: z.string().optional(),
  status: z.string().optional(),
  last_run_at: z.string().optional(),
  next_run_at: z.string().optional(),
  owner_id: z.string().optional(),
});

export const updateReportScheduleBody = createReportScheduleBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createReportScheduleBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
