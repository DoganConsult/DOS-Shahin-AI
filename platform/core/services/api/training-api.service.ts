/**
 * Training API Service
 * Canonical location: core/services/api/training-api.service.ts
 * Provides typed access to training courses, enrollments, and completion records.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'waived';

export interface TrainingCourseDto {
  id: string;
  title: string;
  description?: string;
  moduleCode?: string;
  durationMinutes?: number;
  mandatory: boolean;
  expiryDays?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface TrainingEnrollmentDto {
  id: string;
  courseId: string;
  userId: string;
  status: TrainingStatus;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  score?: number;
  certificateId?: string;
  [key: string]: unknown;
}

export interface TrainingListResponse {
  items: Array<TrainingCourseDto | TrainingEnrollmentDto>;
  total: number;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class TrainingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listCourses(params?: Record<string, string>): Observable<TrainingListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<TrainingListResponse>(`${this.base}/training/courses`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getCourse(id: string): Observable<TrainingCourseDto> {
    return this.http.get<TrainingCourseDto>(`${this.base}/training/courses/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  listEnrollments(params?: Record<string, string>): Observable<TrainingListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<TrainingListResponse>(`${this.base}/training/enrollments`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<TrainingEnrollmentDto> {
    return this.http.get<TrainingEnrollmentDto>(`${this.base}/training/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  enroll(courseId: string, userId: string, dueDate?: string): Observable<TrainingEnrollmentDto> {
    return this.http.post<TrainingEnrollmentDto>(`${this.base}/training/enrollments`, { courseId, userId, dueDate }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  complete(enrollmentId: string, score?: number): Observable<TrainingEnrollmentDto> {
    return this.http.post<TrainingEnrollmentDto>(`${this.base}/training/enrollments/${enrollmentId}/complete`, { score }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  /** @deprecated @removal-date Phase 9 @owner DOS @replacement listCourses/listEnrollments for typed access */
  list(params?: Record<string, string>): Observable<TrainingListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<TrainingListResponse>(`${this.base}/training`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
