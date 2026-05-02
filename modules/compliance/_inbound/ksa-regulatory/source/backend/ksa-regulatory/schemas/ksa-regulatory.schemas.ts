import { z } from 'zod';
import { paginationQuery, statusFilter } from '../../../schemas/common.schemas';

export const listObligationsQuery = paginationQuery.merge(statusFilter).extend({
  authority: z.string().optional(),
  framework: z.string().optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
});

export const createObligationBody = z.object({
  title: z.string().min(3).max(500),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  regulatoryAuthority: z.string().min(1),
  frameworkCode: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['draft', 'active', 'compliant', 'non_compliant', 'waived', 'archived']).default('draft'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export const updateObligationBody = createObligationBody.partial();

export const listChangesQuery = paginationQuery.extend({
  authority: z.string().optional(),
  effectiveAfter: z.string().datetime({ offset: true }).optional(),
  search: z.string().optional(),
});

export const createChangeTrackingBody = z.object({
  title: z.string().min(3).max(500),
  authority: z.string().min(1),
  changeType: z.enum(['new_regulation', 'amendment', 'guidance', 'circular', 'enforcement']),
  effectiveDate: z.string().datetime({ offset: true }),
  impactAssessment: z.string().optional(),
  summary: z.string().optional(),
});

export const maturityAssessmentQuery = z.object({
  sector: z.string().optional(),
  includeBreakdown: z.coerce.boolean().default(true),
});

export const frameworkMappingBody = z.object({
  sourceFramework: z.string().min(1),
  targetFramework: z.string().min(1),
  controlId: z.string().min(1),
  mappedControlId: z.string().min(1),
  mappingStrength: z.enum(['exact', 'partial', 'related']).default('partial'),
});
