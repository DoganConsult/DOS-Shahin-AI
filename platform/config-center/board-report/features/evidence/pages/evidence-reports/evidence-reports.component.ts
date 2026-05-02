/**
 * Evidence Reports Dashboard -- Report center for evidence analytics.
 *
 * Features:
 *   - p-tabview with 6 tabs: Aging, Backlog, Source Coverage, Reuse, Quality, Audit Readiness
 *   - Aging tab: evidence grouped by age bands (0-30d, 31-60d, etc.)
 *   - Backlog tab: KPI cards + oldest open requests table
 *   - Source Coverage tab: source types with count, percentage, avg quality
 *   - Reuse tab: most reused evidence, reuse rate KPI
 *   - Quality tab: quality tier distribution, average score
 *   - Audit Readiness tab: framework-level readiness with progress
 *   - CSV export per tab
 *
 * API endpoints (via EvidenceApiService):
 *   GET /api/evidence/reports/aging
 *   GET /api/evidence/reports/overdue-requests
 *   GET /api/evidence/reports/review-backlog
 *   GET /api/evidence/reports/reuse
 *   GET /api/evidence/reports/source-coverage
 *   GET /api/evidence/reports/audit-readiness
 *   GET /api/evidence/reports/stale
 */

import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EvidenceApiService } from '../../services/evidence-api.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { KpiCardVM } from '@app/shared/models/module-overview.vm';
import { GrcDataTableComponent } from '@app/shared/components';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TabViewModule, TabViewChangeEvent } from 'primeng/tabs';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';

/** Age band row for the aging report */
interface AgeBandRow {
  band: string;
  count: number;
  percentage: number;
}

/** Backlog request row */
interface BacklogRow {
  id: string;
  title: string;
  control_id: string;
  assignee: string;
  status: string;
  due_date: string;
  days_overdue: number;
}

/** Source coverage row */
interface SourceCoverageRow {
  source_type: string;
  count: number;
  percentage: number;
  avg_quality: number;
}

/** Reuse row */
interface ReuseRow {
  evidence_id: string;
  title: string;
  type: string;
  reuse_count: number;
  frameworks: string[];
}

/** Quality tier row */
interface QualityTierRow {
  tier: string;
  count: number;
  percentage: number;
}

/** Audit readiness row */
interface AuditReadinessRow {
  framework: string;
  total_controls: number;
  evidence_complete: number;
  readiness_pct: number;
  gaps: number;
}

