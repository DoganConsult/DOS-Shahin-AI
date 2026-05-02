/**
 * Privacy API Service
 * Canonical location: core/services/api/privacy-api.service.ts
 * Provides typed access to privacy records (DPIA, data mapping, breach reports).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type PrivacyRecordType = 'dpia' | 'data_mapping' | 'breach_report' | 'consent_record' | 'processing_activity';
export type PrivacyRecordStatus = 'draft' | 'under_review' | 'approved' | 'rejected' | 'archived';

export interface PrivacyRecordDto {
  id: string;
  type: PrivacyRecordType;
  title: string;
  description?: string;
  status: PrivacyRecordStatus;
  dataCategories?: string[];
  legalBasis?: string;
  retentionPeriod?: string;
  dpoAssigneeId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PrivacyListResponse {
  items: PrivacyRecordDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class PrivacyApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<PrivacyListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<PrivacyListResponse>(`${this.base}/privacy`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<PrivacyRecordDto> {
    return this.http.get<PrivacyRecordDto>(`${this.base}/privacy/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  create(payload: Partial<PrivacyRecordDto>): Observable<PrivacyRecordDto> {
    return this.http.post<PrivacyRecordDto>(`${this.base}/privacy`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  update(id: string, payload: Partial<PrivacyRecordDto>): Observable<PrivacyRecordDto> {
    return this.http.patch<PrivacyRecordDto>(`${this.base}/privacy/${id}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  submit(id: string): Observable<PrivacyRecordDto> {
    return this.http.post<PrivacyRecordDto>(`${this.base}/privacy/${id}/submit`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/privacy/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
