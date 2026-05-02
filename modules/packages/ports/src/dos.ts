/**
 * DOSPort — public surface that the DOS core platform module exposes to
 * DAuth, DSOC, DNOC, and products.
 *
 * DOS owns: orchestration, tenancy, module registry, product registry,
 * events (backbone), jobs, provisioning, workspaces.
 *
 * Consumers of this port MUST NOT import from `@dos/platform-core` directly;
 * they receive a port implementation at runtime.
 */

export interface TenantRef {
  readonly tenantId: string;
  readonly productCode?: string | null;
  readonly status: 'active' | 'suspended' | 'provisioning' | 'decommissioned';
}

export interface PlatformEventEnvelope<TPayload = unknown> {
  readonly eventType: string;
  readonly tenantId: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
  readonly eventId?: string;
  readonly correlationId?: string;
}

export type EventHandler<TPayload = unknown> = (
  event: PlatformEventEnvelope<TPayload>,
) => Promise<void>;

export interface ModuleDescriptor {
  readonly moduleCode: string;
  readonly version: string;
  readonly layer: 'platform' | 'product';
  readonly ownerTeam: string;
}

export interface ProductDescriptor {
  readonly productCode: string;
  readonly version: string;
  readonly enabled: boolean;
}

export interface DOSPort {
  /** Retrieve a tenant's reference record; null if unknown. */
  getTenant(tenantId: string): Promise<TenantRef | null>;

  /** Publish an event on the platform event-backbone. Fire-and-forget at-least-once. */
  publishEvent<TPayload>(event: PlatformEventEnvelope<TPayload>): Promise<void>;

  /** Subscribe to events of a given type. Handler is invoked per delivery. */
  subscribeEvent<TPayload>(
    eventType: string,
    subscriberId: string,
    handler: EventHandler<TPayload>,
  ): void;

  /** Declare that a module is registered with DOS. Idempotent. */
  registerModule(descriptor: ModuleDescriptor): void;

  /** Whether a module is registered. */
  isModuleRegistered(moduleCode: string): boolean;

  /** List all registered products. */
  listProducts(): Promise<ProductDescriptor[]>;
}
