// @ts-nocheck
import { z } from 'zod';

export const RecordMetricSchema = z.object({
  metricKey: z.string().min(1).max(255),
  metricValue: z.number(),
  metricUnit: z.string().max(50).optional(),
  sourceModule: z.string().max(100).optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const QueryMetricsSchema = z.object({
  metricKey: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export const QueryUsageSchema = z.object({
  moduleCode: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
