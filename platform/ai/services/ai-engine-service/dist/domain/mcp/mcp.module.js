import { registerModule } from '@dos/module-sdk';
export const MCP_MANIFEST = {
    code: 'mcp',
    version: '1.0.0',
    nameEn: 'Model Context Protocol',
    nameAr: 'بروتوكول سياق النموذج',
    descriptionEn: 'MCP tool registry, agent bindings, and execution logging for external data integration.',
    descriptionAr: 'سجل أدوات MCP وروابط الوكلاء وتسجيل التنفيذ للتكامل مع البيانات الخارجية.',
    tier: 'technical',
    category: 'platform',
    routeBase: '/api/mcp',
    eventNamespace: 'mcp',
    tablePrefix: 'mcp_',
    ownedTables: [
        'mcp_tool_registry', 'mcp_agent_registry', 'mcp_agent_tools',
        'mcp_execution_logs', 'mcp_prompt_registry', 'mcp_resource_registry',
    ],
    sharedTables: [],
    referencedTables: [],
    aggregateRoots: ['mcp_tool_registry', 'mcp_agent_registry'],
    publishedEvents: [
        'mcp.tool.created', 'mcp.tool.updated',
        'mcp.agent.created', 'mcp.agent.bound',
        'mcp.execution.logged',
    ],
    consumedEvents: [],
    hardDeps: [],
    softDeps: ['ai'],
    installable: true,
    provisioningOrder: 90,
    licensingTier: 'starter',
    visibility: 'internal',
    adminSurfaces: [],
    securityPermissions: [
        { permissionCode: 'mcp.read', resourceType: 'data', actionType: 'read', descriptionEn: 'Read MCP data', descriptionAr: 'قراءة بيانات MCP' },
        { permissionCode: 'mcp.manage', resourceType: 'data', actionType: 'manage', descriptionEn: 'Manage MCP tools', descriptionAr: 'إدارة أدوات MCP', sensitive: true },
    ],
    securityRoles: [
        { roleCode: 'mcp.viewer', archetype: 'viewer', isDefault: true, isSystem: true, isGlobal: false, permissions: ['mcp.read'] },
        { roleCode: 'mcp.admin', archetype: 'module_lead', isDefault: false, isSystem: true, isGlobal: false, permissions: ['mcp.read', 'mcp.manage'] },
    ],
    securityActions: [],
    approvalRules: [],
    ownershipRules: [],
    sodRules: [],
};
registerModule(MCP_MANIFEST);
//# sourceMappingURL=mcp.module.js.map