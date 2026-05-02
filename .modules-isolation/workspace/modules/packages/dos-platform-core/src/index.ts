export * from './contracts';
export * from './ports';
export * from './constants';
export * from './auth-host-policy';
export * from './config/platform-identity';
export { UnifiedConfigService } from './settings/unified-config.service';
export * from './settings/platform-mode-gate.service';
export * from './security/openfga-client';
export {
  resolveNodeEnv,
  isProductionLikeEnv,
  assertJwtSigningSecret,
  getEphemeralDevJwtSecret,
  resolveJwtSigningSecret,
} from './security/jwt-env-policy';
export { verifyCaptcha, captchaRequired } from './security/captcha-verifier';
export type {
  CaptchaProvider,
  CaptchaVerifyInput,
  CaptchaVerifyResult,
} from './security/captcha-verifier';
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

export const DOS_PLATFORM_CORE_VERSION = '1.0.0';

export function withTimeout<T>(promiseOrFn: Promise<T> | (() => Promise<T>), ms: number, label?: string): Promise<T> {
  const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label || 'operation'} exceeded ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export const DOS_CONCERNS = [
  'branding',
  'constants',
  'contracts',
  'events',
  'http',
  'jobs',
  'lifecycle',
  'modules',
  'notifications',
  'observability',
  'ports',
  'provisioning',
  'resilience',
  'search',
  'shell',
  'storage',
  'tenancy',
  'workflows',
] as const;

export type DosConcern = typeof DOS_CONCERNS[number];

// ── Route Catalog types (used by dos-contracts/platform) ──────────────
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

export const ROUTE_CATALOG: RouteDefinition[] = [];

export function generateMountPlan(routes: RouteDefinition[]): MountableRoute[] {
  const map = new Map<string, MountableRoute>();
  for (const r of routes) {
    const prefix = r.path.split('/').slice(0, 3).join('/');
    const existing = map.get(prefix);
    if (existing) {
      if (!existing.methods.includes(r.method)) existing.methods.push(r.method);
    } else {
      map.set(prefix, { prefix, service: r.service, methods: [r.method], guards: r.guards });
    }
  }
  return [...map.values()];
}

export function toMountableRoutes(routes: RouteDefinition[]): MountableRoute[] {
  return generateMountPlan(routes);
}

export function validateMountPlan(plan: MountableRoute[]): { valid: boolean; conflicts: string[] } {
  const prefixes = plan.map(p => p.prefix);
  const dups = prefixes.filter((p, i) => prefixes.indexOf(p) !== i);
  return { valid: dups.length === 0, conflicts: [...new Set(dups)] };
}

// ── Agent Catalog ───────────────────────────────────────────────────
// Canonical agent IDs for the Shahin AGRC-OS squad.
// These power initAgentToolsRegistry() — without them, all 57 tools are dead.

const AGENT_CATALOG_IDS = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06',
  'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13',
] as const;

export type AgentCatalogId = typeof AGENT_CATALOG_IDS[number];

export interface AgentCatalogEntry {
  id: AgentCatalogId;
  name: string;
  domain: string;
  moduleCode: string;
  status: 'active' | 'disabled';
}

const _agentCatalog = new Map<string, AgentCatalogEntry>();

// Populated from product definitions at startup, or falls back to built-in list
export function getAgentCatalogIds(): string[] {
  if (_agentCatalog.size > 0) return Array.from(_agentCatalog.keys());
  return [...AGENT_CATALOG_IDS];
}

