import { z } from 'zod';
export declare const AgentTenantRulesSchema: z.ZodObject<{
    scope: z.ZodEnum<["tenant", "platform"]>;
    requireModules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    requirePermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    scope?: "platform" | "tenant";
    requireModules?: string[];
    requirePermissions?: string[];
}, {
    scope?: "platform" | "tenant";
    requireModules?: string[];
    requirePermissions?: string[];
}>;
export declare const AgentRegistryEntrySchema: z.ZodObject<{
    agentCode: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    capabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiredTools: z.ZodArray<z.ZodString, "many">;
    tenantRules: z.ZodObject<{
        scope: z.ZodEnum<["tenant", "platform"]>;
        requireModules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        requirePermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        scope?: "platform" | "tenant";
        requireModules?: string[];
        requirePermissions?: string[];
    }, {
        scope?: "platform" | "tenant";
        requireModules?: string[];
        requirePermissions?: string[];
    }>;
    provenance: z.ZodString;
}, "strip", z.ZodTypeAny, {
    version?: string;
    name?: string;
    capabilities?: string[];
    agentCode?: string;
    requiredTools?: string[];
    tenantRules?: {
        scope?: "platform" | "tenant";
        requireModules?: string[];
        requirePermissions?: string[];
    };
    provenance?: string;
}, {
    version?: string;
    name?: string;
    capabilities?: string[];
    agentCode?: string;
    requiredTools?: string[];
    tenantRules?: {
        scope?: "platform" | "tenant";
        requireModules?: string[];
        requirePermissions?: string[];
    };
    provenance?: string;
}>;
export declare const AgentsRegistrySchemaV2: z.ZodObject<{
    metadata: z.ZodObject<{
        version: z.ZodString;
        generator: z.ZodString;
        generatedAt: z.ZodString;
        sourceRoot: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        generatedAt?: string;
        generator?: string;
        sourceRoot?: string;
    }, {
        version?: string;
        generatedAt?: string;
        generator?: string;
        sourceRoot?: string;
    }>;
    agents: z.ZodArray<z.ZodObject<{
        agentCode: z.ZodString;
        name: z.ZodString;
        version: z.ZodString;
        capabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredTools: z.ZodArray<z.ZodString, "many">;
        tenantRules: z.ZodObject<{
            scope: z.ZodEnum<["tenant", "platform"]>;
            requireModules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            requirePermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            scope?: "platform" | "tenant";
            requireModules?: string[];
            requirePermissions?: string[];
        }, {
            scope?: "platform" | "tenant";
            requireModules?: string[];
            requirePermissions?: string[];
        }>;
        provenance: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        name?: string;
        capabilities?: string[];
        agentCode?: string;
        requiredTools?: string[];
        tenantRules?: {
            scope?: "platform" | "tenant";
            requireModules?: string[];
            requirePermissions?: string[];
        };
        provenance?: string;
    }, {
        version?: string;
        name?: string;
        capabilities?: string[];
        agentCode?: string;
        requiredTools?: string[];
        tenantRules?: {
            scope?: "platform" | "tenant";
            requireModules?: string[];
            requirePermissions?: string[];
        };
        provenance?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    metadata?: {
        version?: string;
        generatedAt?: string;
        generator?: string;
        sourceRoot?: string;
    };
    agents?: {
        version?: string;
        name?: string;
        capabilities?: string[];
        agentCode?: string;
        requiredTools?: string[];
        tenantRules?: {
            scope?: "platform" | "tenant";
            requireModules?: string[];
            requirePermissions?: string[];
        };
        provenance?: string;
    }[];
}, {
    metadata?: {
        version?: string;
        generatedAt?: string;
        generator?: string;
        sourceRoot?: string;
    };
    agents?: {
        version?: string;
        name?: string;
        capabilities?: string[];
        agentCode?: string;
        requiredTools?: string[];
        tenantRules?: {
            scope?: "platform" | "tenant";
            requireModules?: string[];
            requirePermissions?: string[];
        };
        provenance?: string;
    }[];
}>;
export type AgentsRegistryV2 = z.infer<typeof AgentsRegistrySchemaV2>;
