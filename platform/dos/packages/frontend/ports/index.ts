/**
 * DOS frontend injection ports. Product shells provide concrete
 * implementations (typically HTTP clients pointed at /api/dos/port/v1).
 */

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  TenantRef,
  ModuleDescriptor,
  ProductDescriptor,
  PlatformEventEnvelope,
} from '@dos/ports/dos';

export interface DOSTenantLookupPort {
  get(tenantId: string): Observable<TenantRef | null>;
}

export interface DOSModuleRegistryPort {
  list(layer?: 'platform' | 'product'): Observable<readonly ModuleDescriptor[]>;
}

export interface DOSProductRegistryPort {
  list(): Observable<readonly ProductDescriptor[]>;
}

export interface DOSEventLogPort {
  recent(tenantId: string, limit: number): Observable<readonly PlatformEventEnvelope[]>;
}

export const DOS_TENANT_LOOKUP_PORT = new InjectionToken<DOSTenantLookupPort>('DOSTenantLookupPort');
export const DOS_MODULE_REGISTRY_PORT = new InjectionToken<DOSModuleRegistryPort>('DOSModuleRegistryPort');
export const DOS_PRODUCT_REGISTRY_PORT = new InjectionToken<DOSProductRegistryPort>('DOSProductRegistryPort');
export const DOS_EVENT_LOG_PORT = new InjectionToken<DOSEventLogPort>('DOSEventLogPort');