export function getAgentCatalog(): Map<string, AgentCatalogEntry> {
  if (_agentCatalog.size > 0) return _agentCatalog;
  // Return default catalog
  const defaults = new Map<string, AgentCatalogEntry>();
  const names: Record<string, [string, string]> = {
    A01: ['Onboarding Agent', 'foundation'], A02: ['Identity Provisioning', 'admin'],
    A03: ['Framework Mapping', 'compliance'], A04: ['Control Authoring', 'compliance'],
    A05: ['Evidence Collection', 'evidence'], A06: ['Gap Remediation', 'remediation'],
    A07: ['Risk Assessment', 'risk'], A08: ['Policy Lifecycle', 'governance'],
    A09: ['Vendor Risk', 'vendor'], A10: ['Audit & Reporting', 'audit'],
    A11: ['BCP Agent', 'bcp'], A12: ['Training Agent', 'training'],
    A13: ['Policy Review & Landing Copilot', 'copilot'],
  };
  for (const id of AGENT_CATALOG_IDS) {
    const [name, moduleCode] = names[id];
    defaults.set(id, { id, name, domain: name, moduleCode, status: 'active' });
  }
  return defaults;
}

export function registerAgentCatalogEntry(entry: AgentCatalogEntry): void {
  _agentCatalog.set(entry.id, entry);
}

// ── Stub functions required by platform.port.ts ─────────────────────
// These are referenced by the ai-engine-service ports layer.
// Real implementations will be wired as each platform concern matures.

export function getAgentRbacEntry(_agentId: string): { permissions: string[] } | null {
  return null; // DAuth handles permissions at runtime
}

export function checkQuota(_tenantId: string, _resource: string): { allowed: boolean; remaining: number } {
  return { allowed: true, remaining: 999 };
}

export function getApplicableRegulations(_tenantId: string): string[] {
  return [];
}

export function enqueueHandoff(_handoff: unknown): void {
  // No-op — handoff queue not yet wired
}

export function getHandoffBatch(_agentId: string, _limit?: number): unknown[] {
  return [];
}

export const DEFAULT_EMBEDDING_DIM = 1536;

export function triggerAgentsForWorkflowTransition(_req: unknown): Promise<unknown[]> {
  return Promise.resolve([]);
}

export function findAgentsForWorkflow(_workflowId: string): string[] {
  return [];
}

export function buildDependencyGraph(_modules: unknown[]): { nodes: string[]; edges: [string, string][] } {
  return { nodes: [], edges: [] };
}

export function detectPatterns(_data: unknown[]): unknown[] {
  return [];
}

// ── AI Kernel stubs ──────────────────────────────────────────────────
// These power the AGRC-OS kernel routes. Real implementations are
// wired when the kernel service is instantiated at runtime.

export type { AiProcess, KernelStatus, KernelHealth, ProcessRow, ProcessDetail,
  MemoryPartition, MemoryRow, LogRow, SchedulerRow, SchedulerEntry,
  IpcRow, IpcMessage, AgentDetail, AgentExecution, AgentExecutionCreateInput,
  AgentHandoff, AgentStep, HealthStatus, KernelLogEvent,
  KernelProcessView, KernelSchedulerView, KernelIpcView, KernelMemoryView,
  KernelLogView, KernelProcessDetailView, KernelAgentDetailView,
  KernelHealthView, KernelSnapshotView, KernelOverviewView,
  WorkflowAgentResult, WorkflowTriggerRequest,
  EngineRun, EngineResult,
  McpServerInfo, McpToolDef, McpToolOverride, ToolListFilter, ToolListResult,
  CodeSearchEngineRecord, CodeSearchEngineCreateDTO, CodeSearchEngineUpdateDTO,
  CodeSearchHealthResponse, CodeSearchQueryInput, CodeSearchQueryResponse,
  CodeSearchSurfaceRecord, CodeSearchSurfaceCreateDTO,
  AiSystem, CreateAssetInput, CircuitState, CircuitBreaker,
} from '@dos/types';

// Wave 2 #7 — Real kernel APIs. The historical stubs returned empty
// shapes which let the AI-OS UI render but never actually reflected the
// engine state. The implementations live in ./kernel/ai-os-kernel.service
// and are lazy-imported here to keep the static module graph acyclic
// (the kernel module needs @dos/db at runtime; it doesn't need to be
// present for code that just imports types from this package).
//
// API CHANGE: every kernel call now requires `tenantId` as the first
// argument. Previous stubs were tenant-agnostic; the real implementations
// are not. Callers that previously omitted tenantId (kept compiling with
// `(_pid)` etc.) will get a TypeScript error — that's the intended
// signal to thread tenant context through.
async function _kernel(): Promise<typeof import('./kernel/ai-os-kernel.service.js')> {
  return await import('./kernel/ai-os-kernel.service.js');
}

