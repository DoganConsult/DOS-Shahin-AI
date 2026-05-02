/**
 * Issues API Service
 * Canonical location: core/services/api/issues-api.service.ts
 * Provides typed access to GRC issue tracking resources.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IssueDto {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  severity: IssueSeverity;
  sourceModule?: string;
  sourceEntityId?: string;
  assigneeId?: string;
  reporterId?: string;
  dueDate?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface IssueListResponse {
  items: IssueDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  severity: IssueSeverity;
  sourceModule?: string;
  sourceEntityId?: string;
  assigneeId?: string;
  dueDate?: string;
}

@Injectable({ providedIn: 'root' })
export class IssuesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<IssueListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<IssueListResponse>(`${this.base}/issues`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<IssueDto> {
    return this.http.get<IssueDto>(`${this.base}/issues/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  create(payload: CreateIssueRequest): Observable<IssueDto> {
    return this.http.post<IssueDto>(`${this.base}/issues`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  update(id: string, payload: Partial<IssueDto>): Observable<IssueDto> {
    return this.http.patch<IssueDto>(`${this.base}/issues/${id}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  resolve(id: string, resolution?: string): Observable<IssueDto> {
    return this.http.post<IssueDto>(`${this.base}/issues/${id}/resolve`, { resolution }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  escalate(id: string, reason?: string): Observable<IssueDto> {
    return this.http.post<IssueDto>(`${this.base}/issues/${id}/escalate`, { reason }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/issues/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
