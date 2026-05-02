import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MilestoneType {
  milestoneId: string;
  flowId: string;
  milestoneOrder: number;
  title: string;
  isComplete: boolean;
  completedAt: string | null;
}

export interface OsFlowType {
  flowId: string;
  entityType: string;
  entityId: string;
  status: string;
  milestones: MilestoneType[];
}

@Injectable({ providedIn: 'root' })
export class OnboardingOsService {
  constructor(private http: HttpClient) {}

  getActiveFlows(): Observable<{data: OsFlowType[]}> {
    return this.http.get<{data: OsFlowType[]}>('/api/onboarding-os/flows/active');
  }

  completeMilestone(flowId: string, milestoneId: string): Observable<{data: MilestoneType}> {
    return this.http.post<{data: MilestoneType}>(`/api/onboarding-os/flows/${flowId}/milestones/${milestoneId}/complete`, {});
  }
}