export async function getKernelStatus(tenantId: string) { return (await _kernel()).getKernelStatus(tenantId); }
export async function getKernelHealth(tenantId: string) { return (await _kernel()).getKernelHealth(tenantId); }
export async function getProcessTable(tenantId: string) { return (await _kernel()).getProcessTable(tenantId); }
export async function getProcessDetail(tenantId: string, pid: string) { return (await _kernel()).getProcessDetail(tenantId, pid); }
export async function getAgentDetail(tenantId: string, agentId: string) { return (await _kernel()).getAgentDetail(tenantId, agentId); }
export async function getSchedulerTable(tenantId: string) { return (await _kernel()).getSchedulerTable(tenantId); }
export async function getIpcMessages(tenantId: string, limit?: number) { return (await _kernel()).getIpcMessages(tenantId, limit); }
export async function getMemoryPartitions(tenantId: string) { return (await _kernel()).getMemoryPartitions(tenantId); }
export async function getKernelLog(tenantId: string, limit?: number) { return (await _kernel()).getKernelLog(tenantId, limit); }
export async function killProcess(tenantId: string, runId: string) { return (await _kernel()).killProcess(tenantId, runId); }
export async function rebootAgent(tenantId: string, agentId: string) { return (await _kernel()).rebootAgent(tenantId, agentId); }
export async function pauseAgent(tenantId: string, agentId: string) { return (await _kernel()).pauseAgent(tenantId, agentId); }
export async function resumeAgent(tenantId: string, agentId: string) { return (await _kernel()).resumeAgent(tenantId, agentId); }
// Levels: 'full_autonomous' | 'hybrid' | 'shadow_agent' | 'human'.
export async function adjustAutonomyLevel(tenantId: string, agentId: string, level: string) { return (await _kernel()).adjustAutonomyLevel(tenantId, agentId, level); }
export async function setGlobalAutonomyLevel(tenantId: string, level: string) { return (await _kernel()).setGlobalAutonomyLevel(tenantId, level); }
export async function injectPriority(tenantId: string, agentId: string, directive: { focus: string; urgency: 'critical' | 'high' | 'medium' | 'low'; context?: string }) {
  return (await _kernel()).injectPriority(tenantId, agentId, directive);
}
// killRunningAction takes a run_id (not agent_id) — rename the second
// param at call sites accordingly.
export async function killRunningAction(tenantId: string, runId: string) { return (await _kernel()).killRunningAction(tenantId, runId); }
// Second argument is windowHours (default 24), not agentId.
export async function getTokenUsage(tenantId: string, windowHours: number = 24) { return (await _kernel()).getTokenUsage(tenantId, windowHours); }
export async function getPriorityDirective(tenantId: string, agentId: string) { return (await _kernel()).getPriorityDirective(tenantId, agentId); }
export async function clearPriorityDirective(tenantId: string, agentId: string) { return (await _kernel()).clearPriorityDirective(tenantId, agentId); }
// Snapshot helpers: implementation TBD in kernel.service. Kept as stubs
// so the export surface stays stable until the snapshot table is wired.
export async function saveKernelSnapshot(_tenantId?: string): Promise<string> { return 'snapshot-' + Date.now(); }
export async function listKernelSnapshots(_tenantId?: string): Promise<unknown[]> { return []; }

// ── Delegation stubs ─────────────────────────────────────────────────
export type DelegationScope = 'full' | 'read' | 'write' | 'execute';
export type DelegationAction = 'grant' | 'revoke' | 'delegate' | 'escalate';

export function estimateRemediationTime(_input: unknown): number { return 0; }

// KernelHealthStatus alias for backward compatibility
import type { HealthStatus as _HealthStatus } from '@dos/types';
export type KernelHealthStatus = _HealthStatus;
