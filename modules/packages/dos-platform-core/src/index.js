"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EMBEDDING_DIM = exports.ROUTE_CATALOG = exports.DOS_CONCERNS = exports.DOS_PLATFORM_CORE_VERSION = exports.dispatchEvent = exports.deleteWebhook = exports.listWebhooks = exports.registerWebhook = exports.isModuleActive = exports.invalidateComplianceCache = exports.cacheGetOrSetWithMeta = exports.cacheGetOrSet = exports.CacheNS = exports.CacheTTL = exports.swallowNull = exports.swallowEmpty = exports.swallowDefault = exports.swallow = exports.catchHandler = exports.EC = exports.rateLimitKey = exports.checkRateLimit = exports.checkPasswordStrength = exports.isNamespacedCacheKey = exports.globalCacheKey = exports.cacheKey = exports.verifyCaptchaSvg = exports.generateSvgCaptcha = exports.captchaRequired = exports.verifyCaptcha = exports.resolveJwtSigningSecret = exports.getEphemeralDevJwtSecret = exports.assertJwtSigningSecret = exports.isProductionLikeEnv = exports.resolveNodeEnv = exports.UnifiedConfigService = void 0;
exports.withTimeout = withTimeout;
exports.generateMountPlan = generateMountPlan;
exports.toMountableRoutes = toMountableRoutes;
exports.validateMountPlan = validateMountPlan;
exports.getAgentCatalogIds = getAgentCatalogIds;
exports.getAgentCatalog = getAgentCatalog;
exports.registerAgentCatalogEntry = registerAgentCatalogEntry;
exports.getAgentRbacEntry = getAgentRbacEntry;
exports.checkQuota = checkQuota;
exports.getApplicableRegulations = getApplicableRegulations;
exports.enqueueHandoff = enqueueHandoff;
exports.getHandoffBatch = getHandoffBatch;
exports.triggerAgentsForWorkflowTransition = triggerAgentsForWorkflowTransition;
exports.findAgentsForWorkflow = findAgentsForWorkflow;
exports.buildDependencyGraph = buildDependencyGraph;
exports.detectPatterns = detectPatterns;
exports.getKernelStatus = getKernelStatus;
exports.getKernelHealth = getKernelHealth;
exports.getProcessTable = getProcessTable;
exports.getProcessDetail = getProcessDetail;
exports.getAgentDetail = getAgentDetail;
exports.getSchedulerTable = getSchedulerTable;
exports.getIpcMessages = getIpcMessages;
exports.getMemoryPartitions = getMemoryPartitions;
exports.getKernelLog = getKernelLog;
exports.killProcess = killProcess;
exports.rebootAgent = rebootAgent;
exports.pauseAgent = pauseAgent;
exports.resumeAgent = resumeAgent;
exports.adjustAutonomyLevel = adjustAutonomyLevel;
exports.setGlobalAutonomyLevel = setGlobalAutonomyLevel;
exports.injectPriority = injectPriority;
exports.killRunningAction = killRunningAction;
exports.getTokenUsage = getTokenUsage;
exports.getPriorityDirective = getPriorityDirective;
exports.clearPriorityDirective = clearPriorityDirective;
exports.saveKernelSnapshot = saveKernelSnapshot;
exports.listKernelSnapshots = listKernelSnapshots;
exports.estimateRemediationTime = estimateRemediationTime;
__exportStar(require("./contracts"), exports);
__exportStar(require("./ports"), exports);
__exportStar(require("./constants"), exports);
__exportStar(require("./auth-host-policy"), exports);
__exportStar(require("./config/platform-identity"), exports);
var unified_config_service_1 = require("./settings/unified-config.service");
Object.defineProperty(exports, "UnifiedConfigService", { enumerable: true, get: function () { return unified_config_service_1.UnifiedConfigService; } });
__exportStar(require("./settings/platform-mode-gate.service"), exports);
__exportStar(require("./security/openfga-client"), exports);
var jwt_env_policy_1 = require("./security/jwt-env-policy");
Object.defineProperty(exports, "resolveNodeEnv", { enumerable: true, get: function () { return jwt_env_policy_1.resolveNodeEnv; } });
Object.defineProperty(exports, "isProductionLikeEnv", { enumerable: true, get: function () { return jwt_env_policy_1.isProductionLikeEnv; } });
Object.defineProperty(exports, "assertJwtSigningSecret", { enumerable: true, get: function () { return jwt_env_policy_1.assertJwtSigningSecret; } });
Object.defineProperty(exports, "getEphemeralDevJwtSecret", { enumerable: true, get: function () { return jwt_env_policy_1.getEphemeralDevJwtSecret; } });
Object.defineProperty(exports, "resolveJwtSigningSecret", { enumerable: true, get: function () { return jwt_env_policy_1.resolveJwtSigningSecret; } });
var captcha_verifier_1 = require("./security/captcha-verifier");
Object.defineProperty(exports, "verifyCaptcha", { enumerable: true, get: function () { return captcha_verifier_1.verifyCaptcha; } });
Object.defineProperty(exports, "captchaRequired", { enumerable: true, get: function () { return captcha_verifier_1.captchaRequired; } });
var captcha_svg_service_1 = require("./security/captcha-svg.service");
Object.defineProperty(exports, "generateSvgCaptcha", { enumerable: true, get: function () { return captcha_svg_service_1.generateSvgCaptcha; } });
Object.defineProperty(exports, "verifyCaptchaSvg", { enumerable: true, get: function () { return captcha_svg_service_1.verifyCaptchaSvg; } });
var cache_key_1 = require("./security/cache-key");
Object.defineProperty(exports, "cacheKey", { enumerable: true, get: function () { return cache_key_1.cacheKey; } });
Object.defineProperty(exports, "globalCacheKey", { enumerable: true, get: function () { return cache_key_1.globalCacheKey; } });
Object.defineProperty(exports, "isNamespacedCacheKey", { enumerable: true, get: function () { return cache_key_1.isNamespacedCacheKey; } });
var password_strength_1 = require("./security/password-strength");
Object.defineProperty(exports, "checkPasswordStrength", { enumerable: true, get: function () { return password_strength_1.checkPasswordStrength; } });
var rate_limit_check_1 = require("./security/rate-limit-check");
Object.defineProperty(exports, "checkRateLimit", { enumerable: true, get: function () { return rate_limit_check_1.checkRateLimit; } });
Object.defineProperty(exports, "rateLimitKey", { enumerable: true, get: function () { return rate_limit_check_1.rateLimitKey; } });
var resilience_1 = require("./resilience");
Object.defineProperty(exports, "EC", { enumerable: true, get: function () { return resilience_1.EC; } });
Object.defineProperty(exports, "catchHandler", { enumerable: true, get: function () { return resilience_1.catchHandler; } });
Object.defineProperty(exports, "swallow", { enumerable: true, get: function () { return resilience_1.swallow; } });
Object.defineProperty(exports, "swallowDefault", { enumerable: true, get: function () { return resilience_1.swallowDefault; } });
Object.defineProperty(exports, "swallowEmpty", { enumerable: true, get: function () { return resilience_1.swallowEmpty; } });
Object.defineProperty(exports, "swallowNull", { enumerable: true, get: function () { return resilience_1.swallowNull; } });
var cache_service_1 = require("./cache/cache.service");
Object.defineProperty(exports, "CacheTTL", { enumerable: true, get: function () { return cache_service_1.CacheTTL; } });
Object.defineProperty(exports, "CacheNS", { enumerable: true, get: function () { return cache_service_1.CacheNS; } });
Object.defineProperty(exports, "cacheGetOrSet", { enumerable: true, get: function () { return cache_service_1.cacheGetOrSet; } });
Object.defineProperty(exports, "cacheGetOrSetWithMeta", { enumerable: true, get: function () { return cache_service_1.cacheGetOrSetWithMeta; } });
Object.defineProperty(exports, "invalidateComplianceCache", { enumerable: true, get: function () { return cache_service_1.invalidateComplianceCache; } });
var modules_1 = require("./modules");
Object.defineProperty(exports, "isModuleActive", { enumerable: true, get: function () { return modules_1.isModuleActive; } });
var outbound_webhooks_service_1 = require("./notifications/outbound-webhooks.service");
Object.defineProperty(exports, "registerWebhook", { enumerable: true, get: function () { return outbound_webhooks_service_1.registerWebhook; } });
Object.defineProperty(exports, "listWebhooks", { enumerable: true, get: function () { return outbound_webhooks_service_1.listWebhooks; } });
Object.defineProperty(exports, "deleteWebhook", { enumerable: true, get: function () { return outbound_webhooks_service_1.deleteWebhook; } });
Object.defineProperty(exports, "dispatchEvent", { enumerable: true, get: function () { return outbound_webhooks_service_1.dispatchEvent; } });
__exportStar(require("./compat/legacy"), exports);
exports.DOS_PLATFORM_CORE_VERSION = '1.0.0';
function withTimeout(promiseOrFn, ms, label) {
    const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${label || 'operation'} exceeded ${ms}ms`)), ms);
        promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });
}
exports.DOS_CONCERNS = [
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
];
exports.ROUTE_CATALOG = [];
function generateMountPlan(routes) {
    const map = new Map();
    for (const r of routes) {
        const prefix = r.path.split('/').slice(0, 3).join('/');
        const existing = map.get(prefix);
        if (existing) {
            if (!existing.methods.includes(r.method))
                existing.methods.push(r.method);
        }
        else {
            map.set(prefix, { prefix, service: r.service, methods: [r.method], guards: r.guards });
        }
    }
    return [...map.values()];
}
function toMountableRoutes(routes) {
    return generateMountPlan(routes);
}
function validateMountPlan(plan) {
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
];
const _agentCatalog = new Map();
// Populated from product definitions at startup, or falls back to built-in list
function getAgentCatalogIds() {
    if (_agentCatalog.size > 0)
        return Array.from(_agentCatalog.keys());
    return [...AGENT_CATALOG_IDS];
}
function getAgentCatalog() {
    if (_agentCatalog.size > 0)
        return _agentCatalog;
    // Return default catalog
    const defaults = new Map();
    const names = {
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
function registerAgentCatalogEntry(entry) {
    _agentCatalog.set(entry.id, entry);
}
// ── Stub functions required by platform.port.ts ─────────────────────
// These are referenced by the ai-engine-service ports layer.
// Real implementations will be wired as each platform concern matures.
function getAgentRbacEntry(_agentId) {
    return null; // DAuth handles permissions at runtime
}
function checkQuota(_tenantId, _resource) {
    return { allowed: true, remaining: 999 };
}
function getApplicableRegulations(_tenantId) {
    return [];
}
function enqueueHandoff(_handoff) {
    // No-op — handoff queue not yet wired
}
function getHandoffBatch(_agentId, _limit) {
    return [];
}
exports.DEFAULT_EMBEDDING_DIM = 1536;
function triggerAgentsForWorkflowTransition(_req) {
    return Promise.resolve([]);
}
function findAgentsForWorkflow(_workflowId) {
    return [];
}
function buildDependencyGraph(_modules) {
    return { nodes: [], edges: [] };
}
function detectPatterns(_data) {
    return [];
}
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
async function _kernel() {
    return await import('./kernel/ai-os-kernel.service.js');
}
async function getKernelStatus(tenantId) { return (await _kernel()).getKernelStatus(tenantId); }
async function getKernelHealth(tenantId) { return (await _kernel()).getKernelHealth(tenantId); }
async function getProcessTable(tenantId) { return (await _kernel()).getProcessTable(tenantId); }
async function getProcessDetail(tenantId, pid) { return (await _kernel()).getProcessDetail(tenantId, pid); }
async function getAgentDetail(tenantId, agentId) { return (await _kernel()).getAgentDetail(tenantId, agentId); }
async function getSchedulerTable(tenantId) { return (await _kernel()).getSchedulerTable(tenantId); }
async function getIpcMessages(tenantId, limit) { return (await _kernel()).getIpcMessages(tenantId, limit); }
async function getMemoryPartitions(tenantId) { return (await _kernel()).getMemoryPartitions(tenantId); }
async function getKernelLog(tenantId, limit) { return (await _kernel()).getKernelLog(tenantId, limit); }
async function killProcess(tenantId, runId) { return (await _kernel()).killProcess(tenantId, runId); }
async function rebootAgent(tenantId, agentId) { return (await _kernel()).rebootAgent(tenantId, agentId); }
async function pauseAgent(tenantId, agentId) { return (await _kernel()).pauseAgent(tenantId, agentId); }
async function resumeAgent(tenantId, agentId) { return (await _kernel()).resumeAgent(tenantId, agentId); }
// Levels: 'full_autonomous' | 'hybrid' | 'shadow_agent' | 'human'.
async function adjustAutonomyLevel(tenantId, agentId, level) { return (await _kernel()).adjustAutonomyLevel(tenantId, agentId, level); }
async function setGlobalAutonomyLevel(tenantId, level) { return (await _kernel()).setGlobalAutonomyLevel(tenantId, level); }
async function injectPriority(tenantId, agentId, directive) {
    return (await _kernel()).injectPriority(tenantId, agentId, directive);
}
// killRunningAction takes a run_id (not agent_id) — rename the second
// param at call sites accordingly.
async function killRunningAction(tenantId, runId) { return (await _kernel()).killRunningAction(tenantId, runId); }
// Second argument is windowHours (default 24), not agentId.
async function getTokenUsage(tenantId, windowHours = 24) { return (await _kernel()).getTokenUsage(tenantId, windowHours); }
async function getPriorityDirective(tenantId, agentId) { return (await _kernel()).getPriorityDirective(tenantId, agentId); }
async function clearPriorityDirective(tenantId, agentId) { return (await _kernel()).clearPriorityDirective(tenantId, agentId); }
// Snapshot helpers: implementation TBD in kernel.service. Kept as stubs
// so the export surface stays stable until the snapshot table is wired.
async function saveKernelSnapshot(_tenantId) { return 'snapshot-' + Date.now(); }
async function listKernelSnapshots(_tenantId) { return []; }
function estimateRemediationTime(_input) { return 0; }
//# sourceMappingURL=index.js.map