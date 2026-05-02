/**
 * Records API Service
 * Canonical location: core/services/api/records-api.service.ts
 * Provides typed access to generic GRC record resources (cross-module).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface GrcRecordDto {
  id: string;
  recordType: string;
  title: string;
  description?: string;
  status: string;
  moduleCode?: string;
  ownerId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface GrcRecordListResponse {
  items: GrcRecordDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface RecordsSearchRequest {
  query?: string;
  moduleCode?: string;
  recordType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class RecordsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<GrcRecordListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<GrcRecordListResponse>(`${this.base}/records`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<GrcRecordDto> {
    return this.http.get<GrcRecordDto>(`${this.base}/records/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  search(request: RecordsSearchRequest): Observable<GrcRecordListResponse> {
    return this.http.post<GrcRecordListResponse>(`${this.base}/records/search`, request).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  create(payload: Partial<GrcRecordDto>): Observable<GrcRecordDto> {
    return this.http.post<GrcRecordDto>(`${this.base}/records`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  update(id: string, payload: Partial<GrcRecordDto>): Observable<GrcRecordDto> {
    return this.http.patch<GrcRecordDto>(`${this.base}/records/${id}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/records/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
