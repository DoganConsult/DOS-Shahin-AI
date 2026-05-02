import { logger } from '@dos/platform-core/observability';
// ============================================
// LangGraph Metrics Callback
// Captures agent execution metrics for observability
// ============================================

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { LANGGRAPH_CONFIG } from '../config/langgraph.config';
import { recordAgentMetrics, type AgentMetrics } from './langsmith-metrics.service';
import { addToDeadLetterQueue, type FailureCategory } from './dead-letter-queue.service';
import { getOpenTelemetryContext, createAgentSpan, recordOtelException, getCorrelationIdFromRequest, type TracingContext as _TracingContext } from './tracing-correlation.service';

/** Subset of OpenTelemetry Span + createAgentSpan return used in metrics */
interface OtelSpanHandle {
  traceId?: string;
  spanId?: string;
  endSpan?: () => void;
  recordException?: (err: Error) => void;
  setStatus?: (s: { code: number; message: string }) => void;
  end?: () => void;
}

interface MetricsState {
  runId: string;
  agentId: string;
  tenantId: string;
  graphType: 'single-agent' | 'orchestrator' | 'template';
  templateType?: string;
  startTime: Date;
  toolCalls: number;
  discoveries: number;
  proposedActions: number;
  executedActions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  cacheHits: number;
  error?: string;
  langsmithTraceId?: string;
  temporalWorkflowId?: string;
  retryCount?: number;
  maxRetries?: number;
  inputData?: Record<string, unknown>;
  stateSnapshot?: Record<string, unknown>;
  // Distributed tracing
  otelTraceId?: string;
  otelSpanId?: string;
  correlationId?: string;
  otelSpan?: OtelSpanHandle; // OpenTelemetry span for ending
}

/**
 * Callback handler that captures agent execution metrics
 * for LangSmith observability integration
 */
export class LangGraphMetricsCallback extends BaseCallbackHandler {
  name = 'LangGraphMetricsCallback';

  private state: MetricsState;

  constructor(
    runId: string,
    agentId: string,
    tenantId: string,
    graphType: 'single-agent' | 'orchestrator' | 'template',
    options?: {
      templateType?: string;
      langsmithTraceId?: string;
      temporalWorkflowId?: string;
      correlationId?: string;
      request?: { correlationId?: string; headers?: Record<string, string | string[] | undefined> }; // Express request for correlation ID extraction
    },
  ) {
    super();

    // Extract OpenTelemetry context and create span
    const otelContext = getOpenTelemetryContext();
    const otelSpan = createAgentSpan(agentId, runId, {
      tenant_id: tenantId,
      graph_type: graphType,
      template_type: options?.templateType || '',
    });

    // Extract correlation ID from request or options
    const correlationId = options?.correlationId ||
                         (options?.request ? getCorrelationIdFromRequest(options.request) : undefined);

    this.state = {
      runId,
      agentId,
      tenantId,
      graphType,
      templateType: options?.templateType,
      startTime: new Date(),
      toolCalls: 0,
      discoveries: 0,
      proposedActions: 0,
      executedActions: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      cacheHits: 0,
      langsmithTraceId: options?.langsmithTraceId,
      temporalWorkflowId: options?.temporalWorkflowId,
      otelTraceId: otelContext?.traceId || otelSpan?.traceId,
      otelSpanId: otelContext?.spanId || otelSpan?.spanId,
      correlationId,
      otelSpan: otelSpan as OtelSpanHandle | undefined,
    };
  }

  override async handleLLMStart(
    _llm: Serialized,
    _prompts: string[],
    _runId: string,
    _parentRunId?: string,
    _extraParams?: Record<string, unknown>,
  ): Promise<void> {
    // Track LLM invocation start
  }

  override async handleLLMEnd(output: LLMResult, _runId: string): Promise<void> {
    // Extract token usage from LLM result
    if (output.llmOutput?.tokenUsage) {
      const usage = output.llmOutput.tokenUsage;
      this.state.inputTokens += usage.promptTokens || 0;
      this.state.outputTokens += usage.completionTokens || 0;
      this.state.totalTokens += usage.totalTokens || usage.promptTokens || 0 + (usage.completionTokens || 0);
    }

    // Estimate cost (simplified - actual cost calculation should use model-specific rates)
    // This is a placeholder; actual cost should be calculated based on model/provider
    const estimatedCost = this.state.totalTokens * 0.000001; // Placeholder rate
    this.state.costUsd += estimatedCost;
  }

  override async handleLLMError(err: Error, _runId: string): Promise<void> {
    this.state.error = (err instanceof Error ? err.message : String(err));
    // Record exception in OpenTelemetry span
    if (this.state.otelSpan) {
      recordOtelException(err, this.state.otelSpan);
    }
  }

  override async handleToolStart(
    _tool: Serialized,
    _input: string,
    _runId: string,
    _parentRunId?: string,
  ): Promise<void> {
    this.state.toolCalls += 1;
  }

  override async handleToolEnd(_output: string, _runId: string): Promise<void> {
    // Tool execution completed
  }

