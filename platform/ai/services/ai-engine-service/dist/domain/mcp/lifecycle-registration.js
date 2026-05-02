import { registerLifecycleDefinition } from './ports/lifecycle.port.js';
const MCP_TOOL_STATES = [
    'draft',
    'active',
    'suspended',
    'deprecated',
    'archived',
];
const MCP_TOOL_TRANSITIONS = {
    draft: ['active'],
    active: ['suspended', 'deprecated'],
    suspended: ['active', 'deprecated'],
    deprecated: ['archived'],
    archived: [],
};
registerLifecycleDefinition('mcp', 'mcp_tool_registry', MCP_TOOL_STATES, MCP_TOOL_TRANSITIONS, {
    initialState: 'draft',
    terminalStates: ['archived'],
});
const MCP_APPROVAL_STATES = [
    'pending',
    'approved',
    'rejected',
    'expired',
];
const MCP_APPROVAL_TRANSITIONS = {
    pending: ['approved', 'rejected', 'expired'],
    approved: [],
    rejected: [],
    expired: [],
};
registerLifecycleDefinition('mcp', 'mcp_tool_approval_requests', MCP_APPROVAL_STATES, MCP_APPROVAL_TRANSITIONS, {
    initialState: 'pending',
    terminalStates: ['approved', 'rejected', 'expired'],
});
//# sourceMappingURL=lifecycle-registration.js.map