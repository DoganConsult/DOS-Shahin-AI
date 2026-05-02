import { z } from 'zod';
import { paginationQuery } from './common.schemas';

export const createPositionBody = z.object({
  dept_id: z.string().uuid('Invalid department ID format').optional(),
  title_en: z.string().min(1, 'English title is required').max(255, 'English title too long'),
  title_ar: z.string().min(1, 'Arabic title is required').max(255, 'Arabic title too long').optional(),
  grade: z.string().max(50, 'Grade too long').optional(),
  reports_to_position_id: z.string().uuid('Invalid reports-to position ID format').optional(),
  status: z.enum(['active', 'inactive', 'vacant'], {
    message: 'Invalid status. Must be active, inactive, or vacant.',
  }).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updatePositionBody = createPositionBody.partial();

export const listPositionsQuery = paginationQuery.extend({
  departmentId: z.string().uuid('Invalid department ID format').optional(),
});
