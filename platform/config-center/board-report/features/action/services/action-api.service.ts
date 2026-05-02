import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActionItemDto {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  assigneeName?: string;
  reporterId?: string;
  reporterName?: string;
  module: string;
  entityType?: string;
  entityId?: string;
  dueDate?: string;
  completedAt?: string;
  slaHours?: number;
  slaBreached: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionListResponse {
  data: ActionItemDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ActionApiService {
  private http = inject(HttpClient);
  private base = '/api/action-items';

  list(params?: { page?: number; limit?: number; status?: string; priority?: string; assigneeId?: string; search?: string; module?: string }): Observable<ActionListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.priority) httpParams = httpParams.set('priority', params.priority);
    if (params?.assigneeId) httpParams = httpParams.set('assigneeId', params.assigneeId);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.module) httpParams = httpParams.set('module', params.module);
    return this.http.get<ActionListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<ActionItemDto> {
    return this.http.get<ActionItemDto>(`${this.base}/${id}`);
  }

  create(item: Partial<ActionItemDto>): Observable<ActionItemDto> {
    return this.http.post<ActionItemDto>(this.base, item);
  }

  update(id: string, item: Partial<ActionItemDto>): Observable<ActionItemDto> {
    return this.http.put<ActionItemDto>(`${this.base}/${id}`, item);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}?confirm=true`);
  }

  complete(id: string): Observable<ActionItemDto> {
    return this.http.post<ActionItemDto>(`${this.base}/${id}/complete`, {});
  }

  reassign(id: string, assigneeId: string): Observable<ActionItemDto> {
    return this.http.post<ActionItemDto>(`${this.base}/${id}/reassign`, { assigneeId });
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/action/diagnostics`);
  }
}
