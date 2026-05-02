/**
 * @dos/module-dos — module-facing orchestrator surface.
 *
 * Modules call getTenant / publishEvent / subscribeEvent / registerModule /
 * isModuleRegistered / listProducts through this shim. The product shell
 * binds the actual DOSPort at bootstrap.
 *
 * Enforced by `modules-cannot-import-dos-direct` in .dependency-cruiser.cjs.
 */

import type {
  DOSPort,
  TenantRef,
  PlatformEventEnvelope,
  EventHandler,
  ModuleDescriptor,
  ProductDescriptor,
} from '@dos/ports/dos';

let bound: DOSPort | null = null;

export function bindModuleDOS(port: DOSPort): void {
  bound = port;
}

export function resetModuleDOS(): void {
  bound = null;
}

function requirePort(): DOSPort {
  if (!bound) {
    throw new Error(
      '[@dos/module-dos] not bound. Product shell must call bindModuleDOS(port) during bootstrap before any module uses the orchestrator.',
    );
  }
  return bound;
}

export async function getTenant(tenantId: string): Promise<TenantRef | null> {
  return requirePort().getTenant(tenantId);
}

export async function publishPlatformEvent<TPayload>(event: PlatformEventEnvelope<TPayload>): Promise<void> {
  await requirePort().publishEvent(event);
}

export function subscribePlatformEvent<TPayload>(
  eventType: string,
  subscriberId: string,
  handler: EventHandler<TPayload>,
): void {
  requirePort().subscribeEvent(eventType, subscriberId, handler);
}

export function registerPlatformModule(descriptor: ModuleDescriptor): void {
  requirePort().registerModule(descriptor);
}

export function isPlatformModuleRegistered(moduleCode: string): boolean {
  return requirePort().isModuleRegistered(moduleCode);
}

export async function listPlatformProducts(): Promise<ProductDescriptor[]> {
  return requirePort().listProducts();
}

export type {
  DOSPort,
  TenantRef,
  PlatformEventEnvelope,
  EventHandler,
  ModuleDescriptor,
  ProductDescriptor,
} from '@dos/ports/dos';
