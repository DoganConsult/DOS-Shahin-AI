import type { ModuleEventContract } from '@dos/types';

export const MCP_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'mcp',
  published: {
    'mcp.tool_registered': { description: 'Emitted when an MCP tool is registered', version: 1, payloadType: 'McpToolPayload' },
    'mcp.tool_invoked': { description: 'Emitted when an MCP tool is invoked', version: 1, payloadType: 'McpToolPayload' },
    'mcp.tool_completed': { description: 'Emitted when an MCP tool invocation completes', version: 1, payloadType: 'McpToolPayload' },
    'mcp.tool_failed': { description: 'Emitted when an MCP tool invocation fails', version: 1, payloadType: 'McpToolPayload' },
    'mcp.server_connected': { description: 'Emitted when an MCP server connection is established', version: 1, payloadType: 'McpServerPayload' },
    'mcp.server_disconnected': { description: 'Emitted when an MCP server connection is lost', version: 1, payloadType: 'McpServerPayload' },
  },
  consumed: {
    'ai.agent_started': { source: 'ai', handler: 'handleAgentStarted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const MCP_PUBLISHED_EVENTS = Object.keys(MCP_EVENT_CONTRACT.published);
export const MCP_CONSUMED_EVENTS = Object.keys(MCP_EVENT_CONTRACT.consumed);

export const MCP_EVENT_ORDERING = {
  strictOrdering: false,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const MCP_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: ['toolInput', 'toolOutput'] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const MCP_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
