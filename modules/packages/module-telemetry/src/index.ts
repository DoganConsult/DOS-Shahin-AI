/**
 * @dos/module-telemetry — module-facing telemetry surface.
 *
 * Modules call recordMetric() / emitLog() / emitSpan() / registerRoute()
 * / getHealth() through this shim. The product shell binds the actual
 * DNOCPort implementation at bootstrap.
 *
 * A module NEVER imports from @dos/dnoc-*. Enforced by
 * `modules-cannot-import-dnoc-direct` in .dependency-cruiser.cjs.
 */

import type {
  DNOCPort,
  DNOCMetric,
  DNOCLogEntry,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
} from '@dos/ports/dnoc';

let bound: DNOCPort | null = null;

export function bindModuleTelemetry(port: DNOCPort): void {
  bound = port;
}

export function resetModuleTelemetry(): void {
  bound = null;
}

function requirePort(): DNOCPort {
  if (!bound) {
    throw new Error(
      '[@dos/module-telemetry] not bound. Product shell must call bindModuleTelemetry(port) during bootstrap before any module emits telemetry.',
    );
  }
  return bound;
}

export function recordMetric(metric: DNOCMetric): void {
  requirePort().recordMetric(metric);
}

export function emitLog(entry: DNOCLogEntry): void {
  requirePort().emitLog(entry);
}

export function emitSpan(span: DNOCTraceSpan): void {
  requirePort().emitSpan(span);
}

export function registerRoute(route: DNOCRouteDescriptor): void {
  requirePort().registerRoute(route);
}

export async function getHealth(serviceCode: string): Promise<DNOCHealthStatus> {
  return requirePort().getHealth(serviceCode);
}

export type {
  DNOCMetric,
  DNOCMetricKind,
  DNOCLogEntry,
  DNOCLogLevel,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
  DNOCPort,
} from '@dos/ports/dnoc';
