/**
 * @dos/module-sdk module utilities
 * Module-level helpers for health checks, versioning, and status reporting
 */
import type { ModuleManifest, ModuleTier } from '@dos/types';
import type { ModuleContract } from '@dos/contracts';
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
export declare function runHealthCheck(checker: HealthChecker): Promise<HealthCheckResult>;
export declare function runHealthChecks(checkers: HealthChecker[]): Promise<HealthCheckResult[]>;
export declare function aggregateHealthStatus(results: HealthCheckResult[], checkers: HealthChecker[]): HealthStatus;
export declare function buildModuleHealthReport(manifest: ModuleManifest, startTime: number, checks: HealthCheckResult[]): ModuleHealthReport;
export declare function createDatabaseHealthChecker(name: string, queryFn: () => Promise<unknown>, critical?: boolean): HealthChecker;
export declare function createRedisHealthChecker(name: string, pingFn: () => Promise<string>, critical?: boolean): HealthChecker;
export declare function createExternalServiceHealthChecker(name: string, checkFn: () => Promise<boolean>, critical?: boolean): HealthChecker;
export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
}
export declare function parseVersion(version: string): SemanticVersion | null;
export declare function formatVersion(version: SemanticVersion): string;
export declare function compareVersions(a: string, b: string): number;
export declare function isVersionCompatible(required: string, actual: string): boolean;
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
export declare class ModuleStateTracker {
    private readonly moduleCode;
    private readonly version;
    private state;
    private startTime;
    private requestCount;
    private errorCount;
    private lastError?;
    private lastErrorAt?;
    constructor(moduleCode: string, version: string);
    markReady(): void;
    markDegraded(): void;
    markError(error: Error | string): void;
    markShutdown(): void;
    recordRequest(): void;
    recordError(error: Error | string): void;
    getStatus(): ModuleStatus;
    isHealthy(): boolean;
}
export declare function isModuleActive(module: ModuleContract): boolean;
export declare function getModuleRouteBase(moduleCode: string): string;
export declare function getModuleEventNamespace(moduleCode: string): string;
export declare function buildModuleContract(manifest: ModuleManifest): ModuleContract;
export type ModuleCapability = 'crud' | 'search' | 'audit' | 'export' | 'import' | 'workflow' | 'reporting' | 'notifications' | 'ai' | 'integration';
export declare function hasCapability(manifest: ModuleManifest, capability: ModuleCapability): boolean;
export declare function getEnabledCapabilities(manifest: ModuleManifest): ModuleCapability[];
export declare const MODULE_TIER_ORDER: Record<ModuleTier, number>;
export declare function compareTiers(a: ModuleTier, b: ModuleTier): number;
export declare function isTierAccessible(requiredTier: ModuleTier, userTier: ModuleTier): boolean;
export interface ModuleDependency {
    moduleCode: string;
    version: string;
    optional?: boolean;
}
export interface DependencyResolution {
    satisfied: boolean;
    missing: string[];
    incompatible: Array<{
        moduleCode: string;
        required: string;
        actual: string;
    }>;
}
export declare function resolveDependencies(manifest: ModuleManifest, availableModules: Map<string, string>): DependencyResolution;
export type { ModuleManifest, ModuleCategory, ModuleTier, ModuleVisibility } from '@dos/types';
export type { ModuleContract } from '@dos/contracts';
