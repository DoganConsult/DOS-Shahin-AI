import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RemediationPlanDto {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed' | 'overdue' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  gapId?: string;
  gapTitle?: string;
  findingId?: string;
  findingTitle?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  tasks: RemediationTaskDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RemediationTaskDto {
  id: string;
  planId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface RemediationListResponse {
  data: RemediationPlanDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class RemediationApiService {
  private http = inject(HttpClient);
  private base = '/api/remediation';

  list(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }): Observable<RemediationListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.priority) httpParams = httpParams.set('priority', params.priority);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<RemediationListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<RemediationPlanDto> {
    return this.http.get<RemediationPlanDto>(`${this.base}/${id}`);
  }

  create(plan: Partial<RemediationPlanDto>): Observable<RemediationPlanDto> {
    return this.http.post<RemediationPlanDto>(this.base, plan);
  }

  update(id: string, plan: Partial<RemediationPlanDto>): Observable<RemediationPlanDto> {
    return this.http.put<RemediationPlanDto>(`${this.base}/${id}`, plan);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}?confirm=true`);
  }

  addTask(planId: string, task: Partial<RemediationTaskDto>): Observable<RemediationTaskDto> {
    return this.http.post<RemediationTaskDto>(`${this.base}/${planId}/tasks`, task);
  }

  completeTask(planId: string, taskId: string): Observable<RemediationTaskDto> {
    return this.http.post<RemediationTaskDto>(`${this.base}/${planId}/tasks/${taskId}/complete`, {});
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/remediation/diagnostics`);
  }
}
