/**
 * Report Builder Component — Orchestrator for the 4-step report creation wizard.
 *
 * Delegates rendering to child presentational components:
 * - ReportBuilderTemplateSelectorComponent (Step 1: template selection)
 * - ReportBuilderParametersFormatComponent (Steps 2-3: parameters & format)
 * - ReportBuilderGenerateDeliverComponent (Step 4: generate/schedule)
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService, REPORT_TEMPLATES } from '../services/reports-api.service';
import type { ReportTemplate } from '../services/reports-api.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { REPORT_TABS } from '../reports.constants';
import { ReportBuilderTemplateSelectorComponent } from '../components/report-builder-template-selector.component';
import { ReportBuilderParametersFormatComponent } from '../components/report-builder-parameters-format.component';
import { ReportBuilderGenerateDeliverComponent } from '../components/report-builder-generate-deliver.component';
import { GrcOperationsService } from '@app/api';

type Step = 1 | 2 | 3 | 4;
type Frequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
type Format = 'pdf' | 'excel' | 'html';

const FREQ_TO_CRON: Record<Frequency, string> = {
  once:      '',
  daily:     '0 6 * * *',
  weekly:    '0 6 * * 1',
  monthly:   '0 6 1 * *',
  quarterly: '0 6 1 1,4,7,10 *',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-builder',
    imports: [
        CommonModule,
        PageHeaderComponent,
        ModuleTabsBarComponent,
        ReportBuilderTemplateSelectorComponent,
        ReportBuilderParametersFormatComponent,
        ReportBuilderGenerateDeliverComponent,
    ],
    template: `
    <div class="rb-page" [attr.dir]="dir()">

      <app-page-header
        [titleEn]="'Report Builder'"
        [titleAr]="'منشئ التقارير'"
        [subtitleEn]="'Build, configure and generate custom GRC reports in any format'"
        [subtitleAr]="'أنشئ وهيّئ وأصدر تقارير حوكمة مخصصة بأي تنسيق'"
        icon="file-edit"
        [breadcrumbs]="isAr() ? ['لوحة التحكم','التقارير','المنشئ'] : ['Dashboard','Reports','Builder']"
        [isAr]="isAr()"
        [dir]="dir()"
        [actions]="headerActions"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />

      <div class="rb-body">

        <!-- Step Progress Bar -->
        <div class="rb-stepper">
          @for (s of steps; track s.num) {
            <div class="rb-step" [class.active]="currentStep() === s.num" [class.done]="currentStep() > s.num" (click)="goToStep(s.num)">
              <div class="step-circle">
                @if (currentStep() > s.num) {
                  <i class="pi pi-check" aria-hidden="true"></i>
                } @else {
                  <span>{{ s.num }}</span>
                }
              </div>
              <span class="step-label">{{ isAr() ? s.labelAr : s.labelEn }}</span>
            </div>
            @if (s.num < steps.length) {
              <div class="step-connector" [class.done]="currentStep() > s.num"></div>
            }
          }
        </div>

        <!-- Step 1: Template Selection -->
        @if (currentStep() === 1) {
          <app-report-builder-template-selector
            [templates]="templates"
            [selectedTemplate]="selectedTemplate()"
            (templateSelected)="selectTemplate($event)"
            (next)="nextStep()" />
        }

        <!-- Steps 2-3: Parameters & Format -->
        @if (currentStep() === 2 || currentStep() === 3) {
          <app-report-builder-parameters-format
            [currentStep]="currentStep()"
            [selectedTemplate]="selectedTemplate()"
            [selectedFormat]="selectedFormat()"
            [params]="params"
            [availableSections]="availableSections()"
            (next)="nextStep()"
            (back)="prevStep()"
            (formatSelected)="selectedFormat.set($event)" />
        }

        <!-- Step 4: Generate & Deliver -->
        @if (currentStep() === 4 && selectedTemplate()) {
          <app-report-builder-generate-deliver
            [selectedTemplate]="selectedTemplate()!"
            [selectedFormat]="selectedFormat()"
            [reportLanguage]="params.language"
            [dateFrom]="params.dateFrom"
            [deliveryMode]="deliveryMode()"
            [generating]="generating()"
            [generated]="generated()"
            [generateError]="generateError()"
            [progress]="progress()"
            [scheduling]="scheduling()"
            [scheduled]="scheduled()"
            [scheduleError]="scheduleError()"
            [cronPreview]="cronPreview()"
            [cronDescription]="cronDescription()"
            [schedule]="schedule"
            (generate)="generate()"
            (createSchedule)="createSchedule()"
            (resetRequested)="resetBuilder()"
            (back)="prevStep()"
            (deliveryModeChange)="deliveryMode.set($event)" />
        }

      </div>
    </div>
  `,
    styles: [`
    .rb-page {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      background: var(--surface-ground, var(--surface-ice));
    }

    .rb-body {
      flex: 1;
      padding: 20px 28px 40px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* -- Stepper -- */
    .rb-stepper {
      display: flex;
      align-items: center;
      gap: 0;
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 16px 24px;
    }

    .rb-step {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: 700;
      border: 2px solid var(--border-subtle);
      background: var(--surface-ground, var(--surface-ice));
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .rb-step.active .step-circle {
      border-color: var(--primary-600, #2563eb);
      background: var(--primary-600, #2563eb);
      color: #fff;
    }

    .rb-step.done .step-circle {
      border-color: var(--success);
      background: var(--success);
      color: #fff;
    }

    .step-label {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .rb-step.active .step-label { color: var(--primary-700, #1d4ed8); font-weight: 700; }
    .rb-step.done .step-label { color: var(--success); }

    .step-connector {
      flex: 1;
      height: 2px;
      background: var(--border-subtle);
      margin: 0 12px;
      transition: background 0.2s;
    }
    .step-connector.done { background: var(--success); }

    @media (max-width: 768px) {
      .rb-body { padding: 16px 16px 32px; }
      .rb-stepper { padding: 12px 16px; gap: 0; }
      .step-label { display: none; }
      .step-connector { margin: 0 6px; }
    }
  `]
})
export class ReportBuilderComponent {
    private operationsSvc = inject(GrcOperationsService);
  readonly i18n = inject(I18nService);
  private reportsApi = inject(ReportsApiService);
  private router = inject(Router);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly tabs = REPORT_TABS;
  readonly templates = REPORT_TEMPLATES;

  readonly headerActions: PageHeaderAction[] = [
    { id: 'view-catalog', labelEn: 'Report Catalog', labelAr: 'كتالوج التقارير', icon: 'list' },
    { id: 'view-scheduled', labelEn: 'Schedules', labelAr: 'الجداول', icon: 'calendar' },
  ];

  readonly steps = [
    { num: 1 as Step, labelEn: 'Template',   labelAr: 'القالب' },
    { num: 2 as Step, labelEn: 'Parameters', labelAr: 'المعاملات' },
    { num: 3 as Step, labelEn: 'Format',     labelAr: 'التنسيق' },
    { num: 4 as Step, labelEn: 'Generate',   labelAr: 'الإنشاء' },
  ];

  currentStep   = signal<Step>(1);
  selectedTemplate = signal<ReportTemplate | null>(null);
  selectedFormat   = signal<Format | null>(null);
  deliveryMode     = signal<'now' | 'schedule'>('now');

  generating = signal(false);
  generated  = signal(false);
  generateError = signal('');
  progress = signal(0);

  scheduling = signal(false);
  scheduled  = signal(false);
  scheduleError = signal('');

  params = {
    dateFrom: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
    dateTo:   new Date().toISOString().slice(0, 10),
    language: this.isAr() ? 'ar' : 'en',
    scope:    'all' as string,
    reportName: '',
    orientation: 'portrait' as 'portrait' | 'landscape',
  };

  schedule = {
    frequency: 'monthly' as Frequency,
    weekDay:   '1',
    monthDay:  1,
    recipients: '',
  };

  availableSections = computed(() => {
    const t = this.selectedTemplate();
    if (!t) return [];
    const base = [
      { key: 'summary',         labelEn: 'Executive Summary',   labelAr: 'الملخص التنفيذي',   checked: true },
      { key: 'kpis',            labelEn: 'KPI Cards',           labelAr: 'بطاقات المؤشرات',   checked: true },
      { key: 'charts',          labelEn: 'Charts & Visuals',    labelAr: 'الرسوم البيانية',   checked: true },
      { key: 'findings',        labelEn: 'Key Findings',        labelAr: 'النتائج الرئيسية', checked: true },
      { key: 'recommendations', labelEn: 'Recommendations',     labelAr: 'التوصيات',         checked: true },
      { key: 'appendix',        labelEn: 'Appendix / Raw Data', labelAr: 'الملاحق والبيانات', checked: false },
    ];
    const extras: Record<string, { key: string; labelEn: string; labelAr: string; checked: boolean }[]> = {
      risk:       [{ key: 'heatmap',    labelEn: 'Risk Heatmap',      labelAr: 'خريطة المخاطر الحرارية', checked: true }],
      compliance: [{ key: 'framework', labelEn: 'Framework Coverage', labelAr: 'تغطية الأطر',           checked: true }],
      audit:      [{ key: 'capa',      labelEn: 'CAPA Status',        labelAr: 'حالة الإجراءات التصحيحية', checked: true }],
      executive:  [{ key: 'maturity',  labelEn: 'Maturity Score',     labelAr: 'مستوى النضج',           checked: true }],
    };
    return [...base, ...(extras[t.category] ?? [])];
  });

  cronPreview = computed(() => {
    if (this.schedule.frequency === 'weekly') {
      return `0 6 * * ${this.schedule.weekDay}`;
    }
    if (this.schedule.frequency === 'monthly') {
      return `0 6 ${this.schedule.monthDay} * *`;
    }
    return FREQ_TO_CRON[this.schedule.frequency] || '';
  });

  cronDescription = computed(() => {
    const isAr = this.isAr();
    switch (this.schedule.frequency) {
      case 'daily':     return isAr ? 'كل يوم الساعة ٦ صباحاً' : 'Every day at 6:00 AM';
      case 'weekly':    return isAr ? 'كل أسبوع في اليوم المحدد الساعة ٦ص' : 'Every week on the selected day at 6:00 AM';
      case 'monthly':   return isAr ? `اليوم ${this.schedule.monthDay} من كل شهر الساعة ٦ص` : `Day ${this.schedule.monthDay} of every month at 6:00 AM`;
      case 'quarterly': return isAr ? 'كل ٣ أشهر الساعة ٦ص' : 'Every 3 months at 6:00 AM';
      default:          return '';
    }
  });

  selectTemplate(t: ReportTemplate): void {
    this.selectedTemplate.set(t);
    this.selectedFormat.set(t.formats[0] ?? null);
  }

  goToStep(num: Step): void {
    if (num < this.currentStep()) this.currentStep.set(num);
  }

  nextStep(): void {
    const next = (this.currentStep() + 1) as Step;
    if (next <= 4) this.currentStep.set(next);
  }

  prevStep(): void {
    const prev = (this.currentStep() - 1) as Step;
    if (prev >= 1) this.currentStep.set(prev);
  }

  generate(): void {
    const t = this.selectedTemplate();
    const fmt = this.selectedFormat();
    if (!t || !fmt) return;

    this.generating.set(true);
    this.generated.set(false);
    this.generateError.set('');
    this.progress.set(10);

    const lang = this.params.language as 'en' | 'ar';
    const progressInterval = setInterval(() => {
      const p = this.progress();
      if (p < 85) this.progress.set(p + 15);
    }, 400);

    this.reportsApi.generateReport(t.key, fmt, lang).subscribe({
      next: (blob) => {
        clearInterval(progressInterval);
        this.progress.set(100);
        const ext = fmt === 'excel' ? 'xlsx' : fmt;
        const name = this.params.reportName
          ? `${this.params.reportName}.${ext}`
          : `${t.key}-${new Date().toISOString().slice(0, 10)}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => {
          this.generating.set(false);
          this.generated.set(true);
        }, 300);
      },
      error: () => {
        clearInterval(progressInterval);
        this.progress.set(0);
        this.generating.set(false);
        this.generateError.set(this.isAr() ? 'فشل إنشاء التقرير — تحقق من الاتصال وحاول مجدداً' : 'Report generation failed — check connection and retry');
      },
    });
  }

  createSchedule(): void {
    const t = this.selectedTemplate();
    const fmt = this.selectedFormat();
    if (!t || !fmt || !this.schedule.frequency) return;

    this.scheduling.set(true);
    this.scheduled.set(false);
    this.scheduleError.set('');

    const cron = this.cronPreview();
    this.operationsSvc.createReportSchedule({
      reportType:       t.key,
      cronExpression:   cron,
      recipients:       this.schedule.recipients,
      format:           fmt,
      language:         this.params.language,
      reportName:       this.params.reportName || (this.isAr() ? t.titleAr : t.titleEn),
      params:           {
        dateFrom:    this.params.dateFrom,
        dateTo:      this.params.dateTo,
        scope:       this.params.scope,
        orientation: this.params.orientation,
      },
    } as any).subscribe({
      next: () => { this.scheduling.set(false); this.scheduled.set(true); },
      error: () => {
        this.scheduling.set(false);
        this.scheduleError.set(this.isAr() ? 'فشل حفظ الجدول — حاول مجدداً' : 'Failed to save schedule — please retry');
      },
    });
  }

  resetBuilder(): void {
    this.currentStep.set(1);
    this.selectedTemplate.set(null);
    this.selectedFormat.set(null);
    this.generated.set(false);
    this.generateError.set('');
    this.progress.set(0);
    this.deliveryMode.set('now');
  }

  onHeaderAction(id: string): void {
    if (id === 'view-catalog')  this.router.navigate(['/reports/exports']);
    if (id === 'view-scheduled') this.router.navigate(['/reports/scheduled']);
  }
}
