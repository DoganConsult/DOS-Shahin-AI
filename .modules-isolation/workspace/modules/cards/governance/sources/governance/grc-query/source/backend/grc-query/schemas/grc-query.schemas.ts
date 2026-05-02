// @ts-nocheck
import { z } from 'zod';

export const SaveQuerySchema = z.object({
  name: z.string().min(1).max(255),
  queryDslJson: z.record(z.unknown()),
  isPublic: z.boolean().default(false)
});

export const UnifiedSearchSchema = z.object({
  query: z.string().min(2),
  limit: z.number().max(100).optional(),
  modules: z.array(z.string()).optional()
});

export const FederatedSearchSchema = z.object({
  queryDslJson: z.record(z.unknown()),
  limit: z.number().max(500).optional(),
  modules: z.array(z.string()).optional()
});

export const NlqSearchSchema = z.object({
  prompt: z.string().min(5),
  limit: z.number().max(100).optional()
});
