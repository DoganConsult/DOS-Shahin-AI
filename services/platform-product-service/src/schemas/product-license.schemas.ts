import { z } from 'zod';

export const createProductLicenseBody = z.object({
  product_code: z.string().min(1, 'product_code is required'),
  plan: z.string().min(1, 'plan is required'),
  status: z.string().optional(),
  seat_count: z.number().optional(),
  features: z.any().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});

export const updateProductLicenseBody = createProductLicenseBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createProductLicenseBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
