import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { SodRuleContract, SodViolationContract, SodCheckResultContract } from './sod.contracts';

@Injectable({ providedIn: 'root' })
export class SodService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/sod`;

  getRules(): Observable<SodRuleContract[]> {
    return this.http.get<SodRuleContract[]>(`${this.base}/rules`);
  }

  checkUser(userId: string): Observable<SodCheckResultContract> {
    return this.http.post<SodCheckResultContract>(`${this.base}/check`, { userId });
  }

  getViolations(params?: Record<string, string>): Observable<SodViolationContract[]> {
    return this.http.get<SodViolationContract[]>(`${this.base}/violations`, { params });
  }

  mitigate(violationId: string, note: string): Observable<void> {
    return this.http.post<void>(`${this.base}/violations/${violationId}/mitigate`, { note });
  }

  accept(violationId: string, justification: string): Observable<void> {
    return this.http.post<void>(`${this.base}/violations/${violationId}/accept`, { justification });
  }
}
