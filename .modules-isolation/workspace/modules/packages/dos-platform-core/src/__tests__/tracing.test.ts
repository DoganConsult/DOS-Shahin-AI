import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initTracing, startSpan, tracingMiddleware, ConsoleExporter, extractTraceContext, injectTraceHeaders } from '../observability/tracing';

describe('tracing', () => {
  beforeEach(() => {
    initTracing({ serviceName: 'test-svc', enabled: false });
  });

  describe('startSpan', () => {
    it('creates span with correct name', () => {
      const span = startSpan('test-operation');
      expect(span.name).toBe('test-operation');
      expect(span.context.traceId).toBeDefined();
      expect(span.context.spanId).toBeDefined();
    });

    it('inherits parent trace ID', () => {
      const parent = startSpan('parent');
      const child = startSpan('child', parent.context);
      expect(child.context.traceId).toBe(parent.context.traceId);
      expect(child.context.parentSpanId).toBe(parent.context.spanId);
    });

    it('sets attributes', () => {
      const span = startSpan('test');
      span.setAttribute('http.method', 'GET');
      span.setAttribute('http.status_code', 200);
      expect(span.attributes['http.method']).toBe('GET');
      expect(span.attributes['http.status_code']).toBe(200);
    });

    it('records events', () => {
      const span = startSpan('test');
      span.addEvent('error', { message: 'something failed' });
      expect(span.events).toHaveLength(1);
      expect(span.events[0].name).toBe('error');
    });

    it('end sets endTime and status', () => {
      const span = startSpan('test');
      span.end('ok');
      expect(span.endTime).toBeDefined();
      expect(span.status).toBe('ok');
    });
  });

  describe('extractTraceContext', () => {
    it('extracts from traceparent header', () => {
      const req = { headers: { traceparent: '00-abc123def456-span123-01' } } as any;
      const ctx = extractTraceContext(req);
      expect(ctx).toBeDefined();
      expect(ctx!.traceId).toBe('abc123def456');
      expect(ctx!.spanId).toBe('span123');
      expect(ctx!.sampled).toBe(true);
    });

    it('returns undefined without traceparent', () => {
      const req = { headers: {} } as any;
      expect(extractTraceContext(req)).toBeUndefined();
    });
  });

  describe('injectTraceHeaders', () => {
    it('produces valid traceparent', () => {
      const span = startSpan('test');
      const headers = injectTraceHeaders(span);
      expect(headers.traceparent).toMatch(/^00-/);
    });
  });

  describe('tracingMiddleware', () => {
    it('returns middleware function', () => {
      const mw = tracingMiddleware();
      expect(typeof mw).toBe('function');
    });
  });

  describe('ConsoleExporter', () => {
    it('exports spans without error', async () => {
      const exporter = new ConsoleExporter();
      const span = startSpan('test');
      span.end('ok');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await exporter.export([span]);
      consoleSpy.mockRestore();
    });
  });
});
