// @ts-nocheck
import { z } from 'zod';

export const CreateBenchmarkSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.string().max(50).default('1.0'),
  provider: z.string().min(1).max(255),
  frameworkCode: z.string().max(100).optional(),
  releaseDate: z.string().optional(),
});

export const CreateMappingSchema = z.object({
  benchmarkId: z.string().uuid(),
  internalControlId: z.string().uuid(),
  weight: z.number().min(0).max(100).default(1),
  notes: z.string().optional(),
});

export const ComputeScoreSchema = z.object({
  benchmarkId: z.string().uuid(),
  computationMethod: z.enum(['weighted_average', 'simple_average', 'maturity_based']).default('weighted_average'),
});
