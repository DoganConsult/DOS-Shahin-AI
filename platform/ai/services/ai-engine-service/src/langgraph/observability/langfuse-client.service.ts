// ============================================
// Langfuse Client Service
// Open-source LLM observability for LangGraph agents
// Replaces LangSmith cloud with self-hosted Langfuse
// ============================================

import { Langfuse } from 'langfuse';
import { LANGGRAPH_CONFIG } from '../config/langgraph.config';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { logger } from '@dos/platform-core/observability';

// ── Langfuse Handle Types ───────────────────────────────────────

/** Lightweight handle returned by Langfuse `client.trace()` */
interface LangfuseTraceHandle {
  id: string;
  span(opts: { name: string; metadata?: Record<string, unknown> }): LangfuseSpanHandle;
  score(opts: { name: string; value: number; comment?: string }): void;
}

/** Lightweight handle returned by `trace.span()` */
interface LangfuseSpanHandle {
  generation(opts: {
    name: string; model: string; input: string; output: string;
    usage?: { input: number; output: number; total: number };
    metadata?: Record<string, unknown>;
  }): void;
}

// ── Langfuse Client Singleton ────────────────────────────────────

let _langfuseClient: Langfuse | null = null;

/**
 * Get or create Langfuse client instance
 */
function getLangfuseClient(): Langfuse | null {
  if (_langfuseClient) {
    return _langfuseClient;
  }

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  const host = process.env.LANGFUSE_HOST || (isProduction ? '' : 'http://localhost:3000');

  if (!publicKey || !secretKey) {
    logger.warn('[Langfuse] LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY not set — Langfuse tracing disabled');
    return null;
  }

  try {
    _langfuseClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
      enabled: process.env.LANGFUSE_ENABLED !== 'false',
    });
    return _langfuseClient;
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to initialize client: ${toErrorMessage(err)}`);
    return null;
  }
}

// ── Trace Management ─────────────────────────────────────────────

export interface LangfuseTraceMetadata {
  tenantId?: string;
  agentId?: string;
  runId?: string;
  graphType?: 'single-agent' | 'orchestrator' | 'template';
  templateType?: string;
  temporalWorkflowId?: string;
  langsmithTraceId?: string; // For migration correlation
  otelTraceId?: string; // OpenTelemetry trace ID for correlation
  otelSpanId?: string; // OpenTelemetry span ID for correlation
  correlationId?: string; // Request correlation ID (X-Correlation-ID)
  [key: string]: unknown;
}

/**
 * Create a Langfuse trace for agent execution
 * Automatically includes OpenTelemetry context if available
 */
export function createLangfuseTrace(
  name: string,
  metadata?: LangfuseTraceMetadata,
): { trace: LangfuseTraceHandle; traceId: string } | null {
  const client = getLangfuseClient();
  if (!client) {
    return null;
  }

  try {
    // Import tracing correlation service to get OTEL context
    const { getOpenTelemetryContext } = require('./tracing-correlation.service');
    const otelContext = getOpenTelemetryContext();

    const trace = client.trace({
      name,
      metadata: {
        ...metadata,
        project: LANGGRAPH_CONFIG.langsmithProject, // Keep project name for consistency
        // Include OpenTelemetry context for correlation
        ...(otelContext?.traceId && { otelTraceId: otelContext.traceId }),
        ...(otelContext?.spanId && { otelSpanId: otelContext.spanId }),
      },
    });

    return {
      trace,
      traceId: trace.id,
    };
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to create trace: ${toErrorMessage(err)}`);
    return null;
  }
}

/**
 * Create a Langfuse span within a trace
 */
