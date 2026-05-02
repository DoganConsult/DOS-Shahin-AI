import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Client {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'inactive';
  tenantId?: string;
}

export interface PortfolioHealth {
  clientId: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastAssessment: string;
}

export interface Finding {
  id: string;
  clientId: string;
  title: string;
  severity: string;
  status: string;
}

export interface FindingInput { clientId: string; title: string; severity: string; description?: string; frameworkRef?: string; [key: string]: any; }
export interface Benchmark { benchmarkId: string; name: string; score: number; industry: string; }
export interface TimelineEvent { eventId: string; clientId: string; type: string; description: string; timestamp: string; }

@Injectable({ providedIn: 'root' })
export class ConsultantCenterService {
  private readonly http = inject(HttpClient);

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>('/api/portals/consultant/clients');
  }

  getPortfolioHealth(): Observable<PortfolioHealth[]> {
    return this.http.get<PortfolioHealth[]>('/api/portals/consultant/portfolio-health');
  }

  getFindings(clientId: string): Observable<Finding[]> {
    return this.http.get<Finding[]>(`/api/portals/consultant/clients/${clientId}/findings`);
  }

  getClientFindings(clientId: string): Observable<Finding[]> {
    return this.getFindings(clientId);
  }

  publishFinding(findingId: string, data?: any): Observable<Finding> {
    return this.http.post<Finding>(`/api/portals/consultant/findings/${findingId}/publish`, data ?? {});
  }

  getClientContext(clientId: string): Observable<any> {
    return this.http.get<any>(`/api/portals/consultant/clients/${clientId}/context`);
  }

  getBenchmarks(): Observable<Benchmark[]> {
    return this.http.get<Benchmark[]>('/api/portals/consultant/benchmarks');
  }

  getEngagementTimeline(clientId: string): Observable<TimelineEvent[]> {
    return this.http.get<TimelineEvent[]>(`/api/portals/consultant/clients/${clientId}/timeline`);
  }

  getPortfolioReport(): Observable<any> {
    return this.http.get<any>('/api/portals/consultant/portfolio-report');
  }

  getConsultantId(): Observable<{ consultantId: string }> {
    return this.http.get<{ consultantId: string }>('/api/portals/consultant/me');
  }
}
