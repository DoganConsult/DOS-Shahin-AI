import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface AuthAuditEntry {
  eventId: string;
  userId: string;
  eventType: string;
  decision: string;
  reason: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthAuditService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/auth/audit`;

  getDecisionLog(params?: { userId?: string; limit?: number }): Observable<AuthAuditEntry[]> {
    return this.http.get<AuthAuditEntry[]>(this.baseUrl, { params: params as any, withCredentials: true });
  }

  getSecurityEvents(params?: { eventType?: string; since?: string }): Observable<AuthAuditEntry[]> {
    return this.http.get<AuthAuditEntry[]>(`${this.baseUrl}/security-events`, { params: params as any, withCredentials: true });
  }
}
