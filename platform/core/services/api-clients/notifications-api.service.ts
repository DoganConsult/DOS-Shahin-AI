import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationDto {
  id: string;
  title: string;
  body?: string;
  createdAt?: string;
  readAt?: string | null;
  severity?: 'info' | 'success' | 'warning' | 'error';
  route?: string;
}

export interface NotificationsListResponse {
  data: NotificationDto[];
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<NotificationsListResponse> {
    return this.http.get<NotificationsListResponse>('/api/notifications');
  }

  markRead(id: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`/api/notifications/${encodeURIComponent(id)}/read`, {});
  }
}

