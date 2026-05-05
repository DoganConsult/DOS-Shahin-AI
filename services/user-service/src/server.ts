import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { setEventBus, logger } from '@dos/module-sdk';
import { connectRedis } from '@dos/db';
import { userRouter } from './routes/user.routes';
import { teamRouter } from './routes/team.routes';
import { roleRouter } from './routes/role.routes';
import { departmentRouter } from './routes/department.routes';
import viewPreferencesRouter from './routes/view-preferences.routes';
import { invitationsRouter } from './routes/invitations.routes';
import { auditTrailRouter } from './routes/audit-trail.routes';
import { profilesRouter } from './routes/profiles.routes';
import { roleProfileRouter } from './routes/role-profile.routes';
import { privacyOpsRouter } from './routes/privacy-ops.routes';
import { healthFoundationRouter } from './routes/health.foundation';
import {
  organizationsRouter,
  businessUnitsRouter,
  positionsRouter,
  locationsRouter,
  orgHierarchyRouter,
  committeeManagementRouter,
  ownershipMappingRouter,
  sodCheckRouter,
  foundationGovernanceRouter,
  userLifecycleRouter,
  bulkInviteRouter,
  accessReviewRouter,
  delegationRouter,
  foundationRouter,
} from './domain/foundation';
import { startConsumer } from './events/consumer';

const SERVICE_CODE = 'user-service';

async function checkDatabase(): Promise<boolean> {
  try {
    const { query } = await import('@dos/db');
    const result = await query('SELECT 1 AS ok');
    return !!result && result.rows[0]?.ok === 1;
  } catch (err) {
    logger.warn('[user-service.health] Database check failed', { err: (err as Error)?.message });
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const { isRedisHealthy } = await import('@dos/db');
    const res = await isRedisHealthy();
    return res.connected === true;
  } catch (err) {
    logger.warn('[user-service.health] Redis check failed', { err: (err as Error)?.message });
    return false;
  }
}

