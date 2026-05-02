/**
 * Inbox API Service
 * Canonical location: core/services/api/inbox-api.service.ts
 * Provides typed access to user notification inbox resources.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface InboxItemDto {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  isPinned?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  createdAt: string;
  readAt?: string;
  [key: string]: unknown;
}

export interface InboxListResponse {
  items: InboxItemDto[];
  total: number;
  unreadCount: number;
  page?: number;
  pageSize?: number;
}

export interface InboxBulkActionRequest {
  ids: string[];
  action: 'mark_read' | 'mark_unread' | 'delete' | 'pin' | 'unpin';
}

@Injectable({ providedIn: 'root' })
export class InboxApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<InboxListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<InboxListResponse>(`${this.base}/inbox`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<InboxItemDto> {
    return this.http.get<InboxItemDto>(`${this.base}/inbox/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  markRead(id: string): Observable<InboxItemDto> {
    return this.http.patch<InboxItemDto>(`${this.base}/inbox/${id}/read`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  markAllRead(): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.base}/inbox/mark-all-read`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  bulkAction(request: InboxBulkActionRequest): Observable<{ affected: number }> {
    return this.http.post<{ affected: number }>(`${this.base}/inbox/bulk`, request).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/inbox/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/inbox/unread-count`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getDashboard(): Observable<unknown> {
    return this.http.get(`${this.base}/inbox/dashboard`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
