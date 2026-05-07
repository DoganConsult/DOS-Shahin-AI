// @ts-nocheck
import { logger } from '../../../ports/logger.port.js';
// ================================================================
// AGRC-OS — Agent Tools Registry
// Registers real, DB-backed tools for all 12 agents (A01-A12).
// This is the critical piece that transforms agents from
// chatbot-like (single JSON response) into true autonomous agents
// (multi-step tool loops: query -> reason -> act -> verify).
//
// Called once at server startup via initAgentToolsRegistry().
//
// Tool definitions have been split into focused files under
// ./agent-tools/ for maintainability. This module re-exports
// them and handles master registration.
// ================================================================
import { registerAgentTools, getToolsForAgent as getToolsForAgentSync } from './agent-tool-executor.service.js';
import { getAgentCatalogIds } from '../../../ports/platform.port.js';
import { buildA01Tools } from '@shahin-ai/product/ai/tools/a01-onboarding-tools';
import { buildA02Tools } from '@shahin-ai/product/ai/tools/a02-identity-access-tools';
import { buildA03Tools } from '@shahin-ai/product/ai/tools/a03-framework-tools';
import { buildA04Tools } from '@shahin-ai/product/ai/tools/a04-control-tools';
import { buildA05Tools } from '@shahin-ai/product/ai/tools/a05-evidence-tools';
import { buildA06Tools } from '@shahin-ai/product/ai/tools/a06-gap-remediation-tools';
import { buildA07Tools } from '@shahin-ai/product/ai/tools/a07-risk-tools';
import { buildA08Tools } from '@shahin-ai/product/ai/tools/a08-policy-tools';
import { buildA09Tools } from '@shahin-ai/product/ai/tools/a09-vendor-tools';
import { buildA10Tools } from '@shahin-ai/product/ai/tools/a10-audit-tools';
import { buildA11Tools } from '@shahin-ai/product/ai/tools/a11-bcp-tools';
import { buildA12Tools } from '@shahin-ai/product/ai/tools/a12-training-tools';
export { buildA01Tools, buildA02Tools, buildA03Tools, buildA04Tools, buildA05Tools, buildA06Tools, buildA07Tools, buildA08Tools, buildA09Tools, buildA10Tools, buildA11Tools, buildA12Tools, };
/** Builtin tool builders keyed by agent ID */
const BUILTIN_BUILDERS = {
    A01: buildA01Tools, A02: buildA02Tools, A03: buildA03Tools, A04: buildA04Tools,
    A05: buildA05Tools, A06: buildA06Tools, A07: buildA07Tools, A08: buildA08Tools,
    A09: buildA09Tools, A10: buildA10Tools, A11: buildA11Tools, A12: buildA12Tools,
};
/**
 * Master registration -- called once at server startup.
 * Product-driven: resolves tool builders from product-bound providers,
 * falls back to built-in builders for backward compatibility.
 */
