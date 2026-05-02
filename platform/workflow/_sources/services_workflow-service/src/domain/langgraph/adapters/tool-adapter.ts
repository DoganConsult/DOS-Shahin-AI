// ============================================
// LangGraph Tool Adapter
// Converts existing AgentToolDefinition handlers
// into LangChain DynamicStructuredTool instances
// ============================================

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { toErrorMessage } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

/**
 * Shape of tool definitions from agent-tools-registry.service.ts.
 * Each tool has a name, description, JSON Schema input_schema, and handler function.
 */
export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (tenantId: string, input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Convert a JSON Schema property to a Zod schema.
 * Handles basic types used by our agent tools.
 */
function jsonSchemaPropertyToZod(prop: any): z.ZodTypeAny {
  if (!prop || !prop.type) return z.any();
  switch (prop.type) {
    case 'string':
      if (prop.enum) return z.enum(prop.enum as readonly [string, ...string[]]);
      return z.string().describe(prop.description || '');
    case 'number':
    case 'integer':
      return z.number().describe(prop.description || '');
    case 'boolean':
      return z.boolean().describe(prop.description || '');
    case 'array':
      return z.array(jsonSchemaPropertyToZod((prop as any).items || {})).describe(prop.description || '');
    case 'object':
      return z.record(z.string(), z.any()).describe(prop.description || '');
    default:
      return z.any();
  }
}

/**
 * Convert a JSON Schema object to a Zod object schema.
 */
function jsonSchemaToZod(schema: { properties: Record<string, unknown>; required?: string[] }): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
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
export function convertToLangChainTool(
  toolDef: AgentToolDefinition,
  tenantId: string,
): DynamicStructuredTool {
  const zodSchema = jsonSchemaToZod(toolDef.input_schema);

  return new DynamicStructuredTool({
    name: toolDef.name,
    description: toolDef.description,
    schema: zodSchema,
    func: async (input: Record<string, unknown>) => {
      try {
        const result = await toolDef.handler(tenantId, input);
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (err: unknown) {
        return JSON.stringify({ error: toErrorMessage(err) || 'Tool execution failed' });
      }
    },
  });
}

/**
 * Convert an array of AgentToolDefinitions to LangChain tools.
 */
export function convertAllTools(
  toolDefs: AgentToolDefinition[],
  tenantId: string,
): DynamicStructuredTool[] {
  return toolDefs.map((td) => convertToLangChainTool(td, tenantId));
}
