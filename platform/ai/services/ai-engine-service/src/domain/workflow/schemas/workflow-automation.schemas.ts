import { z } from 'zod';

export const triggerAutomationBody = z.object({}).strict();

export type TriggerAutomationBodyInput = z.infer<typeof triggerAutomationBody>;