export function createLangfuseSpan(
  trace: LangfuseTraceHandle | null,
  name: string,
  metadata?: Record<string, unknown>,
): LangfuseSpanHandle | null {
  if (!trace) {
    return null;
  }

  try {
    return trace.span({
      name,
      metadata,
    });
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to create span: ${toErrorMessage(err)}`);
    return null;
  }
}

/**
 * Log LLM generation to Langfuse
 */
export function logLangfuseGeneration(
  trace: LangfuseTraceHandle | null,
  span: LangfuseSpanHandle | null,
  model: string,
  input: string | unknown[],
  output: string,
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  },
  metadata?: Record<string, unknown>,
): void {
  if (!trace || !span) {
    return;
  }

  try {
    span.generation({
      name: model,
      model,
      input: typeof input === 'string' ? input : JSON.stringify(input),
      output,
      usage: usage
        ? {
            input: usage.promptTokens || 0,
            output: usage.completionTokens || 0,
            total: usage.totalTokens || (usage.promptTokens || 0) + (usage.completionTokens || 0),
          }
        : undefined,
      metadata,
    });
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to log generation: ${toErrorMessage(err)}`);
  }
}

/**
 * Log score/evaluation to Langfuse
 */
export function logLangfuseScore(
  trace: LangfuseTraceHandle | null,
  name: string,
  value: number,
  comment?: string,
): void {
  if (!trace) {
    return;
  }

  try {
    trace.score({
      name,
      value,
      comment,
    });
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to log score: ${toErrorMessage(err)}`);
  }
}

/**
 * Create Langfuse callback handler for LangGraph
 * Returns a callback that integrates with LangChain/LangGraph tracing
 */
export function createLangfuseCallback(
  _traceId?: string,
  _metadata?: LangfuseTraceMetadata,
): unknown[] {
  const client = getLangfuseClient();
  if (!client) {
    return [];
  }

  try {
    // Langfuse auto-instruments LangChain when initialized
    // We return an empty array here and rely on Langfuse's auto-instrumentation
    // For explicit control, we can use Langfuse's LangChainTracer if needed
    return [];
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to create callback: ${toErrorMessage(err)}`);
    return [];
  }
}

/**
 * Flush Langfuse events (call before process exit)
 */
export async function flushLangfuse(): Promise<void> {
  const client = getLangfuseClient();
  if (!client) {
    return;
  }

  try {
    await client.flushAsync();
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to flush: ${toErrorMessage(err)}`);
  }
}

// ── Dual-Write Support (Langfuse + PostgreSQL) ──────────────────

/**
 * Record metrics to both Langfuse and PostgreSQL
 * This enables gradual migration and redundancy
 */
export async function recordMetricsDualWrite(
  metrics: {
    agentId: string;
    tenantId: string;
    runId: string;
    graphType: 'single-agent' | 'orchestrator' | 'template';
    templateType?: string;
    startTime: Date;
    endTime?: Date;
    durationMs: number;
    status: 'success' | 'error' | 'timeout' | 'cancelled';
    error?: string;
    toolCalls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    langfuseTraceId?: string;
    temporalWorkflowId?: string;
  },
): Promise<void> {
  // Write to PostgreSQL (existing metrics service)
  try {
    const { recordAgentMetrics } = await import('./langsmith-metrics.service');
    await recordAgentMetrics({
      ...metrics,
      discoveries: 0, // Add if available
      proposedActions: 0,
      executedActions: 0,
      cacheHits: 0,
      langsmithTraceId: metrics.langfuseTraceId, // Map langfuse trace to langsmith field for compatibility
    });
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Failed to write to PostgreSQL: ${toErrorMessage(err)}`);
  }

  // Write to Langfuse (if trace exists)
  if (metrics.langfuseTraceId) {
    const client = getLangfuseClient();
    if (client) {
      try {
        // Log final metrics as a score/event on the trace
        const trace = client.trace({ id: metrics.langfuseTraceId }) as unknown as LangfuseTraceHandle;
        trace.score({
          name: 'agent_execution_metrics',
          value: metrics.status === 'success' ? 1 : 0,
          comment: JSON.stringify({
            toolCalls: metrics.toolCalls,
            tokens: metrics.totalTokens,
            cost: metrics.costUsd,
            duration: metrics.durationMs,
          }),
        });
      } catch (err: unknown) {
        logger.warn(`[Langfuse] Failed to write metrics to Langfuse: ${toErrorMessage(err)}`);
      }
    }
  }
}