/** Tab definition */
interface ReportTab {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

const REPORT_TABS: ReportTab[] = [
  { id: 'aging',            labelEn: 'Aging',            labelAr: 'تقادم الأدلة',       icon: 'pi-calendar' },
  { id: 'backlog',          labelEn: 'Backlog',          labelAr: 'المتأخرات',          icon: 'pi-clock' },
  { id: 'source-coverage',  labelEn: 'Source Coverage',  labelAr: 'تغطية المصادر',      icon: 'pi-chart-bar' },
  { id: 'reuse',            labelEn: 'Reuse',            labelAr: 'إعادة الاستخدام',    icon: 'pi-replay' },
  { id: 'quality',          labelEn: 'Quality',          labelAr: 'الجودة',             icon: 'pi-star' },
  { id: 'audit-readiness',  labelEn: 'Audit Readiness',  labelAr: 'جاهزية التدقيق',     icon: 'pi-check-circle' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-reports',
    imports: [
        CommonModule,
        PageHeaderComponent, KpiCardGridComponent,
        SkeletonLoaderComponent, EmptyStateComponent,
        GrcDataTableComponent,
        ButtonModule, CardModule, TableModule, ToastModule,
        TabViewModule, ProgressBarModule, SkeletonModule,
    ],
    providers: [MessageService],
    templateUrl: './evidence-reports.component.html',
    styleUrls: ['./evidence-reports.component.scss']
})
export class EvidenceReportsComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(EvidenceApiService);
  private readonly msg = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.i18n.direction());

  readonly reportTabs = REPORT_TABS;

  // ── Active tab ──
  activeTabIndex = signal(0);
  activeTabId = computed(() => REPORT_TABS[this.activeTabIndex()]?.id ?? 'aging');

  // ── Loading state per tab ──
  tabLoading = signal(false);

  // ── Aging data ──
  agingBands = signal<AgeBandRow[]>([]);

  // ── Backlog data ──
  backlogKpis = signal<KpiCardVM[]>([]);
  backlogRows = signal<BacklogRow[]>([]);

  // ── Source Coverage data ──
  sourceCoverageRows = signal<SourceCoverageRow[]>([]);

  // ── Reuse data ──
  reuseKpis = signal<KpiCardVM[]>([]);
  reuseRows = signal<ReuseRow[]>([]);

  // ── Quality data ──
  qualityKpis = signal<KpiCardVM[]>([]);
  qualityTiers = signal<QualityTierRow[]>([]);

  // ── Audit Readiness data ──
  auditReadinessRows = signal<AuditReadinessRow[]>([]);

  /** Track which tabs have been loaded to avoid re-fetching */
  private loadedTabs = new Set<string>();

  ngOnInit(): void {
    this.loadTab('aging');
  }

  onTabChange(event: TabViewChangeEvent): void {
    this.activeTabIndex.set(event.index);
    const tabId = REPORT_TABS[event.index]?.id;
    if (tabId) this.loadTab(tabId);
  }

  /** Load data for a specific tab */
  loadTab(tabId: string): void {
    if (this.loadedTabs.has(tabId)) return;
    this.tabLoading.set(true);

    switch (tabId) {
      case 'aging':
        this.api.getAgingReport()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => this.handleAgingData(res),
            error: () => this.handleTabError(),
          });
        break;

      case 'backlog':
        this.api.getOverdueRequestsReport()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => this.handleBacklogData(res),
            error: () => this.handleTabError(),
          });
        break;

      case 'source-coverage':
        this.api.getSourceCoverageReport()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => this.handleSourceCoverageData(res),
            error: () => this.handleTabError(),
          });
        break;

      case 'reuse':
        this.api.getReusableEvidenceReport()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => this.handleReuseData(res),
            error: () => this.handleTabError(),
          });
        break;

      case 'quality':
        this.api.getStaleEvidenceReport()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => this.handleQualityData(res),
            error: () => this.handleTabError(),
          });
        break;

      case 'audit-readiness':
        this.api.getAuditReadinessReport()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => this.handleAuditReadinessData(res),
            error: () => this.handleTabError(),
          });
        break;

      default:
        this.tabLoading.set(false);
    }
  }

  // ── Data handlers ──

  private handleAgingData(res: Record<string, unknown>): void {
    const bands = this.extractArray(res, 'bands', 'byAge', 'items');
    this.agingBands.set(bands.map((b: Record<string, unknown>) => ({
      band: (b['band'] as string) || (b['label'] as string) || '',
      count: (b['count'] as number) || 0,
      percentage: (b['percentage'] as number) || (b['pct'] as number) || 0,
    })));
    this.markLoaded('aging');
  }

  private handleBacklogData(res: Record<string, unknown>): void {
    const openRequests = (res['openRequests'] as number) ?? (res['open'] as number) ?? 0;
    const overdueCount = (res['overdueCount'] as number) ?? (res['overdue'] as number) ?? 0;
    const pendingReviews = (res['pendingReviews'] as number) ?? (res['pending'] as number) ?? 0;
    const avgAgeDays = (res['avgAgeDays'] as number) ?? (res['avgAge'] as number) ?? 0;

    this.backlogKpis.set([
      {
        id: 'open', labelEn: 'Open Requests', labelAr: 'طلبات مفتوحة',
        value: openRequests, icon: 'file', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        route: '', severity: 'default' as const,
      },
      {
        id: 'overdue', labelEn: 'Overdue', labelAr: 'متأخرة',
        value: overdueCount, icon: 'exclamation-triangle', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)',
        route: '', severity: 'danger' as const,
      },
      {
        id: 'pending', labelEn: 'Pending Reviews', labelAr: 'مراجعات معلقة',
        value: pendingReviews, icon: 'clock', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)',
        route: '', severity: 'warning' as const,
      },
      {
        id: 'avg-age', labelEn: 'Avg Age (days)', labelAr: 'متوسط العمر (أيام)',
        value: avgAgeDays, icon: 'calendar', color: 'var(--text-muted)', bg: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
        route: '', severity: 'default' as const,
      },
    ]);

    const rows = this.extractArray(res, 'items', 'requests', 'rows');
    this.backlogRows.set(rows.map((r: Record<string, unknown>) => ({
      id: (r['id'] as string) || '',
      title: (r['title'] as string) || (r['evidence_title'] as string) || '',
      control_id: (r['control_id'] as string) || (r['controlId'] as string) || '',
      assignee: (r['assignee'] as string) || (r['assigned_to'] as string) || '',
      status: (r['status'] as string) || 'open',
      due_date: (r['due_date'] as string) || (r['dueDate'] as string) || '',
      days_overdue: (r['days_overdue'] as number) || (r['daysOverdue'] as number) || 0,
    })));
    this.markLoaded('backlog');
  }

  private handleSourceCoverageData(res: Record<string, unknown>): void {
    const rows = this.extractArray(res, 'sources', 'bySource', 'items');
    this.sourceCoverageRows.set(rows.map((r: Record<string, unknown>) => ({
      source_type: (r['source_type'] as string) || (r['sourceType'] as string) || (r['type'] as string) || '',
      count: (r['count'] as number) || 0,
      percentage: (r['percentage'] as number) || (r['pct'] as number) || 0,
      avg_quality: (r['avg_quality'] as number) || (r['avgQuality'] as number) || 0,
    })));
    this.markLoaded('source-coverage');
  }

  private handleReuseData(res: Record<string, unknown>): void {
    const reuseRate = (res['reuseRate'] as number) ?? (res['reuse_rate'] as number) ?? 0;
    const totalReused = (res['totalReused'] as number) ?? (res['reused'] as number) ?? 0;

    this.reuseKpis.set([
      {
        id: 'rate', labelEn: 'Reuse Rate', labelAr: 'معدل إعادة الاستخدام',
        value: `${reuseRate}%`, icon: 'percentage', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)',
        route: '', severity: 'success' as const,
      },
      {
        id: 'total', labelEn: 'Total Reused', labelAr: 'إجمالي المعاد استخدامها',
        value: totalReused, icon: 'copy', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        route: '', severity: 'default' as const,
      },
    ]);

    const rows = this.extractArray(res, 'items', 'evidence', 'rows');
    this.reuseRows.set(rows.map((r: Record<string, unknown>) => ({
      evidence_id: (r['evidence_id'] as string) || (r['evidenceId'] as string) || (r['id'] as string) || '',
      title: (r['title'] as string) || '',
      type: (r['type'] as string) || '',
      reuse_count: (r['reuse_count'] as number) || (r['reuseCount'] as number) || 0,
      frameworks: Array.isArray(r['frameworks']) ? r['frameworks'] as string[] : [],
    })));
    this.markLoaded('reuse');
  }

  private handleQualityData(res: Record<string, unknown>): void {
    const avgScore = (res['avgScore'] as number) ?? (res['avg_score'] as number) ?? (res['averageScore'] as number) ?? 0;

    const tiers = this.extractArray(res, 'tiers', 'byTier', 'quality_tiers');
    const tierRows: QualityTierRow[] = tiers.length > 0
      ? tiers.map((t: Record<string, unknown>) => ({
          tier: (t['tier'] as string) || (t['grade'] as string) || '',
          count: (t['count'] as number) || 0,
          percentage: (t['percentage'] as number) || (t['pct'] as number) || 0,
        }))
      : [
          { tier: 'A', count: 0, percentage: 0 },
          { tier: 'B', count: 0, percentage: 0 },
          { tier: 'C', count: 0, percentage: 0 },
        ];

    this.qualityKpis.set([
      {
        id: 'avg', labelEn: 'Average Quality Score', labelAr: 'متوسط درجة الجودة',
        value: avgScore, icon: 'star', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        route: '', severity: 'default' as const,
      },
    ]);
    this.qualityTiers.set(tierRows);
    this.markLoaded('quality');
  }

  private handleAuditReadinessData(res: Record<string, unknown>): void {
    const rows = this.extractArray(res, 'frameworks', 'items', 'byFramework');
    this.auditReadinessRows.set(rows.map((r: Record<string, unknown>) => ({
      framework: (r['framework'] as string) || (r['name'] as string) || '',
      total_controls: (r['total_controls'] as number) || (r['totalControls'] as number) || 0,
      evidence_complete: (r['evidence_complete'] as number) || (r['complete'] as number) || 0,
      readiness_pct: (r['readiness_pct'] as number) || (r['readinessPct'] as number) || (r['pct'] as number) || 0,
      gaps: (r['gaps'] as number) || 0,
    })));
    this.markLoaded('audit-readiness');
  }

  private handleTabError(): void {
    this.msg.add({
      severity: 'error',
      summary: this.isAr() ? 'خطأ' : 'Error',
      detail: this.isAr() ? 'فشل تحميل التقرير' : 'Failed to load report',
    });
    this.tabLoading.set(false);
  }

  private markLoaded(tabId: string): void {
    this.loadedTabs.add(tabId);
    this.tabLoading.set(false);
  }

  /** Force reload the current tab */
  onRefreshTab(): void {
    const tabId = this.activeTabId();
    this.loadedTabs.delete(tabId);
    this.loadTab(tabId);
  }

  // ── CSV Export ──

  onExportCsv(): void {
    const tabId = this.activeTabId();
    let csvContent = '';
    let filename = `evidence-${tabId}-report.csv`;

    switch (tabId) {
      case 'aging': {
        csvContent = this.buildCsv(
          ['Band', 'Count', 'Percentage'],
          this.agingBands().map(r => [r.band, String(r.count), `${r.percentage}%`])
        );
        break;
      }
      case 'backlog': {
        csvContent = this.buildCsv(
          ['Title', 'Control', 'Assignee', 'Status', 'Due Date', 'Days Overdue'],
          this.backlogRows().map(r => [r.title, r.control_id, r.assignee, r.status, r.due_date, String(r.days_overdue)])
        );
        break;
      }
      case 'source-coverage': {
        csvContent = this.buildCsv(
          ['Source Type', 'Count', 'Percentage', 'Avg Quality'],
          this.sourceCoverageRows().map(r => [r.source_type, String(r.count), `${r.percentage}%`, String(r.avg_quality)])
        );
        break;
      }
      case 'reuse': {
        csvContent = this.buildCsv(
          ['Evidence ID', 'Title', 'Type', 'Reuse Count', 'Frameworks'],
          this.reuseRows().map(r => [r.evidence_id, r.title, r.type, String(r.reuse_count), r.frameworks.join('; ')])
        );
        break;
      }
      case 'quality': {
        csvContent = this.buildCsv(
          ['Tier', 'Count', 'Percentage'],
          this.qualityTiers().map(r => [r.tier, String(r.count), `${r.percentage}%`])
        );
        break;
      }
      case 'audit-readiness': {
        csvContent = this.buildCsv(
          ['Framework', 'Total Controls', 'Evidence Complete', 'Readiness %', 'Gaps'],
          this.auditReadinessRows().map(r => [r.framework, String(r.total_controls), String(r.evidence_complete), `${r.readiness_pct}%`, String(r.gaps)])
        );
        break;
      }
    }

    if (!csvContent) {
      this.msg.add({ severity: 'warn', summary: this.isAr() ? 'تنبيه' : 'Warning', detail: this.isAr() ? 'لا توجد بيانات للتصدير' : 'No data to export' });
      return;
    }

    this.downloadCsv(csvContent, filename);
    this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Exported', detail: filename });
  }

  // ── Helpers ──

  /** Extract an array from a response object, trying multiple key names */
  private extractArray(res: Record<string, unknown>, ...keys: string[]): Record<string, unknown>[] {
    for (const key of keys) {
      if (Array.isArray(res?.[key])) return res[key] as Record<string, unknown>[];
    }
    if (Array.isArray(res)) return res as unknown as Record<string, unknown>[];
    return [];
  }

  /** Build CSV string from headers and rows */
  private buildCsv(headers: string[], rows: string[][]): string {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
      lines.push(row.map(escape).join(','));
    }
    return lines.join('\n');
  }

  /** Trigger CSV file download */
  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Get tab label in current language */
  getTabLabel(tab: ReportTab): string {
    return this.isAr() ? tab.labelAr : tab.labelEn;
  }
}
