/**
 * MCP Gateway Client (was: in-process stub).
 *
 * W3 extracted the real MCP server into services/mcp-gateway-service. This
 * class now speaks to that service over streamable-HTTP using the official
 * @modelcontextprotocol/sdk Client. All calls carry agent principal context
 * (tenantId + principalType) so mcp_audit_log records the real actor.
 *
 * Env:
 *   MCP_ENABLED             — gate (default: false)
 *   MCP_GATEWAY_URL         — base URL of mcp-gateway-service (default http://localhost:3011/mcp)
 *   MCP_GATEWAY_BEARER      — service JWT for M2M auth
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { logger } from '@dos/platform-core/observability';

export type McpPrincipalType = 'human' | 'agent' | 'service_account' | 'external';

export interface McpCallerPrincipal {
  principalType: McpPrincipalType;
  actorId?: string;
  tenantId: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export class MCPGateway {
  private readonly isEnabled: boolean;
  private readonly baseUrl: string;
  private readonly bearer: string | undefined;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor() {
    this.isEnabled = process.env.MCP_ENABLED === 'true';
    this.baseUrl = process.env.MCP_GATEWAY_URL || 'http://localhost:3011/mcp';
    this.bearer = process.env.MCP_GATEWAY_BEARER;
  }

  public enabled(): boolean {
    return this.isEnabled;
  }

  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('[MCP Gateway] disabled (MCP_ENABLED!=true) — bypassing initialization.');
      return;
    }
    if (this.client) return;
    try {
      this.transport = new StreamableHTTPClientTransport(new URL(this.baseUrl), {
        requestInit: this.bearer
          ? { headers: { Authorization: `Bearer ${this.bearer}` } }
          : undefined,
      });
      this.client = new Client(
        { name: 'ai-engine-service', version: '1.0.0' },
        { capabilities: {} },
      );
      await this.client.connect(this.transport);
      logger.info(`[MCP Gateway] connected to ${this.baseUrl}`);
    } catch (err) {
      logger.error(`[MCP Gateway] initialize failed — ${(err as Error).message}`);
      this.client = null;
      this.transport = null;
    }
  }

  public async listTools(_principal: McpCallerPrincipal): Promise<McpTool[]> {
    if (!this.isEnabled || !this.client) return [];
    const result = await this.client.listTools();
    return (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }));
  }

  public async callTool(
    principal: McpCallerPrincipal,
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!this.isEnabled) return null;
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('[MCP Gateway] client unavailable');
    // Wave 4: surface:mcp-tool trace per call, attributed to the calling principal.
    const { traceSurfaceCall } = await import('../../domain/agrc-engine/observability/langfuse-bridge.js');
    return traceSurfaceCall(
      {
        surface: 'mcp-tool',
        name: `mcp.${toolName}`,
        tenantId: principal.tenantId,
        userId: `${principal.principalType}:${principal.actorId}`,
        input: { toolName, args },
        metadata: { toolName, principalType: principal.principalType, actorId: principal.actorId },
      },
      () => this.client!.callTool({
        name: toolName,
        arguments: args,
        _meta: {
          'dos/tenant-id': principal.tenantId,
          'dos/principal-type': principal.principalType,
          'dos/actor-id': principal.actorId,
        } as Record<string, unknown>,
      }),
    );
  }

  public async fetchContext(
    principal: McpCallerPrincipal,
    modelName: string,
    query: string,
  ): Promise<string> {
    if (!this.isEnabled) return '';
    try {
      const tools = await this.listTools(principal);
      const contextTool = tools.find((t) => t.name === 'fetch_context' || t.name === 'context');
      if (!contextTool) return '';
      const result = (await this.callTool(principal, contextTool.name, { modelName, query })) as
        | { content?: Array<{ type: string; text?: string }> }
        | null;
      const text = result?.content?.find((c) => c.type === 'text')?.text;
      return text ?? '';
    } catch (err) {
      logger.warn(`[MCP Gateway] fetchContext failed (modelName=${modelName}) — ${(err as Error).message}`);
      return '';
    }
  }

  public async shutdown(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (err) {
        logger.warn(`[MCP Gateway] transport close failed — ${(err as Error).message}`);
      }
    }
    this.client = null;
    this.transport = null;
  }
}

export const mcpGateway = new MCPGateway();
