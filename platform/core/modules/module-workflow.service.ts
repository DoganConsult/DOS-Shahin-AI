import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ModuleWorkflowInstance {
  id: string;
  moduleCode: string;
  workflowCode: string;
  currentState: string;
  startedAt: string;
}

export interface WorkflowEvent {
  eventType: string;
  event_type?: string;
  instance_id?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ModuleWorkflowService {
  private http = inject(HttpClient);

  getInstances(moduleCode: string) {
    return this.http.get<ModuleWorkflowInstance[]>(`/api/modules/${moduleCode}/workflows`);
  }

  emitEvent(instanceId: string, event: WorkflowEvent) {
    return this.http.post<void>(`/api/workflows/${instanceId}/events`, event);
  }

  getWorkflowEvents(opts?: Record<string, string | number | boolean | undefined>) {
    return this.http.get<WorkflowEvent[]>('/api/module-workflows/events', { params: opts });
  }
}
