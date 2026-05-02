import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService } from '../services/reports-api.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { WidgetShellComponent } from '@app/dashboard';
import { RiskHeatmapEchartComponent } from '@app/shared/widgets/echart-components/heatmap/risk-heatmap-echart.component';
import { TrendLineEchartComponent } from '@app/shared/widgets/echart-components/line/trend-line-echart.component';
import { TopRisksEchartComponent } from '@app/shared/widgets/echart-components/specialty/top-risks-echart.component';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { REPORT_TABS, PERIOD_OPTIONS, periodToDates, ReportPeriod } from '../reports.constants';
import type { HeatmapData, TimeSeriesData, FindingsBarData } from '@app/shared/widgets/echart-builders/builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-report',
  standalone: true,
  imports: [
    CommonModule, StatCardComponent, WidgetShellComponent,
    RiskHeatmapEchartComponent, TrendLineEchartComponent, TopRisksEchartComponent,
    PageHeaderComponent, ModuleTabsBarComponent, AppNumberPipe,],
  template: `
    <div class="rp-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Risk Analytics"
        titleAr="تحليلات المخاطر"
        subtitleEn="Risk posture heatmap, distribution trends and top risk register"
        subtitleAr="خريطة وضع المخاطر وتوزيعها واتجاهاتها وأبرز المخاطر"
        icon="exclamation-triangle"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','المخاطر'] : ['Dashboard','Reports','Risk']"
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
          <app-stat-card icon="chart-line"
            [label]="i18n.isAr() ? 'متوسط الدرجة' : 'Average Score'"
            [value]="riskKpis()?.averageScore != null ? ('' + (riskKpis()!.averageScore | appNumber:'decimal':'1.0-1')) : '--'"
            accentColor="#ef4444" />
          <app-stat-card icon="list"
            [label]="i18n.isAr() ? 'إجمالي المخاطر' : 'Total Risks'"
            [value]="riskKpis()?.totalRisks ?? '--'"
            accentColor="#6366f1" (click)="drill('/risk/register')" class="clickable" />
          <app-stat-card icon="exclamation-circle"
            [label]="i18n.isAr() ? 'حرجة' : 'Critical'"
            [value]="dist().critical" accentColor="var(--error)"
            (click)="drill('/risk/register', {severity: 'critical'})" class="clickable" />
          <app-stat-card icon="exclamation-triangle"
            [label]="i18n.isAr() ? 'عالية' : 'High'"
            [value]="dist().high" accentColor="#f59e0b"
            (click)="drill('/risk/register', {severity: 'high'})" class="clickable" />
          <app-stat-card icon="info-circle"
            [label]="i18n.isAr() ? 'متوسطة' : 'Medium'"
            [value]="dist().medium" accentColor="#3b82f6"
            (click)="drill('/risk/register', {severity: 'medium'})" class="clickable" />
          <app-stat-card icon="check"
            [label]="i18n.isAr() ? 'منخفضة' : 'Low'"
            [value]="dist().low" accentColor="#22c55e"
            (click)="drill('/risk/register', {severity: 'low'})" class="clickable" />
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'خريطة المخاطر الحرارية' : 'Risk Heatmap'" [state]="heatmapState()">
            @if (heatmapData()) {
              <div class="chart-h">
                <app-risk-heatmap-echart [data]="heatmapData()!"
                  (cellDrillDown)="drill('/risk/register', {likelihood: $event.row, impact: $event.column})" />
              </div>
            }
          </app-widget-shell>

          <app-widget-shell
            [title]="i18n.isAr() ? 'اتجاه المخاطر (' + periodLabel() + ')' : 'Risk Trend (' + periodLabel() + ')'"
            [state]="trendState()">
            @if (trendData()) {
              <div class="chart-h"><app-trend-line-echart [data]="trendData()!" /></div>
            }
          </app-widget-shell>
        </section>

        <section class="charts-row">
          <app-widget-shell [title]="i18n.isAr() ? 'أهم المخاطر' : 'Top Risks'" [state]="topRisksState()">
            @if (topRisksData()) {
              <div class="chart-h">
                <app-top-risks-echart [data]="topRisksData()!"
                  (riskDrillDown)="drill('/risk/register', {id: $event?.name})" />
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
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
    .clickable { cursor: pointer; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .chart-h { height: 300px; }
    @media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .rp-body { padding: 16px 16px 32px; } .rp-period-bar { padding: 10px 16px; flex-wrap: wrap; } }
  `]
})
export class RiskReportComponent implements OnInit {
    private riskSvc = inject(GrcRiskService);
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

