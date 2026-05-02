import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface WorkItemDto {
  id: string;
  source: string;
  sourceId?: string;
  title: string;
  description?: string;
  taskType?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  completedAt?: string;
  context?: Record<string, unknown>;
}

export interface WorkflowInstanceDto {
  id: string;
  definitionId: string;
  tenantId?: string;
  workspaceId?: string;
  status: string;
  createdAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class WorkItemsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params: { assignedTo?: string; status?: string; moduleCode?: string; workspaceId?: string; limit?: number; offset?: number }): Observable<WorkItemDto[]> {
    const q = new URLSearchParams();
    if (params.assignedTo) q.set('assignedTo', params.assignedTo);
    if (params.status) q.set('status', params.status);
    if (params.moduleCode) q.set('source', params.moduleCode);
    if (params.workspaceId) q.set('workspaceId', params.workspaceId);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    const query = q.toString();
    return this.http.get<{ data: any[] }>(`${this.base}/work-items${query ? '?' + query : ''}`).pipe(
      map((body) => (Array.isArray(body?.data) ? body.data : [])),
      map((items) =>
        items.map((i: any) => ({
          id: String(i.work_item_id ?? i.id ?? ''),
          source: String(i.source ?? ''),
          sourceId: i.source_id ? String(i.source_id) : undefined,
          title: String(i.title ?? ''),
          description: i.description ? String(i.description) : undefined,
          taskType: i.task_type ? String(i.task_type) : undefined,
          status: String(i.status ?? ''),
          priority: String(i.priority ?? 'medium'),
          assignedTo: i.assigned_to ? String(i.assigned_to) : undefined,
          dueDate: i.due_date ? String(i.due_date) : undefined,
          entityType: i.entity_type ? String(i.entity_type) : undefined,
          entityId: i.entity_id ? String(i.entity_id) : undefined,
          createdAt: String(i.created_at ?? ''),
          completedAt: i.completed_at ? String(i.completed_at) : undefined,
          context: i.context && typeof i.context === 'object' ? (i.context as Record<string, unknown>) : undefined,
        })),
      ),
    );
  }

  complete(id: string, outcome: string, comment?: string): Observable<WorkItemDto> {
    return this.http.post<{ data: any }>(`${this.base}/work-items/${encodeURIComponent(id)}/complete`, { outcome, comment }).pipe(
      map((body) => body.data),
      map((i: any) => ({
        id: String(i.work_item_id ?? i.id ?? ''),
        source: String(i.source ?? ''),
        sourceId: i.source_id ? String(i.source_id) : undefined,
        title: String(i.title ?? ''),
        description: i.description ? String(i.description) : undefined,
        taskType: i.task_type ? String(i.task_type) : undefined,
        status: String(i.status ?? ''),
        priority: String(i.priority ?? 'medium'),
        assignedTo: i.assigned_to ? String(i.assigned_to) : undefined,
        dueDate: i.due_date ? String(i.due_date) : undefined,
        entityType: i.entity_type ? String(i.entity_type) : undefined,
        entityId: i.entity_id ? String(i.entity_id) : undefined,
        createdAt: String(i.created_at ?? ''),
        completedAt: i.completed_at ? String(i.completed_at) : undefined,
        context: i.context && typeof i.context === 'object' ? (i.context as Record<string, unknown>) : undefined,
      })),
    );
  }

  startInstance(definitionId: string, tenantId?: string, workspaceId?: string, context?: Record<string, string>): Observable<WorkflowInstanceDto> {
    return this.http.post<{ data: WorkflowInstanceDto }>(`${this.base}/workflow/instances`, {
      workflowType: definitionId,
      tenantId,
      workspaceId,
      context: context ?? undefined,
    }).pipe(
      map((body) => body.data),
    );
  }

  getInstance(id: string): Observable<WorkflowInstanceDto> {
    return this.http.get<{ data: WorkflowInstanceDto }>(`${this.base}/workflow/instances/${encodeURIComponent(id)}`).pipe(
      map((body) => body.data),
    );
  }
}
