/**
 * @dos/module-sdk module utilities
 * Module-level helpers for health checks, versioning, and status reporting
 */

import type { ModuleManifest, ModuleCategory, ModuleTier, ModuleVisibility } from '@dos/types';
import type { ModuleContract } from '@dos/contracts';

// ────────────────────────────────────────────────────────────────────────────
// Module Health
// ────────────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
  lastChecked: string;
  metadata?: Record<string, unknown>;
}

export interface ModuleHealthReport {
  moduleCode: string;
  version: string;
  status: HealthStatus;
  uptime: number;
  checks: HealthCheckResult[];
  timestamp: string;
}

export type HealthCheckFn = () => Promise<HealthCheckResult>;

export interface HealthChecker {
  name: string;
  check: HealthCheckFn;
  critical?: boolean;
  timeout?: number;
}

export async function runHealthCheck(checker: HealthChecker): Promise<HealthCheckResult> {
  const start = Date.now();
  const timeout = checker.timeout ?? 5000;

  try {
    const result = await Promise.race([
      checker.check(),
      new Promise<HealthCheckResult>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);

    return {
      ...result,
      name: checker.name,
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: checker.name,
      status: 'unhealthy',
      message: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function runHealthChecks(checkers: HealthChecker[]): Promise<HealthCheckResult[]> {
  return Promise.all(checkers.map(runHealthCheck));
}

export function aggregateHealthStatus(results: HealthCheckResult[], checkers: HealthChecker[]): HealthStatus {
  const criticalNames = new Set(checkers.filter(c => c.critical).map(c => c.name));

  const hasUnhealthy = results.some(
    r => r.status === 'unhealthy' && criticalNames.has(r.name)
  );
  if (hasUnhealthy) return 'unhealthy';

  const hasDegraded = results.some(
    r => r.status === 'degraded' || (r.status === 'unhealthy' && !criticalNames.has(r.name))
  );
  if (hasDegraded) return 'degraded';

  return 'healthy';
}

export function buildModuleHealthReport(
  manifest: ModuleManifest,
  startTime: number,
  checks: HealthCheckResult[]
): ModuleHealthReport {
  const checkers: HealthChecker[] = checks.map(c => ({ name: c.name, check: async () => c }));
  return {
    moduleCode: manifest.code,
    version: manifest.version,
    status: aggregateHealthStatus(checks, checkers),
    uptime: Date.now() - startTime,
    checks,
    timestamp: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Common Health Checkers
// ────────────────────────────────────────────────────────────────────────────

export function createDatabaseHealthChecker(
  name: string,
  queryFn: () => Promise<unknown>,
  critical = true
): HealthChecker {
  return {
    name,
    critical,
    timeout: 3000,
    check: async () => {
      try {
        await queryFn();
        return { name, status: 'healthy', lastChecked: new Date().toISOString() };
      } catch (err) {
        return {
          name,
          status: 'unhealthy',
          message: err instanceof Error ? err.message : 'Database check failed',
          lastChecked: new Date().toISOString(),
        };
      }
    },
  };
}

export function createRedisHealthChecker(
  name: string,
  pingFn: () => Promise<string>,
  critical = false
): HealthChecker {
  return {
    name,
    critical,
    timeout: 2000,
    check: async () => {
      try {
        const result = await pingFn();
        return {
          name,
          status: result === 'PONG' ? 'healthy' : 'degraded',
          lastChecked: new Date().toISOString(),
        };
      } catch (err) {
        return {
          name,
          status: 'unhealthy',
          message: err instanceof Error ? err.message : 'Redis check failed',
          lastChecked: new Date().toISOString(),
        };
      }
    },
  };
}

export function createExternalServiceHealthChecker(
  name: string,
  checkFn: () => Promise<boolean>,
  critical = false
): HealthChecker {
  return {
    name,
    critical,
    timeout: 10000,
    check: async () => {
      try {
        const healthy = await checkFn();
        return {
          name,
          status: healthy ? 'healthy' : 'degraded',
          lastChecked: new Date().toISOString(),
        };
      } catch (err) {
        return {
          name,
          status: 'unhealthy',
          message: err instanceof Error ? err.message : 'External service check failed',
          lastChecked: new Date().toISOString(),
        };
      }
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Module Versioning
// ────────────────────────────────────────────────────────────────────────────

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export function parseVersion(version: string): SemanticVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

export function formatVersion(version: SemanticVersion): string {
  const base = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${base}-${version.prerelease}` : base;
}

export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);

  if (!vA && !vB) return 0;
  if (!vA) return -1;
  if (!vB) return 1;

  if (vA.major !== vB.major) return vA.major - vB.major;
  if (vA.minor !== vB.minor) return vA.minor - vB.minor;
  if (vA.patch !== vB.patch) return vA.patch - vB.patch;

  // Prerelease versions are lower than release versions
  if (vA.prerelease && !vB.prerelease) return -1;
  if (!vA.prerelease && vB.prerelease) return 1;

  return 0;
}

export function isVersionCompatible(required: string, actual: string): boolean {
  const reqV = parseVersion(required);
  const actV = parseVersion(actual);

  if (!reqV || !actV) return false;

  // Major version must match
  if (reqV.major !== actV.major) return false;

  // Actual minor must be >= required minor
  if (actV.minor < reqV.minor) return false;

  // If same minor, actual patch must be >= required patch
  if (actV.minor === reqV.minor && actV.patch < reqV.patch) return false;

  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Module State
// ────────────────────────────────────────────────────────────────────────────

export type ModuleState = 'initializing' | 'ready' | 'degraded' | 'error' | 'shutdown';

export interface ModuleStatus {
  moduleCode: string;
  state: ModuleState;
  version: string;
  startedAt: string;
  uptime: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: string;
}

export class ModuleStateTracker {
  private state: ModuleState = 'initializing';
  private startTime: number = Date.now();
  private requestCount: number = 0;
  private errorCount: number = 0;
  private lastError?: string;
  private lastErrorAt?: string;

  constructor(
    private readonly moduleCode: string,
    private readonly version: string
  ) {}

  markReady(): void {
    this.state = 'ready';
  }

  markDegraded(): void {
    this.state = 'degraded';
  }

  markError(error: Error | string): void {
    this.state = 'error';
    this.lastError = error instanceof Error ? error.message : error;
    this.lastErrorAt = new Date().toISOString();
    this.errorCount++;
  }

  markShutdown(): void {
    this.state = 'shutdown';
  }

  recordRequest(): void {
    this.requestCount++;
  }

  recordError(error: Error | string): void {
    this.lastError = error instanceof Error ? error.message : error;
    this.lastErrorAt = new Date().toISOString();
    this.errorCount++;
  }

  getStatus(): ModuleStatus {
    return {
      moduleCode: this.moduleCode,
      state: this.state,
      version: this.version,
      startedAt: new Date(this.startTime).toISOString(),
      uptime: Date.now() - this.startTime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt,
    };
  }

  isHealthy(): boolean {
    return this.state === 'ready';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Module Metadata Helpers
// ────────────────────────────────────────────────────────────────────────────

export function isModuleActive(module: ModuleContract): boolean {
  return module.isActive === true;
}

export function getModuleRouteBase(moduleCode: string): string {
  return `/api/modules/${moduleCode.toLowerCase()}`;
}

export function getModuleEventNamespace(moduleCode: string): string {
  return `module.${moduleCode.toLowerCase()}`;
}

export function buildModuleContract(manifest: ModuleManifest): ModuleContract {
  return {
    moduleCode: manifest.code,
    name: manifest.nameEn,
    version: manifest.version,
    tier: manifest.tier,
    category: manifest.category,
    isActive: true,
    routeBase: manifest.routeBase || getModuleRouteBase(manifest.code),
    eventNamespace: manifest.eventNamespace || getModuleEventNamespace(manifest.code),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Module Capability Checks
// ────────────────────────────────────────────────────────────────────────────

export type ModuleCapability =
  | 'crud'
  | 'search'
  | 'audit'
  | 'export'
  | 'import'
  | 'workflow'
  | 'reporting'
  | 'notifications'
  | 'ai'
  | 'integration';

export function hasCapability(manifest: ModuleManifest, capability: ModuleCapability): boolean {
  const capabilities = manifest.aiCapabilities as unknown as ModuleCapability[] | undefined;
  return capabilities?.includes(capability) ?? false;
}

export function getEnabledCapabilities(manifest: ModuleManifest): ModuleCapability[] {
  return (manifest.aiCapabilities as unknown as ModuleCapability[] | undefined) || [];
}

// ────────────────────────────────────────────────────────────────────────────
// Module Tier Helpers
// ────────────────────────────────────────────────────────────────────────────

export const MODULE_TIER_ORDER: Record<ModuleTier, number> = {
  core: 0,
  platform: 1,
  standard: 2,
  premium: 3,
  enterprise: 4,
  custom: 5,
};

export function compareTiers(a: ModuleTier, b: ModuleTier): number {
  return MODULE_TIER_ORDER[a] - MODULE_TIER_ORDER[b];
}

export function isTierAccessible(requiredTier: ModuleTier, userTier: ModuleTier): boolean {
  return MODULE_TIER_ORDER[userTier] >= MODULE_TIER_ORDER[requiredTier];
}

// ────────────────────────────────────────────────────────────────────────────
// Module Dependency Resolution
// ────────────────────────────────────────────────────────────────────────────

export interface ModuleDependency {
  moduleCode: string;
  version: string;
  optional?: boolean;
}

export interface DependencyResolution {
  satisfied: boolean;
  missing: string[];
  incompatible: Array<{ moduleCode: string; required: string; actual: string }>;
}

export function resolveDependencies(
  manifest: ModuleManifest,
  availableModules: Map<string, string>
): DependencyResolution {
  const hardDeps = manifest.hardDeps || [];
  const softDeps = manifest.softDeps || [];
  const dependencies: ModuleDependency[] = [
    ...hardDeps.map(d => ({ moduleCode: d, version: '*', optional: false })),
    ...softDeps.map(d => ({ moduleCode: d, version: '*', optional: true })),
  ];
  const missing: string[] = [];
  const incompatible: Array<{ moduleCode: string; required: string; actual: string }> = [];

  for (const dep of dependencies) {
    if (dep.optional) continue;

    const actualVersion = availableModules.get(dep.moduleCode);
    if (!actualVersion) {
      missing.push(dep.moduleCode);
    } else if (!isVersionCompatible(dep.version, actualVersion)) {
      incompatible.push({
        moduleCode: dep.moduleCode,
        required: dep.version,
        actual: actualVersion,
      });
    }
  }

  return {
    satisfied: missing.length === 0 && incompatible.length === 0,
    missing,
    incompatible,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Re-export types
// ────────────────────────────────────────────────────────────────────────────

export type { ModuleManifest, ModuleCategory, ModuleTier, ModuleVisibility } from '@dos/types';
export type { ModuleContract } from '@dos/contracts';
