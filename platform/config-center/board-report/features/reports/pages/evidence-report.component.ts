import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService } from '../services/reports-api.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { WidgetShellComponent } from '@app/dashboard';
import { EvidenceDonutEchartComponent } from '@app/shared/widgets/echart-components/donut/evidence-donut-echart.component';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { REPORT_TABS, PERIOD_OPTIONS, ReportPeriod } from '../reports.constants';
import type { DonutData } from '@app/shared/widgets/echart-builders/builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-report',
    imports: [
        CommonModule, StatCardComponent, WidgetShellComponent,
        EvidenceDonutEchartComponent,
        PageHeaderComponent, ModuleTabsBarComponent, AppDatePipe, AppNumberPipe,
    ],
    template: `
    <div class="rp-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Evidence Analytics"
        titleAr="تحليلات الأدلة"
        subtitleEn="Evidence coverage, pending queue and remediation closure tracking"
        subtitleAr="تغطية الأدلة وقائمة الانتظار وتتبع إغلاق المعالجة"
        icon="folder"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','الأدلة'] : ['Dashboard','Reports','Evidence']"
        [actions]="headerActions"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="rp-period-bar">
        <span class="period-label">{{ i18n.isAr() ? 'الفترة:' : 'Period:' }}</span>
        @for (p of periods; track p.value) {
          <button class="period-btn" [class.active]="period() === p.value" (click)="period.set(p.value)">
            {{ i18n.isAr() ? p.labelAr : p.labelEn }}
          </button>
        }
      </div>

      <div class="rp-body">

        <section class="kpi-grid">
          <app-stat-card icon="folder-open"
            [label]="i18n.isAr() ? 'تغطية الأدلة' : 'Evidence Coverage'"
            [value]="kpis()?.evidenceCoverage != null ? (kpis()!.evidenceCoverage | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="#3b82f6" />
          <app-stat-card icon="wrench"
            [label]="i18n.isAr() ? 'معدل إغلاق المعالجة' : 'Remediation Closure'"
            [value]="kpis()?.remediationClosureRate != null ? (kpis()!.remediationClosureRate | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="#a855f7" (click)="drill('/governance/actions', {status: 'overdue'})" class="clickable" />
          <app-stat-card icon="clock"
            [label]="i18n.isAr() ? 'متأخرة' : 'Overdue'"
            [value]="overdueCount()"
            accentColor="#ef4444" />
          <app-stat-card icon="inbox"
            [label]="i18n.isAr() ? 'في الانتظار' : 'Pending'"
            [value]="pendingCount()"
            accentColor="#f59e0b" />
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'حالة الأدلة' : 'Evidence Status'" [state]="donutState()">
            @if (donutData()) {
              <div class="chart-h">
                <app-evidence-donut-echart [data]="donutData()!"
                  (segmentDrillDown)="drill('/evidence', {status: $event?.name})" />
              </div>
            }
          </app-widget-shell>

          <app-widget-shell [title]="i18n.isAr() ? 'قائمة الأدلة المعلقة' : 'Pending Evidence Queue'" [state]="queueState()">
            @if (queue()?.length) {
              <div class="queue-table">
                <table>
                  <thead>
                    <tr>
                      <th>{{ i18n.isAr() ? 'الضابط' : 'Control' }}</th>
                      <th>{{ i18n.isAr() ? 'النوع' : 'Type' }}</th>
                      <th>{{ i18n.isAr() ? 'الموعد' : 'Due' }}</th>
                      <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of queue()!.slice(0, 15); track item.taskId || $index) {
                      <tr tabindex="0" role="button" (keyup.enter)="drill('/evidence', {taskId: item.taskId})" class="queue-row" (click)="drill('/evidence', {taskId: item.taskId})">
                        <td>{{ item.controlId || item.control_id || '--' }}</td>
                        <td>{{ item.evidenceType || item.evidence_type || '--' }}</td>
                        <td [class.overdue]="isOverdue(item)">{{ item.dueDate || item.due_date | appDate:'medium' }}</td>
                        <td><span class="status-badge" [class]="'s-' + (item.status || 'pending')">{{ item.status || 'pending' }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </app-widget-shell>
        </section>

      </div>
    </div>
  `,
    styles: [`
    .rp-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .rp-period-bar {
      display: flex; align-items: center; gap: 6px; padding: 10px 28px;
      background: var(--surface-card, #fff); border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .period-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); margin-inline-end: 4px; }
    .period-btn {
      padding: 5px 14px; border-radius: var(--radius-xl); border: 1.5px solid var(--border-subtle, var(--border-subtle));
      background: var(--surface-ground, var(--surface-ice)); font-size: var(--font-size-sm); font-weight: 600;
      color: var(--text-muted, var(--text-muted)); cursor: pointer; transition: all .15s;
    }
    .period-btn:hover { border-color: var(--primary-300, #93c5fd); }
    .period-btn.active { border-color: var(--primary-600, #2563eb); background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8); }
    .rp-body { flex: 1; padding: 20px 28px 40px; display: flex; flex-direction: column; gap: 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .clickable { cursor: pointer; }
    .charts-row { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
    .chart-h { height: 280px; }
    .queue-table { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    th { text-align: start; padding: 8px 10px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--surface-border); }
    td { padding: 8px 10px; border-bottom: 1px solid var(--surface-border, var(--surface-ice)); }
    .queue-row { cursor: pointer; transition: background .1s; }
    .queue-row:hover { background: var(--surface-50, #f9fafb); }
    .overdue { color: var(--error); font-weight: 600; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; }
    .s-pending { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .s-overdue { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .s-collected, .s-approved { background: var(--status-success-bg, #defbe6); color: #166534; }
    @media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .rp-body { padding: 16px 16px 32px; } .rp-period-bar { padding: 10px 16px; flex-wrap: wrap; } }
  `]
})
export class EvidenceReportComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private reportsApi = inject(ReportsApiService);
  private router = inject(Router);

  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly tabs    = REPORT_TABS;
  readonly periods = PERIOD_OPTIONS;

  readonly headerActions: PageHeaderAction[] = [
    { id: 'export-pdf',   labelEn: 'PDF',     labelAr: 'PDF',     icon: 'file-pdf' },
    { id: 'export-excel', labelEn: 'Excel',   labelAr: 'Excel',   icon: 'file-excel' },
    { id: 'print',        labelEn: 'Print',   labelAr: 'طباعة',  icon: 'print' },
    { id: 'builder',      labelEn: 'Builder', labelAr: 'المنشئ', icon: 'file-edit', primary: true },
  ];

  period = signal<ReportPeriod>('30d');

  kpis       = signal<GrcRecord | null>(null);
  donutData  = signal<DonutData | null>(null);
  donutState = signal<LoadState>('loading');
  queue      = signal<Record<string, unknown>[]>([]);
  queueState = signal<LoadState>('loading');

  overdueCount = computed(() => this.queue().filter((q: Record<string, unknown>) => this.isOverdue(q)).length);
  pendingCount = computed(() => this.queue().filter((q: Record<string, unknown>) => q.status === 'pending' || !q.status).length);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadKpis(), this.loadQueue()]);
  }

  private async loadKpis(): Promise<void> {
    try {
      const data = await firstValueFrom(this.operationsSvc.getAnalyticsKPIs());
      this.kpis.set(data);
    } catch { /* non-critical */ }
  }

  private async loadQueue(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<unknown>('/api/dashboard/evidence-queue')) as Record<string, unknown> | unknown[];
      const items = (Array.isArray(data) ? data : ((data as Record<string, unknown>)?.items ?? (data as Record<string, unknown>)?.queue ?? [])) as Record<string, unknown>[];
      this.queue.set(items);

      const collected = items.filter((i: Record<string, unknown>) => i.status === 'collected' || i.status === 'approved').length;
      const pending   = items.filter((i: Record<string, unknown>) => i.status === 'pending' || !i.status).length;
      const overdue   = items.filter((i: Record<string, unknown>) => this.isOverdue(i)).length;
      if (items.length) {
        this.donutData.set({
          segments: [
            { name: 'Collected', value: collected, color: '#22c55e' },
            { name: 'Pending',   value: pending,   color: '#f59e0b' },
            { name: 'Overdue',   value: overdue,   color: '#ef4444' },
          ],
        });
        this.donutState.set('ready');
      } else {
        this.donutState.set('empty');
      }
      this.queueState.set(items.length ? 'ready' : 'empty');
    } catch {
      this.donutState.set('error');
      this.queueState.set('error');
    }
  }

  isOverdue(item: Record<string, unknown>): boolean {
    const due = item['dueDate'] || item['due_date'];
    return !!due && new Date(String(due)) < new Date() && item['status'] !== 'collected' && item['status'] !== 'approved';
  }

  drill(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  onHeaderAction(id: string): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    if (id === 'export-pdf')        { this.reportsApi.generateReport('dpia', 'pdf', lang).subscribe(b => this.download(b, 'evidence-report', 'pdf')); }
    else if (id === 'export-excel') { this.reportsApi.generateReport('dpia', 'excel', lang).subscribe(b => this.download(b, 'evidence-report', 'xlsx')); }
    else if (id === 'print')        { window.print(); }
    else if (id === 'builder')      { this.router.navigate(['/reports/builder']); }
  }

  private download(blob: Blob, name: string, ext: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }
}
