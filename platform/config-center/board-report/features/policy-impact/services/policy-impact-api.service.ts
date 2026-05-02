import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImpactedEntity {
  entityType: string;
  entityId: string;
  entityTitle?: string;
  entityName?: string;
  linkType: string;
  impactLevel: 'direct' | 'indirect';
  impactScore?: number;
  impactDescription?: string;
  path?: string[];
}

export interface PolicyImpactResult {
  policyId: string;
  policyTitle?: string;
  impactedEntities: ImpactedEntity[];
  totalImpactCount: number;
  totalImpacted?: number;
  highImpactCount?: number;
  mediumImpactCount?: number;
  lowImpactCount?: number;
  impactByType: Record<string, number>;
  simulatedAt: string;
}

export interface BatchImpactRequest {
  policyIds: string[];
}

export interface BatchImpactResult {
  results: PolicyImpactResult[];
}

@Injectable({ providedIn: 'root' })
export class PolicyImpactApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/policy-impact';

  /**
   * Simulate policy impact on linked entities
   */
  simulateImpact(policyId: string): Observable<PolicyImpactResult> {
    return this.http.post<PolicyImpactResult>(`${this.base}/simulate`, { policyId });
  }

  /**
   * Simulate impact for multiple policies in batch
   */
  simulateBatch(request: BatchImpactRequest): Observable<BatchImpactResult> {
    return this.http.post<BatchImpactResult>(`${this.base}/simulate/batch`, request);
  }
}
