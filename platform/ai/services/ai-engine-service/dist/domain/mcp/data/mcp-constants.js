export const MCP_TIMEOUTS = {
    DEFAULT_TOOL_EXECUTION_MS: 30_000,
    MAX_TOOL_EXECUTION_MS: 300_000,
    SESSION_TTL_MS: 30 * 60 * 1000,
    SESSION_EVICTION_INTERVAL_MS: 5 * 60 * 1000,
    CACHE_TTL_MS: 60_000,
    APPROVAL_EXPIRY_HOURS: 72,
    LOG_RETENTION_DAYS: 90,
    ARCHIVE_AFTER_DAYS: 365,
};
export const MCP_BUSINESS_THRESHOLDS = {
    MAX_ACTIVE_SESSIONS: 200,
    DEFAULT_RATE_LIMIT_PER_MIN: 60,
    MAX_RATE_LIMIT_PER_MIN: 600,
    MAX_RETRIES: 3,
    RETRY_BACKOFF_MS: [1000, 5000, 15000],
    MAX_INPUT_SIZE_BYTES: 1_048_576,
    MAX_OUTPUT_SIZE_BYTES: 10_485_760,
    STALE_TOOL_DAYS: 90,
    ERROR_RATE_WARNING_THRESHOLD: 0.1,
    ERROR_RATE_CRITICAL_THRESHOLD: 0.3,
    HIGH_LATENCY_WARNING_MS: 5000,
    HIGH_LATENCY_CRITICAL_MS: 15000,
    PENDING_APPROVAL_WARNING: 10,
};
export const MCP_AUTONOMY_LEVELS = ['L0', 'L1', 'L2', 'L3'];
export const MCP_RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
export const MCP_TABLE_PREFIX = 'mcp_';
export const MCP_OWNED_TABLES = [
    'mcp_tool_registry',
    'mcp_agent_registry',
    'mcp_prompt_registry',
    'mcp_resource_registry',
    'mcp_tool_overrides',
    'mcp_tool_execution_log',
    'mcp_tool_usage_counters',
    'mcp_tool_approval_requests',
];
//# sourceMappingURL=mcp-constants.js.map