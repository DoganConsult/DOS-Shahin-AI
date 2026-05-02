export declare function resolveIntegrationConfig(tenantId: string, type: 'jira' | 'slack' | 'teams' | 'servicenow' | 'ciso_assistant' | 'openproject'): Promise<Record<string, unknown> | null>;
export declare function invalidateConfigCache(tenantId: string, type?: string): void;
export declare function resolveJiraConfig(tenantId: string): Promise<{
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
} | null>;
export declare function resolveSlackConfig(tenantId: string): Promise<{
    webhookUrl: string;
} | null>;
export declare function resolveTeamsConfig(tenantId: string): Promise<{
    webhookUrl: string;
} | null>;
export declare function resolveServiceNowConfig(tenantId: string): Promise<{
    instanceUrl: string;
    username: string;
    password: string;
} | null>;
export declare function resolveCisoAssistantConfig(tenantId: string): Promise<{
    url: string;
    apiKey: string;
} | null>;
export declare function resolveOpenProjectConfig(tenantId: string): Promise<{
    url: string;
    apiKey: string;
    projectId?: string;
} | null>;
