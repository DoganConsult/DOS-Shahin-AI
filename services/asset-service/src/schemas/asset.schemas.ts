import { z } from 'zod';

export const createAssetBody = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'type is required'),
  category: z.string().optional(),
  status: z.string().optional(),
  criticality: z.string().optional(),
  owner_id: z.string().optional(),
  department_id: z.string().optional(),
  location: z.string().optional(),
  ip_address: z.string().optional(),
  os_type: z.string().min(1, 'os_type is required'),
  vendor: z.string().optional(),
  classification: z.string().optional(),
});

export const updateAssetBody = createAssetBody.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const bulkCreateBody = z.object({
  items: z.array(createAssetBody).min(1).max(100),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
