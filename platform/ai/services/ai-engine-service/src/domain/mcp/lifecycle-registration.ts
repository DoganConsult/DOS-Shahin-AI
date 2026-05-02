import { registerLifecycleDefinition } from './ports/lifecycle.port';

const MCP_TOOL_STATES = [
  'draft',
  'active',
  'suspended',
  'deprecated',
  'archived',
] as const;

const MCP_TOOL_TRANSITIONS: Record<string, string[]> = {
  draft:      ['active'],
  active:     ['suspended', 'deprecated'],
  suspended:  ['active', 'deprecated'],
  deprecated: ['archived'],
  archived:   [],
};

registerLifecycleDefinition(
  'mcp',
  'mcp_tool_registry',
  MCP_TOOL_STATES,
  MCP_TOOL_TRANSITIONS,
  {
    initialState: 'draft',
    terminalStates: ['archived'],
  },
);

const MCP_APPROVAL_STATES = [
  'pending',
  'approved',
  'rejected',
  'expired',
] as const;

const MCP_APPROVAL_TRANSITIONS: Record<string, string[]> = {
  pending:  ['approved', 'rejected', 'expired'],
  approved: [],
  rejected: [],
  expired:  [],
};

registerLifecycleDefinition(
  'mcp',
  'mcp_tool_approval_requests',
  MCP_APPROVAL_STATES,
  MCP_APPROVAL_TRANSITIONS,
  {
    initialState: 'pending',
    terminalStates: ['approved', 'rejected', 'expired'],
  },
);
