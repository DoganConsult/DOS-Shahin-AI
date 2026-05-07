import { MCP_MANIFEST } from '../mcp.module.js';
export { MCP_MANIFEST };
export const MCP_MANIFEST_META = {
    code: MCP_MANIFEST.code,
    version: MCP_MANIFEST.version,
    tier: MCP_MANIFEST.tier,
    category: MCP_MANIFEST.category,
    routeBase: MCP_MANIFEST.routeBase,
    eventNamespace: MCP_MANIFEST.eventNamespace,
    tablePrefix: MCP_MANIFEST.tablePrefix,
    ownedTables: MCP_MANIFEST.ownedTables,
    publishedEvents: MCP_MANIFEST.publishedEvents,
    consumedEvents: MCP_MANIFEST.consumedEvents,
    hardDeps: MCP_MANIFEST.hardDeps,
    softDeps: MCP_MANIFEST.softDeps,
    provisioningOrder: MCP_MANIFEST.provisioningOrder,
    lifecycleParticipation: true,
    uiSurfaces: [
        'mcp-tool-registry',
        'mcp-agent-registry',
        'mcp-server-status',
        'mcp-approval-queue',
        'mcp-execution-logs',
        'mcp-diagnostics',
    ],
    adminSurfaces: MCP_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'server_healthy', 'tool_registry_loaded', 'agent_registry_loaded'],
};
//# sourceMappingURL=mcp.manifest.js.map