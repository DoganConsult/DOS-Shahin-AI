/**
 * RAG Validation Schemas — Zod
 */

import { z } from 'zod';

export const indexDocumentBody = z.object({
  content: z.string().min(1).max(500000),
  sourceType: z.string().min(1).max(100).default('document'),
  sourceId: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  chunkOptions: z.object({
    maxChunkSize: z.coerce.number().int().min(100).max(10000).optional(),
    overlapSize: z.coerce.number().int().min(0).max(2000).optional(),
    respectParagraphs: z.boolean().optional(),
  }).optional(),
});

export const indexBatchBody = z.object({
  documents: z.array(z.object({
    content: z.string().min(1).max(500000),
    sourceType: z.string().min(1).max(100).default('document'),
    sourceId: z.string().max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(50),
  chunkOptions: z.object({
    maxChunkSize: z.coerce.number().int().min(100).max(10000).optional(),
    overlapSize: z.coerce.number().int().min(0).max(2000).optional(),
    respectParagraphs: z.boolean().optional(),
  }).optional(),
});

export const searchBody = z.object({
  query: z.string().min(1).max(10000),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.3),
  sourceFilter: z.string().max(100).optional(),
});

export const hybridSearchBody = z.object({
  query: z.string().min(1).max(10000),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sourceFilter: z.string().max(100).optional(),
});
