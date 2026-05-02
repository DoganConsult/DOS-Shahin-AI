import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/* ── DTOs ── */

export interface ReportTemplate {
  id: string;
  key: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  category: 'governance' | 'risk' | 'compliance' | 'audit' | 'vendor' | 'executive';
  formats: ('pdf' | 'html' | 'excel')[];
}

export interface ReportCatalogItem {
  reportId: string;
  title: string;
  module: string;
  generatedAt: string;
  format: string;
  sharedBy?: string;
}

export interface ReportCatalogPage {
  items: ReportCatalogItem[];
  nextCursor?: string;
  total: number;
}

export interface ExecutiveSummary {
  overallComplianceScore: number;
  openRisksCount: number;
  pendingRemediationsCount: number;
  controlsTestedCount: number;
  frameworksCovered: number;
  evidenceFreshPercent: number;
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
}

export interface BoardReport {
  generatedAt: string;
  executiveSummary: {
    overallCompliancePct: number;
    controlEffectivenessPct: number;
    policyApprovalPct: number;
    openRisks: number;
    criticalFindings: number;
    openIncidents: number;
  };
  risks: { total: number; critical: number; high: number; medium: number; low: number };
  controls: { total: number; implemented: number; effectivenessPct: number };
  policies: { total: number; approved: number; approvalPct: number };
  findings: { total: number; open: number; closed: number; criticalOpen: number };
  compliance: { totalFrameworks: number; activeFrameworks: number; avgCompliancePct: number };
  vendors: { total: number; criticalVendors: number; expiredContracts: number };
  incidents: { total: number; openIncidents: number };
}

/* ── Report Templates Registry ── */

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive_summary', key: 'executive-snapshot',
    titleEn: 'Executive GRC Summary', titleAr: 'ملخص الحوكمة التنفيذي',
    descriptionEn: 'Board-level overview with compliance gauge, risk distribution, and KPIs',
    descriptionAr: 'نظرة تنفيذية شاملة مع مقياس الامتثال وتوزيع المخاطر والمؤشرات',
    icon: '📊', category: 'executive', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'risk_posture', key: 'risk-register',
    titleEn: 'Risk Register Report', titleAr: 'تقرير سجل المخاطر',
    descriptionEn: 'Full risk posture with distribution, trends, top risks, and treatment status',
    descriptionAr: 'وضع المخاطر الكامل مع التوزيع والاتجاهات وأهم المخاطر وحالة المعالجة',
    icon: '🛡️', category: 'risk', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'audit_readiness', key: 'audit-summary',
    titleEn: 'Audit Readiness Report', titleAr: 'تقرير جاهزية التدقيق',
    descriptionEn: 'Audit readiness scores by domain with gaps and recommendations',
    descriptionAr: 'درجات جاهزية التدقيق حسب المجال مع الثغرات والتوصيات',
    icon: '🔍', category: 'audit', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'vendor_risk_summary', key: 'vendor-risk',
    titleEn: 'Vendor Risk Summary', titleAr: 'ملخص مخاطر الموردين',
    descriptionEn: 'Vendor assessment scores, risk tiers, and contract status',
    descriptionAr: 'درجات تقييم الموردين ومستويات المخاطر وحالة العقود',
    icon: '🏢', category: 'vendor', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'incident_trend', key: 'incident-trend',
    titleEn: 'Incident Trend Analysis', titleAr: 'تحليل اتجاهات الحوادث',
    descriptionEn: 'Monthly incident trends by severity with resolution metrics',
    descriptionAr: 'اتجاهات الحوادث الشهرية حسب الخطورة مع مقاييس الحل',
    icon: '⚡', category: 'risk', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'evidence_coverage', key: 'dpia',
    titleEn: 'Evidence Coverage Report', titleAr: 'تقرير تغطية الأدلة',
    descriptionEn: 'Evidence freshness, coverage gaps, and stale evidence tracking',
    descriptionAr: 'حداثة الأدلة وثغرات التغطية وتتبع الأدلة القديمة',
    icon: '📋', category: 'compliance', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'maturity_assessment', key: 'maturity',
    titleEn: 'Maturity Assessment', titleAr: 'تقييم النضج',
    descriptionEn: 'GRC maturity scores across domains with radar visualization',
    descriptionAr: 'درجات نضج الحوكمة عبر المجالات مع التمثيل الراداري',
    icon: '📈', category: 'governance', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'kpi_trend', key: 'kpi-trend',
    titleEn: 'KPI Trend Dashboard', titleAr: 'لوحة اتجاهات المؤشرات',
    descriptionEn: 'Key performance indicators over time with multi-line trending',
    descriptionAr: 'مؤشرات الأداء الرئيسية عبر الزمن مع اتجاهات متعددة',
    icon: '📉', category: 'executive', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'remediation_progress', key: 'remediation',
    titleEn: 'Remediation Progress', titleAr: 'تقدم المعالجة',
    descriptionEn: 'Remediation task completion, overdue items, and priority breakdown',
    descriptionAr: 'إنجاز مهام المعالجة والعناصر المتأخرة وتوزيع الأولويات',
    icon: '🔧', category: 'compliance', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'regulatory_heatmap', key: 'regulator-heatmap',
    titleEn: 'Regulatory Compliance Heatmap', titleAr: 'خريطة الامتثال التنظيمي',
    descriptionEn: 'Cross-framework compliance heatmap with regulator mapping',
    descriptionAr: 'خريطة حرارية للامتثال عبر الأطر مع تعيين المنظمين',
    icon: '🗺️', category: 'compliance', formats: ['pdf', 'html', 'excel'],
  },
  {
    id: 'cross_mapping', key: 'cross-mapping',
    titleEn: 'Cross-Framework Control Mapping', titleAr: 'خريطة الضوابط المتقاطعة',
    descriptionEn: 'Control overlap and mapping across NCA-ECC, ISO 27001, SAMA, PDPL',
    descriptionAr: 'تداخل الضوابط والتعيين عبر أطر NCA-ECC وISO 27001 وساما وPDPL',
    icon: '🔗', category: 'governance', formats: ['pdf', 'html', 'excel'],
  },
];

