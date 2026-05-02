import { logger } from '@dos/platform-core/observability';
// ============================================
// Tracing Correlation Service
// Correlates Langfuse, OpenTelemetry, and request correlation IDs
// for unified distributed tracing across observability systems
// ============================================
import { toErrorMessage } from '@dos/platform-core/resilience';
/**
 * Extract OpenTelemetry trace and span IDs from current context
 * Returns null if OpenTelemetry is not enabled or not available
 */
export function getOpenTelemetryContext() {
    if (process.env.OTEL_ENABLED !== 'true') {
        return null;
    }
    try {
        const { trace, context } = require('@opentelemetry/api');
        const _activeContext = context.active();
        const span = trace.getActiveSpan();
        if (!span) {
            return null;
        }
        const spanContext = span.spanContext();
        if (!spanContext || !spanContext.isValid) {
            return null;
        }
        return {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
        };
    }
    catch (_err) {
        // OpenTelemetry not available or not initialized
        return null;
    }
}
/**
 * Create a new OpenTelemetry span for agent execution
 * Returns span context with trace/span IDs
 */
export function createAgentSpan(agentId, runId, attributes) {
    if (process.env.OTEL_ENABLED !== 'true') {
        return { endSpan: () => { } };
    }
    try {
        const { trace, context: _context } = require('@opentelemetry/api');
        const tracer = trace.getTracer('agrc-os-agents', '1.0.0');
        const span = tracer.startSpan(`agent.${agentId}.execute`, {
            attributes: {
                'agent.id': agentId,
                'agent.run_id': runId,
                ...attributes,
            },
        });
        const spanContext = span.spanContext();
        if (!spanContext || !spanContext.isValid) {
            span.end();
            return null;
        }
        return {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            endSpan: () => {
                try {
                    span.setStatus({ code: 1 }); // OK
                    span.end();
                }
                catch (err) {
                    logger.warn(`[Tracing] Failed to end span: ${toErrorMessage(err)}`);
                }
            },
        };
    }
    catch (err) {
        logger.warn(`[Tracing] Failed to create agent span: ${toErrorMessage(err)}`);
        return null;
    }
}
/**
 * Record exception in OpenTelemetry span
 */
export function recordOtelException(err, span) {
    if (process.env.OTEL_ENABLED !== 'true' || !span) {
        return;
    }
    try {
        if (typeof span.recordException === 'function') {
            span.recordException(err);
        }
        if (typeof span.setStatus === 'function') {
            span.setStatus({ code: 2, message: (err instanceof Error ? err.message : String(err)) }); // ERROR
        }
    }
    catch (otelErr) {
        logger.warn(`[Tracing] Failed to record exception: ${toErrorMessage(otelErr)}`);
    }
}
/**
 * Build unified tracing context from all available sources
 */
export function buildTracingContext(langfuseTraceId, correlationId, otelContext) {
    return {
        langfuseTraceId,
        otelTraceId: otelContext?.traceId,
        otelSpanId: otelContext?.spanId,
        correlationId,
    };
}
/**
 * Get correlation ID from request context (Express middleware)
 */
export function getCorrelationIdFromRequest(req) {
    return req?.correlationId || req?.headers?.['x-correlation-id'];
}
/**
 * Format trace IDs for logging/display
 */
export function formatTraceIds(context) {
    const parts = [];
    if (context.langfuseTraceId) {
        parts.push(`Langfuse: ${context.langfuseTraceId.substring(0, 8)}...`);
    }
    if (context.otelTraceId) {
        parts.push(`OTEL: ${context.otelTraceId.substring(0, 16)}...`);
    }
    if (context.correlationId) {
        parts.push(`Corr: ${context.correlationId.substring(0, 8)}...`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'No tracing';
}
//# sourceMappingURL=tracing-correlation.service.js.map