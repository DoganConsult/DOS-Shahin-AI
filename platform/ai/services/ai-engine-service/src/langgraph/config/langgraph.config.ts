import { logger } from '@dos/platform-core/observability';
// ============================================
// LangGraph / Langfuse Configuration
// Observability + tracing for AI agent graphs
// ============================================

/**
 * Langfuse environment variables (set in .env / ecosystem.config.js):
 *   LANGFUSE_PUBLIC_KEY=<public_key>
 *   LANGFUSE_SECRET_KEY=<secret_key>
 *   LANGFUSE_HOST=http://localhost:3000 (default)
 *   LANGFUSE_ENABLED=true (default)
 *
 * When enabled, all LangGraph agent runs are traced in Langfuse
 * with correlation to Temporal workflowId.
 */

// LANGGRAPH_AGENTS_ENABLED gates the primary execution path.
// When true, runAgent() routes through the LangGraph StateGraph.
// When false, runAgent() uses the legacy tool executor.

export const LANGGRAPH_CONFIG = {
  /** Feature flag: when false, falls back to existing agent-runner loop */
  enabled: process.env.LANGGRAPH_AGENTS_ENABLED === 'true',

  /** Max tool-calling iterations per agent graph run */
  maxSteps: parseInt(process.env.LANGGRAPH_MAX_TOOL_ITERATIONS || '5', 10),
  maxToolIterations: parseInt(process.env.LANGGRAPH_MAX_TOOL_ITERATIONS || '5', 10),

  /** Default model for agent execution */
  defaultModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',

  /** Project name for trace grouping */
  langsmithProject: process.env.LANGCHAIN_PROJECT || process.env.LANGFUSE_PROJECT || 'agrc-os',

  /** Whether Langfuse tracing is active */
  tracingEnabled:
    process.env.LANGFUSE_ENABLED !== 'false' &&
    !!process.env.LANGFUSE_PUBLIC_KEY &&
    !!process.env.LANGFUSE_SECRET_KEY,

  /** Per-node timeout in milliseconds */
  timeoutMs: parseInt(process.env.LANGGRAPH_NODE_TIMEOUT_MS || '120000', 10),
  nodeTimeoutMs: parseInt(process.env.LANGGRAPH_NODE_TIMEOUT_MS || '120000', 10),

  /** Whether to record detailed metrics (token usage, errors, performance) */
  metricsEnabled: process.env.LANGGRAPH_METRICS_ENABLED !== 'false',

  /** Retention period for metrics in days */
  metricsRetentionDays: parseInt(process.env.LANGGRAPH_METRICS_RETENTION_DAYS || '90', 10),
} as const;

/**
 * Creates Langfuse tracing callbacks for LangGraph graph invocations.
 * Returns an empty array when tracing is disabled, making it safe to
 * always pass the result to graph.invoke().
 */
export function createTracingCallbacks(_metadata?: Record<string, unknown>): unknown[] {
  if (!LANGGRAPH_CONFIG.tracingEnabled) return [];

  try {
    const { getLangfuseClient } = require('../observability/langfuse-client.service');
    const client = getLangfuseClient();
    if (!client) return [];
    // Langfuse auto-instruments when the client is initialized
    return [];
  } catch {
    return [];
  }
}

/** @deprecated Use createTracingCallbacks instead */
export function getLangGraphCallbacks(): unknown[] {
  return createTracingCallbacks();
}

/**
 * Creates metrics callback for LangGraph agent execution observability.
 * Returns null if metrics are disabled.
 */
export function createMetricsCallback(
  runId: string,
  agentId: string,
  tenantId: string,
  graphType: 'single-agent' | 'orchestrator' | 'template',
  options?: {
    templateType?: string;
    langsmithTraceId?: string;
    temporalWorkflowId?: string;
  },
): unknown | null {
  if (!LANGGRAPH_CONFIG.metricsEnabled) return null;

  try {
    const { LangGraphMetricsCallback } = require('../observability/metrics-callback');
    return new LangGraphMetricsCallback(runId, agentId, tenantId, graphType, options);
  } catch (err) {
    logger.warn(`[LangGraph] Failed to create metrics callback: ${err}`);
    return null;
  }
}
