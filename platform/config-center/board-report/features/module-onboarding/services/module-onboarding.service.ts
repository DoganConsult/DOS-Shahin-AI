import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ModuleStepType {
  stepId: string;
  stepCode: string;
  isComplete: boolean;
  isRequired: boolean;
  completedAt: string | null;
}

export interface ModuleStatusType {
  moduleId: string;
  moduleCode: string;
  overallStatus: string;
  completionPct: number;
  steps: ModuleStepType[];
}

@Injectable({ providedIn: 'root' })
export class ModuleOnboardingService {
  constructor(private http: HttpClient) {}

  getOnboardingStatus(moduleCode: string): Observable<{data: ModuleStatusType}> {
    return this.http.get<{data: ModuleStatusType}>(`/api/module-onboarding/status/${moduleCode}`);
  }

  getActiveOnboardings(): Observable<{data: ModuleStatusType[]}> {
    return this.http.get<{data: ModuleStatusType[]}>('/api/module-onboarding/active');
  }

  completeStep(moduleId: string, stepCode: string): Observable<{data: ModuleStepType}> {
    return this.http.post<{data: ModuleStepType}>(`/api/module-onboarding/modules/${moduleId}/steps/${stepCode}/complete`, {});
  }
}
