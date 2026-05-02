"use strict";
/**
 * @dos/module-sdk module utilities
 * Module-level helpers for health checks, versioning, and status reporting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_TIER_ORDER = exports.ModuleStateTracker = void 0;
exports.runHealthCheck = runHealthCheck;
exports.runHealthChecks = runHealthChecks;
exports.aggregateHealthStatus = aggregateHealthStatus;
exports.buildModuleHealthReport = buildModuleHealthReport;
exports.createDatabaseHealthChecker = createDatabaseHealthChecker;
exports.createRedisHealthChecker = createRedisHealthChecker;
exports.createExternalServiceHealthChecker = createExternalServiceHealthChecker;
exports.parseVersion = parseVersion;
exports.formatVersion = formatVersion;
exports.compareVersions = compareVersions;
exports.isVersionCompatible = isVersionCompatible;
exports.isModuleActive = isModuleActive;
exports.getModuleRouteBase = getModuleRouteBase;
exports.getModuleEventNamespace = getModuleEventNamespace;
exports.buildModuleContract = buildModuleContract;
exports.hasCapability = hasCapability;
exports.getEnabledCapabilities = getEnabledCapabilities;
exports.compareTiers = compareTiers;
exports.isTierAccessible = isTierAccessible;
exports.resolveDependencies = resolveDependencies;
async function runHealthCheck(checker) {
    const start = Date.now();
    const timeout = checker.timeout ?? 5000;
    try {
        const result = await Promise.race([
            checker.check(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), timeout)),
        ]);
        return {
            ...result,
            name: checker.name,
            latencyMs: Date.now() - start,
            lastChecked: new Date().toISOString(),
        };
    }
    catch (err) {
        return {
            name: checker.name,
            status: 'unhealthy',
            message: err instanceof Error ? err.message : String(err),
            latencyMs: Date.now() - start,
            lastChecked: new Date().toISOString(),
        };
    }
}
async function runHealthChecks(checkers) {
    return Promise.all(checkers.map(runHealthCheck));
}
function aggregateHealthStatus(results, checkers) {
    const criticalNames = new Set(checkers.filter(c => c.critical).map(c => c.name));
    const hasUnhealthy = results.some(r => r.status === 'unhealthy' && criticalNames.has(r.name));
    if (hasUnhealthy)
        return 'unhealthy';
    const hasDegraded = results.some(r => r.status === 'degraded' || (r.status === 'unhealthy' && !criticalNames.has(r.name)));
    if (hasDegraded)
        return 'degraded';
    return 'healthy';
}
function buildModuleHealthReport(manifest, startTime, checks) {
    const checkers = checks.map(c => ({ name: c.name, check: async () => c }));
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
function createDatabaseHealthChecker(name, queryFn, critical = true) {
    return {
        name,
        critical,
        timeout: 3000,
        check: async () => {
            try {
                await queryFn();
                return { name, status: 'healthy', lastChecked: new Date().toISOString() };
            }
            catch (err) {
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
function createRedisHealthChecker(name, pingFn, critical = false) {
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
            }
            catch (err) {
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
function createExternalServiceHealthChecker(name, checkFn, critical = false) {
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
            }
            catch (err) {
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
function parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match)
        return null;
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4],
    };
}
function formatVersion(version) {
    const base = `${version.major}.${version.minor}.${version.patch}`;
    return version.prerelease ? `${base}-${version.prerelease}` : base;
}
function compareVersions(a, b) {
    const vA = parseVersion(a);
    const vB = parseVersion(b);
    if (!vA && !vB)
        return 0;
    if (!vA)
        return -1;
    if (!vB)
        return 1;
    if (vA.major !== vB.major)
        return vA.major - vB.major;
    if (vA.minor !== vB.minor)
        return vA.minor - vB.minor;
    if (vA.patch !== vB.patch)
        return vA.patch - vB.patch;
    // Prerelease versions are lower than release versions
    if (vA.prerelease && !vB.prerelease)
        return -1;
    if (!vA.prerelease && vB.prerelease)
        return 1;
    return 0;
}
function isVersionCompatible(required, actual) {
    const reqV = parseVersion(required);
    const actV = parseVersion(actual);
    if (!reqV || !actV)
        return false;
    // Major version must match
    if (reqV.major !== actV.major)
        return false;
    // Actual minor must be >= required minor
    if (actV.minor < reqV.minor)
        return false;
    // If same minor, actual patch must be >= required patch
    if (actV.minor === reqV.minor && actV.patch < reqV.patch)
        return false;
    return true;
}
class ModuleStateTracker {
    moduleCode;
    version;
    state = 'initializing';
    startTime = Date.now();
    requestCount = 0;
    errorCount = 0;
    lastError;
    lastErrorAt;
    constructor(moduleCode, version) {
        this.moduleCode = moduleCode;
        this.version = version;
    }
    markReady() {
        this.state = 'ready';
    }
    markDegraded() {
        this.state = 'degraded';
    }
    markError(error) {
        this.state = 'error';
        this.lastError = error instanceof Error ? error.message : error;
        this.lastErrorAt = new Date().toISOString();
        this.errorCount++;
    }
    markShutdown() {
        this.state = 'shutdown';
    }
    recordRequest() {
        this.requestCount++;
    }
    recordError(error) {
        this.lastError = error instanceof Error ? error.message : error;
        this.lastErrorAt = new Date().toISOString();
        this.errorCount++;
    }
    getStatus() {
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
    isHealthy() {
        return this.state === 'ready';
    }
}
exports.ModuleStateTracker = ModuleStateTracker;
// ────────────────────────────────────────────────────────────────────────────
// Module Metadata Helpers
// ────────────────────────────────────────────────────────────────────────────
function isModuleActive(module) {
    return module.isActive === true;
}
function getModuleRouteBase(moduleCode) {
    return `/api/modules/${moduleCode.toLowerCase()}`;
}
function getModuleEventNamespace(moduleCode) {
    return `module.${moduleCode.toLowerCase()}`;
}
function buildModuleContract(manifest) {
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
function hasCapability(manifest, capability) {
    const capabilities = manifest.aiCapabilities;
    return capabilities?.includes(capability) ?? false;
}
function getEnabledCapabilities(manifest) {
    return manifest.aiCapabilities || [];
}
// ────────────────────────────────────────────────────────────────────────────
// Module Tier Helpers
// ────────────────────────────────────────────────────────────────────────────
exports.MODULE_TIER_ORDER = {
    core: 0,
    platform: 1,
    standard: 2,
    premium: 3,
    enterprise: 4,
    custom: 5,
};
function compareTiers(a, b) {
    return exports.MODULE_TIER_ORDER[a] - exports.MODULE_TIER_ORDER[b];
}
function isTierAccessible(requiredTier, userTier) {
    return exports.MODULE_TIER_ORDER[userTier] >= exports.MODULE_TIER_ORDER[requiredTier];
}
function resolveDependencies(manifest, availableModules) {
    const hardDeps = manifest.hardDeps || [];
    const softDeps = manifest.softDeps || [];
    const dependencies = [
        ...hardDeps.map(d => ({ moduleCode: d, version: '*', optional: false })),
        ...softDeps.map(d => ({ moduleCode: d, version: '*', optional: true })),
    ];
    const missing = [];
    const incompatible = [];
    for (const dep of dependencies) {
        if (dep.optional)
            continue;
        const actualVersion = availableModules.get(dep.moduleCode);
        if (!actualVersion) {
            missing.push(dep.moduleCode);
        }
        else if (!isVersionCompatible(dep.version, actualVersion)) {
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
//# sourceMappingURL=module-utils.js.map