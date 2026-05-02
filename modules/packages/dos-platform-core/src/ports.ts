import type {
  LifecycleDefinition,
  ModuleRegistrationContract,
  ProductManifest,
  ProvisioningContract,
  TenantContract,
  WorkspaceContract,
} from '@dos/contracts';
import type {
  EventRegistration,
  PlatformEvent,
  NotificationPayload,
  NotificationRecord,
  SearchQuery,
  SearchResponse,
  SearchEntityType,
  ScheduledJob,
  JobRun,
} from '@dos/types';

export interface DosEventBusPort {
  publish(event: PlatformEvent): Promise<void | string>;
  subscribe(eventType: string, subscriberId: string, handler: (event: PlatformEvent) => Promise<void>): void;
  registerEventType?(registration: EventRegistration): void;
}

export interface DosLifecyclePort {
  register(definition: LifecycleDefinition): void;
  getDefinition(entityType: string): LifecycleDefinition | undefined;
  getAllDefinitions(): LifecycleDefinition[];
}

export interface DosModuleRegistryPort {
  register(contract: ModuleRegistrationContract): void;
  isRegistered(moduleCode: string): boolean;
}

export interface DosProductRegistryPort {
  register(manifest: ProductManifest): void;
  get(productCode: string): ProductManifest | undefined;
  getAll(): ProductManifest[];
}

export interface DosProvisioningPort {
  getStatus(tenantId: string): Promise<ProvisioningContract | null>;
  start?(tenantId: string): Promise<ProvisioningContract>;
}

export interface DosTenancyPort {
  getTenant(tenantId: string): Promise<TenantContract | null>;
  listTenants?(): Promise<TenantContract[]>;
}

export interface DosWorkspacePort {
  getWorkspace(workspaceId: string): Promise<WorkspaceContract | null>;
  listWorkspaces?(tenantId: string): Promise<WorkspaceContract[]>;
}

export interface DosObservabilityPort {
  getHealth(): Promise<unknown>;
  getMetrics?(): Promise<unknown>;
}

export interface BrandingConfig {
  tenantId: string;
  displayName?: string;
  primaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  locale: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
}

export interface DosBrandingPort {
  getBrandingConfig(tenantId: string): Promise<BrandingConfig | null>;
  setBrandingConfig(tenantId: string, config: BrandingConfig): Promise<void>;
}

export interface DosNotificationPort {
  send(payload: NotificationPayload): Promise<NotificationRecord>;
  sendBatch(payloads: NotificationPayload[]): Promise<NotificationRecord[]>;
  getRecord(notificationId: string, tenantId: string): Promise<NotificationRecord | null>;
}

export interface DosJobPort {
  schedule(job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledJob>;
  cancel(jobId: string, tenantId: string): Promise<void>;
  getStatus(jobId: string, tenantId: string): Promise<JobRun | null>;
}

export interface DosStoragePort {
  put(
    tenantId: string,
    key: string,
    data: Buffer | Uint8Array | string,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; size: number }>;
  get(
    tenantId: string,
    key: string,
  ): Promise<{ data: Buffer; metadata: Record<string, string> } | null>;
  delete(tenantId: string, key: string): Promise<void>;
  list(
    tenantId: string,
    prefix?: string,
  ): Promise<Array<{ key: string; size: number; updatedAt: string }>>;
  getSignedUrl?(tenantId: string, key: string, expiresInSeconds: number): Promise<string>;
}

export interface DosSearchPort {
  search(tenantId: string, query: SearchQuery): Promise<SearchResponse>;
  indexDocument(
    tenantId: string,
    entityType: SearchEntityType,
    entityId: string,
    document: Record<string, unknown>,
  ): Promise<void>;
  removeDocument(tenantId: string, entityType: SearchEntityType, entityId: string): Promise<void>;
}

export interface DosResiliencePort {
  withRetry<T>(operation: () => Promise<T>, maxAttempts: number, backoffMs?: number): Promise<T>;
  withCircuitBreaker<T>(key: string, operation: () => Promise<T>): Promise<T>;
  withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T>;
}

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceEndpoint {
  serviceCode: string;
  baseUrl: string;
  health: ServiceHealthStatus;
  lastCheckedAt?: string;
  metadata?: Record<string, string>;
}

export interface DosServiceDiscoveryPort {
  resolve(serviceCode: string): Promise<ServiceEndpoint | null>;
  resolveAll(): Promise<ServiceEndpoint[]>;
  register(endpoint: ServiceEndpoint): Promise<void>;
  deregister(serviceCode: string): Promise<void>;
  healthCheck(serviceCode: string): Promise<ServiceHealthStatus>;
  onServiceChange?(callback: (serviceCode: string, endpoint: ServiceEndpoint | null) => void): void;
}

export interface DosRuntimePorts {
  events?: DosEventBusPort;
  lifecycle?: DosLifecyclePort;
  modules?: DosModuleRegistryPort;
  products?: DosProductRegistryPort;
  provisioning?: DosProvisioningPort;
  tenancy?: DosTenancyPort;
  workspace?: DosWorkspacePort;
  observability?: DosObservabilityPort;
  branding?: DosBrandingPort;
  notifications?: DosNotificationPort;
  jobs?: DosJobPort;
  storage?: DosStoragePort;
  search?: DosSearchPort;
  resilience?: DosResiliencePort;
  discovery?: DosServiceDiscoveryPort;
}
