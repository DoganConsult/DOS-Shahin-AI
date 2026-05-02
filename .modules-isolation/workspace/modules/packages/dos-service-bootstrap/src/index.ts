import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { createServicePool, closeServicePool, setDbMetricsHook } from '@dos/db';
import { setLogger, setEventBus, setAuthMiddleware, setLifecycleRegistry } from '@dos/module-sdk';
import { createCanonicalAuthMiddleware, setAuthMiddleware as setAuthMiddlewareDosAuth, bootstrapDauth, buildKeycloakPayloadMapper } from '@dos/dauth-shared';
import * as jsonwebtoken from 'jsonwebtoken';
import { correlationMiddleware, createRateLimiter, interServiceGuard, inputSanitization, createCorsConfig, tenantAwareRateLimiter } from '@dos/platform-core/http';
import { metricsMiddleware, getMetricsText, getContentType, initTracing, tracingMiddleware, startSpan, OTLPExporter, ConsoleExporter, classifyError, recordError, recordDbQuery, recordMigration, recordCircuitBreakerState, getResponseTimeSLAs, startHeapTrendTracker, getHeapTrendData, initExtendedMetrics, initAgentMetrics, initBusinessMetrics, recordDbPoolMetrics } from '@dos/platform-core/observability';
import { getAllCircuitStates } from '@dos/platform-core/http';
import { setCircuitBreakerMetricsHook } from '@dos/platform-core/resilience';
import { connectOpenFGA } from '@dos/platform-core';
import { registerTenancyAdapter } from '@dos/platform-core/tenancy';
import { allAuthOrigins } from '@dos/platform-core/auth-host-policy';
import { runServiceMigrations } from './migration-runner';
import { setupServiceOpenApi } from './openapi';
import { enforceEnvValidation, type EnvRule } from './validate-env';
import { initErrorTelemetry, captureException } from './error-telemetry';
import { initFeatureFlags } from './feature-flags';

export interface ServiceConfig {
  serviceCode: string;
  port: number;
  cors?: cors.CorsOptions;
  helmet?: Parameters<typeof helmet>[0];
  modules?: ModuleRegistration[];
  routes?: RouteRegistration[];
  healthChecks?: Record<string, () => Promise<boolean>>;
  onReady?: () => void;
  skipDbPool?: boolean;
  migrationsDir?: string;
  skipMigrations?: boolean;
  rateLimiting?: {
    enabled?: boolean;
    maxRequests?: number;
    windowMs?: number;
  };
  tenantRateLimiting?: boolean;
  /**
   * Service-specific env-var rules appended to the platform-wide set
   * checked by validate-env.ts. Optional rules emit warnings; required
   * rules cause the service to refuse to boot in production.
   */
  envRules?: EnvRule[];
}

export interface ModuleRegistration {
  moduleCode: string;
  register: (app: Express) => Promise<void>;
}

export interface RouteRegistration {
  path: string;
  router: express.Router;
}

