import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of, interval } from 'rxjs';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { environment } from '@env/environment';
import type { EChartsOption } from 'echarts';
import { AppNumberPipe } from '@app/shared/pipes';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-executive-command',
    imports: [CommonModule, RouterLink, AppEchartComponent, AppNumberPipe],
    templateUrl: './executive-command.component.html',
    styleUrl: './executive-command.component.css'
})
export class ExecutiveCommandComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private svc = inject(AGRCOSService);
  private api = environment.apiUrl;

  // Signals
  kpis = signal<GrcRecord | null>(null);
  maturity = signal<GrcRecord | null>(null);
  trends = signal<GrcRecord[]>([]);
  predictions = signal<GrcRecord | null>(null);
  benchmark = signal<GrcRecord | null>(null);
  topRisks = signal<GrcRecord[]>([]);
  metrics = signal<GrcRecord | null>(null);
  healthStatus = signal<string>('healthy');
  daysSinceIncident = signal<number>(0);
  lastUpdated = signal<string>('');

  // Chart options
  postureGaugeOpts = signal<EChartsOption>({});
  trendSparklineOpts = signal<EChartsOption>({});
  riskBubbleOpts = signal<EChartsOption>({});
  evidenceHeatmapOpts = signal<EChartsOption>({});
  maturityRadarOpts = signal<EChartsOption>({});
  frameworkGaugesOpts = signal<EChartsOption>({});

  ngOnInit(): void {
    this.loadAll();
    interval(30000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll());
  }

  loadAll(): void {
    this.lastUpdated.set(new Date().toLocaleTimeString());

    // KPIs
    this.http.get(`${this.api}/analytics/kpis`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(k => {
      this.kpis.set(k);
      this.buildPostureGauge();
    });

    // Maturity
    this.http.get(`${this.api}/analytics/maturity`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(m => {
      this.maturity.set(m);
      this.buildMaturityRadar();
    });

    // Trends (90 days)
    const start = new Date(); start.setDate(start.getDate() - 90);
    this.http.get<any[]>(`${this.api}/analytics/trends`, {
      params: { startDate: start.toISOString(), endDate: new Date().toISOString() }
    }).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(t => {
      this.trends.set(t);
      this.buildTrendSparklines();
    });

    // Predictions
    this.http.get(`${this.api}/analytics/predictions`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(p => this.predictions.set(p));

    // Benchmark
    this.http.post(`${this.api}/analytics/benchmark`, {}).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(b => {
      this.benchmark.set(b);
    });

    // AGRC-OS metrics + health
    this.svc.getMetrics().pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(m => this.metrics.set(m));
    this.svc.getHealth().pipe(catchError(() => of({ status: 'healthy' })), takeUntilDestroyed(this.destroyRef)).subscribe((h: Record<string, any>) => this.healthStatus.set(h?.status || 'healthy'));

    // Days since incident
    this.http.get<any>(`${this.api}/incidents`, { params: { limit: '1' } }).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(d => {
      if (d?.incidents?.[0]?.created_at) {
        const diff = Math.floor((Date.now() - new Date(d.incidents[0].created_at).getTime()) / 86400000);
        this.daysSinceIncident.set(diff);
      }
    });

    // Top risks
    this.http.get<any>(`${this.api}/risks`, { params: { limit: '5', sort: 'score', order: 'desc' } }).pipe(catchError(() => of({ risks: [] })), takeUntilDestroyed(this.destroyRef)).subscribe(d => {
      this.topRisks.set(d?.risks || []);
      this.buildRiskBubbles();
    });

    // Evidence freshness
    this.http.get<any>(`${this.api}/evidence`).pipe(catchError(() => of({ evidence: [] })), takeUntilDestroyed(this.destroyRef)).subscribe(d => {
      this.buildEvidenceHeatmap(d?.evidence || []);
    });
  }

  buildPostureGauge(): void {
    const k = this.kpis();
    if (!k) return;
    const score = k.complianceScore || k.complianceScorePercent || 0;
    this.postureGaugeOpts.set({
      series: [{
        type: 'gauge',
        startAngle: 220, endAngle: -40,
        min: 0, max: 100,
        pointer: { show: true, length: '60%', width: 6, itemStyle: { color: '#0ea5e9' } },
        progress: { show: true, width: 18, roundCap: true,
          itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 0.5, color: '#f59e0b' }, { offset: 1, color: '#22c55e' }]
          }}
        },
        axisLine: { lineStyle: { width: 18, color: [[1, 'rgba(var(--color-black-rgb), 0.05)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '70%'], fontSize: 13, color: '#64748b' },
        detail: { valueAnimation: true, fontSize: 42, fontWeight: 800, offsetCenter: [0, '30%'],
          formatter: '{value}%', color: score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : 'var(--error)'
        },
        data: [{ value: Math.round(score), name: 'GRC Posture' }]
      }]
    });
  }

  buildTrendSparklines(): void {
    const t = this.trends();
    if (!t?.length) return;
    const dates = t.map(d => d.snapshotDate?.slice(0, 10) || '');
    this.trendSparklineOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      legend: { bottom: 0, textStyle: { fontSize: 10 } },
      grid: { top: 10, right: 16, bottom: 30, left: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 9, rotate: 30 }, boundaryGap: false },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9 } },
      series: [
        { name: 'Compliance', type: 'line', data: t.map(d => d.complianceScore || 0), smooth: true, lineStyle: { width: 2 }, symbol: 'none', itemStyle: { color: '#22c55e' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(var(--module-accent-green-rgb), 0.15)' }, { offset: 1, color: 'rgba(var(--module-accent-green-rgb), 0)' }] } } },
        { name: 'Risk', type: 'line', data: t.map(d => d.riskScore || 0), smooth: true, lineStyle: { width: 2 }, symbol: 'none', itemStyle: { color: '#ef4444' } },
        { name: 'Evidence', type: 'line', data: t.map(d => d.evidenceCoverage || 0), smooth: true, lineStyle: { width: 2 }, symbol: 'none', itemStyle: { color: '#0ea5e9' } },
      ]
    });
  }

  buildRiskBubbles(): void {
    const risks = this.topRisks();
    if (!risks?.length) return;
    this.riskBubbleOpts.set({
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.data[3]}<br/>Impact: ${p.data[0]} · Likelihood: ${p.data[1]}<br/>Score: ${p.data[2]}` },
      grid: { top: 10, right: 16, bottom: 30, left: 40 },
      xAxis: { name: 'Impact', min: 0, max: 5, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
      yAxis: { name: 'Likelihood', min: 0, max: 5, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
      series: [{
        type: 'scatter',
        symbolSize: (d: Record<string, any>) => Math.max(16, (d[2] || 1) * 4),
        data: risks.map((r: Record<string, any>) => [r.impact || r.impact_score || 3, r.likelihood || r.likelihood_score || 3, r.score || r.risk_score || 10, r.title || r.name || 'Risk']),
        itemStyle: { color: '#ef4444', shadowBlur: 10, shadowColor: 'rgba(var(--module-accent-red-rgb), 0.3)' },
        label: { show: true, formatter: (p: any) => p.data[3]?.slice(0, 12), fontSize: 9, position: 'right' }
      }]
    });
  }

  buildEvidenceHeatmap(evidence: Record<string, any>[]): void {
    // Build calendar heatmap data from evidence dates
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 90);
    const dateMap: Record<string, number> = {};
    evidence.forEach(e => {
      const d = (e.collected_at || e.created_at || '').slice(0, 10);
      if (d) dateMap[d] = (dateMap[d] || 0) + 1;
    });
    const data: Record<string, any>[] = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      data.push([key, dateMap[key] || 0]);
    }

    this.evidenceHeatmapOpts.set({
      tooltip: { formatter: (p: any) => `${p.data[0]}: ${p.data[1]} items` },
      visualMap: { min: 0, max: Math.max(5, ...data.map(d => d[1])), calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
        inRange: { color: ['var(--status-success-bg, #defbe6)', '#86efac', '#22c55e', '#15803d'] },
        textStyle: { fontSize: 9 }
      },
      calendar: { top: 20, left: 30, right: 16, bottom: 30, range: [start.toISOString().slice(0, 10), now.toISOString().slice(0, 10)],
        cellSize: ['auto', 13], splitLine: { show: false }, itemStyle: { borderWidth: 2, borderColor: '#fff' },
        yearLabel: { show: false }, monthLabel: { fontSize: 9 }, dayLabel: { fontSize: 8, firstDay: 1 }
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data } as any]
    });
  }

  buildMaturityRadar(): void {
    const m = this.maturity();
    if (!m?.criteria) return;
    const c = m.criteria;
    this.maturityRadarOpts.set({
      radar: {
        indicator: [
          { name: 'Compliance', max: 100 }, { name: 'Risk Mgmt', max: 100 },
          { name: 'Evidence', max: 100 }, { name: 'Process', max: 100 }
        ],
        shape: 'polygon', radius: '65%',
        axisName: { fontSize: 10, color: '#64748b' },
        splitArea: { areaStyle: { color: ['rgba(var(--module-accent-sky-rgb), 0.02)', 'rgba(var(--module-accent-sky-rgb), 0.05)'] } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [c.complianceScore || 0, 100 - (c.riskScore || 0), c.evidenceCoverage || 0, c.processMaturity || 0],
          name: 'Current',
          areaStyle: { color: 'rgba(var(--module-accent-sky-rgb), 0.15)' },
          lineStyle: { color: '#0ea5e9', width: 2 },
          itemStyle: { color: '#0ea5e9' }
        }]
      }]
    });
  }

  getPostureClass(): string {
    const k = this.kpis();
    const score = k?.complianceScore || k?.complianceScorePercent || 0;
    if (score >= 70) return 'posture-good';
    if (score >= 40) return 'posture-warn';
    return 'posture-critical';
  }

  getMaturityLabel(): string {
    const m = this.maturity();
    if (!m) return '—';
    const labels: Record<number, string> = { 1: 'Initial', 2: 'Managed', 3: 'Defined', 4: 'Measured', 5: 'Optimizing' };
    return `Level ${m.level} — ${labels[m.level] || this.i18n.translate('common.unknown')}`;
  }
}