export function initAgentToolsRegistry() {
    const catalogIds = getAgentCatalogIds();
    let registered = 0;
    for (const agentId of catalogIds) {
        const builder = BUILTIN_BUILDERS[agentId];
        const tools = builder ? builder() : [];
        // Dynamic injection of the Universal Squad Mesh Tool
        tools.push({
            name: 'delegate_to_agent',
            description: 'Delegate a specialized task to another AI agent in the squad. Use this when the user needs something outside your specific domain (like Risk Assessment, Evidence Collection, Training, Policy drafting, etc). Ensure you format expectedOutcome clearly.',
            input_schema: {
                type: "object",
                properties: {
                    targetAgentId: { type: "string", description: "The ID of the target agent (A01-A12). E.g. A07 for Risk, A08 for Governance, A02 for Identity." },
                    taskType: { type: "string", description: "Short keyword for the task (e.g. risk_scan, draft_policy)" },
                    taskDescription: { type: "string", description: "Full prompt instruction for the target agent" },
                    priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    expectedOutcome: { type: "string", description: "Details on what the target agent must produce" }
                },
                required: ["targetAgentId", "taskType", "taskDescription", "priority", "expectedOutcome"]
            },
            handler: async (tenantId, input, opts) => {
                const visitedAgents = opts?.visitedAgents || [];
                const targetAgentId = String(input.targetAgentId);
                // ── D1: Cross-agent permission gate ──
                // Validate that the target agent ID is a recognized platform agent
                const validAgents = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];
                if (!validAgents.includes(targetAgentId)) {
                    return { error: `Invalid target agent: ${targetAgentId}. Must be one of ${validAgents.join(', ')}.` };
                }
                // Self-delegation is never useful — block before circular check
                if (targetAgentId === agentId) {
                    return { error: `Agent ${agentId} cannot delegate to itself. Use your own tools directly.` };
                }
                // ── Circular Dependency Guardrail ──
                if (visitedAgents.includes(targetAgentId)) {
                    const { logBlockedDelegation } = await import('../../delegation/agent-to-agent-delegation.service.js');
                    await logBlockedDelegation(tenantId, agentId, targetAgentId, 'circular_dependency_prevented');
                    return {
                        error: `System Warning: Circular dependency detected. Target agent ${targetAgentId} is already active in the current call stack (${visitedAgents.join(' -> ')}). You cannot delegate to it. Synthesize your final response using your current context.`
                    };
                }
                // ── Depth Guardrail ──
                if (visitedAgents.length >= 5) {
                    const { logBlockedDelegation } = await import('../../delegation/agent-to-agent-delegation.service.js');
                    await logBlockedDelegation(tenantId, agentId, targetAgentId, 'max_depth_exceeded');
                    return {
                        error: `System Error: Maximum delegation depth (5) exceeded. Delegation chain: ${visitedAgents.join(' -> ')}. Aborting immediately.`
                    };
                }
                const { delegateToAgent } = await import('../../delegation/agent-to-agent-delegation.service.js');
                const result = await delegateToAgent(tenantId, agentId, targetAgentId, {
                    taskType: String(input.taskType),
                    taskDescription: String(input.taskDescription),
                    context: { visitedAgents, sessionId: opts?.sessionId }, // D2: Pass session context
                    priority: (input.priority || 'medium'),
                    expectedOutcome: String(input.expectedOutcome)
                }, { userId: opts?.userId, sessionId: opts?.sessionId });
                return { success: true, delegationId: result.delegationId, target_agent_output: result.executionResult };
            }
        });
        // Dynamic injection of the Model Context Protocol Tool (Proactive World Connection)
        tools.push({
            name: 'query_mcp_server',
            description: 'Query external live data sources via Model Context Protocol (MCP) servers. Use this when you need real-time, non-database world knowledge (e.g. NIST vulnerabilities, global SOC2 lists, geopolitical risks, regulatory news).',
            input_schema: {
                type: "object",
                properties: {
                    serverName: { type: "string", description: "Name of the MCP server (e.g., 'nist-cve', 'soc2-trust', 'fatf-watchlist')" },
                    queryType: { type: "string", description: "The specific functional query (e.g. 'check_cve', 'verify_certification')" },
                    searchParams: { type: "object", description: "JSON parameters required for the search." }
                },
                required: ["serverName", "queryType", "searchParams"]
            },
            handler: async (tenantId, input) => {
                const { serverName, queryType, searchParams } = input;
                const ts = new Date().toISOString();
                // D5: Route through real MCP tool registry when available
                try {
                    const mcpService = await import('../../../../../domain/mcp/services/mcp.service.js');
                    const tools = await mcpService.getTools(tenantId);
                    const matchedTool = tools.find((t) => t.name === serverName || t.name === queryType);
                    if (matchedTool) {
                        const logResult = await mcpService.logExecution(tenantId, null, {
                            agentId, toolId: matchedTool.toolId,
                            executionPayload: { serverName, queryType, searchParams },
                            executionResult: { status: 'routed', matchedTool: matchedTool.name },
                            status: 'success', executionTimeMs: 0,
                        });
                        return { mcpSource: matchedTool.name, timestamp: ts, status: 'routed_via_registry', toolId: matchedTool.toolId, logId: logResult.logId, params: searchParams };
                    }
                }
                catch { /* MCP registry not available — fall through to built-in handlers */ }
                // Built-in MCP handlers — call live APIs when keys are available
                if (serverName === 'nist-cve') {
                    // NIST NVD API is free and public — no key required
                    try {
                        const params = searchParams;
                        const keyword = String(params?.keyword || params?.cve_id || 'critical');
                        const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=5`;
                        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                        if (res.ok) {
                            const data = await res.json();
                            const vulns = (data.vulnerabilities || []).slice(0, 5).map((v) => ({
                                id: v.cve?.id, severity: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || 'UNKNOWN',
                                score: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 0,
                                description: v.cve?.descriptions?.[0]?.value?.slice(0, 200) || '',
                            }));
                            return { mcpSource: 'NIST NVD (LIVE)', timestamp: ts, status: 'live', totalResults: data.totalResults, findings: vulns };
                        }
                    }
                    catch { /* fall through to offline response */ }
                    return { mcpSource: 'NIST NVD', timestamp: ts, status: 'offline', note: 'NVD API unreachable. Retry later.', findings: [] };
                }
                if (serverName === 'soc2-trust') {
                    return { mcpSource: 'SOC2 Verification', timestamp: ts, status: 'requires_api_key', note: 'SOC2 trust verification requires a commercial API subscription. Configure MCP_SOC2_API_KEY.' };
                }
                return { mcpSource: serverName || 'Unknown-MCP', timestamp: ts, status: 'no_handler', rawData: searchParams };
            }
        });
        // Dynamic injection of the RAG Deep Document Reading tool
        tools.push({
            name: 'analyze_document_contents',
            description: 'Read and extract deep contextual knowledge directly from an uploaded Evidence or Policy document (PDF/Word/Text). Supply specific questions you want the AI RAG engine to answer based on the actual text in the file.',
            input_schema: {
                type: "object",
                properties: {
                    documentId: { type: "string", description: "The UUID of the evidence or policy document" },
                    query: { type: "string", description: "Direct question you want answered using the document's content (e.g. 'Does this state a 12 hour RTO?')" }
                },
                required: ["documentId", "query"]
            },
            handler: async (tenantId, input) => {
                const { analyzeDocumentWithRAG } = await import('../../rag/ai-rag-service.js');
                const result = await analyzeDocumentWithRAG(tenantId, String(input.documentId), String(input.query));
                return result;
            }
        });
        registerAgentTools(agentId, tools);
        registered++;
    }
    logger.info(`[AgentToolsRegistry] ${registered} agents registered with DB-backed tools AND Squad Mesh (product-driven)`);
}
export async function getToolsForAgent(_tenantId, agentId) {
    return getToolsForAgentSync(agentId);
}
//# sourceMappingURL=agent-tools-registry.service.js.map