export * from './contracts';
export * from './ports';
export * from './constants';
export * from './auth-host-policy';
export * from './config/platform-identity';
export { UnifiedConfigService } from './settings/unified-config.service';
export * from './settings/platform-mode-gate.service';
export * from './security/openfga-client';
export { resolveNodeEnv, isProductionLikeEnv, assertJwtSigningSecret, getEphemeralDevJwtSecret, resolveJwtSigningSecret, } from './security/jwt-env-policy';
export { verifyCaptcha, captchaRequired } from './security/captcha-verifier';
export type { CaptchaProvider, CaptchaVerifyInput, CaptchaVerifyResult, } from './security/captcha-verifier';
export { generateSvgCaptcha, verifyCaptchaSvg } from './security/captcha-svg.service';
export type { SvgCaptchaChallenge, SvgCaptchaVerifyResult } from './security/captcha-svg.service';
export { cacheKey, globalCacheKey, isNamespacedCacheKey } from './security/cache-key';
export { checkPasswordStrength } from './security/password-strength';
export type { PasswordStrengthResult } from './security/password-strength';
export { checkRateLimit, rateLimitKey } from './security/rate-limit-check';
export type { RateLimitCheckInput, RateLimitCheckResult } from './security/rate-limit-check';
export { EC, catchHandler, swallow, swallowDefault, swallowEmpty, swallowNull } from './resilience';
export { CacheTTL, CacheNS, cacheGetOrSet, cacheGetOrSetWithMeta, invalidateComplianceCache } from './cache/cache.service';
export { isModuleActive } from './modules';
export { registerWebhook, listWebhooks, deleteWebhook, dispatchEvent } from './notifications/outbound-webhooks.service';
export * from './compat/legacy';
export declare const DOS_PLATFORM_CORE_VERSION = "1.0.0";
export declare function withTimeout<T>(promiseOrFn: Promise<T> | (() => Promise<T>), ms: number, label?: string): Promise<T>;
export declare const DOS_CONCERNS: readonly ["branding", "constants", "contracts", "events", "http", "jobs", "lifecycle", "modules", "notifications", "observability", "ports", "provisioning", "resilience", "search", "shell", "storage", "tenancy", "workflows"];
export type DosConcern = typeof DOS_CONCERNS[number];
export interface RouteDefinition {
    id: string;
    method: string;
    path: string;
    service: string;
    module?: string;
    guards?: string[];
    description?: string;
}
export interface MountableRoute {
    prefix: string;
    service: string;
    methods: string[];
    guards?: string[];
}
export declare const ROUTE_CATALOG: RouteDefinition[];
export declare function generateMountPlan(routes: RouteDefinition[]): MountableRoute[];
export declare function toMountableRoutes(routes: RouteDefinition[]): MountableRoute[];
export declare function validateMountPlan(plan: MountableRoute[]): {
    valid: boolean;
    conflicts: string[];
};
declare const AGENT_CATALOG_IDS: readonly ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12", "A13"];
export type AgentCatalogId = typeof AGENT_CATALOG_IDS[number];
export interface AgentCatalogEntry {
    id: AgentCatalogId;
    name: string;
    domain: string;
    moduleCode: string;
    status: 'active' | 'disabled';
}
export declare function getAgentCatalogIds(): string[];
export declare function getAgentCatalog(): Map<string, AgentCatalogEntry>;
export declare function registerAgentCatalogEntry(entry: AgentCatalogEntry): void;
export declare function getAgentRbacEntry(_agentId: string): {
    permissions: string[];
} | null;
export declare function checkQuota(_tenantId: string, _resource: string): {
    allowed: boolean;
    remaining: number;
};
export declare function getApplicableRegulations(_tenantId: string): string[];
export declare function enqueueHandoff(_handoff: unknown): void;
export declare function getHandoffBatch(_agentId: string, _limit?: number): unknown[];
export declare const DEFAULT_EMBEDDING_DIM = 1536;
export declare function triggerAgentsForWorkflowTransition(_req: unknown): Promise<unknown[]>;
export declare function findAgentsForWorkflow(_workflowId: string): string[];
export declare function buildDependencyGraph(_modules: unknown[]): {
    nodes: string[];
    edges: [string, string][];
};
export declare function detectPatterns(_data: unknown[]): unknown[];
export type { AiProcess, KernelStatus, KernelHealth, ProcessRow, ProcessDetail, MemoryPartition, MemoryRow, LogRow, SchedulerRow, SchedulerEntry, IpcRow, IpcMessage, AgentDetail, AgentExecution, AgentExecutionCreateInput, AgentHandoff, AgentStep, HealthStatus, KernelLogEvent, KernelProcessView, KernelSchedulerView, KernelIpcView, KernelMemoryView, KernelLogView, KernelProcessDetailView, KernelAgentDetailView, KernelHealthView, KernelSnapshotView, KernelOverviewView, WorkflowAgentResult, WorkflowTriggerRequest, EngineRun, EngineResult, McpServerInfo, McpToolDef, McpToolOverride, ToolListFilter, ToolListResult, CodeSearchEngineRecord, CodeSearchEngineCreateDTO, CodeSearchEngineUpdateDTO, CodeSearchHealthResponse, CodeSearchQueryInput, CodeSearchQueryResponse, CodeSearchSurfaceRecord, CodeSearchSurfaceCreateDTO, AiSystem, CreateAssetInput, CircuitState, CircuitBreaker, } from '@dos/types';
export declare function getKernelStatus(tenantId: string): Promise<import("./kernel/ai-os-kernel.service.js").KernelStatus>;
export declare function getKernelHealth(tenantId: string): Promise<import("./kernel/ai-os-kernel.service.js").KernelHealth>;
export declare function getProcessTable(tenantId: string): Promise<import("./kernel/ai-os-kernel.service.js").AiProcess[]>;
export declare function getProcessDetail(tenantId: string, pid: string): Promise<import("./kernel/ai-os-kernel.service.js").ProcessDetail>;
export declare function getAgentDetail(tenantId: string, agentId: string): Promise<import("./kernel/ai-os-kernel.service.js").AgentDetail>;
export declare function getSchedulerTable(tenantId: string): Promise<import("./kernel/ai-os-kernel.service.js").SchedulerEntry[]>;
export declare function getIpcMessages(tenantId: string, limit?: number): Promise<import("./kernel/ai-os-kernel.service.js").IpcMessage[]>;
export declare function getMemoryPartitions(tenantId: string): Promise<import("./kernel/ai-os-kernel.service.js").MemoryPartition[]>;
export declare function getKernelLog(tenantId: string, limit?: number): Promise<import("./kernel/ai-os-kernel.types").KernelLogEvent[]>;
export declare function killProcess(tenantId: string, runId: string): Promise<boolean>;
export declare function rebootAgent(tenantId: string, agentId: string): Promise<{
    reset: boolean;
    circuitCleared: boolean;
}>;
export declare function pauseAgent(tenantId: string, agentId: string): Promise<boolean>;
export declare function resumeAgent(tenantId: string, agentId: string): Promise<boolean>;
export declare function adjustAutonomyLevel(tenantId: string, agentId: string, level: string): Promise<{
    success: boolean;
    previousLevel: string;
    newLevel: string;
}>;
export declare function setGlobalAutonomyLevel(tenantId: string, level: string): Promise<{
    success: boolean;
    agentsUpdated: number;
}>;
export declare function injectPriority(tenantId: string, agentId: string, directive: {
    focus: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    context?: string;
}): Promise<{
    success: boolean;
    message: string;
}>;
export declare function killRunningAction(tenantId: string, runId: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function getTokenUsage(tenantId: string, windowHours?: number): Promise<{
    totalTokens: number;
    byAgent: Record<string, number>;
    avgPerRun: number;
}>;
export declare function getPriorityDirective(tenantId: string, agentId: string): Promise<{
    focus: string;
    urgency: string;
    context?: string;
}>;
export declare function clearPriorityDirective(tenantId: string, agentId: string): Promise<void>;
export declare function saveKernelSnapshot(_tenantId?: string): Promise<string>;
export declare function listKernelSnapshots(_tenantId?: string): Promise<unknown[]>;
export type DelegationScope = 'full' | 'read' | 'write' | 'execute';
export type DelegationAction = 'grant' | 'revoke' | 'delegate' | 'escalate';
export declare function estimateRemediationTime(_input: unknown): number;
import type { HealthStatus as _HealthStatus } from '@dos/types';
export type KernelHealthStatus = _HealthStatus;
