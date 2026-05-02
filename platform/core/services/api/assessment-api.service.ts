/**
 * Assessment API Service
 * Canonical location: core/services/api/assessment-api.service.ts
 * Provides typed access to assessment resources (risk, compliance, maturity).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type AssessmentType = 'risk' | 'compliance' | 'maturity' | 'vendor' | 'control' | 'qiyas';
export type AssessmentStatus = 'draft' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'archived';

export interface AssessmentDto {
  id: string;
  type: AssessmentType;
  title: string;
  description?: string;
  status: AssessmentStatus;
  frameworkId?: string;
  scope?: string;
  score?: number;
  maxScore?: number;
  percentComplete?: number;
  assessorId?: string;
  reviewerId?: string;
  approvedAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface AssessmentListResponse {
  items: AssessmentDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface AssessmentScoreResult {
  assessmentId: string;
  score: number;
  maxScore: number;
  percentComplete: number;
  maturityLevel?: string;
  breakdown?: Array<{ category: string; score: number; maxScore: number }>;
}

@Injectable({ providedIn: 'root' })
export class AssessmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<AssessmentListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<AssessmentListResponse>(`${this.base}/assessments`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<AssessmentDto> {
    return this.http.get<AssessmentDto>(`${this.base}/assessments/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  create(payload: Partial<AssessmentDto>): Observable<AssessmentDto> {
    return this.http.post<AssessmentDto>(`${this.base}/assessments`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  update(id: string, payload: Partial<AssessmentDto>): Observable<AssessmentDto> {
    return this.http.patch<AssessmentDto>(`${this.base}/assessments/${id}`, payload).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  submit(id: string): Observable<AssessmentDto> {
    return this.http.post<AssessmentDto>(`${this.base}/assessments/${id}/submit`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  approve(id: string, notes?: string): Observable<AssessmentDto> {
    return this.http.post<AssessmentDto>(`${this.base}/assessments/${id}/approve`, { notes }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getScore(id: string): Observable<AssessmentScoreResult> {
    return this.http.get<AssessmentScoreResult>(`${this.base}/assessments/${id}/score`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assessments/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
