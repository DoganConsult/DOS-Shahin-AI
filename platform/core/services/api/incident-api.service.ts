/**
 * Incident API Service
 * Canonical location: core/services/api/incident-api.service.ts
 * Provides typed access to incident management resources.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed' | 'escalated';

export interface IncidentDto {
  id: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category?: string;
  impactedSystems?: string[];
  reporterId?: string;
  assigneeId?: string;
  teamId?: string;
  detectedAt?: string;
  containedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  rootCause?: string;
  lessonLearned?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface IncidentListResponse {
  items: IncidentDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  category?: string;
  impactedSystems?: string[];
  assigneeId?: string;
}

export interface IncidentUpdateRequest {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  assigneeId?: string;
  containedAt?: string;
  rootCause?: string;
  lessonLearned?: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<IncidentListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<IncidentListResponse>(`${this.base}/incidents`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<IncidentDto> {
    return this.http.get<IncidentDto>(`${this.base}/incidents/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  create(payload: CreateIncidentRequest): Observable<IncidentDto> {
    return this.http.post<IncidentDto>(`${this.base}/incidents`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  update(id: string, payload: IncidentUpdateRequest): Observable<IncidentDto> {
    return this.http.patch<IncidentDto>(`${this.base}/incidents/${id}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  escalate(id: string, reason?: string): Observable<IncidentDto> {
    return this.http.post<IncidentDto>(`${this.base}/incidents/${id}/escalate`, { reason }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  resolve(id: string, rootCause?: string, lessonLearned?: string): Observable<IncidentDto> {
    return this.http.post<IncidentDto>(`${this.base}/incidents/${id}/resolve`, { rootCause, lessonLearned }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  close(id: string): Observable<IncidentDto> {
    return this.http.post<IncidentDto>(`${this.base}/incidents/${id}/close`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/incidents/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
