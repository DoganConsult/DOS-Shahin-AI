/**
 * @dos/module-qiyas — bootstrap entrypoint.
 * Mirrors Foundation/Compliance: register, bind ports, lifecycle hooks.
 */
import type { Express, Router } from 'express';
import manifest from './module.manifest.json';

export interface QiyasHostBindings {
  database?: Record<string, unknown>;
  logger?: Record<string, unknown>;
  middleware?: Record<string, unknown>;
  response?: Record<string, unknown>;
  resilience?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  events?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  schemas?: Record<string, unknown>;
}

export interface RegisterQiyasOptions extends QiyasHostBindings {
  app?: Express;
  mountPath?: string;
  routers?: Record<string, Router>;
}

export interface RegisterQiyasResult {
  moduleCode: string;
  routeBase: string;
  manifest: typeof manifest;
}

const _bindings: QiyasHostBindings = {};

export function bindQiyasPorts(bindings: QiyasHostBindings = {}): void {
  Object.assign(_bindings, bindings);
}

export function registerQiyas(options: RegisterQiyasOptions = {}): RegisterQiyasResult {
  bindQiyasPorts(options);
  const mountPath = options.mountPath ?? '/api/qiyas';
  if (options.app && options.routers) {
    for (const [base, router] of Object.entries(options.routers)) {
      options.app.use(base, router);
    }
  }
  return {
    moduleCode: manifest.moduleCode,
    routeBase: mountPath,
    manifest,
  };
}

export async function onInstall(ctx: { tenantId?: string } = {}): Promise<void> {
  console.log('[qiyas] onInstall', { tenantId: ctx.tenantId });
}

export async function onActivate(ctx: { tenantId?: string } = {}): Promise<void> {
  console.log('[qiyas] onActivate', { tenantId: ctx.tenantId });
}

export async function onMigrate(ctx: { tenantId?: string; toVersion?: string } = {}): Promise<void> {
  console.log('[qiyas] onMigrate', { tenantId: ctx.tenantId, toVersion: ctx.toVersion });
}

export async function onUninstall(ctx: { tenantId?: string } = {}): Promise<void> {
  console.log('[qiyas] onUninstall', { tenantId: ctx.tenantId });
}

export default registerQiyas;
