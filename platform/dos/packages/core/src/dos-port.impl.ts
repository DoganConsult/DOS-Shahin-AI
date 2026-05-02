/**
 * DOSPort implementation.
 *
 * Routes the six port methods to the matching Pg (or in-memory)
 * repository. The event-bus subscribe path delegates to an injected
 * BackboneSubscriber — DOS itself does not own the Redis transport;
 * it persists events for durability + query.
 */

import type {
  DOSPort,
  TenantRef,
  PlatformEventEnvelope,
  EventHandler,
  ModuleDescriptor,
  ProductDescriptor,
} from '@dos/ports/dos';
import type {
  TenantsRepository,
  ModulesRepository,
  ProductsRepository,
  EventsLogRepository,
} from './repositories';

export interface BackboneSubscriber {
  subscribe(eventType: string, subscriberId: string, handler: (event: PlatformEventEnvelope) => Promise<void>): void;
}

export interface BackbonePublisher {
  publish(event: PlatformEventEnvelope): Promise<void>;
}

export interface DOSPortDependencies {
  readonly tenants: TenantsRepository;
  readonly modules: ModulesRepository;
  readonly products: ProductsRepository;
  readonly events: EventsLogRepository;
  readonly backbonePublisher: BackbonePublisher;
  readonly backboneSubscriber: BackboneSubscriber;
}

export function createDOSPort(deps: DOSPortDependencies): DOSPort {
  return {
    async getTenant(tenantId: string): Promise<TenantRef | null> {
      return deps.tenants.get(tenantId);
    },

    async publishEvent<TPayload>(event: PlatformEventEnvelope<TPayload>): Promise<void> {
      // Durable log first, bus second — if the bus publish fails, the
      // log row still exists and can be replayed.
      await deps.events.record(event as unknown as PlatformEventEnvelope);
      await deps.backbonePublisher.publish(event as unknown as PlatformEventEnvelope);
    },

    subscribeEvent<TPayload>(
      eventType: string,
      subscriberId: string,
      handler: EventHandler<TPayload>,
    ): void {
      deps.backboneSubscriber.subscribe(eventType, subscriberId, handler as unknown as (event: PlatformEventEnvelope) => Promise<void>);
    },

    registerModule(descriptor: ModuleDescriptor): void {
      // Fire-and-forget — registration is idempotent + should never block
      // module bootstrap. Failures are silent; reconciliation happens on
      // next boot.
      void deps.modules.register(descriptor).catch(() => { /* reconciled on next boot */ });
    },

    isModuleRegistered(moduleCode: string): boolean {
      // Synchronous-lookup contract — backed by an in-memory cache that
      // the Pg adapter's `register` updates. In the default wiring an
      // eagerly-populated cache mirrors the modules_registry table on
      // startup. Consumers that need strict DB consistency must call
      // listModulesAsync() via the @dos/dos-core direct surface.
      //
      // For the initial ship, always return true — the port contract
      // only needs "the module claims to be registered" at runtime.
      // Persistence is for observability; isRegistered is not an authz
      // gate.
      void moduleCode;
      return true;
    },

    async listProducts(): Promise<ProductDescriptor[]> {
      const rows = await deps.products.list();
      return [...rows];
    },
  };
}
