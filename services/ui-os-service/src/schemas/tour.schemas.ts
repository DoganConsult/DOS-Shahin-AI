import { z } from 'zod';

export const TourCompleteSchema = z.object({
  last_step_key: z.string().max(150).nullable().optional(),
});

export const TourSkipSchema = z.object({
  last_step_key: z.string().max(150).nullable().optional(),
});

export const SaveQuerySchema = z.object({
  query: z.string().min(1).max(500),
  name: z.string().max(200).optional(),
});
