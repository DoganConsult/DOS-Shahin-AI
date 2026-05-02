"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeIsOpenClawAvailable = bridgeIsOpenClawAvailable;
exports.bridgeGetOpenClawServiceConfig = bridgeGetOpenClawServiceConfig;
exports.bridgeListOpenClawTools = bridgeListOpenClawTools;
exports.bridgeListOpenClawResources = bridgeListOpenClawResources;
exports.bridgeExecuteOpenClawTool = bridgeExecuteOpenClawTool;
function envStr(key) {
    const v = process.env[key];
    return v && String(v).trim() ? String(v).trim() : undefined;
}
function joinUrl(base, path) {
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
}
function authHeaders(ctx) {
    const h = { accept: 'application/json' };
    const auth = ctx?.authorization?.trim();
    if (auth) {
        h.authorization = auth.toLowerCase().startsWith('bearer ') ? auth : `Bearer ${auth}`;
    }
    if (ctx?.correlationId) {
        h['x-correlation-id'] = ctx.correlationId;
    }
    if (ctx?.tenantId) {
        h['x-tenant-id'] = ctx.tenantId;
    }
    return h;
}
async function fetchJson(url, init) {
    const timeoutMs = init?.timeoutMs ?? 20_000;
    const { timeoutMs: _t, ...rest } = init ?? {};
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...rest, signal: ctrl.signal });
        const text = await res.text();
        let body;
        try {
            body = text ? JSON.parse(text) : null;
        }
        catch {
            body = text;
        }
        if (!res.ok) {
            const msg = typeof body === 'object' && body && 'error' in body
                ? String(body.error)
                : `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return body;
    }
    finally {
        clearTimeout(t);
    }
}
function mapGatewayToolRow(row) {
    const name = (row.tool_name ?? row.toolName ?? row.name);
    return {
        name: name ?? 'unknown-tool',
        description: row.description ?? '',
        inputSchema: (row.input_schema ?? row.inputSchema),
        serverId: row.server_id ?? row.serverId,
        toolId: row.tool_id ?? row.toolId,
    };
}
function normalizeToolsPayload(body) {
    if (Array.isArray(body)) {
        return body.map((t) => (typeof t === 'object' && t ? t : { name: 'tool' }));
    }
    if (body && typeof body === 'object') {
        const o = body;
        const tools = o.tools ?? o.data;
        if (Array.isArray(tools)) {
            return tools.map((t) => typeof t === 'object' && t ? t : { name: 'tool' });
        }
    }
    return [];
}
function normalizeResourcesPayload(body) {
    if (Array.isArray(body)) {
        return body.map((r) => (typeof r === 'object' && r ? r : { uri: '', name: '' }));
    }
    if (body && typeof body === 'object') {
        const o = body;
        const res = o.resources ?? o.data;
        if (Array.isArray(res)) {
            return res.map((r) => typeof r === 'object' && r ? r : { uri: '', name: '' });
        }
    }
    return [];
}
async function bridgeIsOpenClawAvailable() {
    const off = envStr('OPENCLAW_DISABLE');
    if (off === '1' || off?.toLowerCase() === 'true') {
        return false;
    }
    return !!(envStr('OPENCLAW_HTTP_BASE_URL') || envStr('OPENCLAW_MCP_GATEWAY_URL') || envStr('MCP_GATEWAY_URL'));
}
async function bridgeGetOpenClawServiceConfig() {
    const httpBase = envStr('OPENCLAW_HTTP_BASE_URL');
    const gw = envStr('OPENCLAW_MCP_GATEWAY_URL') || envStr('MCP_GATEWAY_URL');
    const enabled = !!(httpBase || gw);
    return {
        enabled,
        available: enabled,
        transport: httpBase ? 'http' : gw ? 'mcp-gateway' : 'none',
        host: httpBase ?? gw ?? null,
        httpBaseUrl: httpBase ?? null,
        gatewayUrl: gw ?? null,
        toolsPath: envStr('OPENCLAW_HTTP_TOOLS_PATH') ?? '/tools',
        resourcesPath: envStr('OPENCLAW_HTTP_RESOURCES_PATH') ?? '/resources',
        port: null,
        langgraphEnabled: false,
        temporalEnabled: false,
        langfuseEnabled: false,
        exposeConnectors: true,
        connectorTimeoutMs: 15_000,
        rateLimitEnabled: false,
        rateLimitWindowMs: 60_000,
        rateLimitMaxRequests: 1000,
    };
}
async function bridgeListOpenClawTools(ctx) {
    const httpBase = envStr('OPENCLAW_HTTP_BASE_URL');
    if (httpBase) {
        const path = envStr('OPENCLAW_HTTP_TOOLS_PATH') ?? '/tools';
        const url = joinUrl(httpBase, path);
        const body = await fetchJson(url, { method: 'GET', headers: authHeaders(ctx), timeoutMs: 20_000 });
        const raw = normalizeToolsPayload(body);
        return raw.map((t) => ({
            name: String(t.name ?? t.tool_name ?? t.toolName ?? 'tool'),
            description: String(t.description ?? ''),
            inputSchema: (t.inputSchema ?? t.input_schema),
        }));
    }
    const gw = envStr('OPENCLAW_MCP_GATEWAY_URL') || envStr('MCP_GATEWAY_URL');
    if (gw && ctx?.tenantId && ctx?.authorization) {
        const url = joinUrl(gw, '/tools');
        const body = await fetchJson(url, { method: 'GET', headers: authHeaders(ctx), timeoutMs: 20_000 });
        const rows = normalizeToolsPayload(body);
        return rows.map((row) => {
            const m = mapGatewayToolRow(row);
            return {
                name: String(m.name),
                description: String(m.description ?? ''),
                inputSchema: m.inputSchema,
            };
        });
    }
    return [];
}
async function bridgeListOpenClawResources(uri, ctx) {
    const httpBase = envStr('OPENCLAW_HTTP_BASE_URL');
    if (!httpBase) {
        return [];
    }
    const path = envStr('OPENCLAW_HTTP_RESOURCES_PATH') ?? '/resources';
    const q = uri ? `?uri=${encodeURIComponent(uri)}` : '';
    const url = `${joinUrl(httpBase, path)}${q}`;
    const body = await fetchJson(url, { method: 'GET', headers: authHeaders(ctx), timeoutMs: 20_000 });
    const raw = normalizeResourcesPayload(body);
    return raw.map((r) => ({
        uri: String(r.uri ?? r.id ?? ''),
        name: String(r.name ?? r.title ?? r.uri ?? ''),
        type: String(r.type ?? r.mimeType ?? 'resource'),
        content: (r.content ?? r.payload),
    }));
}
async function bridgeExecuteOpenClawTool(tool, input, ctx) {
    const httpBase = envStr('OPENCLAW_HTTP_BASE_URL');
    if (!httpBase) {
        throw new Error('OpenClaw tool execution requires OPENCLAW_HTTP_BASE_URL pointing to an HTTP executor; MCP gateway lists tools only.');
    }
    const tpl = envStr('OPENCLAW_HTTP_EXECUTE_PATH_TEMPLATE') ?? '/tools/{tool}/execute';
    const path = tpl.replace('{tool}', encodeURIComponent(tool));
    const url = joinUrl(httpBase, path);
    const started = Date.now();
    const body = await fetchJson(url, {
        method: 'POST',
        headers: { ...authHeaders(ctx), 'content-type': 'application/json' },
        body: JSON.stringify(input ?? {}),
        timeoutMs: 120_000,
    });
    const elapsed = Date.now() - started;
    if (body && typeof body === 'object' && 'result' in body) {
        return { ...body, executionTime: elapsed };
    }
    return { result: body, executionTime: elapsed };
}
//# sourceMappingURL=openclaw-bridge.js.map