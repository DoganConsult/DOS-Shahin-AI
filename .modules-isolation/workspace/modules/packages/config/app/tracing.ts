import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface Span {
  context: SpanContext;
  name: string;
  service: string;
  startTime: bigint;
  endTime?: bigint;
  status: 'ok' | 'error' | 'unset';
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  end(status?: 'ok' | 'error'): void;
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
}

export interface SpanEvent {
  name: string;
  timestamp: bigint;
  attributes?: Record<string, string | number | boolean>;
}

export interface TracingExporter {
  export(spans: Span[]): Promise<void>;
}

let _serviceName = 'unknown';
let _exporter: TracingExporter | null = null;
let _samplingRate = 1.0;
let _errorSamplingRate = 1.0;
let _successSamplingRate = 0.1;
let _enabled = false;
const _pendingSpans: Span[] = [];
const FLUSH_INTERVAL_MS = 5000;
const MAX_PENDING = 1000;

export function initTracing(config: {
  serviceName: string;
  exporter?: TracingExporter;
  samplingRate?: number;
  errorSamplingRate?: number;
  successSamplingRate?: number;
  enabled?: boolean;
}): void {
  _serviceName = config.serviceName;
  _exporter = config.exporter || null;
  _samplingRate = config.samplingRate ?? 1.0;
  _errorSamplingRate = config.errorSamplingRate ?? parseFloat(process.env.OTEL_ERROR_SAMPLING_RATE || '1.0');
  _successSamplingRate = config.successSamplingRate ?? parseFloat(process.env.OTEL_SUCCESS_SAMPLING_RATE || '0.1');
  _enabled = config.enabled ?? (process.env.OTEL_TRACING_ENABLED === 'true');

  if (_enabled) {
    setInterval(flushSpans, FLUSH_INTERVAL_MS).unref();
  }
}

function shouldSample(): boolean {
  return Math.random() < _samplingRate;
}

function generateId(bytes: number): string {
  const buf = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf.toString('hex');
}

export function startSpan(name: string, parentContext?: SpanContext): Span {
  const sampled = parentContext ? parentContext.sampled : shouldSample();
  const context: SpanContext = {
    traceId: parentContext?.traceId || generateId(16),
    spanId: generateId(8),
    parentSpanId: parentContext?.spanId,
    sampled,
  };

  const span: Span = {
    context,
    name,
    service: _serviceName,
    startTime: process.hrtime.bigint(),
    status: 'unset',
    attributes: {},
    events: [],
    end(status?: 'ok' | 'error') {
      span.endTime = process.hrtime.bigint();
      span.status = status || 'ok';
      if (_enabled && sampled) {
        _pendingSpans.push(span);
        if (_pendingSpans.length >= MAX_PENDING) {
          flushSpans();
        }
      }
    },
    setAttribute(key: string, value: string | number | boolean) {
      span.attributes[key] = value;
    },
    addEvent(eventName: string, attributes?: Record<string, string | number | boolean>) {
      span.events.push({ name: eventName, timestamp: process.hrtime.bigint(), attributes });
    },
  };

  return span;
}

export function extractTraceContext(req: Request): SpanContext | undefined {
  const traceparent = req.headers['traceparent'] as string | undefined;
  if (!traceparent) return undefined;

  const parts = traceparent.split('-');
  if (parts.length < 4) return undefined;

  return {
    traceId: parts[1],
    spanId: parts[2],
    sampled: parts[3] === '01',
  };
}

export function injectTraceHeaders(span: Span): Record<string, string> {
  const flags = span.context.sampled ? '01' : '00';
  return {
    traceparent: `00-${span.context.traceId}-${span.context.spanId}-${flags}`,
  };
}

export function tracingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!_enabled) return next();

    const parentCtx = extractTraceContext(req);
    // Always create spans; error-aware sampling decides on finish
    const span = startSpan(`${req.method} ${req.path}`, parentCtx);
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.originalUrl || req.url);
    span.setAttribute('http.target', req.path);

    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) span.setAttribute('tenant.id', tenantId);

    (req as any).__span = span;

    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      // Error-aware sampling: 100% errors (default), 10% success (configurable)
      const isError = res.statusCode >= 400;
      span.context.sampled = isError
        ? Math.random() < _errorSamplingRate
        : Math.random() < _successSamplingRate;
      span.end(isError ? 'error' : 'ok');
    });

    next();
  };
}

export function getActiveSpan(req: Request): Span | undefined {
  return (req as any).__span;
}

async function flushSpans(): Promise<void> {
  if (_pendingSpans.length === 0 || !_exporter) return;
  const batch = _pendingSpans.splice(0, _pendingSpans.length);
  try {
    await _exporter.export(batch);
  } catch {
    // silently drop — observability must not crash the service
  }
}

export class ConsoleExporter implements TracingExporter {
  async export(spans: Span[]): Promise<void> {
    for (const span of spans) {
      const durationMs = span.endTime
        ? Number(span.endTime - span.startTime) / 1e6
        : 0;
      console.log(JSON.stringify({
        trace_id: span.context.traceId,
        span_id: span.context.spanId,
        parent_span_id: span.context.parentSpanId,
        name: span.name,
        service: span.service,
        status: span.status,
        duration_ms: Math.round(durationMs * 100) / 100,
        attributes: span.attributes,
        events: span.events.length,
      }));
    }
  }
}

export class OTLPExporter implements TracingExporter {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
  }

  async export(spans: Span[]): Promise<void> {
    const resourceSpans = [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: _serviceName } },
        ],
      },
      scopeSpans: [{
        scope: { name: '@dos/platform-core/tracing', version: '1.0.0' },
        spans: spans.map(s => ({
          traceId: s.context.traceId,
          spanId: s.context.spanId,
          parentSpanId: s.context.parentSpanId || '',
          name: s.name,
          kind: 2,
          startTimeUnixNano: String(s.startTime),
          endTimeUnixNano: String(s.endTime || s.startTime),
          attributes: Object.entries(s.attributes).map(([k, v]) => ({
            key: k,
            value: typeof v === 'number' ? { intValue: v } : { stringValue: String(v) },
          })),
          status: { code: s.status === 'error' ? 2 : s.status === 'ok' ? 1 : 0 },
          events: s.events.map(e => ({
            name: e.name,
            timeUnixNano: String(e.timestamp),
            attributes: Object.entries(e.attributes || {}).map(([k, v]) => ({
              key: k,
              value: typeof v === 'number' ? { intValue: v } : { stringValue: String(v) },
            })),
          })),
        })),
      }],
    }];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceSpans }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // silently drop
    }
  }
}
