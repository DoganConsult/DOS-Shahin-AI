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
export declare function initTracing(config: {
    serviceName: string;
    exporter?: TracingExporter;
    samplingRate?: number;
    errorSamplingRate?: number;
    successSamplingRate?: number;
    enabled?: boolean;
}): void;
export declare function startSpan(name: string, parentContext?: SpanContext): Span;
export declare function extractTraceContext(req: Request): SpanContext | undefined;
export declare function injectTraceHeaders(span: Span): Record<string, string>;
export declare function tracingMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function getActiveSpan(req: Request): Span | undefined;
export declare class ConsoleExporter implements TracingExporter {
    export(spans: Span[]): Promise<void>;
}
export declare class OTLPExporter implements TracingExporter {
    private endpoint;
    constructor(endpoint?: string);
    export(spans: Span[]): Promise<void>;
}
