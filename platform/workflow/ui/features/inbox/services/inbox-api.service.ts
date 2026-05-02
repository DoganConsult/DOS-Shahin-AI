import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InboxMessageDto {
  id: string;
  tenantId: string;
  subject: string;
  subjectAr?: string;
  body?: string;
  channel: 'internal' | 'email' | 'system' | 'workflow';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'actioned' | 'archived';
  senderId?: string;
  senderName?: string;
  recipientId: string;
  recipientName?: string;
  sourceModule?: string;
  sourceEntityId?: string;
  actionRequired: boolean;
  actionUrl?: string;
  readAt?: string;
  expiresAt?: string;
  threadId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InboxListResponse {
  data: InboxMessageDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InboxDashboard {
  stats: Record<string, number>;
  kpis: Record<string, unknown>;
  channelBreakdown: Record<string, number>;
  priorityDist: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class InboxApiService {
  private http = inject(HttpClient);
  private base = '/api/inbox';

  list(params?: { page?: number; limit?: number; status?: string; channel?: string; priority?: string }): Observable<InboxListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.channel) httpParams = httpParams.set('channel', params.channel);
    if (params?.priority) httpParams = httpParams.set('priority', params.priority);
    return this.http.get<InboxListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<InboxMessageDto> {
    return this.http.get<InboxMessageDto>(`${this.base}/${id}`);
  }

  send(data: Partial<InboxMessageDto>): Observable<InboxMessageDto> {
    return this.http.post<InboxMessageDto>(this.base, data);
  }

  markRead(id: string): Observable<InboxMessageDto> {
    return this.http.post<InboxMessageDto>(`${this.base}/${id}/read`, {});
  }

  archive(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/archive`, {});
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  reply(id: string, body: string): Observable<InboxMessageDto> {
    return this.http.post<InboxMessageDto>(`${this.base}/${id}/reply`, { body });
  }

  getDashboard(): Observable<InboxDashboard> {
    return this.http.get<InboxDashboard>(`${this.base}/dashboard`);
  }

  getTrends(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/trends`);
  }

  getExport(filters?: Record<string, string>): Observable<{ rows: unknown[]; total: number }> {
    let httpParams = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<{ rows: unknown[]; total: number }>(`${this.base}/export`, { params: httpParams });
  }

  getSlaBreaches(): Observable<{ breaches: unknown[]; total: number }> {
    return this.http.get<{ breaches: unknown[]; total: number }>(`${this.base}/sla-breaches`);
  }

  getExpiring(hours?: number): Observable<{ messages: unknown[]; total: number }> {
    const params = hours ? new HttpParams().set('hours', hours) : undefined;
    return this.http.get<{ messages: unknown[]; total: number }>(`${this.base}/expiring`, { params });
  }

  getUnreadByRecipient(limit?: number): Observable<{ recipients: unknown[] }> {
    const params = limit ? new HttpParams().set('limit', limit) : undefined;
    return this.http.get<{ recipients: unknown[] }>(`${this.base}/unread-by-recipient`, { params });
  }

  bulkDelete(ids: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/bulk/delete`, { ids });
  }

  getCrossModule(linkedModule: string): Observable<{ items: unknown[]; total: number }> {
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/cross-module/${linkedModule}`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/inbox/diagnostics`);
  }
}
