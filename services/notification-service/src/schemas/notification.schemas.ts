import { z } from 'zod';

export const createNotificationBody = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(5000),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  channel: z.enum(['in_app', 'email', 'sms', 'push']).default('in_app'),
  recipient_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const markReadBody = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  read: z.enum(['true', 'false']).optional(),
  channel: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
