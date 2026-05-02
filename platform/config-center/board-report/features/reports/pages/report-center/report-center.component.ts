import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcFormFieldComponent } from '@app/widgets';
import {
  ReportFactoryCatalogService,
  AgrcReport,
} from '@app/core/services/reporting/report-factory-catalog.service';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

type ViewMode = 'role' | 'workspace' | 'lifecycle';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-center',
    imports: [
        CommonModule, FormsModule, PageShellComponent,
        ButtonModule, TagModule, DialogModule, DropdownModule, TooltipModule,
        GrcFormFieldComponent
    ],
    templateUrl: './report-center.component.html',
    styleUrls: ['./report-center.component.scss']
})
export class ReportCenterComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  catalog = inject(ReportFactoryCatalogService);
  i18n = inject(I18nService);
  private toast = inject(ToastService);

  // Backend has 10 real report generators — map catalog IDs to their template keys
  private readonly BACKEND_TEMPLATE_KEYS = [
    'risk_posture', 'audit_readiness', 'vendor_risk_summary', 'incident_trend',
    'evidence_coverage', 'maturity_assessment', 'executive_summary',
    'regulatory_change_impact', 'kpi_trend', 'remediation_progress',
  ] as const;

  private readonly catalogToTemplate: Record<string, string> = {
    // CEO
    'ceo-01': 'executive_summary', 'ceo-02': 'risk_posture', 'ceo-03': 'maturity_assessment',
    'ceo-06': 'executive_summary', 'ceo-07': 'executive_summary',
    // CISO
    'ciso-01': 'risk_posture', 'ciso-04': 'incident_trend', 'ciso-05': 'evidence_coverage',
    'ciso-07': 'vendor_risk_summary',
    // Compliance
    'comp-01': 'maturity_assessment', 'comp-02': 'evidence_coverage',
    'comp-04': 'regulatory_change_impact', 'comp-05': 'audit_readiness',
    'comp-06': 'evidence_coverage', 'comp-07': 'remediation_progress',
    'comp-10': 'kpi_trend',
    // Risk Manager
    'risk-01': 'risk_posture', 'risk-02': 'risk_posture', 'risk-03': 'risk_posture',
    'risk-07': 'vendor_risk_summary',
    // Auditor
    'aud-01': 'audit_readiness', 'aud-02': 'audit_readiness', 'aud-06': 'remediation_progress',
    // Control Owner
    'co-01': 'evidence_coverage', 'co-02': 'evidence_coverage', 'co-03': 'remediation_progress',
  };

  viewMode = signal<ViewMode>('role');
  activeRoleKey = signal<string>('');
  activeHubKey = signal<string>('');
  activeStageKey = signal<string>('');

  filteredReports = computed(() => {
    const mode = this.viewMode();
    if (mode === 'role') {
      const key = this.activeRoleKey();
      return key ? this.catalog.getReportsByRole(key) : this.catalog.getAllRoleReports();
    }
    if (mode === 'workspace') {
      const key = this.activeHubKey();
      return key ? this.catalog.getReportsByWorkspace(key) : this.catalog.getAllWorkspaceReports();
    }
    const key = this.activeStageKey();
    return key ? this.catalog.getReportsByLifecycle(key) : this.catalog.getAllLifecycleReports();
  });

  generateDialogVisible = false;
  generateDialogTitle = '';
  selectedReport: AgrcReport | null = null;
  exportLang = 'en';
  exportFormat: 'pdf' | 'excel' | 'html' = 'pdf';

  langOptions = [
    { label: 'English', value: 'en' },
    { label: 'العربية', value: 'ar' },
    { label: 'Bilingual / ثنائي', value: 'bilingual' },
  ];

  schedules: Record<string, any>[] = [];
  showScheduleDialog = false;
  newSchedule = { templateKey: '', cronExpression: '' };

  scheduleReportOptions: { label: string; value: string }[] = [];

  isAr(): boolean { return this.i18n.currentLang() === 'ar'; }

  formatOptions = computed(() => {
    if (!this.selectedReport) return [];
    return this.selectedReport.formats.map(f => ({ label: f.toUpperCase(), value: f }));
  });

  private readonly SCHEDULE_LABELS: Record<string, { en: string; ar: string }> = {
    risk_posture: { en: 'Risk Posture Report', ar: 'تقرير وضع المخاطر' },
    audit_readiness: { en: 'Audit Readiness Report', ar: 'تقرير جاهزية التدقيق' },
    vendor_risk_summary: { en: 'Vendor Risk Summary', ar: 'ملخص مخاطر الموردين' },
    incident_trend: { en: 'Incident Trend Report', ar: 'تقرير اتجاه الحوادث' },
    evidence_coverage: { en: 'Evidence Coverage Report', ar: 'تقرير تغطية الأدلة' },
    maturity_assessment: { en: 'Maturity Assessment', ar: 'تقييم النضج' },
    executive_summary: { en: 'Executive Summary', ar: 'الملخص التنفيذي' },
    regulatory_change_impact: { en: 'Regulatory Change Impact', ar: 'أثر التغيير التنظيمي' },
    kpi_trend: { en: 'KPI Trend Report', ar: 'تقرير اتجاه المؤشرات' },
    remediation_progress: { en: 'Remediation Progress', ar: 'تقدم المعالجة' },
  };

  ngOnInit(): void {
    // Only show the 10 backend-supported generator templates for scheduling
    this.scheduleReportOptions = this.BACKEND_TEMPLATE_KEYS.map(key => ({
      label: this.isAr()
        ? (this.SCHEDULE_LABELS[key]?.ar || key)
        : (this.SCHEDULE_LABELS[key]?.en || key),
      value: key,
    }));
    this.loadSchedules();
  }

  openGenerateDialog(report: AgrcReport): void {
    this.selectedReport = report;
    this.generateDialogTitle = this.i18n.localize(report.titleEn, report.titleAr);
    this.exportFormat = report.formats.find((format): format is 'html' | 'pdf' | 'excel' => format === 'html' || format === 'pdf' || format === 'excel') ?? 'pdf';
    this.generateDialogVisible = true;
  }

  async downloadReport(): Promise<void> {
    this.generateDialogVisible = false;
    if (!this.selectedReport) return;
    const rpt = this.selectedReport;
    const fmt = this.exportFormat;
    const lang = this.exportLang;

    if (fmt === 'html') {
      const url = `/api/public/sample-reports/executive-grc`;
      this.fetchAndDownload(url, `${rpt.id}-report.html`);
      return;
    }

    // Map catalog ID → backend template key for real data generation
    const templateKey = this.catalogToTemplate[rpt.id];
    if (templateKey) {
      // Generate real report via report-center, then download via report.routes format endpoint
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
      this.operationsSvc.generateReportCenter(templateKey, { language: lang } as any).subscribe({
        next: () => {
          const url = `/api/reports/generate/${templateKey}/${fmt}?lang=${lang}`;
          this.fetchAndDownload(url, `${rpt.id}-report.${ext}`);
        },
        error: () => {
          // Fallback to direct download
          const url = `/api/reports/generate/${templateKey}/${fmt}?lang=${lang}`;
          this.fetchAndDownload(url, `${rpt.id}-report.${ext}`);
        },
      });
      return;
    }

    // Unmapped reports — try direct download
    const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
    const url = `/api/reports/generate/${rpt.id}/${fmt}?lang=${lang}`;
    this.fetchAndDownload(url, `${rpt.id}-report.${ext}`);
  }

  private fetchAndDownload(url: string, filename: string): void {
    this.apiclientSvc.getBlob(url.replace('/api', '')).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (err) => this.toast.error('Download failed: ' + (err.message || 'Unknown error')),
    });
  }

  loadSchedules(): void {
    this.operationsSvc.getReportCenterSchedules().subscribe({
      next: (d: Record<string, any>) => { this.schedules = Array.isArray(d) ? d : (d.schedules || []); },
      error: (e: any) => devError("[API]", e),
    });
  }

  createSchedule(): void {
    this.operationsSvc.createReportSchedule({
      templateKey: this.newSchedule.templateKey,
      cronExpression: this.newSchedule.cronExpression,
    } as any).subscribe({
      next: () => {
        this.showScheduleDialog = false;
        this.newSchedule = { templateKey: '', cronExpression: '' };
        this.loadSchedules();
      },
      error: (e: any) => devError("[API]", e),
    });
  }
}
