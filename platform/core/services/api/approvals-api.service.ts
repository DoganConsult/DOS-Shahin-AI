import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalsApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApprovalRequest[]> {
    return this.http.get<ApprovalRequest[]>('/api/approvals');
  }

  approve(id: string, comment?: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`/api/approvals/${id}/approve`, { comment });
  }

  reject(id: string, reason: string): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`/api/approvals/${id}/reject`, { reason });
  }
}
