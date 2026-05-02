import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { ScopeAssignmentContract, ScopeResolutionContract } from './scope.contracts';

@Injectable({ providedIn: 'root' })
export class ScopeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/scope`;

  resolve(userId: string): Observable<ScopeResolutionContract> {
    return this.http.get<ScopeResolutionContract>(`${this.base}/resolve/${userId}`);
  }

  getAssignments(userId: string): Observable<ScopeAssignmentContract[]> {
    return this.http.get<ScopeAssignmentContract[]>(`${this.base}/assignments/${userId}`);
  }

  assign(userId: string, scopeType: string, scopeId: string): Observable<ScopeAssignmentContract> {
    return this.http.post<ScopeAssignmentContract>(`${this.base}/assign`, { userId, scopeType, scopeId });
  }

  unassign(assignmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assignments/${assignmentId}`);
  }
}
