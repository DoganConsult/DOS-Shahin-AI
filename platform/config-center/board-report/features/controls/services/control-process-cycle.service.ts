/**
 * Control Process Cycle Service — AGRC-OS Controls Module
 * Manages control lifecycle cycles, linked items, and task management.
 * Re-exported from controls module (originally in compliance).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LinkedGap {
  id: string; title?: string; severity?: string;
  taskStatus?: string; slaStatus?: 'green' | 'amber' | 'red'; dueDate?: string;
}
export interface LinkedRisk {
  id: string; title?: string; score?: number;
  taskStatus?: string; slaStatus?: 'green' | 'amber' | 'red'; dueDate?: string;
}
export interface LinkedEvidence {
  id: string; title?: string; frequency?: string;
  taskStatus?: string; slaStatus?: 'green' | 'amber' | 'red'; dueDate?: string;
}
export interface LinkedAuditTask {
  id: string; title?: string;
  taskStatus?: string; slaStatus?: 'green' | 'amber' | 'red'; dueDate?: string;
}
export interface LinkedItems {
  gaps: LinkedGap[];
  risks: LinkedRisk[];
  evidence: LinkedEvidence[];
  auditTasks: LinkedAuditTask[];
}

@Injectable({ providedIn: 'root' })
export class ControlProcessCycleService {
  private http = inject(HttpClient);

  getProcessCycle(controlId: string): Observable<any> {
    return this.http.get(`/api/controls/${controlId}/process-cycle`);
  }

  launch(controlId: string): Observable<any> {
    return this.http.post(`/api/controls/${controlId}/process-cycle/launch`, {});
  }

  getLinkedItems(controlId: string): Observable<LinkedItems> {
    return this.http.get<LinkedItems>(`/api/controls/${controlId}/process-cycle/linked-items`);
  }

  reassignTask(controlId: string, taskId: string, userId: string): Observable<any> {
    return this.http.post(`/api/controls/${controlId}/process-cycle/tasks/${taskId}/reassign`, { userId });
  }

  completeTask(controlId: string, taskId: string): Observable<any> {
    return this.http.post(`/api/controls/${controlId}/process-cycle/tasks/${taskId}/complete`, {});
  }
}
