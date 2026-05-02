// @ts-nocheck
import { z } from 'zod';
export const CreateToolSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    parametersSchema: z.record(z.unknown()).default({}),
    isActive: z.boolean().default(true)
});
export const CreateAgentSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    systemPrompt: z.string().optional(),
    isActive: z.boolean().default(true)
});
export const BindToolSchema = z.object({
    toolId: z.string().uuid()
});
export const LogExecutionSchema = z.object({
    agentId: z.string().uuid(),
    toolId: z.string().uuid().optional(),
    executionPayload: z.record(z.unknown()).default({}),
    executionResult: z.record(z.unknown()).default({}),
    status: z.enum(['success', 'failure']).default('success'),
    executionTimeMs: z.number().min(0)
});
//# sourceMappingURL=mcp.schemas.js.map