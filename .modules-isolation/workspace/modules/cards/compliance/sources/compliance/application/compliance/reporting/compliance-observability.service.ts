import { logger } from '../../../ports/logger.port';
/**
 * Compliance Workspace Observability — metrics and structured logging (no PII).
 * Used by compliance-workspace routes for access logging and cache metrics.
 */

import { recordCacheHit, recordCacheMiss, recordDbQuery } from '../../../ports/platform.port';
import { safeQuery } from "@dos/db";

const LOG_NS = "compliance-ws";

export type ComplianceRouteLabel =
  | "overview"
  | "frameworks"
  | "framework-detail"
  | "controls"
  | "findings"
  | "gaps"
  | "domains"
  | "obligations"
  | "roadmap"
  | "audit-readiness"
  | "coverage"
  | "other";

/**
 * Normalize request path to a stable route label for metrics and logs.
 */
export function complianceRouteLabel(path: string, _query?: Record<string, string | undefined>): ComplianceRouteLabel {
  if (path.includes("/overview")) return "overview";
  if (path.includes("/frameworks") && !path.match(/\/frameworks\/[^/]+/)) return "frameworks";
  if (path.match(/\/frameworks\/[^/]+$/)) return "framework-detail";
  if (path.includes("/controls")) return "controls";
  if (path.includes("/findings")) return "findings";
  if (path.includes("/gaps")) return "gaps";
  if (path.includes("/domains")) return "domains";
  if (path.includes("/obligations")) return "obligations";
  if (path.includes("/roadmap")) return "roadmap";
  if (path.includes("/audit-readiness")) return "audit-readiness";
  if (path.includes("/coverage")) return "coverage";
  return "other";
}

/**
 * Record a compliance workspace request for metrics and structured log.
 * Do not pass PII; tenantId is only for log correlation (e.g. hash or "tenant").
 */
export function logComplianceAccess(
  tenantId: string,
  path: string,
  durationMs: number,
  cacheHit: boolean,
  statusCode?: number
): void {
  const route = complianceRouteLabel(path, undefined);
  const payload = {
    ns: LOG_NS,
    route,
    durationMs: Math.round(durationMs),
    cacheHit,
    statusCode: statusCode ?? 200,
    at: new Date().toISOString(),
  };
  try {
    if (process.env.NODE_ENV !== "test") {
      logger.info(JSON.stringify(payload));
    }
  } catch {
    // ignore
  }
  if (cacheHit) {
    recordCacheHit("compliance");
  } else {
    recordCacheMiss("compliance");
  }
  recordDbQuery(`compliance_${route}`, durationMs);
}
