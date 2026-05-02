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
import type { DNOCPort, DNOCMetric, DNOCLogEntry, DNOCTraceSpan, DNOCRouteDescriptor, DNOCHealthStatus } from '@dos/ports/dnoc';
export declare function bindModuleTelemetry(port: DNOCPort): void;
export declare function resetModuleTelemetry(): void;
export declare function recordMetric(metric: DNOCMetric): void;
export declare function emitLog(entry: DNOCLogEntry): void;
export declare function emitSpan(span: DNOCTraceSpan): void;
export declare function registerRoute(route: DNOCRouteDescriptor): void;
export declare function getHealth(serviceCode: string): Promise<DNOCHealthStatus>;
export type { DNOCMetric, DNOCMetricKind, DNOCLogEntry, DNOCLogLevel, DNOCTraceSpan, DNOCRouteDescriptor, DNOCHealthStatus, DNOCPort, } from '@dos/ports/dnoc';
//# sourceMappingURL=index.d.ts.map