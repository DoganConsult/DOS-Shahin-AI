import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { ReportDefinitionContract, ReportRunContract, ReportDiagnosticsContract, ReportDashboardContract } from '../contracts/reports.contracts';

/* ── Board Report aggregate returned by getBoardReport ── */
export interface BoardReport {
  executiveSummary?: { openRisks?: number; [k: string]: unknown };
  findings?: { criticalOpen?: number; closed?: number; total?: number; [k: string]: unknown };
  incidents?: { openIncidents?: number; [k: string]: unknown };
  controls?: { effectivenessPct?: number; [k: string]: unknown };
  policies?: { approvalPct?: number; [k: string]: unknown };
  vendors?: { criticalVendors?: number; [k: string]: unknown };
  compliance?: { activeFrameworks?: number; [k: string]: unknown };
  [k: string]: unknown;
}

/* ── Report template definition used by the builder ── */
export interface ReportTemplate {
  id: string;
  key: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  category: string;
  formats: ('pdf' | 'excel' | 'html')[];
}

/* ── Built-in report templates ── */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'tpl-exec',       key: 'executive-snapshot',  titleEn: 'Executive Summary',         titleAr: 'الملخص التنفيذي',         descriptionEn: 'Board-level KPI overview',                       descriptionAr: 'نظرة شاملة لمؤشرات مجلس الإدارة',           icon: '📊', category: 'executive',  formats: ['pdf', 'excel', 'html'] },
  { id: 'tpl-risk',       key: 'risk-register',       titleEn: 'Risk Register Report',      titleAr: 'تقرير سجل المخاطر',       descriptionEn: 'Full risk register with heatmap',                descriptionAr: 'سجل المخاطر الكامل مع الخريطة الحرارية',    icon: '⚠️', category: 'risk',       formats: ['pdf', 'excel'] },
  { id: 'tpl-compliance', key: 'compliance-status',    titleEn: 'Compliance Status Report',  titleAr: 'تقرير وضع الامتثال',      descriptionEn: 'Framework coverage and compliance gauge',        descriptionAr: 'تغطية الأطر ومقياس الامتثال',               icon: '🛡️', category: 'compliance', formats: ['pdf', 'excel', 'html'] },
  { id: 'tpl-audit',      key: 'audit-summary',       titleEn: 'Audit Summary Report',      titleAr: 'تقرير ملخص التدقيق',      descriptionEn: 'Findings by severity and audit readiness',       descriptionAr: 'النتائج حسب الخطورة وجاهزية التدقيق',       icon: '🔍', category: 'audit',      formats: ['pdf', 'excel'] },
  { id: 'tpl-evidence',   key: 'evidence-coverage',   titleEn: 'Evidence Coverage Report',   titleAr: 'تقرير تغطية الأدلة',      descriptionEn: 'Evidence status and pending queue',              descriptionAr: 'حالة الأدلة وقائمة الانتظار',               icon: '📁', category: 'compliance', formats: ['pdf', 'excel'] },
  { id: 'tpl-vendor',     key: 'vendor-risk-summary', titleEn: 'Vendor Risk Summary',        titleAr: 'ملخص مخاطر الموردين',     descriptionEn: 'Third-party risk assessment overview',           descriptionAr: 'نظرة عامة على تقييم مخاطر الأطراف الثالثة', icon: '🚚', category: 'vendor',     formats: ['pdf', 'excel'] },
  { id: 'tpl-incident',   key: 'incident-trend',      titleEn: 'Incident Trend Report',      titleAr: 'تقرير اتجاه الحوادث',     descriptionEn: 'Incident trends and response metrics',          descriptionAr: 'اتجاهات الحوادث ومقاييس الاستجابة',         icon: '⚡', category: 'risk',       formats: ['pdf', 'excel'] },
  { id: 'tpl-maturity',   key: 'maturity-assessment', titleEn: 'Maturity Assessment',        titleAr: 'تقييم النضج',             descriptionEn: 'GRC maturity model scoring',                     descriptionAr: 'نموذج تسجيل نضج الحوكمة',                   icon: '📈', category: 'executive',  formats: ['pdf', 'html'] },
  { id: 'tpl-regulatory', key: 'regulatory-change',   titleEn: 'Regulatory Change Impact',   titleAr: 'أثر التغيير التنظيمي',    descriptionEn: 'Impact analysis of regulatory changes',          descriptionAr: 'تحليل أثر التغييرات التنظيمية',             icon: '📜', category: 'compliance', formats: ['pdf', 'excel'] },
  { id: 'tpl-kpi',        key: 'kpi-trend',           titleEn: 'KPI Trend Report',           titleAr: 'تقرير اتجاه المؤشرات',    descriptionEn: 'Historical KPI trends and projections',          descriptionAr: 'اتجاهات المؤشرات التاريخية والتوقعات',      icon: '📉', category: 'executive',  formats: ['pdf', 'excel', 'html'] },
  { id: 'tpl-dpia',       key: 'dpia',                titleEn: 'DPIA Report',                titleAr: 'تقرير تقييم الخصوصية',    descriptionEn: 'Data Protection Impact Assessment',              descriptionAr: 'تقييم أثر حماية البيانات',                  icon: '🔒', category: 'governance', formats: ['pdf'] },
];

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  /* ── Contract-based endpoints ── */
  getReports(): Observable<{ data: ReportDefinitionContract[] }> { return this.http.get<{ data: ReportDefinitionContract[] }>(this.base); }
  getReport(id: string): Observable<ReportDefinitionContract> { return this.http.get<ReportDefinitionContract>(`${this.base}/${id}`); }
  createReport(dto: Partial<ReportDefinitionContract>): Observable<ReportDefinitionContract> { return this.http.post<ReportDefinitionContract>(this.base, dto); }
  getRuns(id: string): Observable<{ data: ReportRunContract[] }> { return this.http.get<{ data: ReportRunContract[] }>(`${this.base}/${id}/runs`); }
  getDiagnostics(): Observable<{ data: ReportDiagnosticsContract }> { return this.http.get<{ data: ReportDiagnosticsContract }>(`${this.base}/diagnostics`); }
  getDashboard(): Observable<{ data: ReportDashboardContract }> { return this.http.get<{ data: ReportDashboardContract }>(`${this.base}/dashboard`); }

  /* ── Board / executive aggregate ── */
  getBoardReport(): Observable<BoardReport> { return this.http.get<BoardReport>(`${this.base}/board`); }

  /* ── Report generation (returns blob for download) ── */
  generateReport(key: string, format: string, lang: string): Observable<Blob> {
    return this.http.get(`${this.base}/generate/${key}/${format}`, {
      params: { lang },
      responseType: 'blob',
    });
  }

  /* ── Anomaly alerts ── */
  getAnomalies(): Observable<Record<string, unknown>> { return this.http.get<Record<string, unknown>>(`${this.base}/anomalies`); }

  /* ── Catalog (generated reports listing) ── */
  getCatalog(params?: Record<string, string>): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/catalog`, { params });
  }

  /* ── Direct downloads ── */
  downloadPdf(reportId: string, lang: string): Observable<Blob> {
    return this.http.get(`${this.base}/${reportId}/pdf`, { params: { lang }, responseType: 'blob' });
  }
  downloadExcel(reportId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${reportId}/excel`, { responseType: 'blob' });
  }
}
