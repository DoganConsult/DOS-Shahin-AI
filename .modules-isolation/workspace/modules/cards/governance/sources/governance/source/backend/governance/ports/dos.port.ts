/**
 * Governance module → orchestrator port.
 * Re-exports @dos/module-dos so the rest of the module stays decoupled
 * from the concrete DOS implementation.
 */

export {
  bindModuleDOS,
  resetModuleDOS,
  getTenant,
  publishPlatformEvent,
  subscribePlatformEvent,
  registerPlatformModule,
  isPlatformModuleRegistered,
  listPlatformProducts,
} from '@dos/module-dos';

export type {
  DOSPort,
  TenantRef,
  PlatformEventEnvelope,
  EventHandler,
  ModuleDescriptor,
  ProductDescriptor,
} from '@dos/module-dos';
