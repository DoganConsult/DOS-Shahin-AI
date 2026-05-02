/**
 * Provisioning API Service
 * Canonical location: core/services/api/provisioning-api.service.ts
 * Provides typed access to tenant provisioning and workspace setup resources.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type ProvisioningStatus =
  | 'pending'
  | 'in_progress'
  | 'provisioned'
  | 'failed'
  | 'suspended'
  | 'deprovisioned';

export interface ProvisioningRecordDto {
  id: string;
  tenantId?: string;
  tenantName?: string;
  status: ProvisioningStatus;
  plan?: string;
  region?: string;
  enabledModules?: string[];
  ownerId?: string;
  provisionedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ProvisioningListResponse {
  items: ProvisioningRecordDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ProvisionTenantRequest {
  tenantName: string;
  ownerId: string;
  plan: string;
  region?: string;
  enabledModules?: string[];
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ProvisioningApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<ProvisioningListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<ProvisioningListResponse>(`${this.base}/provisioning`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<ProvisioningRecordDto> {
    return this.http.get<ProvisioningRecordDto>(`${this.base}/provisioning/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  provision(request: ProvisionTenantRequest): Observable<ProvisioningRecordDto> {
    return this.http.post<ProvisioningRecordDto>(`${this.base}/provisioning/v2`, request).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getStatus(tenantId: string): Observable<{ status: ProvisioningStatus; progress?: number }> {
    return this.http.get<{ status: ProvisioningStatus; progress?: number }>(
      `${this.base}/provisioning/status/${tenantId}`
    ).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  retry(id: string): Observable<ProvisioningRecordDto> {
    return this.http.post<ProvisioningRecordDto>(`${this.base}/provisioning/${id}/retry`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  suspend(tenantId: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/provisioning/${tenantId}/suspend`, { reason }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
