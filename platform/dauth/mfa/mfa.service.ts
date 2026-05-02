import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { MfaMethodContract, MfaEnrollmentContract, MfaChallengeContract } from './mfa.contracts';

@Injectable({ providedIn: 'root' })
export class MfaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/mfa`;

  getMethods(): Observable<MfaMethodContract[]> {
    return this.http.get<MfaMethodContract[]>(`${this.base}/methods`);
  }

  enroll(method: MfaMethodContract['type']): Observable<MfaEnrollmentContract> {
    return this.http.post<MfaEnrollmentContract>(`${this.base}/enroll`, { method });
  }

  verify(enrollmentId: string, code: string): Observable<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>(`${this.base}/verify`, { enrollmentId, code });
  }

  challenge(method: MfaMethodContract['type']): Observable<MfaChallengeContract> {
    return this.http.post<MfaChallengeContract>(`${this.base}/challenge`, { method });
  }

  validateChallenge(challengeId: string, code: string): Observable<{ valid: boolean; token?: string }> {
    return this.http.post<{ valid: boolean; token?: string }>(`${this.base}/challenge/validate`, { challengeId, code });
  }

  disable(methodId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/methods/${methodId}`);
  }
}
