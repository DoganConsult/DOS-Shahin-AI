import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService } from '../services/reports-api.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { WidgetShellComponent } from '@app/dashboard';
import { ComplianceGaugeEchartComponent } from '@app/shared/widgets/echart-components/gauge/compliance-gauge-echart.component';
import { TrendLineEchartComponent } from '@app/shared/widgets/echart-components/line/trend-line-echart.component';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { REPORT_TABS, PERIOD_OPTIONS, periodToDates, ReportPeriod } from '../reports.constants';
import type { GaugeData, TimeSeriesData } from '@app/shared/widgets/echart-builders/builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-compliance-report',
    imports: [
        CommonModule, StatCardComponent, WidgetShellComponent,
        ComplianceGaugeEchartComponent, TrendLineEchartComponent,
        PageHeaderComponent, ModuleTabsBarComponent, AppDatePipe, AppNumberPipe,
    ],
    template: `
    <div class="rp-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Compliance Analytics"
        titleAr="تحليلات الامتثال"
        subtitleEn="Framework coverage, compliance gauge and anomaly detection"
        subtitleAr="تغطية الأطر ومقياس الامتثال واكتشاف الشذوذ"
        icon="shield"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','الامتثال'] : ['Dashboard','Reports','Compliance']"
        [actions]="headerActions"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="rp-period-bar">
        <span class="period-label">{{ i18n.isAr() ? 'الفترة:' : 'Period:' }}</span>
        @for (p of periods; track p.value) {
          <button class="period-btn" [class.active]="period() === p.value" (click)="setPeriod(p.value)">
            {{ i18n.isAr() ? p.labelAr : p.labelEn }}
          </button>
        }
      </div>

      <div class="rp-body">

        <section class="kpi-grid">
          <app-stat-card icon="check-circle"
            [label]="i18n.isAr() ? 'نسبة الامتثال' : 'Compliance Score'"
            [value]="kpis()?.complianceScore != null ? (kpis()!.complianceScore | appNumber:'decimal':'1.0-0') + '%' : '--'"
            accentColor="#22c55e" (click)="drill('/compliance/posture')" class="clickable" />
          <app-stat-card icon="th-large"
            [label]="i18n.isAr() ? 'الأطر النشطة' : 'Active Frameworks'"
            [value]="frameworkCards()?.length ?? '--'"
            accentColor="#3b82f6" (click)="drill('/compliance/frameworks')" class="clickable" />
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'مقياس الامتثال' : 'Compliance Gauge'" [state]="gaugeState()">
            @if (gaugeData()) {
              <div class="chart-h"><app-compliance-gauge-echart [data]="gaugeData()!" /></div>
            }
          </app-widget-shell>
          <app-widget-shell
            [title]="i18n.isAr() ? 'اتجاه الامتثال (' + periodLabel() + ')' : 'Compliance Trend (' + periodLabel() + ')'"
            [state]="trendState()">
            @if (trendData()) {
              <div class="chart-h"><app-trend-line-echart [data]="trendData()!" /></div>
            }
          </app-widget-shell>
        </section>

        <app-widget-shell [title]="i18n.isAr() ? 'تغطية الأطر' : 'Framework Coverage'" [state]="fwState()">
          @if (frameworkCards()?.length) {
            <div class="fw-grid">
              @for (fw of frameworkCards(); track fw.frameworkId || $index) {
                <div tabindex="0" role="button" (keyup.enter)="drill('/compliance/frameworks', {id: fw.frameworkId})" class="fw-card" (click)="drill('/compliance/frameworks', {id: fw.frameworkId})">
                  <div class="fw-name">{{ fw.name || fw.frameworkName }}</div>
                  <div class="fw-score">{{ fw.compliancePct ?? fw.score ?? 0 | appNumber:'decimal':'1.0-0' }}%</div>
                  <div class="fw-bar-track"><div class="fw-bar-fill" [style.width.%]="fw.compliancePct ?? fw.score ?? 0"></div></div>
                </div>
              }
            </div>
          }
        </app-widget-shell>

        <app-widget-shell [title]="i18n.isAr() ? 'تنبيهات الشذوذ' : 'Anomaly Alerts'" [state]="anomalyState()">
          @if (anomalies()?.length) {
            <div class="anomaly-list">
              @for (a of anomalies(); track a.id || $index) {
                <div class="anomaly-item" [class]="'sev-' + a.severity">
                  <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                  <span>{{ a.description }}</span>
                  <small>{{ a.detectedAt | appDate:'short' }}</small>
                </div>
              }
            </div>
          }
        </app-widget-shell>

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
    .fw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 8px 0; }
    .fw-card {
      padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff); cursor: pointer; transition: box-shadow .15s;
    }
    .fw-card:hover { box-shadow: var(--shadow-md); }
    .fw-name { font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px; color: var(--text-heading, #111); }
    .fw-score { font-size: var(--font-size-xl); font-weight: 700; color: var(--primary-700, #1d4ed8); margin-bottom: 6px; }
    .fw-bar-track { height: 6px; border-radius: var(--radius-xs); background: var(--surface-200, var(--border-subtle)); }
    .fw-bar-fill { height: 100%; border-radius: var(--radius-xs); background: var(--primary-500, var(--primary)); transition: width .3s; }
    .anomaly-list { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    .anomaly-item {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: var(--radius); font-size: var(--font-size-sm); border-inline-start: 3px solid;
    }
    .anomaly-item.sev-critical { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); }
    .anomaly-item.sev-high { background: var(--status-warning-bg, #fcf4d6); border-color: var(--warning); }
    .anomaly-item.sev-medium { background: #eff6ff; border-color: var(--primary); }
    .anomaly-item.sev-low { background: var(--status-success-bg, #defbe6); border-color: var(--success); }
    .anomaly-item small { margin-inline-start: auto; color: var(--text-muted); white-space: nowrap; }
    @media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .rp-body { padding: 16px 16px 32px; } .rp-period-bar { padding: 10px 16px; flex-wrap: wrap; } }
  `]
})
export class ComplianceReportComponent implements OnInit {
    private complianceSvc = inject(GrcComplianceService);
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
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
  periodLabel = computed(() => {
    const p = this.periods.find(x => x.value === this.period());
    return this.i18n.isAr() ? (p?.labelAr ?? '') : (p?.labelEn ?? '');
  });

