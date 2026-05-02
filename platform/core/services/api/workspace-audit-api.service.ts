/**
 * Workspace Audit API Service
 * Canonical location: core/services/api/workspace-audit-api.service.ts
 * Provides typed access to workspace audit trail and activity log resources.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type AuditLogAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'export' | 'import'
  | 'approve' | 'reject' | 'escalate' | 'assign'
  | 'permission_change' | 'settings_change' | string;

export interface WorkspaceAuditLogDto {
  id: string;
  action: AuditLogAction;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  metadata?: Record<string, unknown>;
  performedAt: string;
  [key: string]: unknown;
}

export interface WorkspaceAuditListResponse {
  items: WorkspaceAuditLogDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface AuditSearchRequest {
  actorId?: string;
  action?: AuditLogAction;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceAuditApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<WorkspaceAuditListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<WorkspaceAuditListResponse>(`${this.base}/workspace/audit`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<WorkspaceAuditLogDto> {
    return this.http.get<WorkspaceAuditLogDto>(`${this.base}/workspace/audit/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  search(request: AuditSearchRequest): Observable<WorkspaceAuditListResponse> {
    return this.http.post<WorkspaceAuditListResponse>(`${this.base}/workspace/audit/search`, request).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  exportCsv(request: AuditSearchRequest): Observable<Blob> {
    return this.http.post(`${this.base}/workspace/audit/export/csv`, request, { responseType: 'blob' }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getActivitySummary(days = 30): Observable<{ actions: Record<string, number>; topActors: string[] }> {
    return this.http.get<{ actions: Record<string, number>; topActors: string[] }>(
      `${this.base}/workspace/audit/summary`, { params: new HttpParams().set('days', days.toString()) }
    ).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