  override async handleToolError(err: Error, _runId: string): Promise<void> {
    if (!this.state.error) {
      this.state.error = `Tool error: ${(err instanceof Error ? err.message : String(err))}`;
    }
    // Record exception in OpenTelemetry span
    if (this.state.otelSpan) {
      recordOtelException(err, this.state.otelSpan);
    }
  }

  /**
   * Record a discovery (e.g., finding a control, risk, evidence)
   */
  recordDiscovery(): void {
    this.state.discoveries += 1;
  }

  /**
   * Record a proposed action
   */
  recordProposedAction(): void {
    this.state.proposedActions += 1;
  }

  /**
   * Record an executed action
   */
  recordExecutedAction(): void {
    this.state.executedActions += 1;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.state.cacheHits += 1;
  }

  /**
   * Set retry information (called before finalize if retries were attempted)
   */
  setRetryInfo(retryCount: number, maxRetries: number): void {
    this.state.retryCount = retryCount;
    this.state.maxRetries = maxRetries;
  }

  /**
   * Set input data and state snapshot for DLQ (if needed)
   */
  setContext(inputData?: Record<string, unknown>, stateSnapshot?: Record<string, unknown>): void {
    this.state.inputData = inputData;
    this.state.stateSnapshot = stateSnapshot;
  }

  /**
   * Determine failure category from error message
   */
  private categorizeFailure(error?: string, status?: string): FailureCategory {
    if (!error && status !== 'error' && status !== 'timeout' && status !== 'cancelled') {
      return 'other';
    }

    const errLower = (error || '').toLowerCase();

    if (status === 'timeout' || errLower.includes('timeout')) {
      return 'timeout';
    }
    if (errLower.includes('circuit') || errLower.includes('circuit_breaker')) {
      return 'circuit_breaker';
    }
    if (errLower.includes('rate_limit') || errLower.includes('429') || errLower.includes('rate limit')) {
      return 'rate_limit';
    }
    if (errLower.includes('invalid') || errLower.includes('validation') || errLower.includes('bad request')) {
      return 'invalid_input';
    }
    if (errLower.includes('resource') || errLower.includes('quota') || errLower.includes('limit exceeded')) {
      return 'resource_exhausted';
    }

    return 'error';
  }

  /**
   * Finalize and persist metrics
   */
  async finalize(status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success'): Promise<void> {
    if (!LANGGRAPH_CONFIG.metricsEnabled) {
      return;
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - this.state.startTime.getTime();
    const finalStatus = this.state.error ? 'error' : status;

    // End OpenTelemetry span
    if (this.state.otelSpan?.endSpan) {
      this.state.otelSpan.endSpan();
    }

    const metrics: AgentMetrics = {
      agentId: this.state.agentId,
      tenantId: this.state.tenantId,
      runId: this.state.runId,
      graphType: this.state.graphType,
      templateType: this.state.templateType,
      startTime: this.state.startTime,
      endTime,
      durationMs,
      status: finalStatus,
      error: this.state.error,
      toolCalls: this.state.toolCalls,
      discoveries: this.state.discoveries,
      proposedActions: this.state.proposedActions,
      executedActions: this.state.executedActions,
      inputTokens: this.state.inputTokens,
      outputTokens: this.state.outputTokens,
      totalTokens: this.state.totalTokens,
      costUsd: this.state.costUsd,
      cacheHits: this.state.cacheHits,
      langsmithTraceId: this.state.langsmithTraceId,
      temporalWorkflowId: this.state.temporalWorkflowId,
      otelTraceId: this.state.otelTraceId,
      otelSpanId: this.state.otelSpanId,
      correlationId: this.state.correlationId,
    };

    await recordAgentMetrics(metrics);

    // Add to dead-letter queue if failed and retries exhausted
    if ((finalStatus === 'error' || finalStatus === 'timeout' || finalStatus === 'cancelled') &&
        this.state.retryCount !== undefined &&
        this.state.retryCount >= (this.state.maxRetries || 3)) {
      try {
        const failureCategory = this.categorizeFailure(this.state.error, finalStatus);
        await addToDeadLetterQueue({
          tenantId: this.state.tenantId,
          agentId: this.state.agentId,
          runId: this.state.runId,
          graphType: this.state.graphType,
          templateType: this.state.templateType,
          failureReason: this.state.error || `${finalStatus} after ${this.state.retryCount} retries`,
          failureCategory,
          errorMessage: this.state.error,
          errorStack: this.state.error ? new Error(this.state.error).stack : undefined,
          retryCount: this.state.retryCount,
          maxRetries: this.state.maxRetries || 3,
          inputData: this.state.inputData,
          stateSnapshot: this.state.stateSnapshot,
          langsmithTraceId: this.state.langsmithTraceId,
          temporalWorkflowId: this.state.temporalWorkflowId,
        });
      } catch (dlqErr: unknown) {
        // Non-fatal: log but don't throw
        logger.warn(`[Metrics Callback] Failed to add to DLQ: ${dlqErr}`);
      }
    }
  }
}