export async function createServiceServer(config: ServiceConfig): Promise<{ app: Express; start: () => Promise<import('http').Server> }> {
  // Init Sentry FIRST — before tracing, before Express — so every subsequent
  // unhandled error is captured. No-op if SENTRY_DSN is unset.
  initErrorTelemetry({ serviceCode: config.serviceCode });

  // Initialise distributed tracing before Express so HTTP instrumentation hooks in
  const tracingExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPExporter(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)
    : process.env.OTEL_TRACING_ENABLED === 'true'
      ? new ConsoleExporter()
      : undefined;
  initTracing({
    serviceName: config.serviceCode,
    exporter: tracingExporter,
    enabled: process.env.OTEL_TRACING_ENABLED === 'true',
    samplingRate: parseFloat(process.env.OTEL_SAMPLING_RATE || '1.0'),
    errorSamplingRate: parseFloat(process.env.OTEL_ERROR_SAMPLING_RATE || '1.0'),
    successSamplingRate: parseFloat(process.env.OTEL_SUCCESS_SAMPLING_RATE || '0.1'),
  });

  // Wire DB query metrics — every query/safeQuery call now records duration to Prometheus + tracing
  setDbMetricsHook((operation, durationMs, isError) => {
    recordDbQuery(isError ? `${operation}_error` : operation, durationMs);
    const span = startSpan(`db.${operation}`);
    span.setAttribute('db.operation', operation);
    span.setAttribute('db.duration_ms', durationMs);
    span.end(isError ? 'error' : 'ok');
  });

  // Wire circuit breaker metrics — state changes recorded to Prometheus gauge
  setCircuitBreakerMetricsHook((name, state) => {
    recordCircuitBreakerState(name, state);
  });

  const app = express();
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
  let trustProxyValue: number | string | boolean = 1;
  if (trustProxyRaw === '' || trustProxyRaw.toLowerCase() === 'false') {
    trustProxyValue = false;
  } else if (trustProxyRaw.toLowerCase() === 'true') {
    trustProxyValue = true;
  } else if (/^\d+$/.test(trustProxyRaw)) {
    trustProxyValue = Number.parseInt(trustProxyRaw, 10);
  } else {
    trustProxyValue = trustProxyRaw;
  }
  app.set('trust proxy', trustProxyValue);

  // Validate critical environment variables before proceeding.
  // Services may pass additional rules via ServiceConfig.envRules.
  enforceEnvValidation(config.serviceCode, logger, config.envRules ?? []);

  setLogger(logger);

  // Wire canonical JWT auth middleware for all services.
  // Sets both @dos/module-sdk and @dos/auth registries so that
  // consumers importing from either package get the same middleware.
  const canonicalAuth = createCanonicalAuthMiddleware();
  setAuthMiddleware(canonicalAuth);
  setAuthMiddlewareDosAuth(canonicalAuth);

  // Initialise the DAuth Enterprise Stack for EVERY service so the canonical
  // middleware's `getTokenVerifier()` resolves successfully. Without this,
  // only services that directly call `bootstrapDauth` (auth-service, gateway)
  // would be able to verify Keycloak RS256 tokens; every other service
  // (onboarding, tenant, user, …) would fall back to HS256 `jwt.verify`
  // and reject KC-issued tokens after the cutover. The call is idempotent
  // and never throws — missing config falls back to native-only.
  try {
    bootstrapDauth({
      nativeVerify: async (token: string) => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET not configured');
        return jsonwebtoken.verify(token, secret) as any;
      },
      // Gateway is the canonical tenant resolver — it enriches missing
      // tenantId claims from dos.tenant_memberships and forwards via
      // x-tenant-id header. Downstream services must NOT reject KC tokens
      // that lack a tenant claim; requireTenantId middleware reads the
      // header to satisfy tenant scope.
      keycloakPayloadMapper: buildKeycloakPayloadMapper({ requireTenantClaim: false }) as any,
      log: {
        info: (m, meta) => logger.info(meta ?? {}, m),
        warn: (m, meta) => logger.warn(meta ?? {}, m),
        error: (m, meta) => logger.error(meta ?? {}, m),
      },
    });
  } catch (err) {
    logger.warn({ err: (err as Error)?.message }, '[Bootstrap] bootstrapDauth failed — continuing native only');
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
    const dauthCoreUnknown = (await import('@dos/dauth-core').catch(() => null)) as unknown;
    const installer = (dauthCoreUnknown as { installNativeAuthzEvaluator?: () => unknown } | null)
      ?.installNativeAuthzEvaluator;
    if (typeof installer === 'function') {
      installer();
      logger.info('[Bootstrap] Native DAuth authz evaluator installed (14-step pipeline active)');
    } else {
      logger.warn('[Bootstrap] @dos/dauth-core not available — using legacy claim evaluator (no SoD/ABAC/ReBAC/ledger)');
    }
  } catch (err) {
    logger.warn({ err: (err as Error)?.message }, '[Bootstrap] installNativeAuthzEvaluator failed — using legacy claim evaluator');
  }

  // Initialize OpenFGA fine-grained authorization (non-blocking).
  // If OPENFGA_ENABLED=true, connects to the OpenFGA server and validates
  // the store. Guards and tuple seeding use the connection state at runtime.
  connectOpenFGA().then(connected => {
    if (connected) logger.info('[Bootstrap] OpenFGA connected');
    else logger.info('[Bootstrap] OpenFGA not active (disabled or unavailable)');
  }).catch(err => {
    logger.warn(`[Bootstrap] OpenFGA init error (non-fatal): ${err.message}`);
  });

  const pool = config.skipDbPool ? null : createServicePool(config.serviceCode, {
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX || '10'),
  });

  // ── Helmet ─────────────────────────────────────────────────────────
  // Non-gateway services sit behind the gateway proxy and only return JSON.
  // CSP is meaningless for API responses and causes duplicate-header conflicts
  // with nginx (which sets the real browser CSP for HTML).  Only the gateway
  // needs CSP because it serves its admin UI directly.
  const isGateway = config.serviceCode === 'gateway';
  const defaultHelmetConfig: Parameters<typeof helmet>[0] = {
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
          ...allAuthOrigins(['https', 'wss', 'ws']),
          "wss:",
          "ws:",
        ],
      },
    } : false, // Disable CSP for API-only services behind the gateway
    crossOriginEmbedderPolicy: false,
  };
  app.use(helmet(config.helmet ?? defaultHelmetConfig));

  // ── Compression ───────────────────────────────────────────────────
  // Nginx handles gzip for all responses.  Adding compression() here
  // double-compresses and wastes CPU.  Only enable for the gateway
  // (which serves static admin pages that might not go through nginx).
  if (isGateway) {
    app.use(compression());
  }

  app.use(cors(config.cors || createCorsConfig({ serviceCode: config.serviceCode })));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(inputSanitization());
  app.use(correlationMiddleware());
  app.use(tracingMiddleware());
  app.use(metricsMiddleware());
  app.use(pinoHttp({
    name: config.serviceCode,
    level: process.env.LOG_LEVEL || 'info',
    customProps: (req: any) => ({
      correlationId: req.correlationId || req.headers['x-correlation-id'],
      tenantId: req.headers['x-tenant-id'],
      userId: req.user?.userId || req.user?.id,
    }),
    customLogLevel: (_req: any, res: any, err: any) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req: any, res: any) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req: any, res: any) => `${req.method} ${req.url} ${res.statusCode}`,
    serializers: {
      req: (req: any) => {
        const base = pino.stdSerializers.req(req) as any;
        const logAllBodies = process.env.LOG_REQUEST_BODIES === 'true';
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(base.method);
        if ((isMutation || logAllBodies) && req.raw?.body) {
          const body = { ...req.raw.body };
          for (const k of ['password', 'secret', 'token', 'api_key', 'apiKey', 'password_hash', 'email', 'phone', 'mobile', 'telephone', 'phoneNumber']) {
            if (body[k]) body[k] = '[REDACTED]';
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
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health' || req.path === '/ready' || req.path === '/metrics') { next(); return; }
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        if (body && typeof body === 'object') {
          const serialized = JSON.stringify(body);
          if (serialized.length <= MAX_LOG_BODY_SIZE) {
            const sanitized = { ...body };
            for (const k of ['password', 'secret', 'token', 'refreshToken', 'apiKey', 'api_key', 'email', 'phone', 'mobile', 'ssn', 'nationalId', 'creditCard']) {
              if (sanitized[k]) sanitized[k] = '[REDACTED]';
            }
            logger.debug({ responseBody: sanitized, method: req.method, path: req.path, statusCode: res.statusCode }, 'Response body');
          } else {
            logger.debug({ method: req.method, path: req.path, statusCode: res.statusCode, bodySize: serialized.length }, 'Response body [TOO_LARGE]');
          }
        }
        return originalJson(body);
      } as any;
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
      app.use(createRateLimiter({
        namespace: config.serviceCode,
        maxRequests: rlOpts.maxRequests ?? 200,
        windowMs: rlOpts.windowMs ?? 60_000,
      }));
    }

    if (config.tenantRateLimiting !== false) {
      app.use(tenantAwareRateLimiter({
        tierResolver: (req: any) => {
          const tier = req.headers['x-tenant-tier'] as string;
          if (tier && ['free', 'starter', 'professional', 'enterprise', 'unlimited'].includes(tier)) {
            return tier as any;
          }
          return 'professional';
        },
        bypassCheck: (req: any) => {
          return !!req.headers['x-service-token'];
        },
      }));
    }
  }

  app.use(interServiceGuard(config.serviceCode));

  const allHealthChecks: Record<string, () => Promise<boolean>> = {};

  if (!config.skipDbPool) {
    allHealthChecks.database = async () => {
      try {
        if (!pool) return false;
        const r = await pool.query('SELECT 1 AS ok');
        return !!r;
      } catch { return false; }
    };

    // Register the canonical Postgres-backed PlatformTenancy adapter so any
    // code in this service (or its loaded modules) calling
    // getProvisionedTenants() from @dos/platform-core/tenancy gets real data
    // without per-service bootstrap boilerplate. Idempotent.
    try {
      registerTenancyAdapter();
    } catch (err) {
      logger.warn({ err }, '[bootstrap] Failed to register PlatformTenancy adapter');
    }
  }

  try {
    const { redisConnected, getRedis } = require('@dos/db');
    if (redisConnected()) {
      allHealthChecks.redis = async () => {
        try {
          if (!redisConnected()) return false;
          const pong = await getRedis().ping();
          return pong === 'PONG';
        } catch { return false; }
      };
    }
  } catch { /* redis not available */ }

  if (config.healthChecks) {
    Object.assign(allHealthChecks, config.healthChecks);
  }

  app.get('/health', async (_req: Request, res: Response) => {
    const entries = await Promise.all(
      Object.entries(allHealthChecks).map(async ([name, check]) => {
        try {
          const ok = await check();
          return [name, ok ? 'ok' : 'fail', ok] as const;
        } catch {
          return [name, 'error', false] as const;
        }
      }),
    );

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
  app.get('/health/:check', async (req: Request, res: Response) => {
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
    } catch (err) {
      res.status(503).json({
        status: 'error',
        service: config.serviceCode,
        check: name,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/ready', (_req: Request, res: Response) => {
    res.json({ status: 'ready', service: config.serviceCode });
  });

  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      const text = await getMetricsText();
      res.set('Content-Type', getContentType());
      res.send(text);
    } catch {
      res.set('Content-Type', 'text/plain');
      res.status(500).send('# metrics unavailable\n');
    }
  });

  app.get('/sla', async (_req: Request, res: Response) => {
    try {
      const sla = await getResponseTimeSLAs();
      res.json({ service: config.serviceCode, ...sla });
    } catch {
      res.json({ service: config.serviceCode, error: 'SLA data unavailable' });
    }
  });

  // ── Dynamic log level (no restart) ──────────────────────────────
  const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

  const requireAdminKey = (req: Request, res: Response, next: NextFunction): void => {
    const adminKey = req.headers['x-admin-key'] || req.headers['x-service-token'];
    const isAdmin = (req as any).user?.role === 'platform_admin' || (req as any).user?.isSuperAdmin;
    if (!adminKey && !isAdmin && process.env.NODE_ENV === 'production') {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    next();
  };

  app.get('/admin/log-level', (_req: Request, res: Response) => {
    res.json({
      service: config.serviceCode,
      level: logger.level,
      availableLevels: [...VALID_LEVELS],
      requestBodyLogging: process.env.LOG_REQUEST_BODIES === 'true',
      responseBodyLogging: process.env.LOG_RESPONSE_BODIES === 'true',
    });
  });

  app.put('/admin/log-level', requireAdminKey, (req: Request, res: Response) => {
    const { level } = req.body || {};
    if (!level || !VALID_LEVELS.includes(level)) {
      res.status(400).json({ error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
      return;
    }
    const previous = logger.level;
    (logger as any).level = level;
    process.env.LOG_LEVEL = level;
    logger.info({ previous, current: level, actor: (req as any).user?.userId || 'admin' }, `Log level changed dynamically from ${previous} to ${level}`);
    res.json({ service: config.serviceCode, previous, current: level });
  });

  // Legacy PATCH support
  app.patch('/admin/log-level', requireAdminKey, (req: Request, res: Response) => {
    const { level } = req.body || {};
    if (!level || !VALID_LEVELS.includes(level)) {
      res.status(400).json({ error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` });
      return;
    }
    const previous = logger.level;
    (logger as any).level = level;
    process.env.LOG_LEVEL = level;
    logger.info({ previous, current: level, actor: (req as any).user?.userId || 'admin' }, `Log level changed dynamically from ${previous} to ${level}`);
    res.json({ service: config.serviceCode, previous, current: level });
  });

  app.post('/admin/config/reload', requireAdminKey, async (_req: Request, res: Response) => {
    try {
      const { loadDbConfigOverlay } = await import('@dos/runtime-config');
      const previousLevel = process.env.LOG_LEVEL || 'info';
      const result = await loadDbConfigOverlay(config.serviceCode);
      const newLevel = process.env.LOG_LEVEL || 'info';
      if (newLevel !== previousLevel && VALID_LEVELS.includes(newLevel as any)) {
        (logger as any).level = newLevel;
        logger.info({ previousLevel, newLevel }, 'Log level updated from DB config overlay');
      }
      res.json({ service: config.serviceCode, configReloaded: true, ...result, logLevel: newLevel });
    } catch (err) {
      res.status(500).json({ error: 'Config reload failed', detail: (err as Error).message });
    }
  });

  app.get('/diagnostics', (_req: Request, res: Response) => {
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
      heapTrend: getHeapTrendData(),
      circuitBreakers: getAllCircuitStates(),
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

  setupServiceOpenApi(app, { serviceCode: config.serviceCode });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const errorType = classifyError(err);
    const status = err?.status || err?.statusCode || 500;
    const route = req.route?.path ? req.baseUrl + req.route.path : req.path;

    logger.error({
      err,
      errorType,
      correlationId: (req as any).correlationId,
      tenantId: req.headers['x-tenant-id'],
      userId: (req as any).user?.userId || (req as any).user?.id,
      route,
      method: req.method,
    }, 'Unhandled error');

    recordError(errorType, route, status);
    if (status >= 500) {
      captureException(err, {
        correlationId: (req as any).correlationId,
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

  const start = async (): Promise<ReturnType<typeof app.listen>> => {
    startHeapTrendTracker();
    initExtendedMetrics();
    initAgentMetrics();
    initBusinessMetrics();

    // Connect to flagd for feature flags. Non-blocking; service still boots
    // if flagd is unreachable (calls fall back to defaults).
    initFeatureFlags(config.serviceCode).then((client) => {
      if (client) logger.info('[Bootstrap] OpenFeature flagd connected');
      else logger.info('[Bootstrap] OpenFeature flagd not active (FLAGD_DISABLED or unavailable)');
    }).catch((err) => {
      logger.warn(`[Bootstrap] flagd init error (non-fatal): ${err.message}`);
    });

    if (!config.skipDbPool && pool) {
      setInterval(() => {
        try {
          recordDbPoolMetrics(
            (pool as any).totalCount - (pool as any).idleCount || 0,
            (pool as any).idleCount || 0,
            (pool as any).waitingCount || 0,
          );
        } catch { /* pool metrics unavailable */ }
      }, 15_000).unref();
    }

    if (!config.skipDbPool && !config.skipMigrations) {
      try {
        const result = await runServiceMigrations({
          serviceCode: config.serviceCode,
          connectionString: process.env.DATABASE_URL || '',
          migrationsDir: config.migrationsDir,
          enabled: process.env.RUN_MIGRATIONS !== 'false',
        });
        if (result.applied > 0) {
          logger.info({ applied: result.applied, skipped: result.skipped }, 'Service migrations complete');
        }
      } catch (err) {
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
              (logger as any).level = curr;
              logger.info({ previousLevel: prev, newLevel: curr }, 'Log level updated from DB config poll');
            }
          } catch { /* config poll failed — keep current level */ }
        }, 60_000).unref();
      } catch { /* DB config overlay not available — using env defaults */ }
    }

    const bindHost = config.serviceCode === 'gateway' ? '0.0.0.0' : '127.0.0.1';
    const server = app.listen(config.port, bindHost, () => {
      logger.info(`${config.serviceCode} listening on ${bindHost}:${config.port}`);
      if (process.send) process.send('ready');
      config.onReady?.();
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down ${config.serviceCode}`);
      server.close(async () => {
        if (pool) await closeServicePool(config.serviceCode);
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

function createLogger(serviceCode: string) {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    name: serviceCode,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    base: {
      service: serviceCode,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
      hostname: process.env.HOSTNAME || require('os').hostname(),
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
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

export { createLogger };
export { createHealthRouter, dbHealthCheck, redisHealthCheck, eventBusHealthCheck } from './health';
export { loadModuleRoute, loadModuleExports, getModuleLoadResults, modulesDiagnosticRouter } from './module-loader';
export { runServiceMigrations, rollbackServiceMigrations } from './migration-runner';
export type { MigrationRunnerOptions } from './migration-runner';
export { setupServiceOpenApi } from './openapi';
export type { OpenApiConfig } from './openapi';
export { validateCriticalEnv, enforceEnvValidation } from './validate-env';
export type { EnvRule, EnvValidationResult } from './validate-env';
export { initErrorTelemetry, captureException, captureMessage, sentry } from './error-telemetry';
export { initFeatureFlags, getClient as getFlagClient, getFlag, getFlagBool, getFlagString } from './feature-flags';
export { createCsrfMiddleware } from './csrf';
export { createBreaker, getBreaker, listBreakerStates } from './circuit-breaker';
export { acquireLock, withLock, getRedlock } from './distributed-lock';
export { getSecret, vaultEnabled, clearSecretCache } from './vault';

// bootstrapService — convenience wrapper used by services
export async function bootstrapService(
  serviceCode: string,
  opts: { mountBase: string; router: any; migrationsDir?: string },
): Promise<Express> {
  const envPort = parseInt(process.env.PORT || '0', 10);
  const migrationsDir = opts.migrationsDir ?? process.env.SERVICE_MIGRATIONS_DIR;
  const config: ServiceConfig = {
    serviceCode,
    port: envPort,
    routes: [{ path: opts.mountBase, router: opts.router }],
    ...(migrationsDir ? { migrationsDir } : {}),
  };
  const { app, start } = await createServiceServer(config);
  await start();
  return app;
}
