import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RiskComplianceMapping {
  riskId: string;
  controlId: string;
  frameworkId: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class RiskComplianceApiService {
  private readonly http = inject(HttpClient);

  getMappings(riskId?: string): Observable<RiskComplianceMapping[]> {
    const params = riskId ? { riskId } : {};
    return this.http.get<RiskComplianceMapping[]>('/api/risk-compliance/mappings', { params });
  }
}
