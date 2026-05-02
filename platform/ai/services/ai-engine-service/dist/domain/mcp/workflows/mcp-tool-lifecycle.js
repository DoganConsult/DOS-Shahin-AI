export const MCP_TOOL_STATES = [
    'draft', 'pending_approval', 'active', 'suspended', 'deprecated', 'inactive',
];
export const MCP_TOOL_TRANSITIONS = {
    draft: ['pending_approval', 'active'],
    pending_approval: ['active', 'draft'],
    active: ['suspended', 'deprecated'],
    suspended: ['active', 'deprecated', 'inactive'],
    deprecated: ['inactive'],
    inactive: [],
};
export const MCP_APPROVAL_STATES = [
    'pending', 'approved', 'rejected', 'expired', 'cancelled',
];
export const MCP_APPROVAL_TRANSITIONS = {
    pending: ['approved', 'rejected', 'expired', 'cancelled'],
    approved: [],
    rejected: [],
    expired: [],
    cancelled: [],
};
//# sourceMappingURL=mcp-tool-lifecycle.js.map