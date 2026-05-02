"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsRegistrySchemaV2 = exports.AgentRegistryEntrySchema = exports.AgentTenantRulesSchema = void 0;
const zod_1 = require("zod");
exports.AgentTenantRulesSchema = zod_1.z.object({
    scope: zod_1.z.enum(['tenant', 'platform']),
    requireModules: zod_1.z.array(zod_1.z.string()).optional(),
    requirePermissions: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.AgentRegistryEntrySchema = zod_1.z.object({
    agentCode: zod_1.z.string().regex(/^A\d{2}$/),
    name: zod_1.z.string().min(1),
    version: zod_1.z.string().min(1),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    requiredTools: zod_1.z.array(zod_1.z.string()).min(1),
    tenantRules: exports.AgentTenantRulesSchema,
    provenance: zod_1.z.string().min(1),
});
exports.AgentsRegistrySchemaV2 = zod_1.z.object({
    metadata: zod_1.z.object({
        version: zod_1.z.string().min(1),
        generator: zod_1.z.string().min(1),
        generatedAt: zod_1.z.string().min(1),
        sourceRoot: zod_1.z.string().min(1),
    }),
    agents: zod_1.z.array(exports.AgentRegistryEntrySchema).min(1),
});
//# sourceMappingURL=agents-registry.schema.js.map