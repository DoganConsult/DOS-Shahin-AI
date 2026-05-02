// ============================================
// LangGraph Tool Adapter
// Converts existing AgentToolDefinition handlers
// into LangChain DynamicStructuredTool instances
// ============================================
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { toErrorMessage } from '@dos/platform-core/resilience';
/**
 * Convert a JSON Schema property to a Zod schema.
 * Handles basic types used by our agent tools.
 */
function jsonSchemaPropertyToZod(prop) {
    if (!prop || !prop.type)
        return z.any();
    switch (prop.type) {
        case 'string':
            if (prop.enum)
                return z.enum(prop.enum);
            return z.string().describe(prop.description || '');
        case 'number':
        case 'integer':
            return z.number().describe(prop.description || '');
        case 'boolean':
            return z.boolean().describe(prop.description || '');
        case 'array':
            return z.array(jsonSchemaPropertyToZod(prop.items || {})).describe(prop.description || '');
        case 'object':
            return z.record(z.string(), z.any()).describe(prop.description || '');
        default:
            return z.any();
    }
}
/**
 * Convert a JSON Schema object to a Zod object schema.
 */
function jsonSchemaToZod(schema) {
    const shape = {};
    for (const [key, prop] of Object.entries(schema.properties || {})) {
        let field = jsonSchemaPropertyToZod(prop);
        if (!schema.required?.includes(key)) {
            field = field.optional();
        }
        shape[key] = field;
    }
    return z.object(shape);
}
/**
 * Convert an existing AgentToolDefinition into a LangChain DynamicStructuredTool.
 * The handler is bound to the given tenantId for multi-tenant execution.
 */
export function convertToLangChainTool(toolDef, tenantId) {
    const zodSchema = jsonSchemaToZod(toolDef.input_schema);
    return new DynamicStructuredTool({
        name: toolDef.name,
        description: toolDef.description,
        schema: zodSchema,
        func: async (input) => {
            try {
                const result = await toolDef.handler(tenantId, input);
                return typeof result === 'string' ? result : JSON.stringify(result);
            }
            catch (err) {
                return JSON.stringify({ error: toErrorMessage(err) || 'Tool execution failed' });
            }
        },
    });
}
/**
 * Convert an array of AgentToolDefinitions to LangChain tools.
 */
export function convertAllTools(toolDefs, tenantId) {
    return toolDefs.map((td) => convertToLangChainTool(td, tenantId));
}
//# sourceMappingURL=tool-adapter.js.map