import { z } from 'zod';

export const NotesBody = z.object({
  notes: z.string().min(1).max(10_000),
  entityId: z.string().uuid().optional(),
  entityType: z.string().max(100).optional(),
});

export const RegisterVersionSchema = z.object({
  frameworkCode: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  changesSummary: z.string().max(5000).optional(),
  publishedBy: z.string().max(200).optional(),
});

export const CreateAlertSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(10_000),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  frameworkCode: z.string().max(100).optional(),
  entityId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const NLQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  frameworkCode: z.string().max(100).optional(),
  locale: z.enum(['en', 'ar']).default('en'),
  maxResults: z.number().int().min(1).max(50).default(10),
});

export const AcceptMappingsSchema = z.object({
  mappingIds: z.array(z.string().uuid()).min(1).max(200),
  notes: z.string().max(2000).optional(),
  acceptedBy: z.string().uuid().optional(),
});

export const LogFrameworkChangeSchema = z.object({
  frameworkCode: z.string().min(1).max(100),
  changeType: z.enum(['added', 'modified', 'removed', 'deprecated']),
  controlCode: z.string().max(200).optional(),
  description: z.string().min(1).max(5000),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  loggedBy: z.string().uuid().optional(),
});

export const RemediationPlanSchema = z.object({
  controlId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerId: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  steps: z.array(z.object({
    step: z.string().min(1).max(1000),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ownerId: z.string().uuid().optional(),
  })).max(50).optional(),
});

export const AddSectorSchema = z.object({
  sectorCode: z.string().min(1).max(100),
  sectorName: z.string().min(1).max(200),
  sectorNameAr: z.string().max(200).optional(),
  parentCode: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export type NotesBodyInput = z.infer<typeof NotesBody>;
export type RegisterVersionInput = z.infer<typeof RegisterVersionSchema>;
export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type NLQueryInput = z.infer<typeof NLQuerySchema>;
export type AcceptMappingsInput = z.infer<typeof AcceptMappingsSchema>;
export type LogFrameworkChangeInput = z.infer<typeof LogFrameworkChangeSchema>;
export type RemediationPlanInput = z.infer<typeof RemediationPlanSchema>;
export type AddSectorInput = z.infer<typeof AddSectorSchema>;
