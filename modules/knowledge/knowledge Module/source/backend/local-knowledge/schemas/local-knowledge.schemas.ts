import { z } from 'zod';
import { paginationQuery } from '../../../schemas/common.schemas';

export const searchKnowledgeQuery = z.object({
  q: z.string().min(1).max(1000),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sourceType: z.string().optional(),
  minScore: z.coerce.number().min(0).max(1).optional(),
});

export const listDocumentsQuery = paginationQuery.extend({
  sourceType: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  search: z.string().optional(),
});

export const ingestDocumentBody = z.object({
  title: z.string().min(1).max(500),
  sourceType: z.enum(['upload', 'url', 'api', 'manual', 'sharepoint', 'confluence']),
  sourceUri: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  chunkStrategy: z.enum(['paragraph', 'sentence', 'fixed_size', 'semantic']).default('paragraph'),
});

export const updateDocumentBody = z.object({
  title: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  reindex: z.boolean().default(false),
});

export const createSourceBody = z.object({
  name: z.string().min(1).max(255),
  sourceType: z.enum(['sharepoint', 'confluence', 'api', 'file_system', 'manual']),
  connectionConfig: z.record(z.string(), z.unknown()),
  syncSchedule: z.string().optional(),
  enabled: z.boolean().default(true),
});
export const createDocumentsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSearchBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSourcesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