/* ── Service ── */

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);

  /* Report Hub endpoints */
  getCatalog(params?: Record<string, string>): Observable<ReportCatalogPage> {
    return this.http.get<ReportCatalogPage>('/api/report-hub/catalog', { params });
  }

  getSummary(): Observable<ExecutiveSummary> {
    return this.http.get<ExecutiveSummary>('/api/report-hub/summary');
  }

  getTrends(days = 30): Observable<{ trends: TrendPoint[] }> {
    return this.http.get<{ trends: TrendPoint[] }>('/api/report-hub/trends', {
      params: { days: days.toString() },
    });
  }

  getAnomalies(): Observable<{ anomalies: Anomaly[] }> {
    return this.http.get<{ anomalies: Anomaly[] }>('/api/report-hub/anomalies').pipe(
      map((r) => ({ anomalies: Array.isArray(r?.anomalies) ? r.anomalies : [] }))
    );
  }

  /* Board report */
  getBoardReport(workspaceId?: string): Observable<BoardReport> {
    const params: Record<string, string> = {};
    if (workspaceId) params['workspaceId'] = workspaceId;
    return this.http.get<BoardReport>('/api/report-center/board-report', { params });
  }

  /* Generate & download reports */
  generateReport(reportType: string, format: 'pdf' | 'html' | 'excel', lang = 'en'): Observable<Blob> {
    return this.http.get(`/api/reports/generate/${reportType}/${format}`, {
      params: { lang },
      responseType: 'blob',
    });
  }

  /* Download from report hub */
  downloadPdf(reportId: string, lang = 'en'): Observable<Blob> {
    return this.http.get(`/api/report-hub/${reportId}/pdf`, {
      params: { lang },
      responseType: 'blob',
    });
  }

  downloadHtml(reportId: string, lang = 'en'): Observable<Blob> {
    return this.http.get(`/api/report-hub/${reportId}/html`, {
      params: { lang },
      responseType: 'blob',
    });
  }

  downloadExcel(reportId: string): Observable<Blob> {
    return this.http.get(`/api/report-hub/${reportId}/xls`, {
      responseType: 'blob',
    });
  }

  /* Board report HTML export */
  downloadBoardHtml(lang = 'en', workspaceId?: string): Observable<Blob> {
    const params: Record<string, string> = { lang };
    if (workspaceId) params['workspaceId'] = workspaceId;
    return this.http.get('/api/report-center/board-report/html', {
      params,
      responseType: 'blob',
    });
  }

  /* Sample reports (public) */
  getSampleReport(type: string): Observable<Blob> {
    return this.http.get(`/api/public/sample-reports/${type}`, {
      responseType: 'blob',
    });
  }

  /* Share */
  shareReport(reportId: string, recipientIds: string[], recipientType = 'user'): Observable<any> {
    return this.http.post(`/api/report-hub/${reportId}/share`, {
      recipientIds,
      recipientType,
    });
  }
}
