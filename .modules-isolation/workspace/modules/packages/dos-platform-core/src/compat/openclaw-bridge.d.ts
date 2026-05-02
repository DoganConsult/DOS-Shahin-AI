/**
 * OpenClaw bridge — resolves tools/resources/execute via HTTP upstream and/or
 * MCP gateway registry. Used by integrations routes through legacy exports.
 *
 * Env (optional, compose-friendly):
 * - OPENCLAW_DISABLE=1|true — force unavailable
 * - OPENCLAW_HTTP_BASE_URL — e.g. https://openclaw.internal:8787/v1 (tools/resources/execute)
 * - OPENCLAW_HTTP_TOOLS_PATH — default /tools
 * - OPENCLAW_HTTP_RESOURCES_PATH — default /resources
 * - OPENCLAW_HTTP_EXECUTE_PATH_TEMPLATE — default /tools/{tool}/execute ({tool} literal segment)
 * - OPENCLAW_MCP_GATEWAY_URL or MCP_GATEWAY_URL — e.g. http://mcp-gateway-service:3011/api/mcp
 *   (list tools only; execute requires HTTP base unless upstream adds POST)
 */
export type OpenClawContext = {
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    /** Full Authorization header value (Bearer …) from the caller */
    authorization?: string;
};
export declare function bridgeIsOpenClawAvailable(): Promise<boolean>;
export declare function bridgeGetOpenClawServiceConfig(): Promise<Record<string, unknown>>;
export declare function bridgeListOpenClawTools(ctx?: OpenClawContext): Promise<Array<Record<string, unknown>>>;
export declare function bridgeListOpenClawResources(uri: string | undefined, ctx?: OpenClawContext): Promise<Array<Record<string, unknown>>>;
export declare function bridgeExecuteOpenClawTool(tool: string, input: Record<string, unknown>, ctx?: OpenClawContext): Promise<Record<string, unknown>>;
