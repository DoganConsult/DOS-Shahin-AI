/**
 * @dos/dos-core — orchestrator public surface.
 */

export { createDOSPort } from './dos-port.impl';
export type {
  DOSPortDependencies,
  BackbonePublisher,
  BackboneSubscriber,
} from './dos-port.impl';

export {
  getDOSPort,
  tryGetDOSPort,
  setDOSPort,
  resetDOSPort,
} from './dos-port.registry';

export {
  InMemoryTenantsRepository,
  PgTenantsRepository,
  InMemoryModulesRepository,
  PgModulesRepository,
  InMemoryProductsRepository,
  PgProductsRepository,
  InMemoryEventsLogRepository,
  PgEventsLogRepository,
} from './repositories';
export type {
  TenantsRepository,
  ModulesRepository,
  ProductsRepository,
  EventsLogRepository,
} from './repositories';

export { buildDOSAgentTools } from './agent-tools';
export type { DOSAgentToolsDeps } from './agent-tools';

export { loadProducts, discoverProductManifests } from './product-registry.loader';
export type { LoadProductsDeps, LoadProductsResult, ProductManifestJson } from './product-registry.loader';

export {
  runSchedulerTick,
  startSchedulerLoop,
  cronMatches,
  InMemoryScheduledJobsRepository,
  PgScheduledJobsRepository,
} from './scheduler';
export type {
  ScheduledJobRow,
  ScheduledJobsRepository,
  SchedulerDeps,
  JobHandler,
} from './scheduler';

export type {
  DOSPort,
  TenantRef,
  PlatformEventEnvelope,
  EventHandler,
  ModuleDescriptor,
  ProductDescriptor,
} from '@dos/ports/dos';
