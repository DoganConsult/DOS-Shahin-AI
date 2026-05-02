/**
 * Controls Reports Page — AGRC-OS Controls Module
 *
 * Report catalog grid with cards for each report type,
 * and a generate report dialog with format/date/framework selectors.
 *
 * @module controls
 * @see ControlsApiService.getReportCatalog, ControlsApiService.runReport
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';

import { ControlsApiService } from '../../services/controls-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';

/** Report card view model */
interface ReportCardVM {
  id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
}

/** Default report catalog (used if API returns empty) */
const DEFAULT_REPORTS: ReportCardVM[] = [
  {
    id: 'executive_pack',
    icon: 'pi-briefcase',
    titleEn: 'Executive Pack',
    titleAr: 'حزمة تنفيذية',
    descEn: 'Board-ready summary of control posture, key metrics, and risk exposure.',
    descAr: 'ملخص جاهز لمجلس الإدارة حول وضع الضوابط والمقاييس الرئيسية والتعرض للمخاطر.',
  },
  {
    id: 'key_controls',
    icon: 'pi-key',
    titleEn: 'Key Controls Report',
    titleAr: 'تقرير الضوابط الرئيسية',
    descEn: 'Status and effectiveness of all key controls across frameworks.',
    descAr: 'حالة وفعالية جميع الضوابط الرئيسية عبر الأطر.',
  },
  {
    id: 'failed_tests',
    icon: 'pi-times-circle',
    titleEn: 'Failed Tests Report',
    titleAr: 'تقرير الاختبارات الفاشلة',
    descEn: 'All tests that failed in the selected period with root cause analysis.',
    descAr: 'جميع الاختبارات التي فشلت في الفترة المحددة مع تحليل السبب الجذري.',
  },
  {
    id: 'overdue_testing',
    icon: 'pi-clock',
    titleEn: 'Overdue Testing Report',
    titleAr: 'تقرير الاختبارات المتأخرة',
    descEn: 'Controls with overdue test schedules and days past due.',
    descAr: 'الضوابط ذات جداول الاختبار المتأخرة وعدد أيام التأخير.',
  },
  {
    id: 'certifications',
    icon: 'pi-check-circle',
    titleEn: 'Certifications Report',
    titleAr: 'تقرير الشهادات',
    descEn: 'Certification campaign completion rates and outstanding attestations.',
    descAr: 'معدلات إتمام حملات الشهادات والتصديقات المعلقة.',
  },
  {
    id: 'deficiencies',
    icon: 'pi-exclamation-triangle',
    titleEn: 'Deficiencies Report',
    titleAr: 'تقرير أوجه القصور',
    descEn: 'Open deficiencies by severity with remediation timelines.',
    descAr: 'أوجه القصور المفتوحة حسب الخطورة مع الجداول الزمنية للمعالجة.',
  },
  {
    id: 'automation_maturity',
    icon: 'pi-cog',
    titleEn: 'Automation Maturity',
    titleAr: 'نضج الأتمتة',
    descEn: 'Breakdown of manual, semi-automated, and fully automated controls.',
    descAr: 'تفصيل الضوابط اليدوية وشبه الآلية والآلية بالكامل.',
  },
  {
    id: 'coverage_analysis',
    icon: 'pi-sitemap',
    titleEn: 'Coverage Analysis',
    titleAr: 'تحليل التغطية',
    descEn: 'Gap analysis: unmapped controls, obligations without controls, weak coverage.',
    descAr: 'تحليل الفجوات: ضوابط غير مرتبطة، التزامات بدون ضوابط، تغطية ضعيفة.',
  },
];

@Component({
    selector: 'app-controls-reports',
    templateUrl: './controls-reports.component.html',
    styleUrl: './controls-reports.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        DropdownModule,
        CalendarModule,
        SkeletonModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        GrcFormFieldComponent,
    ]
})
export class ControlsReportsComponent implements OnInit {
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  reports = signal<ReportCardVM[]>([]);

  /** Generate dialog */
  showGenerateDialog = signal(false);
  generating = signal(false);
  selectedReport = signal<ReportCardVM | null>(null);

  /** Generate form values */
  selectedFormat = signal<string>('pdf');
  dateFrom = signal<Date | null>(null);
  dateTo = signal<Date | null>(null);
  selectedFramework = signal<string | null>(null);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Format options */
  formatOptions = [
    { label: 'PDF', value: 'pdf' },
    { label: 'XLSX', value: 'xlsx' },
    { label: 'CSV', value: 'csv' },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getReportCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          // Use API data if available, otherwise fall back to defaults
          if (data?.length) {
            this.reports.set(data);
          } else {
            this.reports.set(DEFAULT_REPORTS);
          }
          this.loading.set(false);
        },
        error: () => {
          // Fall back to default catalog on error
          this.reports.set(DEFAULT_REPORTS);
          this.loading.set(false);
        },
      });
  }

  /** Open generate dialog for a specific report */
  openGenerateDialog(report: ReportCardVM): void {
    this.selectedReport.set(report);
    this.selectedFormat.set('pdf');
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.selectedFramework.set(null);
    this.showGenerateDialog.set(true);
  }

  /** Generate and download report */
  generateReport(): void {
    const report = this.selectedReport();
    if (!report) return;
    this.generating.set(true);

    const params: Record<string, string> = {
      format: this.selectedFormat(),
    };
    if (this.dateFrom()) {
      params['dateFrom'] = this.dateFrom()!.toISOString().split('T')[0];
    }
    if (this.dateTo()) {
      params['dateTo'] = this.dateTo()!.toISOString().split('T')[0];
    }
    if (this.selectedFramework()) {
      params['frameworkId'] = this.selectedFramework()!;
    }

    this.api
      .runReport(report.id, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.generating.set(false);
          this.showGenerateDialog.set(false);
          // Trigger browser download
          const ext = this.selectedFormat();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${report.id}_report.${ext}`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => this.generating.set(false),
      });
  }
}
