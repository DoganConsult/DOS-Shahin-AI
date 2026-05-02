import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import type { DashboardFilters } from './dashboard-filters.service';

export interface DashboardKpisDto {
  complianceScorePercent: number;
  deltaText?: string;
  openCriticalRisks: number;
  overdueControls: number;
  missingEvidence: number;
}

export interface RiskHeatmapCellDto {
  impact: number;
  likelihood: number;
  count: number;
  weightedScore?: number;
}

export interface TopRiskDto {
  riskId: string;
  title: string;
  severity: string;
  owner: string;
  dueUtc: string;
}

export interface MaturityDomainDto {
  name: string;
  score: number;
}

export interface VendorBubbleDto {
  name: string;
  inherent: number;
  residual: number;
  size: number;
}

export interface DashboardDto {
  kpis: DashboardKpisDto;
  heatmap: RiskHeatmapCellDto[];
  topRisks: TopRiskDto[];
  maturity: MaturityDomainDto[];
  vendorBubbles: VendorBubbleDto[];
  generatedAtUtc: string;
}

function defaultDashboardDto(): DashboardDto {
  return {
    kpis: {} as DashboardKpisDto,
    heatmap: [],
    topRisks: [],
    maturity: [],
    vendorBubbles: [],
    generatedAtUtc: new Date().toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/dashboard';

  query(filters: DashboardFilters): Observable<DashboardDto> {
    const body = {
      tenantId: filters.tenantId,
      workspaceId: filters.workspaceId,
      scopeId: filters.scopeId ?? null,
      frameworkKeys: filters.frameworkKeys ?? [],
      from: filters.from,
      to: filters.to,
    };
    return this.http.post<DashboardDto>(`${this.baseUrl}/query`, body).pipe(
      map((d) => {
        if (!d || typeof d !== 'object') return defaultDashboardDto();
        return {
          ...d,
          kpis: d.kpis && typeof d.kpis === 'object' ? d.kpis : ({} as DashboardKpisDto),
          heatmap: Array.isArray(d.heatmap) ? d.heatmap : [],
          topRisks: Array.isArray(d.topRisks) ? d.topRisks : [],
          maturity: Array.isArray(d.maturity) ? d.maturity : [],
          vendorBubbles: Array.isArray(d.vendorBubbles) ? d.vendorBubbles : [],
          generatedAtUtc: typeof d.generatedAtUtc === 'string' ? d.generatedAtUtc : new Date().toISOString(),
        };
      })
    );
  }
}
