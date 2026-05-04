import { z } from 'zod';

export const FlowQuerySchema = z.object({
  product_code: z.string().regex(/^[a-z][a-z0-9-]*$/),
});

export const StartAttemptSchema = z.object({
  flow_code: z.string().min(2),
  email: z.string().email(),
  device_fp: z.string().optional().nullable(),
});

export const CompleteAttemptSchema = z.object({
  attempt_id: z.string().uuid(),
  edition: z.string().default('standard'),
});
