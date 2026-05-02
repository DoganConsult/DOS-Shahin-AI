/**
 * BCP API Service
 * Canonical location: core/services/api/bcp-api.service.ts
 * Provides typed access to Business Continuity Plan resources.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface BcpPlanDto {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'retired' | string;
  scope?: string;
  ownerId?: string;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface BcpListResponse {
  items: BcpPlanDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class BcpApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<BcpListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<BcpListResponse>(`${this.base}/bcp`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<BcpPlanDto> {
    return this.http.get<BcpPlanDto>(`${this.base}/bcp/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  create(payload: Partial<BcpPlanDto>): Observable<BcpPlanDto> {
    return this.http.post<BcpPlanDto>(`${this.base}/bcp`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  update(id: string, payload: Partial<BcpPlanDto>): Observable<BcpPlanDto> {
    return this.http.patch<BcpPlanDto>(`${this.base}/bcp/${id}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/bcp/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
