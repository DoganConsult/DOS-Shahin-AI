/**
 * OpenClaw A2A Validation Schemas — Zod
 */
import { z } from 'zod';
export const enqueueMessageBody = z.object({
    fromAgentId: z.string().min(1).max(100),
    toAgentId: z.string().min(1).max(100),
    messageType: z.string().min(1).max(100).default('handoff'),
    payload: z.record(z.string(), z.unknown()),
    priority: z.coerce.number().int().min(0).max(100).default(0),
});
export const dequeueMessagesBody = z.object({
    agentId: z.string().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});
export const nackMessageBody = z.object({
    errorMessage: z.string().min(1).max(5000),
});
//# sourceMappingURL=a2a.schemas.js.map