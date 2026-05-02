import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface BCPPlanDto {
  id: string;
  title?: string;
  status?: string;
  lastTestedAt?: string;
}

export interface DRTestDto {
  id: string;
  planId: string;
  scheduledDate?: string;
  status?: string;
}

export interface RecoveryDocDto {
  id: string;
  planId: string;
  description?: string;
  recoveredAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BcpApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getBCPPlans(): Observable<BCPPlanDto[]> {
    return this.http.get<BCPPlanDto[]>(`${this.base}/bcp`);
  }

  createBCPPlan(data: any): Observable<BCPPlanDto> {
    return this.http.post<BCPPlanDto>(`${this.base}/bcp`, data);
  }

  scheduleDRTest(planId: string, data: any): Observable<DRTestDto> {
    return this.http.post<DRTestDto>(`${this.base}/bcp/${planId}/dr-test`, data);
  }

  documentRecovery(planId: string, data: any): Observable<RecoveryDocDto> {
    return this.http.post<RecoveryDocDto>(`${this.base}/bcp/${planId}/recovery`, data);
  }

  getBIAs(status?: string): Observable<any[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/bia${params}`);
  }

  createBIA(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/bia`, data);
  }

  getBIAById(biaId: string): Observable<any> {
    return this.http.get<unknown>(`${this.base}/bcm-advanced/bia/${biaId}`);
  }

  calculateBIACriticality(biaId: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/bia/${biaId}/calculate`, {});
  }

  getExercises(status?: string): Observable<any[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/exercises${params}`);
  }

  createExercise(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/exercises`, data);
  }

  recordExerciseResult(exerciseId: string, data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/exercises/${exerciseId}/results`, data);
  }

  getExerciseGaps(exerciseId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/exercises/${exerciseId}/gaps`);
  }

  getCrisisCommPlans(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/crisis-comm`);
  }

  createCrisisCommPlan(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/crisis-comm`, data);
  }

  activateCrisisComm(planId: string, incidentId?: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/crisis-comm/${planId}/activate`, { incident_id: incidentId });
  }

  getRecoveryStrategies(biaId?: string): Observable<any[]> {
    const params = biaId ? `?bia_id=${biaId}` : '';
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/recovery-strategies${params}`);
  }

  createRecoveryStrategy(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/recovery-strategies`, data);
  }

  activateBCPlan(planId: string, reason: string, incidentId?: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/activate`, { plan_id: planId, reason, incident_id: incidentId });
  }

  getBCPActivations(status?: string): Observable<any[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/activations${params}`);
  }

  deactivateBCPlan(activationId: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/deactivate/${activationId}`, {});
  }

  getMaturityHistory(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/bcm-advanced/maturity/history`);
  }

  runMaturityAssessment(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/bcm-advanced/maturity`, data);
  }
}
