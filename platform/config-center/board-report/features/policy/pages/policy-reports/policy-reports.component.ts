/**
 * Policy Reports Page -- Report catalog with generation, filtering, and export.
 *
 * Displays 7 report types in a card grid. Users select a report, configure
 * filters (date range, category, status), and generate results displayed
 * in a KPI summary + data table. Supports CSV, Excel, and PDF export
 * via PolicyExportService.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PolicyApiService } from '../../services/policy-api.service';
import { PolicyExportService } from '../../services/policy-export.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { GrcDataTableComponent } from '@app/shared/components';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/** A single report type definition in the catalog */
export interface ReportCard {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
}

/** KPI returned by a generated report */
export interface ReportKPI {
  label: string;
  value: string | number;
  icon?: string;
}

/** The full report catalog */
export const REPORT_CATALOG: ReportCard[] = [
  {
    id: 'executive_pack',
    name: 'Executive Policy Pack',
    nameAr: '\u062D\u0632\u0645\u0629 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A\u0629',
    description: 'Board-ready policy summary',
    descriptionAr: '\u0645\u0644\u062E\u0635 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0644\u0645\u062C\u0644\u0633 \u0627\u0644\u0625\u062F\u0627\u0631\u0629',
    icon: 'pi-briefcase',
  },
  {
    id: 'acknowledgment',
    name: 'Acknowledgment Report',
    nameAr: '\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0625\u0642\u0631\u0627\u0631',
    description: 'Attestation completion details',
    descriptionAr: '\u062A\u0641\u0627\u0635\u064A\u0644 \u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u062A\u0635\u062F\u064A\u0642',
    icon: 'pi-check-circle',
  },
  {
    id: 'stale_policy',
    name: 'Stale Policy Report',
    nameAr: '\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629',
    description: 'Policies overdue for review',
    descriptionAr: '\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629',
    icon: 'pi-clock',
  },
  {
    id: 'coverage',
    name: 'Coverage Report',
    nameAr: '\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062A\u063A\u0637\u064A\u0629',
    description: 'Control/risk/obligation linkage gaps',
    descriptionAr: '\u0641\u062C\u0648\u0627\u062A \u0631\u0628\u0637 \u0627\u0644\u0636\u0648\u0627\u0628\u0637/\u0627\u0644\u0645\u062E\u0627\u0637\u0631/\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A',
    icon: 'pi-sitemap',
  },
  {
    id: 'exception_register',
    name: 'Exception Register',
    nameAr: '\u0633\u062C\u0644 \u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A',
    description: 'Active/expired exception log',
    descriptionAr: '\u0633\u062C\u0644 \u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0627\u0644\u0646\u0634\u0637\u0629/\u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629',
    icon: 'pi-exclamation-triangle',
  },
  {
    id: 'publication_history',
    name: 'Publication History',
    nameAr: '\u0633\u062C\u0644 \u0627\u0644\u0646\u0634\u0631',
    description: 'Distribution and delivery log',
    descriptionAr: '\u0633\u062C\u0644 \u0627\u0644\u062A\u0648\u0632\u064A\u0639 \u0648\u0627\u0644\u062A\u0633\u0644\u064A\u0645',
    icon: 'pi-send',
  },
  {
    id: 'review_compliance',
    name: 'Review Compliance',
    nameAr: '\u0627\u0645\u062A\u062B\u0627\u0644 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629',
    description: 'Review cycle adherence metrics',
    descriptionAr: '\u0645\u0642\u0627\u064A\u064A\u0633 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629',
    icon: 'pi-chart-bar',
  },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-reports',
    imports: [
        CommonModule,
        FormsModule,
        GrcDataTableComponent,
        PageHeaderComponent,
        StatusBadgeComponent,
        SkeletonLoaderComponent,
        ButtonModule,
        CalendarModule,
        DropdownModule,
        TableModule,
        ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './policy-reports.component.html',
    styleUrls: ['./policy-reports.component.scss']
})
export class PolicyReportsComponent implements OnInit {
  private readonly policyApi = inject(PolicyApiService);
  private readonly exportService = inject(PolicyExportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  readonly i18n = inject(I18nService);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  readonly headerActions: PageHeaderAction[] = [];

  /** Report catalog loaded from constant */
  readonly reports = signal<ReportCard[]>(REPORT_CATALOG);

  /** Currently selected report type for generation */
  readonly selectedReport = signal<string | null>(null);

  /** Generated report data from the API */
  readonly reportData = signal<any>(null);

  /** Whether report generation is in progress */
  readonly generating = signal(false);

  /** Loading state for initial page */
  readonly loading = signal(false);

  /** Filter model */
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  filterCategory: string | null = null;
  filterStatus: string | null = null;

  /** Dropdown options */
  readonly categoryOptions = signal<{ label: string; value: string }[]>([]);
  readonly statusOptions: { label: string; value: string }[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Published', value: 'published' },
    { label: 'Retired', value: 'retired' },
    { label: 'Archived', value: 'archived' },
  ];

  /** Computed: currently selected report card details */
  readonly selectedReportCard = computed(() => {
    const id = this.selectedReport();
    if (!id) return null;
    return this.reports().find((r) => r.id === id) ?? null;
  });

  /** Computed: KPIs extracted from report data */
  readonly reportKPIs = computed<ReportKPI[]>(() => {
    const data = this.reportData();
    if (!data?.summary) return [];
    return Object.entries(data.summary).map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      value: value as string | number,
    }));
  });

  /** Computed: table rows from report data */
  readonly reportRows = computed<any[]>(() => {
    const data = this.reportData();
    return data?.rows ?? [];
  });

  /** Computed: dynamic table columns from report data */
  readonly reportColumns = computed<string[]>(() => {
    const rows = this.reportRows();
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  /** Load category options for the filter dropdown */
  private loadCategories(): void {
    this.policyApi
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : res?.data ?? [];
          this.categoryOptions.set(
            list.map((c: any) => ({
              label: c.name_en ?? c.name ?? c.code,
              value: c.code ?? c.id,
            })),
          );
        },
        error: () => {
          /* Categories are optional; proceed without them */
        },
      });
  }

  /** Select a report type to configure filters */
  selectReport(reportId: string): void {
    this.selectedReport.set(reportId);
    this.reportData.set(null);
    this.dateFrom = null;
    this.dateTo = null;
    this.filterCategory = null;
    this.filterStatus = null;
  }

  /** Cancel report configuration and return to catalog */
  cancelReport(): void {
    this.selectedReport.set(null);
    this.reportData.set(null);
  }

  /** Generate the selected report with current filters */
  generateReport(): void {
    const reportType = this.selectedReport();
    if (!reportType) return;

    this.generating.set(true);
    const options: any = {};
    if (this.dateFrom) options.dateFrom = this.dateFrom.toISOString();
    if (this.dateTo) options.dateTo = this.dateTo.toISOString();
    if (this.filterCategory) options.category = this.filterCategory;
    if (this.filterStatus) options.status = this.filterStatus;

    this.policyApi
      .runReport({ reportType, options })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.reportData.set(res);
          this.generating.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Report Generated',
            detail: `${this.selectedReportCard()?.name ?? 'Report'} generated successfully.`,
          });
        },
        error: () => {
          this.generating.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to generate report. Please try again.',
          });
        },
      });
  }

  /** Export report results in the given format */
  exportReport(format: 'csv' | 'excel' | 'pdf'): void {
    const reportType = this.selectedReport();
    const data = this.reportData();
    if (!reportType || !data) return;

    this.exportService.exportReport(reportType, {
      ...data,
      format,
      dateFrom: this.dateFrom?.toISOString(),
      dateTo: this.dateTo?.toISOString(),
      category: this.filterCategory,
      status: this.filterStatus,
    });

    this.messageService.add({
      severity: 'info',
      summary: 'Export Started',
      detail: `Exporting as ${format.toUpperCase()}...`,
    });
  }

  /** Return the display name for a report, respecting language */
  reportName(report: ReportCard): string {
    return this.isAr() ? report.nameAr : report.name;
  }

  /** Return the description for a report, respecting language */
  reportDesc(report: ReportCard): string {
    return this.isAr() ? report.descriptionAr : report.description;
  }
}
