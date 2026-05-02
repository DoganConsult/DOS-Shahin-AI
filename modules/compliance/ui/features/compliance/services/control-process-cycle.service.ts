import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface LinkedGap {
  gapId: string; title: string; severity: string; status: string;
  assignedUser: string | null; taskStatus: string | null;
  slaStatus: 'green' | 'amber' | 'red' | null; dueDate: string | null;
}
export interface LinkedRisk {
  riskId: string; title: string; score: number;
  assignedUser: string | null; taskStatus: string | null;
  slaStatus: 'green' | 'amber' | 'red' | null; dueDate: string | null;
}
export interface LinkedEvidence {
  scheduleId: string; controlId: string; frequency: string;
  assignedUser: string | null; taskStatus: string | null;
  slaStatus: 'green' | 'amber' | 'red' | null; dueDate: string | null;
}
export interface LinkedAuditTask {
  taskId: string; title: string; taskStatus: string;
  assignedUser: string | null;
  slaStatus: 'green' | 'amber' | 'red' | null; dueDate: string | null;
}
export interface LinkedItems {
  gaps: LinkedGap[]; risks: LinkedRisk[];
  evidence: LinkedEvidence[]; auditTasks: LinkedAuditTask[];
}

@Injectable({ providedIn: 'root' })
export class ControlProcessCycleService {
  private http = inject(HttpClient);

  private base(controlId: string): string {
    return `/api/controls/${encodeURIComponent(controlId)}/process-cycle`;
  }

  getProcessCycle(controlId: string): Observable<any> {
    return this.http.get(this.base(controlId)).pipe(catchError(() => of({ tasks: [], grouped: {}, count: 0 })));
  }

  launch(controlId: string): Observable<any> {
    return this.http.post(`${this.base(controlId)}/launch`, {}).pipe(catchError(() => of(null)));
  }

  getLinkedItems(controlId: string): Observable<LinkedItems> {
    const empty: LinkedItems = { gaps: [], risks: [], evidence: [], auditTasks: [] };
    return this.http.get<LinkedItems>(`${this.base(controlId)}/linked-items`).pipe(catchError(() => of(empty)));
  }

  reassignTask(controlId: string, taskId: string, userId: string): Observable<any> {
    return this.http.post(`${this.base(controlId)}/tasks/${taskId}/reassign`, { userId }).pipe(catchError(() => of(null)));
  }

  completeTask(controlId: string, taskId: string): Observable<any> {
    return this.http.post(`${this.base(controlId)}/tasks/${taskId}/complete`, {}).pipe(catchError(() => of(null)));
  }
}