  riskKpis     = signal<GrcRecord | null>(null);
  heatmapData  = signal<HeatmapData | null>(null);
  heatmapState = signal<LoadState>('loading');
  trendData    = signal<TimeSeriesData | null>(null);
  trendState   = signal<LoadState>('loading');
  topRisksData  = signal<FindingsBarData | null>(null);
  topRisksState = signal<LoadState>('loading');

  dist = computed(() => {
    const d = this.riskKpis()?.['distribution'] as Record<string, any> | undefined;
    return { critical: Number(d?.['critical'] ?? 0), high: Number(d?.['high'] ?? 0), medium: Number(d?.['medium'] ?? 0), low: Number(d?.['low'] ?? 0) };
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadKpis(), this.loadTrends(), this.loadHeatmap()]);
  }

  setPeriod(p: ReportPeriod): void {
    this.period.set(p);
    this.trendState.set('loading');
    this.loadTrends();
  }

  private async loadKpis(): Promise<void> {
    try {
      const data = await firstValueFrom(this.riskSvc.getRiskKPIs()) as Record<string, any>;
      this.riskKpis.set(data);
      const topRisks = data?.['topRisks'] as Record<string, any>[] | undefined;
      if (topRisks?.length) {
        const topNames  = topRisks.slice(0, 10).map((r: Record<string, any>) => String(r['title'] || r['risk_title'] || `Risk ${r['risk_id']}`));
        const topScores = topRisks.slice(0, 10).map((r: Record<string, any>) => Number(r['risk_score'] ?? 0));
        this.topRisksData.set({ categories: topNames, severities: [{ name: 'Score', values: topScores, color: '#ef4444' }] });
        this.topRisksState.set('ready');
      } else { this.topRisksState.set('empty'); }
    } catch { this.topRisksState.set('error'); }
  }

  private async loadTrends(): Promise<void> {
    try {
      const { start, end } = periodToDates(this.period());
      const data = await firstValueFrom(this.riskSvc.getRiskTrends(start, end)) as unknown[];
      if (Array.isArray(data) && data.length) {
        this.trendData.set({
          series: [{ name: 'Avg Risk Score', data: data.map((d) => { const r = d as Record<string, any>; return { date: String(r['date'] ?? ''), value: Number(r['avgScore'] ?? r['avg_score'] ?? 0) }; }) }],
        });
        this.trendState.set('ready');
      } else { this.trendState.set('empty'); }
    } catch { this.trendState.set('error'); }
  }

  private async loadHeatmap(): Promise<void> {
    try {
      const risks = await firstValueFrom(this.riskSvc.getRiskList()) as unknown[];
      if (Array.isArray(risks) && risks.length) {
        const rows = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
        const cols = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
        const values = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);
        risks.forEach((item) => {
          const r = item as Record<string, any>;
          const li = Math.min(Math.max(Math.round(Number(r['likelihood'] ?? 1) - 1), 0), 4);
          const im = Math.min(Math.max(Math.round(Number(r['impact'] ?? 1) - 1), 0), 4);
          values[li][im]++;
        });
        this.heatmapData.set({ rows, columns: cols, values });
        this.heatmapState.set('ready');
      } else { this.heatmapState.set('empty'); }
    } catch { this.heatmapState.set('error'); }
  }

  drill(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  onHeaderAction(id: string): void {
    const lang = this.i18n.isAr() ? 'ar' : 'en';
    if (id === 'export-pdf')   { this.reportsApi.generateReport('risk-register', 'pdf', lang).subscribe(b => this.download(b, 'risk-report', 'pdf')); }
    else if (id === 'export-excel') { this.reportsApi.generateReport('risk-register', 'excel', lang).subscribe(b => this.download(b, 'risk-report', 'xlsx')); }
    else if (id === 'print')   { window.print(); }
    else if (id === 'builder') { this.router.navigate(['/reports/builder']); }
  }

  private download(blob: Blob, name: string, ext: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }
}