async function checkCriticalTables(): Promise<boolean> {
  try {
    const { query } = await import('@dos/db');
    const result = await query(
      `SELECT COUNT(*)::int AS n
         FROM information_schema.tables
        WHERE (table_schema = 'dos'    AND table_name IN ('teams','departments','user_role_assignments'))
           OR (table_schema = 'public' AND table_name IN ('users','user_view_preferences'))`,
    );
    const count = (result.rows[0] as { n: number } | undefined)?.n ?? 0;
    return count >= 5;
  } catch (err) {
    logger.warn('[user-service.health] Schema check failed', { err: (err as Error)?.message });
    return false;
  }
}

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  // Initialize the shared @dos/db Redis client on startup. Without this,
  // isRedisHealthy() in checkRedis() returns {connected: false} because
  // the module-level client is never opened — matching the pattern used
  // by onboarding-service/server.ts:96. Rate limiter and cache helpers
  // also depend on the shared client being connected.
  const redisReady = await connectRedis();
  if (!redisReady) {
    logger.warn(`[${SERVICE_CODE}] Redis connection not ready at boot — cache/rate-limit will use in-memory fallback`);
  }

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });
  setEventBus(eventBus as unknown as Parameters<typeof setEventBus>[0]);

  // P8.1 — bind the foundation module's domain-event publisher to the
  // shared event-backbone so emits flow through the platform outbox.
  // Also bind database + auth ports so foundation route handlers can
  // execute SQL via @dos/db and enforce real authentication via @dos/dauth-shared.
  try {
    const path = await import('path');
    // Foundation is a platform module living at <platform-root>/platform/foundation
    // (platform-neutral rule, 2026-05-01 — single canonical location, no relocation).
    // Post Phase-0 consolidation services live at <platform-root>/services/<svc>/.
    // __dirname at runtime → <platform-root>/services/user-service/dist
    // 3 ups reaches <platform-root>, then + platform/foundation/dist.
    const foundationDist = process.env.FOUNDATION_MODULE_DIST
      ? path.resolve(process.env.FOUNDATION_MODULE_DIST)
      : path.resolve(__dirname, '../../..', 'platform', 'foundation', 'dist');
    const foundationMod = require(`${foundationDist}/index`) as {
      bindFoundationPublisher?: (bus: unknown) => void;
      bindFoundationPorts?: (bindings: Record<string, unknown>) => void;
    };
    if (typeof foundationMod.bindFoundationPublisher === 'function') {
      foundationMod.bindFoundationPublisher(eventBus);
    }
    if (typeof foundationMod.bindFoundationPorts === 'function') {
      const dbMod = await import('@dos/db');
      foundationMod.bindFoundationPorts({
        database: {
          getClient: dbMod.getClient,
          getPool: dbMod.getPool,
          query: dbMod.query,
          safeQuery: dbMod.safeQuery,
          tenantSchema: dbMod.tenantSchema,
          withTenantClient: dbMod.withTenantClient,
        },
        logger,
      });
    }
    // Bind real DAuth authentication so passthrough no-op is replaced.
    try {
      const authAdapter = require(`${foundationDist}/infrastructure/auth.adapter`) as {
        bindDauthShared?: () => Promise<boolean>;
      };
      if (typeof authAdapter.bindDauthShared === 'function') {
        const ok = await authAdapter.bindDauthShared();
        if (!ok) logger.warn(`[${SERVICE_CODE}] foundation auth port left as passthrough (dauth-shared unavailable)`);
      }
    } catch (authErr: any) {
      logger.warn(`[${SERVICE_CODE}] foundation auth port bind failed: ${authErr?.message ?? authErr}`);
    }
  } catch (err: any) {
    logger.warn(`[${SERVICE_CODE}] foundation ports bind failed: ${err?.message ?? err}`);
  }

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      // View preferences mount ABOVE /api/users so `/api/users/me/view-preferences/...`
      // is matched before the user-CRUD `/api/users/:id` pattern.
      { path: '/api/users', router: viewPreferencesRouter },
      { path: '/api/users', router: userRouter },
      { path: '/api/teams', router: teamRouter },
      { path: '/api/roles', router: roleRouter },
      { path: '/api/departments', router: departmentRouter },
      // Foundation module routes
      { path: '/api/organizations', router: organizationsRouter },
      { path: '/api/business-units', router: businessUnitsRouter },
      { path: '/api/positions', router: positionsRouter },
      { path: '/api/locations', router: locationsRouter },
      { path: '/api/org-hierarchy', router: orgHierarchyRouter },
      { path: '/api/committees', router: committeeManagementRouter },
      { path: '/api/ownership-mappings', router: ownershipMappingRouter },
      // F1.16 singular alias mount.
      { path: '/api/ownership-mapping', router: ownershipMappingRouter },
      { path: '/api/sod', router: sodCheckRouter },
      { path: '/api/governance', router: foundationGovernanceRouter },
      { path: '/api/user-lifecycle', router: userLifecycleRouter },
      { path: '/api/bulk-invite', router: bulkInviteRouter },
      { path: '/api/access-reviews', router: accessReviewRouter },
      // F1.17 singular alias mount.
      { path: '/api/access-review', router: accessReviewRouter },
      { path: '/api/delegations', router: delegationRouter },
      // F1.15 — FE calls /api/governance/delegations; gateway routes this
      // specific prefix to user-service (more specific than /api/governance
      // which goes to governance-policy-service). Mount the delegation
      // router here too so the route resolves.
      { path: '/api/governance/delegations', router: delegationRouter },
      // F1.20 — committees module: canonical /api/committees plus
      // /api/governance/committees (FE governance module calls both).
      { path: '/api/governance/committees', router: committeeManagementRouter },
      // Foundation Zero-Blocker mounts — FE contracts against these exact prefixes.
      { path: '/api/invitations', router: invitationsRouter },
      { path: '/api/audit-trail', router: auditTrailRouter },
      { path: '/api/profiles', router: profilesRouter },
      // Wave F-Build — canonical role-profile surface (sole URA writer).
      { path: '/api/role-profile', router: roleProfileRouter },
      { path: '/api/privacy-ops', router: privacyOpsRouter },
      // V2b — Foundation aggregator: Shahin calls /api/foundation/users,
      // /api/foundation/teams, /api/foundation/dashboard etc. against the
      // same handlers as the top-level /api/users, /api/teams routes.
      { path: '/api/foundation', router: foundationRouter },
      // Foundation DNA readiness probe — consumed by PlatformReadinessService
      // in @dos/access-store to flip Foundation's nav state between
      // 'backend-offline' and enabled. No auth required.
      { path: '/api/health/foundation', router: healthFoundationRouter },
    ],
    healthChecks: {
      database: checkDatabase,
      redis: checkRedis,
      schema: checkCriticalTables,
    },
  });

  await startConsumer();

  await start();
}

main().catch(err => {
  logger.error(`[${SERVICE_CODE}] Failed to start`, { err: (err as Error)?.message });
  // Fatal startup failure — intentional console output before process exit.
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
