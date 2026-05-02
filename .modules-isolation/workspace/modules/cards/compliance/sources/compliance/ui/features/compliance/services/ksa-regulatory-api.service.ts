// ============================================
// KSA Regulatory API Service
// Frontend service for KSA regulatory intelligence
// ============================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface KsaComplianceScore {
  overallScore: number;
  frameworkScores: Record<string, FrameworkScore>;
  domainScores: Record<string, DomainScore>;
  ksaRegulatoryWeight: number;
  criticalGaps: CriticalGap[];
  regulatoryReadiness: RegulatoryReadiness;
}

export interface FrameworkScore {
  frameworkCode: string;
  frameworkName: string;
  totalControls: number;
  implementedControls: number;
  ksaCriticalControls: number;
  ksaCriticalImplemented: number;
  baseScore: number;
  ksaWeightedScore: number;
  compliancePriorities: unknown[];
}

export interface DomainScore {
  domainCode: string;
  domainName: string;
  totalControls: number;
  implementedControls: number;
  ksaCriticalControls: number;
  ksaCriticalImplemented: number;
  baseScore: number;
  ksaWeightedScore: number;
}

export interface CriticalGap {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  frameworkCode: string;
  regulatorCode: string;
  priority: number;
  reasonEn: string;
  reasonAr: string;
  daysUntilDeadline?: number;
}

export interface RegulatoryReadiness {
  ncaEccReadiness: number;
  samaCsfReadiness: number;
  pdplReadiness: number;
  nextDeadlineDays: number | null;
  overdueObligationsCount: number;
  overallReadiness: 'ready' | 'at_risk' | 'not_ready';
}

export interface KsaRegulatoryReport {
  reportId: string;
  reportType: 'nca_self_assessment' | 'sama_posture' | 'pdpl_compliance' | 'regulatory_summary';
  regulatorCode: string;
  frameworkCode: string;
  tenantId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class KsaRegulatoryApiService {
  private readonly baseUrl = '/api/ksa-regulatory';

  constructor(
    private http: HttpClient,

  ) {}

  /**
   * Get KSA-weighted compliance score
   */
  getComplianceScore(frameworkCode?: string): Observable<{ success: boolean; data: KsaComplianceScore }> {
    const params = frameworkCode ? { frameworkCode } : {};
    return this.http.get<{ success: boolean; data: KsaComplianceScore }>(`${this.baseUrl}/score`, { params });
  }

  /**
   * Get KSA compliance score summary for dashboard
   */
  getComplianceSummary(): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`${this.baseUrl}/score/summary`);
  }

  /**
   * Generate NCA ECC Self-Assessment Report
   */
  generateNcaReport(periodStart?: string, periodEnd?: string): Observable<{ success: boolean; data: KsaRegulatoryReport }> {
    return this.http.post<{ success: boolean; data: KsaRegulatoryReport }>(
      `${this.baseUrl}/reports/nca`,
      { periodStart, periodEnd },
    );
  }

  /**
   * Generate SAMA Cybersecurity Posture Report
   */
  generateSamaReport(periodStart?: string, periodEnd?: string): Observable<{ success: boolean; data: KsaRegulatoryReport }> {
    return this.http.post<{ success: boolean; data: KsaRegulatoryReport }>(
      `${this.baseUrl}/reports/sama`,
      { periodStart, periodEnd },
    );
  }

  /**
   * Generate PDPL Compliance Report
   */
  generatePdplReport(periodStart?: string, periodEnd?: string): Observable<{ success: boolean; data: KsaRegulatoryReport }> {
    return this.http.post<{ success: boolean; data: KsaRegulatoryReport }>(
      `${this.baseUrl}/reports/pdpl`,
      { periodStart, periodEnd },
    );
  }

  // ============================================
  // KSA Sector Maturity Models
  // ============================================

  /**
   * Get all available sector maturity models
   */
  getSectorMaturityModels(): Observable<{ success: boolean; data: unknown[] }> {
    return this.http.get<{ success: boolean; data: unknown[] }>('/api/ksa-sector-maturity/models');
  }

  /**
   * Get maturity model for current tenant's sector
   */
  getSectorMaturityModel(): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>('/api/ksa-sector-maturity/model');
  }

  /**
   * Assess tenant's current maturity level
   */
  assessSectorMaturity(scores: {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    processMaturity: number;
    technologyMaturity: number;
    peopleMaturity: number;
    governanceMaturity: number;
  }): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>('/api/ksa-sector-maturity/assess', scores);
  }

  /**
   * Get benchmark data for a sector
   */
  getSectorBenchmark(sectorCode: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>(`/api/ksa-sector-maturity/benchmark/${sectorCode}`);
  }

  // ============================================
  // KSA Regulatory Change Tracking
  // ============================================

  /**
   * Get regulatory changes for current tenant
   */
  getRegulatoryChanges(filters?: {
    regulatorId?: string;
    frameworkCode?: string;
    changeType?: string;
    responseStatus?: string;
    impactLevel?: string;
  }): Observable<{ success: boolean; data: unknown[]; count: number }> {
    const params: Record<string, string> = {};
    if (filters?.regulatorId) params['regulatorId'] = filters.regulatorId;
    if (filters?.frameworkCode) params['frameworkCode'] = filters.frameworkCode;
    if (filters?.changeType) params['changeType'] = filters.changeType;
    if (filters?.responseStatus) params['responseStatus'] = filters.responseStatus;
    if (filters?.impactLevel) params['impactLevel'] = filters.impactLevel;
    return this.http.get<{ success: boolean; data: unknown[]; count: number }>('/api/ksa-regulatory-changes', { params });
  }

  /**
   * Update tenant's response status for a regulatory change
   */
  updateRegulatoryChangeResponse(changeId: string, responseStatus: string, responsePlan?: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `/api/ksa-regulatory-changes/${changeId}/response`,
      { responseStatus, responsePlan },
    );
  }

  // ============================================
  // KSA Cross-Framework Control Mapping
  // ============================================

  /**
   * Get cross-framework mappings for current tenant
   */
  getCrossFrameworkMappings(sourceFramework?: string, targetFramework?: string): Observable<{ success: boolean; data: unknown[]; count: number }> {
    const params: Record<string, string> = {};
    if (sourceFramework) params['sourceFramework'] = sourceFramework;
    if (targetFramework) params['targetFramework'] = targetFramework;
    return this.http.get<{ success: boolean; data: unknown[]; count: number }>('/api/ksa-cross-framework/mappings', { params });
  }

  /**
   * Store cross-framework mappings for tenant
   */
  storeCrossFrameworkMappings(mappings: unknown[]): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      '/api/ksa-cross-framework/mappings/store',
      { mappings },
    );
  }

  /**
   * Get mapping summary between two frameworks
   */
  getFrameworkMappingSummary(sourceFramework: string, targetFramework: string): Observable<{ success: boolean; data: unknown }> {
    return this.http.get<{ success: boolean; data: unknown }>('/api/ksa-cross-framework/summary', {
      params: { sourceFramework, targetFramework },
    });
  }
}
