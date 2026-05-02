import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationDto {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  readAt?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationPreferencesDto {
  emailEnabled: boolean;
  pushEnabled: boolean;
  digestFrequency: 'immediate' | 'daily' | 'weekly' | 'none';
  mutedModules: string[];
  mutedTypes: string[];
}

export interface NotificationTemplateDto {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  subject: string;
  subjectAr?: string;
  bodyHtml: string;
  bodyHtmlAr?: string;
  module: string;
  eventType: string;
  channels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationDto[];
  count: number;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private http = inject(HttpClient);
  private base = '/api/notifications';

  list(params?: { page?: number; limit?: number; unreadOnly?: boolean; module?: string }): Observable<NotificationListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.unreadOnly) httpParams = httpParams.set('unreadOnly', 'true');
    if (params?.module) httpParams = httpParams.set('module', params.module);
    return this.http.get<NotificationListResponse>(this.base, { params: httpParams });
  }

  markAsRead(id: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/read-all`, {});
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  getPreferences(): Observable<NotificationPreferencesDto> {
    return this.http.get<NotificationPreferencesDto>(`${this.base}/preferences`);
  }

  updatePreferences(prefs: Partial<NotificationPreferencesDto>): Observable<NotificationPreferencesDto> {
    return this.http.put<NotificationPreferencesDto>(`${this.base}/preferences`, prefs);
  }

  getTemplates(): Observable<NotificationTemplateDto[]> {
    return this.http.get<NotificationTemplateDto[]>(`${this.base}/templates`);
  }

  updateTemplate(id: string, data: Partial<NotificationTemplateDto>): Observable<NotificationTemplateDto> {
    return this.http.put<NotificationTemplateDto>(`${this.base}/templates/${id}`, data);
  }

  registerPushToken(token: string, platform: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/push-token`, { token, platform });
  }

  testChannel(channel: 'email' | 'push' | 'in_app'): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/test`, { channel });
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/notification/diagnostics`);
  }
}
