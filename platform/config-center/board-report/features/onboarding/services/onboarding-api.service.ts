import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type {
  OnboardingSessionContract,
  OnboardingDiagnosticsContract,
  OnboardingDashboardContract,
  RecommendationContract,
  SaveBulkAnswersContract,
  StartupChecklistContract,
} from '../contracts/onboarding.contracts';

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/onboarding`;

  createSession(dto: { organizationName?: string; displayName?: string; languageCode?: string }): Observable<OnboardingSessionContract> {
    return this.http.post<OnboardingSessionContract>(`${this.base}/sessions`, dto);
  }

  getSession(sessionId: string): Observable<OnboardingSessionContract> {
    return this.http.get<OnboardingSessionContract>(`${this.base}/sessions/${sessionId}`);
  }

  resumeSession(sessionId: string): Observable<OnboardingSessionContract> {
    return this.http.post<OnboardingSessionContract>(`${this.base}/sessions/${sessionId}/resume`, {});
  }

  getFlowMap(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/flow/${sessionId}`);
  }

  getSection(sessionId: string, sectionCode: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/section/${sessionId}/${sectionCode}`);
  }

  saveBulkAnswers(sessionId: string, dto: SaveBulkAnswersContract): Observable<{ session: OnboardingSessionContract; scores: unknown[]; blockers: unknown[] }> {
    return this.http.post<{ session: OnboardingSessionContract; scores: unknown[]; blockers: unknown[] }>(`${this.base}/sessions/${sessionId}/answers`, dto);
  }

  getAnswers(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/sessions/${sessionId}/answers`);
  }

  getScores(sessionId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/sessions/${sessionId}/scores`);
  }

  getRecommendations(sessionId: string): Observable<RecommendationContract> {
    return this.http.get<RecommendationContract>(`${this.base}/sessions/${sessionId}/recommendations`);
  }

  getReview(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/sessions/${sessionId}/review`);
  }

  completeOnboarding(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/sessions/${sessionId}/complete`, {});
  }

  getProvisioningJob(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/sessions/${sessionId}/provisioning`);
  }

  retryProvisioning(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/sessions/${sessionId}/provisioning/retry`, {});
  }

  cancelProvisioning(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/sessions/${sessionId}/provisioning/cancel`, {});
  }

  getStartupChecklist(sessionId: string): Observable<StartupChecklistContract> {
    return this.http.get<StartupChecklistContract>(`${this.base}/sessions/${sessionId}/checklist`);
  }

  getCompletionReadiness(sessionId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/readiness/${sessionId}`);
  }

  getDiagnostics(sessionId: string): Observable<OnboardingDiagnosticsContract> {
    return this.http.get<OnboardingDiagnosticsContract>(`${this.base}/admin/sessions/${sessionId}/diagnostics`);
  }

  getAdminDashboard(): Observable<OnboardingDashboardContract> {
    return this.http.get<OnboardingDashboardContract>(`${this.base}/admin/dashboard`);
  }

  getStuckSessions(olderThanMinutes = 60): Observable<{ data: unknown[]; count: number }> {
    return this.http.get<{ data: unknown[]; count: number }>(`${this.base}/admin/stuck-sessions`, {
      params: { olderThanMinutes: String(olderThanMinutes) },
    });
  }
}
