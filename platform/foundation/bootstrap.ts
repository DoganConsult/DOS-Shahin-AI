import type { Express, Router } from 'express';
import {
  bindDatabasePort,
  bindLoggerPort,
  bindMiddlewarePort,
  bindResponsePort,
  bindResiliencePort,
  bindLifecyclePort,
  bindBlueprintPort,
  bindAiPort,
} from './ports';
import { createFoundationAggregatorRouter, type FoundationAggregatorDeps } from './interface/http/foundation-aggregator.routes';
import { foundationHealthRouter } from './interface/http/foundation-health.routes';
import { bootstrapFoundationDefaults } from './application/bootstrap/foundation-bootstrap.service';
import { runCarbonOnlyBootProbe } from './application/bootstrap/carbon-only-boot-probe';
import { logger } from './ports/logger.port';
import manifest from './module.manifest.json';

export interface FoundationHostBindings {
  database?: Parameters<typeof bindDatabasePort>[0];
  logger?: Parameters<typeof bindLoggerPort>[0];
  middleware?: Parameters<typeof bindMiddlewarePort>[0];
  response?: Parameters<typeof bindResponsePort>[0];
  resilience?: Parameters<typeof bindResiliencePort>[0];
  lifecycle?: Parameters<typeof bindLifecyclePort>[0];
  blueprint?: Parameters<typeof bindBlueprintPort>[0];
  ai?: Parameters<typeof bindAiPort>[0];
}

export interface RegisterFoundationOptions extends FoundationHostBindings {
  app?: Express;
  mountPath?: string;
  aggregatorDeps?: FoundationAggregatorDeps;
}

export interface RegisterFoundationResult {
  moduleCode: string;
  routeBase: string;
  router: Router;
  healthRouter: Router;
  manifest: typeof manifest;
}

export function bindFoundationPorts(bindings: FoundationHostBindings = {}): void {
  if (bindings.database) bindDatabasePort(bindings.database);
  if (bindings.logger) bindLoggerPort(bindings.logger);
  if (bindings.middleware) bindMiddlewarePort(bindings.middleware);
  if (bindings.response) bindResponsePort(bindings.response);
  if (bindings.resilience) bindResiliencePort(bindings.resilience);
  if (bindings.lifecycle) bindLifecyclePort(bindings.lifecycle);
  if (bindings.blueprint) bindBlueprintPort(bindings.blueprint);
  if (bindings.ai) bindAiPort(bindings.ai);
}

export function registerFoundation(options: RegisterFoundationOptions = {}): RegisterFoundationResult {
  bindFoundationPorts(options);

  // Fail-fast guard — the aggregator mounts host-owned identity routers
  // (`/users`, `/roles`, `/departments`); without them the router would
  // silently 404 and mask a host-wiring regression.
  const deps = options.aggregatorDeps;
  if (!deps || !deps.userRouter || !deps.roleRouter || !deps.departmentRouter) {
    const missing = (['userRouter', 'roleRouter', 'departmentRouter'] as const).filter(
      (k) => !deps || !deps[k],
    );
    throw new Error(
      `[foundation] registerFoundation: missing aggregatorDeps.{${missing.join(',')}} — host must inject identity routers before mounting`,
    );
  }
  const router = createFoundationAggregatorRouter(deps);
  // Canonical module manifest schema (platform/contracts/module/module.manifest.schema.json)
  // forbids unknown root fields. Runtime hosting hints (routeBase, eventNamespace, etc.)
  // live under metadata.runtime, where additionalProperties is allowed.
  const mountPath = options.mountPath ?? manifest.metadata?.runtime?.routeBase ?? '/api/foundation';
  if (options.app) {
    options.app.use(mountPath, router);
    options.app.use(`${mountPath}/health`, foundationHealthRouter);
  }
  logger.info('foundation.registered', { mountPath, version: manifest.version });
  return {
    moduleCode: manifest.moduleCode,
    routeBase: mountPath,
    router,
    healthRouter: foundationHealthRouter,
    manifest,
  };
}

export async function onInstall(ctx: { tenantId?: string } = {}): Promise<void> {
  logger.info('foundation.onInstall', { tenantId: ctx.tenantId });
  if (ctx.tenantId) {
    await bootstrapFoundationDefaults({ tenantId: ctx.tenantId, actorId: 'system' } as any).catch((err) => {
      logger.error('foundation.onInstall.bootstrap.failed', { tenantId: ctx.tenantId, err: String(err) });
    });
  }
}

export async function onActivate(ctx: { tenantId?: string } = {}): Promise<void> {
  logger.info('foundation.onActivate', { tenantId: ctx.tenantId });
  // Layer 7 of Carbon-only enforcement: refuse to activate if catalog
  // or runtime registry has drifted away from IBM-Carbon-only invariants.
  // Runs once per service start, before HTTP traffic begins.
  await runCarbonOnlyBootProbe();
}

export async function onMigrate(ctx: { tenantId?: string; toVersion?: string } = {}): Promise<void> {
  logger.info('foundation.onMigrate', { tenantId: ctx.tenantId, toVersion: ctx.toVersion });
}

export async function onUninstall(ctx: { tenantId?: string } = {}): Promise<void> {
  logger.info('foundation.onUninstall', { tenantId: ctx.tenantId });
}

export default registerFoundation;
