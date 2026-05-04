import { z } from 'zod';

export const EvaluateSchema = z.object({
  attempt_id: z.string().uuid(),
  email: z.string().email().optional().nullable(),
  ip_addr: z.string().optional().nullable(),
  device_fp: z.string().optional().nullable(),
  captcha_token: z.string().optional().nullable(),
});
