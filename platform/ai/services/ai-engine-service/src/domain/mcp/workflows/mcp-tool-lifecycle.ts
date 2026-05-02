export const MCP_TOOL_STATES = [
  'draft', 'pending_approval', 'active', 'suspended', 'deprecated', 'inactive',
] as const;

export type McpToolState = (typeof MCP_TOOL_STATES)[number];

export const MCP_TOOL_TRANSITIONS: Record<McpToolState, McpToolState[]> = {
  draft: ['pending_approval', 'active'],
  pending_approval: ['active', 'draft'],
  active: ['suspended', 'deprecated'],
  suspended: ['active', 'deprecated', 'inactive'],
  deprecated: ['inactive'],
  inactive: [],
};

export const MCP_APPROVAL_STATES = [
  'pending', 'approved', 'rejected', 'expired', 'cancelled',
] as const;

export type McpApprovalState = (typeof MCP_APPROVAL_STATES)[number];

export const MCP_APPROVAL_TRANSITIONS: Record<McpApprovalState, McpApprovalState[]> = {
  pending: ['approved', 'rejected', 'expired', 'cancelled'],
  approved: [],
  rejected: [],
  expired: [],
  cancelled: [],
};
