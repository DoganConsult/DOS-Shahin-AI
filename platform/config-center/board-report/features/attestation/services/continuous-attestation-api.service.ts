import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FrameworkReadiness {
  frameworkId: string;
  frameworkName: string;
  overallScore: number;
  controlCount: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  readinessLevel: 'ready' | 'needs-improvement' | 'not-ready';
}

export interface ControlReadiness {
  controlId: string;
  controlCode: string;
  overallScore: number;
  evidenceScore: number;
  testScore: number;
  readinessLevel: 'ready' | 'needs-improvement' | 'not-ready';
}

export interface AttestationDraft {
  draftId: string;
  entityType: 'framework' | 'control';
  entityId: string;
  readinessScore: number;
  content: string;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ContinuousAttestationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/continuous-attestation';

  /**
   * Calculate framework readiness score
   */
  calculateFrameworkReadiness(frameworkId: string): Observable<FrameworkReadiness> {
    return this.http.get<FrameworkReadiness>(`${this.base}/framework/${frameworkId}/readiness`);
  }

  /**
   * Calculate control readiness score
   */
  calculateControlReadiness(controlId: string): Observable<ControlReadiness> {
    return this.http.get<ControlReadiness>(`${this.base}/control/${controlId}/readiness`);
  }

  /**
   * Generate attestation draft for framework or control
   */
  generateDraft(
    entityType: 'framework' | 'control',
    entityId: string,
  ): Observable<AttestationDraft> {
    return this.http.post<AttestationDraft>(`${this.base}/draft`, {
      entityType,
      entityId,
    });
  }

  /**
   * Get all framework readiness scores
   */
  getAllFrameworkReadiness(): Observable<FrameworkReadiness[]> {
    return this.http.get<FrameworkReadiness[]>(`${this.base}/frameworks/readiness`);
  }
}
