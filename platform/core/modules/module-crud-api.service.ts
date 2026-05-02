import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '@env/environment';

export interface CrudCapability {
  module: string;
  moduleEn: string;
  moduleAr: string;
  icon: string;
  route: string;
  apiBase: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canBulk: boolean;
  fields: CrudField[];
  filters: CrudFilter[];
}

export interface CrudField {
  key: string;
  labelEn: string;
  labelAr: string;
  type: string;
  required: boolean;
  options?: { value: string; labelEn: string; labelAr: string }[];
  showInList: boolean;
  showInForm: boolean;
  editable: boolean;
}

export interface CrudFilter {
  key: string;
  labelEn: string;
  labelAr: string;
  type: string;
  options?: { value: string; labelEn: string; labelAr: string }[];
}

export interface ActivityEntry {
  activityId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  metadata: Record<string, unknown>;
  read: boolean;
  archived: boolean;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface EntityLink {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ModuleRecord {
  id: string;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ModuleCrudApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getCapabilities(): Observable<CrudCapability[]> {
    return this.http.get<{ capabilities: CrudCapability[] }>(`${this.base}/auto-crud`).pipe(
      map(r => r.capabilities ?? []),
      catchError(() => of([])),
    );
  }

  getModuleCapability(moduleCode: string): Observable<CrudCapability | null> {
    return this.http.get<CrudCapability>(`${this.base}/auto-crud/module/${moduleCode}`).pipe(
      catchError(() => of(null)),
    );
  }

  listRecords(apiBase: string, params?: { page?: number; pageSize?: number; sort?: string; order?: string; search?: string; filters?: Record<string, string> }): Observable<PaginatedResult<ModuleRecord>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('limit', params.pageSize);
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    if (params?.order) httpParams = httpParams.set('order', params.order);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.filters) {
      for (const [k, v] of Object.entries(params.filters)) {
        if (v) httpParams = httpParams.set(k, v);
      }
    }
    return this.http.get<unknown>(`${this.base}${apiBase}`, { params: httpParams }).pipe(
      map((res: unknown) => {
        const r = res as Record<string, unknown>;
        const items = (r['data'] ?? r['items'] ?? r['records'] ?? r['results'] ?? (Array.isArray(r) ? r : [])) as ModuleRecord[];
        const total = (r['total'] ?? r['count'] ?? items.length) as number;
        return { data: items, total, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 };
      }),
      catchError(() => of({ data: [], total: 0, page: 1, pageSize: 20 })),
    );
  }

  getRecord(apiBase: string, id: string): Observable<ModuleRecord | null> {
    return this.http.get<unknown>(`${this.base}${apiBase}/${id}`).pipe(
      map((res: unknown) => {
        const r = res as Record<string, unknown>;
        return (r['data'] ?? r['record'] ?? r['item'] ?? r) as ModuleRecord;
      }),
      catchError(() => of(null)),
    );
  }

  createRecord(apiBase: string, data: Record<string, unknown>): Observable<ModuleRecord> {
    return this.http.post<unknown>(`${this.base}${apiBase}`, data).pipe(
      map((res: unknown) => {
        const r = res as Record<string, unknown>;
        return (r['data'] ?? r['record'] ?? r['item'] ?? r) as ModuleRecord;
      }),
    );
  }

  updateRecord(apiBase: string, id: string, data: Record<string, unknown>): Observable<ModuleRecord> {
    return this.http.put<unknown>(`${this.base}${apiBase}/${id}`, data).pipe(
      map((res: unknown) => {
        const r = res as Record<string, unknown>;
        return (r['data'] ?? r['record'] ?? r['item'] ?? r) as ModuleRecord;
      }),
    );
  }

  deleteRecord(apiBase: string, id: string): Observable<boolean> {
    return this.http.delete<unknown>(`${this.base}${apiBase}/${id}`).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  getActivityFeed(moduleCode: string, entityId?: string, limit = 20): Observable<ActivityEntry[]> {
    let params = new HttpParams().set('module', moduleCode).set('limit', limit);
    if (entityId) params = params.set('entity_id', entityId);
    return this.http.get<unknown>(`${this.base}/activity-feed`, { params }).pipe(
      map((res: unknown) => {
        const r = res as Record<string, unknown>;
        const activities = (r['activities'] ?? r['feed'] ?? []) as ActivityEntry[];
        return activities;
      }),
      catchError(() => of([])),
    );
  }

  getEntityLinks(entityType: string, entityId: string): Observable<EntityLink[]> {
    return this.http.get<{ links: EntityLink[] }>(`${this.base}/entity-links/${entityType}/${entityId}`).pipe(
      map(r => r.links ?? []),
      catchError(() => of([])),
    );
  }

  getEntityLinkCounts(entityType: string, entityId: string): Observable<Record<string, number>> {
    return this.http.get<{ counts: Record<string, number> }>(`${this.base}/entity-links/${entityType}/${entityId}/counts`).pipe(
      map(r => r.counts ?? {}),
      catchError(() => of({})),
    );
  }

  createEntityLink(link: Omit<EntityLink, 'id'>): Observable<EntityLink> {
    return this.http.post<EntityLink>(`${this.base}/entity-links`, link);
  }

  transitionWorkflow(moduleCode: string, recordId: string, toState: string): Observable<any> {
    return this.http.post(`${this.base}/workflow/transition`, {
      moduleCode, recordId, toState,
    }).pipe(catchError(() => of({ success: false })));
  }

  getWorkflowState(moduleCode: string, recordId: string): Observable<{ currentState: string; completedStates: string[]; availableTransitions: string[] }> {
    return this.http.get<{ currentState: string; completedStates: string[]; availableTransitions: string[] }>(
      `${this.base}/workflow/state/${moduleCode}/${recordId}`,
    ).pipe(
      catchError(() => of({ currentState: 'draft', completedStates: [], availableTransitions: [] })),
    );
  }

  getModuleStats(moduleCode: string): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.base}/dashboard/module-stats/${moduleCode}`).pipe(
      catchError(() => of({})),
    );
  }

  exportRecords(apiBase: string, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.base}${apiBase}/export`, {
      params: { format },
      responseType: 'blob',
    });
  }

  bulkAction(apiBase: string, action: string, ids: string[]): Observable<{ success: boolean; count: number }> {
    return this.http.post<{ success: boolean; count: number }>(`${this.base}${apiBase}/bulk`, {
      action, ids,
    }).pipe(catchError(() => of({ success: false, count: 0 })));
  }
}