  kpis           = signal<GrcRecord | null>(null);
  gaugeData      = signal<GaugeData | null>(null);
  gaugeState     = signal<LoadState>('loading');
  trendData      = signal<TimeSeriesData | null>(null);
  trendState     = signal<LoadState>('loading');
  frameworkCards = signal<Record<string, any>[]>([]);
  fwState        = signal<LoadState>('loading');
  anomalies      = signal<Record<string, any>[]>([]);
  anomalyState   = signal<LoadState>('loading');

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadKpis(), this.loadTrends(), this.loadFrameworks(), this.loadAnomalies()]);
  }

  setPeriod(p: ReportPeriod): void {
    this.period.set(p);
    this.trendState.set('loading');
    this.loadTrends();
  }

  private async loadKpis(): Promise<void> {
    try {
      const data = await firstValueFrom(this.operationsSvc.getAnalyticsKPIs());
      this.kpis.set(data);
      if ((data as any)?.complianceScore != null) {
        this.gaugeData.set({
          value: (data as any).complianceScore, min: 0, max: 100,
          zones: [{ min: 0, max: 40, color: '#ef4444' }, { min: 40, max: 70, color: '#f59e0b' }, { min: 70, max: 100, color: '#22c55e' }],
        });
        this.gaugeState.set('ready');
      } else { this.gaugeState.set('empty'); }
    } catch { this.gaugeState.set('error'); }
  }

  private async loadTrends(): Promise<void> {
    try {
      const { start, end } = periodToDates(this.period());
      const data = await firstValueFrom(this.operationsSvc.getKPITrends(start, end));
      if (data?.length) {
        this.trendData.set({
          series: [{ name: 'Compliance Score', data: data.map((d) => { const r = d as Record<string, any>; return { date: String(r['snapshotDate'] || r['date'] || ''), value: Number(r['complianceScore'] ?? 0) }; }) }],
        });
        this.trendState.set('ready');
      } else { this.trendState.set('empty'); }
    } catch { this.trendState.set('error'); }
  }

  private async loadFrameworks(): Promise<void> {
    try {
      const data = await firstValueFrom(this.complianceSvc.getFrameworks());
      if (Array.isArray(data) && data.length) { this.frameworkCards.set(data as unknown as Record<string, any>[]); this.fwState.set('ready'); }
      else { this.fwState.set('empty'); }
    } catch { this.fwState.set('error'); }
  }

  private async loadAnomalies(): Promise<void> {
    try {
      const res = await firstValueFrom(this.reportsApi.getAnomalies());
      const anomalies = (res?.['anomalies'] ?? []) as Record<string, any>[];
      this.anomalies.set(anomalies);
      this.anomalyState.set(anomalies.length ? 'ready' : 'empty');
    } catch { this.anomalyState.set('error'); }
  }

  drill(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  onHeaderAction(id: string): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    if (id === 'export-pdf')        { this.reportsApi.generateReport('compliance-status', 'pdf', lang).subscribe(b => this.download(b, 'compliance-report', 'pdf')); }
    else if (id === 'export-excel') { this.reportsApi.generateReport('compliance-status', 'excel', lang).subscribe(b => this.download(b, 'compliance-report', 'xlsx')); }
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
