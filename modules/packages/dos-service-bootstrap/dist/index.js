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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSecretCache = exports.vaultEnabled = exports.getSecret = exports.getRedlock = exports.withLock = exports.acquireLock = exports.listBreakerStates = exports.getBreaker = exports.createBreaker = exports.createCsrfMiddleware = exports.getFlagString = exports.getFlagBool = exports.getFlag = exports.getFlagClient = exports.initFeatureFlags = exports.sentry = exports.captureMessage = exports.captureException = exports.initErrorTelemetry = exports.enforceEnvValidation = exports.validateCriticalEnv = exports.setupServiceOpenApi = exports.rollbackServiceMigrations = exports.runServiceMigrations = exports.modulesDiagnosticRouter = exports.getModuleLoadResults = exports.loadModuleExports = exports.loadModuleRoute = exports.eventBusHealthCheck = exports.redisHealthCheck = exports.dbHealthCheck = exports.createHealthRouter = void 0;
exports.createServiceServer = createServiceServer;
exports.createLogger = createLogger;
exports.bootstrapService = bootstrapService;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
const db_1 = require("@dos/db");
const module_sdk_1 = require("@dos/module-sdk");
const dauth_shared_1 = require("@dos/dauth-shared");
const jsonwebtoken = __importStar(require("jsonwebtoken"));
const http_1 = require("@dos/platform-core/http");
const observability_1 = require("@dos/platform-core/observability");
const http_2 = require("@dos/platform-core/http");
const resilience_1 = require("@dos/platform-core/resilience");
const platform_core_1 = require("@dos/platform-core");
const tenancy_1 = require("@dos/platform-core/tenancy");
const auth_host_policy_1 = require("@dos/platform-core/auth-host-policy");
const migration_runner_1 = require("./migration-runner");
const openapi_1 = require("./openapi");
const validate_env_1 = require("./validate-env");
const error_telemetry_1 = require("./error-telemetry");
const feature_flags_1 = require("./feature-flags");
async function createServiceServer(config) {
    // Init Sentry FIRST — before tracing, before Express — so every subsequent
    // unhandled error is captured. No-op if SENTRY_DSN is unset.
    (0, error_telemetry_1.initErrorTelemetry)({ serviceCode: config.serviceCode });
    // Initialise distributed tracing before Express so HTTP instrumentation hooks in
    const tracingExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? new observability_1.OTLPExporter(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)
        : process.env.OTEL_TRACING_ENABLED === 'true'
            ? new observability_1.ConsoleExporter()
            : undefined;
    (0, observability_1.initTracing)({
        serviceName: config.serviceCode,
        exporter: tracingExporter,
        enabled: process.env.OTEL_TRACING_ENABLED === 'true',
        samplingRate: parseFloat(process.env.OTEL_SAMPLING_RATE || '1.0'),
        errorSamplingRate: parseFloat(process.env.OTEL_ERROR_SAMPLING_RATE || '1.0'),
        successSamplingRate: parseFloat(process.env.OTEL_SUCCESS_SAMPLING_RATE || '0.1'),
    });
    // Wire DB query metrics — every query/safeQuery call now records duration to Prometheus + tracing
    (0, db_1.setDbMetricsHook)((operation, durationMs, isError) => {
        (0, observability_1.recordDbQuery)(isError ? `${operation}_error` : operation, durationMs);
        const span = (0, observability_1.startSpan)(`db.${operation}`);
        span.setAttribute('db.operation', operation);
        span.setAttribute('db.duration_ms', durationMs);
        span.end(isError ? 'error' : 'ok');
    });
    // Wire circuit breaker metrics — state changes recorded to Prometheus gauge
    (0, resilience_1.setCircuitBreakerMetricsHook)((name, state) => {
        (0, observability_1.recordCircuitBreakerState)(name, state);
    });
    const app = (0, express_1.default)();
    const logger = createLogger(config.serviceCode);
    // ── Trust proxy ───────────────────────────────────────────────────
    // Behind ingress / Cloudflare / nginx, Express's `req.ip` and the
    // X-Forwarded-For parser must be told how many hops to strip from
    // the X-Forwarded-For chain so per-IP rate-limiting buckets and audit
    // logs see the real client IP, not the loopback / proxy address.
    //
    // Configurable via TRUST_PROXY:
    //   • numeric  ("1", "2")        → trust N hops (most common)
    //   • boolean  ("true" / "false")
    //   • CIDR/list ("loopback", "10.0.0.0/8,172.16.0.0/12")
    //   • default                    → 1 (single ingress hop)
    //
    // Without this, every visitor collapses onto the proxy IP, exhausting
    // the gateway IP rate-limit bucket for the whole platform on first hit.
    const trustProxyRaw = (process.env.TRUST_PROXY ?? '1').trim();
    let trustProxyValue = 1;
    if (trustProxyRaw === '' || trustProxyRaw.toLowerCase() === 'false') {
        trustProxyValue = false;
    }
    else if (trustProxyRaw.toLowerCase() === 'true') {
        trustProxyValue = true;
    }
    else if (/^\d+$/.test(trustProxyRaw)) {
        trustProxyValue = Number.parseInt(trustProxyRaw, 10);
    }
    else {
        trustProxyValue = trustProxyRaw;
    }
    app.set('trust proxy', trustProxyValue);
    // Validate critical environment variables before proceeding.
    // Services may pass additional rules via ServiceConfig.envRules.
    (0, validate_env_1.enforceEnvValidation)(config.serviceCode, logger, config.envRules ?? []);
    (0, module_sdk_1.setLogger)(logger);
    // Wire canonical JWT auth middleware for all services.
    // Sets both @dos/module-sdk and @dos/auth registries so that
    // consumers importing from either package get the same middleware.
    const canonicalAuth = (0, dauth_shared_1.createCanonicalAuthMiddleware)();
    (0, module_sdk_1.setAuthMiddleware)(canonicalAuth);
    (0, dauth_shared_1.setAuthMiddleware)(canonicalAuth);
    // Initialise the DAuth Enterprise Stack for EVERY service so the canonical
    // middleware's `getTokenVerifier()` resolves successfully. Without this,
    // only services that directly call `bootstrapDauth` (auth-service, gateway)
    // would be able to verify Keycloak RS256 tokens; every other service
    // (onboarding, tenant, user, …) would fall back to HS256 `jwt.verify`
    // and reject KC-issued tokens after the cutover. The call is idempotent
    // and never throws — missing config falls back to native-only.
    try {
        (0, dauth_shared_1.bootstrapDauth)({
            nativeVerify: async (token) => {
                const secret = process.env.JWT_SECRET;
                if (!secret)
                    throw new Error('JWT_SECRET not configured');
                return jsonwebtoken.verify(token, secret);
            },
            // Gateway is the canonical tenant resolver — it enriches missing
            // tenantId claims from dos.tenant_memberships and forwards via
            // x-tenant-id header. Downstream services must NOT reject KC tokens
            // that lack a tenant claim; requireTenantId middleware reads the
            // header to satisfy tenant scope.
            keycloakPayloadMapper: (0, dauth_shared_1.buildKeycloakPayloadMapper)({ requireTenantClaim: false }),
            log: {
                info: (m, meta) => logger.info(meta ?? {}, m),
                warn: (m, meta) => logger.warn(meta ?? {}, m),
                error: (m, meta) => logger.error(meta ?? {}, m),
            },
        });
    }
    catch (err) {
        logger.warn({ err: err?.message }, '[Bootstrap] bootstrapDauth failed — continuing native only');
    }
    // Phase C — install the native authz evaluator so that requirePermission /
    // requireDauth / requireOwnershipOf delegate to the 14-step DAuth pipeline
    // (membership → tenant-active → RBAC → entitlement → ABAC → ReBAC → SoD →
    // delegation → lifecycle → SLA → ledger). Loaded via dynamic import so
    // services that intentionally don't ship dauth-core fall back to the
    // LegacyClaimAuthzEvaluator (JWT-claim wildcard match) registered by
    // dauth-shared's port default.
    try {
        // Cast through unknown because dauth-core's published .d.ts may not yet
        // expose installNativeAuthzEvaluator until the next dist rebuild; the
        // runtime export is stable from the moment dauth-core is loaded.
        const dauthCoreUnknown = (await import('@dos/dauth-core').catch(() => null));
        const installer = dauthCoreUnknown
            ?.installNativeAuthzEvaluator;
        if (typeof installer === 'function') {
            installer();
            logger.info('[Bootstrap] Native DAuth authz evaluator installed (14-step pipeline active)');
        }
        else {
            logger.warn('[Bootstrap] @dos/dauth-core not available — using legacy claim evaluator (no SoD/ABAC/ReBAC/ledger)');
        }
    }
    catch (err) {
        logger.warn({ err: err?.message }, '[Bootstrap] installNativeAuthzEvaluator failed — using legacy claim evaluator');
    }
    // Initialize OpenFGA fine-grained authorization (non-blocking).
    // If OPENFGA_ENABLED=true, connects to the OpenFGA server and validates
    // the store. Guards and tuple seeding use the connection state at runtime.
    (0, platform_core_1.connectOpenFGA)().then(connected => {
        if (connected)
            logger.info('[Bootstrap] OpenFGA connected');
        else
            logger.info('[Bootstrap] OpenFGA not active (disabled or unavailable)');
    }).catch(err => {
        logger.warn(`[Bootstrap] OpenFGA init error (non-fatal): ${err.message}`);
    });
    const pool = config.skipDbPool ? null : (0, db_1.createServicePool)(config.serviceCode, {
        connectionString: process.env.DATABASE_URL,
        max: parseInt(process.env.DB_POOL_MAX || '10'),
    });
    // ── Helmet ─────────────────────────────────────────────────────────
    // Non-gateway services sit behind the gateway proxy and only return JSON.
    // CSP is meaningless for API responses and causes duplicate-header conflicts
    // with nginx (which sets the real browser CSP for HTML).  Only the gateway
    // needs CSP because it serves its admin UI directly.
    const isGateway = config.serviceCode === 'gateway';
    const defaultHelmetConfig = {
        contentSecurityPolicy: isGateway ? {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                scriptSrcElem: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                connectSrc: [
                    "'self'",
                    // Auth hosts (frontends that initiate auth). The IdP host is
                    // intentionally NOT here — the SPA does top-level navigation to
                    // it, not fetch(). See @dos/platform-core/auth-host-policy.
                    ...(0, auth_host_policy_1.allAuthOrigins)(['https', 'wss', 'ws']),
                    "wss:",
                    "ws:",
                ],
            },
        } : false, // Disable CSP for API-only services behind the gateway
        crossOriginEmbedderPolicy: false,
    };
    app.use((0, helmet_1.default)(config.helmet ?? defaultHelmetConfig));
    // ── Compression ───────────────────────────────────────────────────
    // Nginx handles gzip for all responses.  Adding compression() here
    // double-compresses and wastes CPU.  Only enable for the gateway
    // (which serves static admin pages that might not go through nginx).
    if (isGateway) {
        app.use((0, compression_1.default)());
    }
    app.use((0, cors_1.default)(config.cors || (0, http_1.createCorsConfig)({ serviceCode: config.serviceCode })));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, http_1.inputSanitization)());
    app.use((0, http_1.correlationMiddleware)());
    app.use((0, observability_1.tracingMiddleware)());
    app.use((0, observability_1.metricsMiddleware)());
    app.use((0, pino_http_1.default)({
        name: config.serviceCode,
        level: process.env.LOG_LEVEL || 'info',
        customProps: (req) => ({
            correlationId: req.correlationId || req.headers['x-correlation-id'],
            tenantId: req.headers['x-tenant-id'],
            userId: req.user?.userId || req.user?.id,
        }),
        customLogLevel: (_req, res, err) => {
            if (res.statusCode >= 500 || err)
                return 'error';
            if (res.statusCode >= 400)
                return 'warn';
            return 'info';
        },
        customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
        serializers: {
            req: (req) => {
                const base = pino_1.default.stdSerializers.req(req);
                const logAllBodies = process.env.LOG_REQUEST_BODIES === 'true';
                const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(base.method);
                if ((isMutation || logAllBodies) && req.raw?.body) {
                    const body = { ...req.raw.body };
                    for (const k of ['password', 'secret', 'token', 'api_key', 'apiKey', 'password_hash', 'email', 'phone', 'mobile', 'telephone', 'phoneNumber']) {
                        if (body[k])
                            body[k] = '[REDACTED]';
                    }
                    // Enforce 16KB max body size in logs
                    const serialized = JSON.stringify(body);
                    base.body = serialized.length > 16384 ? '[BODY_TOO_LARGE]' : body;
                }
                return base;
            },
        },
    }));
    // ── Response body logging (toggle via LOG_RESPONSE_BODIES=true) ─
    const MAX_LOG_BODY_SIZE = 16384; // 16KB
    if (process.env.LOG_RESPONSE_BODY === 'true' || process.env.LOG_RESPONSE_BODIES === 'true') {
        app.use((req, res, next) => {
            if (req.path === '/health' || req.path === '/ready' || req.path === '/metrics') {
                next();
                return;
            }
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                if (body && typeof body === 'object') {
                    const serialized = JSON.stringify(body);
                    if (serialized.length <= MAX_LOG_BODY_SIZE) {
                        const sanitized = { ...body };
                        for (const k of ['password', 'secret', 'token', 'refreshToken', 'apiKey', 'api_key', 'email', 'phone', 'mobile', 'ssn', 'nationalId', 'creditCard']) {
                            if (sanitized[k])
                                sanitized[k] = '[REDACTED]';
                        }
                        logger.debug({ responseBody: sanitized, method: req.method, path: req.path, statusCode: res.statusCode }, 'Response body');
                    }
                    else {
                        logger.debug({ method: req.method, path: req.path, statusCode: res.statusCode, bodySize: serialized.length }, 'Response body [TOO_LARGE]');
                    }
                }
                return originalJson(body);
            };
            next();
        });
    }
    // ── Rate Limiting ──────────────────────────────────────────────────
    // Non-gateway services sit behind the gateway which already rate-limits
    // all inbound traffic (nginx zone + gateway rateLimitMiddleware).
    // Adding per-service rate limiters creates 4-5× redundant counters per
    // request, wastes Redis calls, and returns confusing X-RateLimit headers.
    // Only the gateway needs its own rate limiters.
    if (isGateway) {
        if (config.rateLimiting?.enabled !== false) {
            const rlOpts = config.rateLimiting || {};
            app.use((0, http_1.createRateLimiter)({
                namespace: config.serviceCode,
                maxRequests: rlOpts.maxRequests ?? 200,
                windowMs: rlOpts.windowMs ?? 60_000,
            }));
        }
        if (config.tenantRateLimiting !== false) {
            app.use((0, http_1.tenantAwareRateLimiter)({
                tierResolver: (req) => {
                    const tier = req.headers['x-tenant-tier'];
                    if (tier && ['free', 'starter', 'professional', 'enterprise', 'unlimited'].includes(tier)) {
                        return tier;
                    }
                    return 'professional';
                },
                bypassCheck: (req) => {
                    return !!req.headers['x-service-token'];
                },
            }));
        }
    }
    app.use((0, http_1.interServiceGuard)(config.serviceCode));
    const allHealthChecks = {};
    if (!config.skipDbPool) {
        allHealthChecks.database = async () => {
            try {
                if (!pool)
                    return false;
                const r = await pool.query('SELECT 1 AS ok');
                return !!r;
            }
            catch {
                return false;
            }
        };
        // Register the canonical Postgres-backed PlatformTenancy adapter so any
        // code in this service (or its loaded modules) calling
        // getProvisionedTenants() from @dos/platform-core/tenancy gets real data
        // without per-service bootstrap boilerplate. Idempotent.
        try {
            (0, tenancy_1.registerTenancyAdapter)();
        }
        catch (err) {
            logger.warn({ err }, '[bootstrap] Failed to register PlatformTenancy adapter');
        }
    }
    try {
        const { redisConnected, getRedis } = require('@dos/db');
        if (redisConnected()) {
            allHealthChecks.redis = async () => {
                try {
                    if (!redisConnected())
                        return false;
                    const pong = await getRedis().ping();
                    return pong === 'PONG';
                }
                catch {
                    return false;
                }
            };
        }
    }
    catch { /* redis not available */ }
    if (config.healthChecks) {
        Object.assign(allHealthChecks, config.healthChecks);
    }
    app.get('/health', async (_req, res) => {
        const entries = await Promise.all(Object.entries(allHealthChecks).map(async ([name, check]) => {
            try {
                const ok = await check();
                return [name, ok ? 'ok' : 'fail', ok];
            }
            catch {
                return [name, 'error', false];
            }
        }));
        const results = Object.fromEntries(entries.map(([name, status]) => [name, status]));
        const healthy = entries.every(([, , ok]) => ok);
        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'ok' : 'degraded',
            service: config.serviceCode,
            checks: results,
            uptime: process.uptime(),
            memoryMB: Math.round(process.memoryUsage().heapUsed / 1048576),
            version: process.env.APP_VERSION || process.env.npm_package_version || 'unknown',
            gitSha: process.env.GIT_SHA || 'unknown',
            lastDeploy: process.env.LAST_DEPLOY || 'unknown',
            timestamp: new Date().toISOString(),
        });
    });
    // Per-check sub-probe — /health/<name> returns the individual check
    // status so ops can monitor e.g. /health/dauth without pulling the full
    // summary. Same public policy as /health.
    app.get('/health/:check', async (req, res) => {
        const name = req.params.check;
        const check = allHealthChecks[name];
        if (!check) {
            res.status(404).json({ status: 'unknown', service: config.serviceCode, check: name });
            return;
        }
        try {
            const ok = await check();
            res.status(ok ? 200 : 503).json({
                status: ok ? 'ok' : 'fail',
                service: config.serviceCode,
                check: name,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(503).json({
                status: 'error',
                service: config.serviceCode,
                check: name,
                error: err instanceof Error ? err.message : String(err),
                timestamp: new Date().toISOString(),
            });
        }
    });
    app.get('/ready', (_req, res) => {
        res.json({ status: 'ready', service: config.serviceCode });
    });
    app.get('/metrics', async (_req, res) => {
        try {
            const text = await (0, observability_1.getMetricsText)();
            res.set('Content-Type', (0, observability_1.getContentType)());
            res.send(text);
        }
        catch {
            res.set('Content-Type', 'text/plain');
            res.status(500).send('# metrics unavailable\n');
        }
    });
    app.get('/sla', async (_req, res) => {
        try {
            const sla = await (0, observability_1.getResponseTimeSLAs)();
            res.json({ service: config.serviceCode, ...sla });
        }
        catch {
            res.json({ service: config.serviceCode, error: 'SLA data unavailable' });
        }
    });
    // ── Dynamic log level (no restart) ──────────────────────────────
    const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
    const requireAdminKey = (req, res, next) => {
        const adminKey = req.headers['x-admin-key'] || req.headers['x-service-token'];
        const isAdmin = req.user?.role === 'platform_admin' || req.user?.isSuperAdmin;
        if (!adminKey && !isAdmin && process.env.NODE_ENV === 'production') {
            res.status(401).json({ error: 'Admin authorization required' });
            return;
        }
        next();
    };
    app.get('/admin/log-level', (_req, res) => {
        res.json({
            service: config.serviceCode,
            level: logger.level,
            availableLevels: [...VALID_LEVELS],
            requestBodyLogging: process.env.LOG_REQUEST_BODIES === 'true',
            responseBodyLogging: process.env.LOG_RESPONSE_BODIES === 'true',
        });
    });
    app.put('/admin/log-level', requireAdminKey, (req, res) => {
        const { level } = req.body || {};
        if (!level || !VALID_LEVELS.includes(level)) {
            res.status(400).json({ error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
            return;
        }
        const previous = logger.level;
        logger.level = level;
        process.env.LOG_LEVEL = level;
        logger.info({ previous, current: level, actor: req.user?.userId || 'admin' }, `Log level changed dynamically from ${previous} to ${level}`);
        res.json({ service: config.serviceCode, previous, current: level });
    });
    // Legacy PATCH support
    app.patch('/admin/log-level', requireAdminKey, (req, res) => {
        const { level } = req.body || {};
        if (!level || !VALID_LEVELS.includes(level)) {
            res.status(400).json({ error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
            return;
        }
        const previous = logger.level;
        logger.level = level;
        process.env.LOG_LEVEL = level;
        logger.info({ previous, current: level, actor: req.user?.userId || 'admin' }, `Log level changed dynamically from ${previous} to ${level}`);
        res.json({ service: config.serviceCode, previous, current: level });
    });
    app.post('/admin/config/reload', requireAdminKey, async (_req, res) => {
        try {
            const { loadDbConfigOverlay } = await import('@dos/runtime-config');
            const previousLevel = process.env.LOG_LEVEL || 'info';
            const result = await loadDbConfigOverlay(config.serviceCode);
            const newLevel = process.env.LOG_LEVEL || 'info';
            if (newLevel !== previousLevel && VALID_LEVELS.includes(newLevel)) {
                logger.level = newLevel;
                logger.info({ previousLevel, newLevel }, 'Log level updated from DB config overlay');
            }
            res.json({ service: config.serviceCode, configReloaded: true, ...result, logLevel: newLevel });
        }
        catch (err) {
            res.status(500).json({ error: 'Config reload failed', detail: err.message });
        }
    });
    app.get('/diagnostics', (_req, res) => {
        const mem = process.memoryUsage();
        res.json({
            service: config.serviceCode,
            uptime: process.uptime(),
            memory: {
                heapUsedMB: Math.round(mem.heapUsed / 1048576),
                heapTotalMB: Math.round(mem.heapTotal / 1048576),
                rssMB: Math.round(mem.rss / 1048576),
                externalMB: Math.round(mem.external / 1048576),
            },
            heapTrend: (0, observability_1.getHeapTrendData)(),
            circuitBreakers: (0, http_2.getAllCircuitStates)(),
            nodeVersion: process.version,
            pid: process.pid,
            timestamp: new Date().toISOString(),
        });
    });
    if (config.modules) {
        for (const mod of config.modules) {
            await mod.register(app);
            logger.info(`Module ${mod.moduleCode} registered`);
        }
    }
    if (config.routes) {
        for (const route of config.routes) {
            app.use(route.path, route.router);
        }
    }
    (0, openapi_1.setupServiceOpenApi)(app, { serviceCode: config.serviceCode });
    app.use((err, req, res, _next) => {
        const errorType = (0, observability_1.classifyError)(err);
        const status = err?.status || err?.statusCode || 500;
        const route = req.route?.path ? req.baseUrl + req.route.path : req.path;
        logger.error({
            err,
            errorType,
            correlationId: req.correlationId,
            tenantId: req.headers['x-tenant-id'],
            userId: req.user?.userId || req.user?.id,
            route,
            method: req.method,
        }, 'Unhandled error');
        (0, observability_1.recordError)(errorType, route, status);
        if (status >= 500) {
            (0, error_telemetry_1.captureException)(err, {
                correlationId: req.correlationId,
                tenantId: req.headers['x-tenant-id'],
                route,
                method: req.method,
                service: config.serviceCode,
            });
        }
        res.status(status).json({
            error: err?.message || 'Internal server error',
            code: err?.code || 'INTERNAL_ERROR',
            service: config.serviceCode,
        });
    });
    const start = async () => {
        (0, observability_1.startHeapTrendTracker)();
        (0, observability_1.initExtendedMetrics)();
        (0, observability_1.initAgentMetrics)();
        (0, observability_1.initBusinessMetrics)();
        // Connect to flagd for feature flags. Non-blocking; service still boots
        // if flagd is unreachable (calls fall back to defaults).
        (0, feature_flags_1.initFeatureFlags)(config.serviceCode).then((client) => {
            if (client)
                logger.info('[Bootstrap] OpenFeature flagd connected');
            else
                logger.info('[Bootstrap] OpenFeature flagd not active (FLAGD_DISABLED or unavailable)');
        }).catch((err) => {
            logger.warn(`[Bootstrap] flagd init error (non-fatal): ${err.message}`);
        });
        if (!config.skipDbPool && pool) {
            setInterval(() => {
                try {
                    (0, observability_1.recordDbPoolMetrics)(pool.totalCount - pool.idleCount || 0, pool.idleCount || 0, pool.waitingCount || 0);
                }
                catch { /* pool metrics unavailable */ }
            }, 15_000).unref();
        }
        if (!config.skipDbPool && !config.skipMigrations) {
            try {
                const result = await (0, migration_runner_1.runServiceMigrations)({
                    serviceCode: config.serviceCode,
                    connectionString: process.env.DATABASE_URL || '',
                    migrationsDir: config.migrationsDir,
                    enabled: process.env.RUN_MIGRATIONS !== 'false',
                });
                if (result.applied > 0) {
                    logger.info({ applied: result.applied, skipped: result.skipped }, 'Service migrations complete');
                }
            }
            catch (err) {
                logger.warn({ err }, 'Service migration runner failed — continuing with existing schema');
            }
        }
        if (!config.skipDbPool) {
            try {
                const { loadDbConfigOverlay } = await import('@dos/runtime-config');
                await loadDbConfigOverlay(config.serviceCode);
                // Periodic log level poll — re-reads DB config every 60s, applies LOG_LEVEL if changed
                setInterval(async () => {
                    try {
                        const prev = process.env.LOG_LEVEL || 'info';
                        await loadDbConfigOverlay(config.serviceCode);
                        const curr = process.env.LOG_LEVEL || 'info';
                        if (curr !== prev && ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(curr)) {
                            logger.level = curr;
                            logger.info({ previousLevel: prev, newLevel: curr }, 'Log level updated from DB config poll');
                        }
                    }
                    catch { /* config poll failed — keep current level */ }
                }, 60_000).unref();
            }
            catch { /* DB config overlay not available — using env defaults */ }
        }
        const bindHost = config.serviceCode === 'gateway' ? '0.0.0.0' : '127.0.0.1';
        const server = app.listen(config.port, bindHost, () => {
            logger.info(`${config.serviceCode} listening on ${bindHost}:${config.port}`);
            if (process.send)
                process.send('ready');
            config.onReady?.();
        });
        const shutdown = async (signal) => {
            logger.info(`${signal} received, shutting down ${config.serviceCode}`);
            server.close(async () => {
                if (pool)
                    await (0, db_1.closeServicePool)(config.serviceCode);
                process.exit(0);
            });
            setTimeout(() => process.exit(1), 30000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        return server;
    };
    return { app, start };
}
function createLogger(serviceCode) {
    return (0, pino_1.default)({
        level: process.env.LOG_LEVEL || 'info',
        name: serviceCode,
        formatters: {
            level: (label) => ({ level: label }),
        },
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        base: {
            service: serviceCode,
            env: process.env.NODE_ENV || 'development',
            pid: process.pid,
            hostname: process.env.HOSTNAME || require('os').hostname(),
        },
        serializers: {
            err: pino_1.default.stdSerializers.err,
            req: pino_1.default.stdSerializers.req,
            res: pino_1.default.stdSerializers.res,
        },
        redact: {
            paths: [
                // Auth headers
                'req.headers.authorization',
                'req.headers["x-service-token"]',
                'req.headers.cookie',
                // PII fields in request body
                'req.raw.body.password',
                'req.raw.body.currentPassword',
                'req.raw.body.newPassword',
                'req.raw.body.confirmPassword',
                'req.raw.body.secret',
                'req.raw.body.token',
                'req.raw.body.refreshToken',
                'req.raw.body.apiKey',
                'req.raw.body.api_key',
                'req.raw.body.ssn',
                'req.raw.body.nationalId',
                'req.raw.body.creditCard',
                // PII: email and phone
                'req.raw.body.email',
                'req.raw.body.phone',
                'req.raw.body.mobile',
                'req.raw.body.telephone',
                'req.raw.body.phoneNumber',
                // Nested auth patterns
                'password',
                'secret',
                'token',
                'refreshToken',
                'email',
                'phone',
                'mobile',
            ],
            censor: '[REDACTED]',
        },
    });
}
var health_1 = require("./health");
Object.defineProperty(exports, "createHealthRouter", { enumerable: true, get: function () { return health_1.createHealthRouter; } });
Object.defineProperty(exports, "dbHealthCheck", { enumerable: true, get: function () { return health_1.dbHealthCheck; } });
Object.defineProperty(exports, "redisHealthCheck", { enumerable: true, get: function () { return health_1.redisHealthCheck; } });
Object.defineProperty(exports, "eventBusHealthCheck", { enumerable: true, get: function () { return health_1.eventBusHealthCheck; } });
var module_loader_1 = require("./module-loader");
Object.defineProperty(exports, "loadModuleRoute", { enumerable: true, get: function () { return module_loader_1.loadModuleRoute; } });
Object.defineProperty(exports, "loadModuleExports", { enumerable: true, get: function () { return module_loader_1.loadModuleExports; } });
Object.defineProperty(exports, "getModuleLoadResults", { enumerable: true, get: function () { return module_loader_1.getModuleLoadResults; } });
Object.defineProperty(exports, "modulesDiagnosticRouter", { enumerable: true, get: function () { return module_loader_1.modulesDiagnosticRouter; } });
var migration_runner_2 = require("./migration-runner");
Object.defineProperty(exports, "runServiceMigrations", { enumerable: true, get: function () { return migration_runner_2.runServiceMigrations; } });
Object.defineProperty(exports, "rollbackServiceMigrations", { enumerable: true, get: function () { return migration_runner_2.rollbackServiceMigrations; } });
var openapi_2 = require("./openapi");
Object.defineProperty(exports, "setupServiceOpenApi", { enumerable: true, get: function () { return openapi_2.setupServiceOpenApi; } });
var validate_env_2 = require("./validate-env");
Object.defineProperty(exports, "validateCriticalEnv", { enumerable: true, get: function () { return validate_env_2.validateCriticalEnv; } });
Object.defineProperty(exports, "enforceEnvValidation", { enumerable: true, get: function () { return validate_env_2.enforceEnvValidation; } });
var error_telemetry_2 = require("./error-telemetry");
Object.defineProperty(exports, "initErrorTelemetry", { enumerable: true, get: function () { return error_telemetry_2.initErrorTelemetry; } });
Object.defineProperty(exports, "captureException", { enumerable: true, get: function () { return error_telemetry_2.captureException; } });
Object.defineProperty(exports, "captureMessage", { enumerable: true, get: function () { return error_telemetry_2.captureMessage; } });
Object.defineProperty(exports, "sentry", { enumerable: true, get: function () { return error_telemetry_2.sentry; } });
var feature_flags_2 = require("./feature-flags");
Object.defineProperty(exports, "initFeatureFlags", { enumerable: true, get: function () { return feature_flags_2.initFeatureFlags; } });
Object.defineProperty(exports, "getFlagClient", { enumerable: true, get: function () { return feature_flags_2.getClient; } });
Object.defineProperty(exports, "getFlag", { enumerable: true, get: function () { return feature_flags_2.getFlag; } });
Object.defineProperty(exports, "getFlagBool", { enumerable: true, get: function () { return feature_flags_2.getFlagBool; } });
Object.defineProperty(exports, "getFlagString", { enumerable: true, get: function () { return feature_flags_2.getFlagString; } });
var csrf_1 = require("./csrf");
Object.defineProperty(exports, "createCsrfMiddleware", { enumerable: true, get: function () { return csrf_1.createCsrfMiddleware; } });
var circuit_breaker_1 = require("./circuit-breaker");
Object.defineProperty(exports, "createBreaker", { enumerable: true, get: function () { return circuit_breaker_1.createBreaker; } });
Object.defineProperty(exports, "getBreaker", { enumerable: true, get: function () { return circuit_breaker_1.getBreaker; } });
Object.defineProperty(exports, "listBreakerStates", { enumerable: true, get: function () { return circuit_breaker_1.listBreakerStates; } });
var distributed_lock_1 = require("./distributed-lock");
Object.defineProperty(exports, "acquireLock", { enumerable: true, get: function () { return distributed_lock_1.acquireLock; } });
Object.defineProperty(exports, "withLock", { enumerable: true, get: function () { return distributed_lock_1.withLock; } });
Object.defineProperty(exports, "getRedlock", { enumerable: true, get: function () { return distributed_lock_1.getRedlock; } });
var vault_1 = require("./vault");
Object.defineProperty(exports, "getSecret", { enumerable: true, get: function () { return vault_1.getSecret; } });
Object.defineProperty(exports, "vaultEnabled", { enumerable: true, get: function () { return vault_1.vaultEnabled; } });
Object.defineProperty(exports, "clearSecretCache", { enumerable: true, get: function () { return vault_1.clearSecretCache; } });
// bootstrapService — convenience wrapper used by services
async function bootstrapService(serviceCode, opts) {
    const envPort = parseInt(process.env.PORT || '0', 10);
    const migrationsDir = opts.migrationsDir ?? process.env.SERVICE_MIGRATIONS_DIR;
    const config = {
        serviceCode,
        port: envPort,
        routes: [{ path: opts.mountBase, router: opts.router }],
        ...(migrationsDir ? { migrationsDir } : {}),
    };
    const { app, start } = await createServiceServer(config);
    await start();
    return app;
}
//# sourceMappingURL=index.js.map