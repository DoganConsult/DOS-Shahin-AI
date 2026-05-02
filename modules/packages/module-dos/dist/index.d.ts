/**
 * @dos/module-dos — module-facing orchestrator surface.
 *
 * Modules call getTenant / publishEvent / subscribeEvent / registerModule /
 * isModuleRegistered / listProducts through this shim. The product shell
 * binds the actual DOSPort at bootstrap.
 *
 * Enforced by `modules-cannot-import-dos-direct` in .dependency-cruiser.cjs.
 */
import type { DOSPort, TenantRef, PlatformEventEnvelope, EventHandler, ModuleDescriptor, ProductDescriptor } from '@dos/ports/dos';
export declare function bindModuleDOS(port: DOSPort): void;
export declare function resetModuleDOS(): void;
export declare function getTenant(tenantId: string): Promise<TenantRef | null>;
export declare function publishPlatformEvent<TPayload>(event: PlatformEventEnvelope<TPayload>): Promise<void>;
export declare function subscribePlatformEvent<TPayload>(eventType: string, subscriberId: string, handler: EventHandler<TPayload>): void;
export declare function registerPlatformModule(descriptor: ModuleDescriptor): void;
export declare function isPlatformModuleRegistered(moduleCode: string): boolean;
export declare function listPlatformProducts(): Promise<ProductDescriptor[]>;
export type { DOSPort, TenantRef, PlatformEventEnvelope, EventHandler, ModuleDescriptor, ProductDescriptor, } from '@dos/ports/dos';
//# sourceMappingURL=index.d.ts.map