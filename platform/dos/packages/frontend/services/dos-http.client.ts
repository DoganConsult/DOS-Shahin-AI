/**
 * Real HTTP clients for the DOS port REST surface.
 * Four injectable clients backing the four DI tokens.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type {
  DOSTenantLookupPort,
  DOSModuleRegistryPort,
  DOSProductRegistryPort,
  DOSEventLogPort,
} from '../ports';
import type {
  TenantRef,
  ModuleDescriptor,
  ProductDescriptor,
  PlatformEventEnvelope,
} from '@dos/ports/dos';

const BASE = '/api/dos/port/v1';

@Injectable({ providedIn: 'root' })
export class DOSTenantLookupHttpClient implements DOSTenantLookupPort {
  private http = inject(HttpClient);
  get(tenantId: string): Observable<TenantRef | null> {
    return this.http
      .get<TenantRef>(`${BASE}/tenants/${encodeURIComponent(tenantId)}`)
      .pipe(catchError(() => of<TenantRef | null>(null)));
  }
}

@Injectable({ providedIn: 'root' })
export class DOSModuleRegistryHttpClient implements DOSModuleRegistryPort {
  private http = inject(HttpClient);
  list(layer?: 'platform' | 'product'): Observable<readonly ModuleDescriptor[]> {
    const params = layer ? { layer } : {};
    return this.http
      .get<{ count: number; modules: readonly ModuleDescriptor[] }>(`${BASE}/modules`, { params })
      .pipe(map((r) => r.modules ?? []));
  }
}

@Injectable({ providedIn: 'root' })
export class DOSProductRegistryHttpClient implements DOSProductRegistryPort {
  private http = inject(HttpClient);
  list(): Observable<readonly ProductDescriptor[]> {
    return this.http
      .get<{ count: number; products: readonly ProductDescriptor[] }>(`${BASE}/products`)
      .pipe(map((r) => r.products ?? []));
  }
}

@Injectable({ providedIn: 'root' })
export class DOSEventLogHttpClient implements DOSEventLogPort {
  private http = inject(HttpClient);
  recent(tenantId: string, limit: number): Observable<readonly PlatformEventEnvelope[]> {
    return this.http
      .get<{ tenantId: string; count: number; events: readonly PlatformEventEnvelope[] }>(
        `${BASE}/tenants/${encodeURIComponent(tenantId)}/events`,
        { params: { limit: String(limit) } },
      )
      .pipe(map((r) => r.events ?? []));
  }
}
