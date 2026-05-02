import { z } from 'zod';
import { paginationQuery, statusFilter } from '../../../schemas/common.schemas';

const widgetCategory = z.enum([
  'executive', 'insight', 'structural', 'kpi', 'kri',
  'compliance', 'risk', 'audit', 'evidence', 'general',
]);

const widgetSize = z.enum(['small', 'medium', 'large', 'full']);

const widgetStatus = z.enum([
  'draft', 'in_review', 'approved', 'published', 'suspended', 'archived',
]);

export const createWidgetBody = z.object({
  widgetKey: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  nameEn: z.string().min(2).max(200),
  nameAr: z.string().max(200).optional(),
  descriptionEn: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  category: widgetCategory,
  size: widgetSize.default('medium'),
  icon: z.string().max(100).optional(),
  dataSources: z.array(z.string()).optional(),
  requiredPermissions: z.array(z.string()).optional(),
  scopeRule: z.string().max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateWidgetBody = createWidgetBody.partial().omit({ widgetKey: true });

export const listWidgetsQuery = paginationQuery.merge(statusFilter).extend({
  category: widgetCategory.optional(),
  widgetKey: z.string().optional(),
});

export const widgetKeyParam = z.object({
  widgetKey: z.string().min(1),
});

export const createBundleBody = z.object({
  nameEn: z.string().min(2).max(200),
  nameAr: z.string().max(200).optional(),
  descriptionEn: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  widgetIds: z.array(z.string()).min(1),
  layout: z.array(z.object({
    widgetId: z.string(),
    position: z.number().int().min(0),
    colSpan: z.number().int().min(1).max(12),
    rowSpan: z.number().int().min(1).max(6),
  })).optional(),
  targetAudience: z.string().max(100).optional(),
});

export const updateBundleBody = createBundleBody.partial();

export const listBundlesQuery = paginationQuery.merge(statusFilter).extend({
  targetAudience: z.string().optional(),
});

export const statusTransitionBody = z.object({
  status: widgetStatus,
  comment: z.string().max(1000).optional(),
});
