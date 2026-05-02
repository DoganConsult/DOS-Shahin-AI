"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthRouter = createHealthRouter;
exports.dbHealthCheck = dbHealthCheck;
exports.redisHealthCheck = redisHealthCheck;
exports.eventBusHealthCheck = eventBusHealthCheck;
const express_1 = require("express");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
/* ── Startup-cached metadata (computed once, reused on every /health call) ── */
function resolveGitSha() {
    if (process.env.GIT_SHA)
        return process.env.GIT_SHA;
    try {
        return (0, node_child_process_1.execSync)('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    }
    catch {
        return 'unknown';
    }
}
function resolveVersion() {
    if (process.env.npm_package_version)
        return process.env.npm_package_version;
    // Walk up from cwd looking for the nearest package.json with a version field
    try {
        let dir = process.cwd();
        for (let i = 0; i < 5; i++) {
            const pkgPath = (0, node_path_1.resolve)(dir, 'package.json');
            try {
                const pkg = JSON.parse((0, node_fs_1.readFileSync)(pkgPath, 'utf8'));
                if (pkg.version)
                    return pkg.version;
            }
            catch { /* not found at this level, keep walking */ }
            const parent = (0, node_path_1.dirname)(dir);
            if (parent === dir)
                break;
            dir = parent;
        }
    }
    catch { /* give up */ }
    return '0.0.0';
}
const _cachedGitSha = resolveGitSha();
const _cachedVersion = resolveVersion();
const _processStartISO = new Date().toISOString();
function createHealthRouter(serviceCode, checks) {
    const router = (0, express_1.Router)();
    router.get('/health', async (_req, res) => {
        const results = {};
        let healthy = true;
        if (checks) {
            for (const [name, check] of Object.entries(checks)) {
                try {
                    const ok = await check();
                    results[name] = ok ? 'ok' : 'fail';
                    if (!ok)
                        healthy = false;
                }
                catch {
                    results[name] = 'error';
                    healthy = false;
                }
            }
        }
        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'ok' : 'degraded',
            service: process.env.SERVICE_CODE || serviceCode,
            version: _cachedVersion,
            gitSha: _cachedGitSha,
            checks: results,
            uptime: process.uptime(),
            lastDeploy: process.env.DEPLOY_TIMESTAMP || _processStartISO,
            memoryMB: Math.round(process.memoryUsage().heapUsed / 1048576),
            timestamp: new Date().toISOString(),
        });
    });
    // Per-check sub-probe — /health/<name> returns the individual check
    // status so ops can monitor e.g. /health/dauth without needing the full
    // summary. Publicly reachable (same policy as /health).
    router.get('/health/:check', async (req, res) => {
        const name = req.params.check;
        if (!checks || !checks[name]) {
            res.status(404).json({ status: 'unknown', service: serviceCode, check: name });
            return;
        }
        try {
            const ok = await checks[name]();
            res.status(ok ? 200 : 503).json({
                status: ok ? 'ok' : 'fail',
                service: process.env.SERVICE_CODE || serviceCode,
                check: name,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(503).json({
                status: 'error',
                service: process.env.SERVICE_CODE || serviceCode,
                check: name,
                error: err instanceof Error ? err.message : String(err),
                timestamp: new Date().toISOString(),
            });
        }
    });
    router.get('/ready', (_req, res) => {
        res.json({ status: 'ready', service: serviceCode });
    });
    // ── Runtime log-level configuration (no restart needed) ──
    router.get('/log-level', (_req, res) => {
        try {
            const { getLogLevel } = require('@dos/platform-core/observability');
            res.json({ level: getLogLevel(), service: serviceCode });
        }
        catch {
            res.json({ level: process.env.LOG_LEVEL || 'info', service: serviceCode });
        }
    });
    router.put('/log-level', (req, res) => {
        const { level } = req.body || {};
        const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
        if (!level || !validLevels.includes(level)) {
            res.status(400).json({ error: `Invalid level. Must be one of: ${validLevels.join(', ')}` });
            return;
        }
        try {
            const { setLogLevel } = require('@dos/platform-core/observability');
            setLogLevel(level);
            res.json({ level, service: serviceCode, message: `Log level changed to ${level}` });
        }
        catch {
            process.env.LOG_LEVEL = level;
            res.json({ level, service: serviceCode, message: `Log level env updated to ${level}` });
        }
    });
    return router;
}
async function dbHealthCheck() {
    try {
        const { query } = await import('@dos/db');
        const result = await query('SELECT 1 AS ok');
        return !!result;
    }
    catch {
        return false;
    }
}
async function redisHealthCheck() {
    try {
        const { getRedis, redisConnected } = await import('@dos/db');
        if (!redisConnected())
            return false;
        const redis = getRedis();
        const pong = await redis.ping();
        return pong === 'PONG';
    }
    catch {
        return false;
    }
}
async function eventBusHealthCheck() {
    try {
        const { getRedis, redisConnected } = await import('@dos/db');
        return redisConnected();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=health.js.map