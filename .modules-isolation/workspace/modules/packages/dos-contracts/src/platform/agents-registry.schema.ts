import { z } from 'zod';

export const AgentTenantRulesSchema = z.object({
  scope: z.enum(['tenant', 'platform']),
  requireModules: z.array(z.string()).optional(),
  requirePermissions: z.array(z.string()).optional(),
});

export const AgentRegistryEntrySchema = z.object({
  agentCode: z.string().regex(/^A\d{2}$/),
  name: z.string().min(1),
  version: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  requiredTools: z.array(z.string()).min(1),
  tenantRules: AgentTenantRulesSchema,
  provenance: z.string().min(1),
});

export const AgentsRegistrySchemaV2 = z.object({
  metadata: z.object({
    version: z.string().min(1),
    generator: z.string().min(1),
    generatedAt: z.string().min(1),
    sourceRoot: z.string().min(1),
  }),
  agents: z.array(AgentRegistryEntrySchema).min(1),
});

export type AgentsRegistryV2 = z.infer<typeof AgentsRegistrySchemaV2>;

