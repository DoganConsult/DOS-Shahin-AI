import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';
import type { EChartsOption } from 'echarts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-framework-scorecard',
    imports: [CommonModule, RouterLink, AppEchartComponent],
    templateUrl: './framework-scorecard.component.html',
    styleUrl: './framework-scorecard.component.css'
})
export class FrameworkScorecardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  frameworks = signal<GrcRecord[]>([]);
  trends = signal<GrcRecord[]>([]);

  frameworkGaugesOpts = signal<EChartsOption>({});
  overlapChordOpts = signal<EChartsOption>({});
  domainBreakdownOpts = signal<EChartsOption>({});
  trendLinesOpts = signal<EChartsOption>({});

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.http.get<any>(`${this.api}/frameworks`).pipe(catchError(() => of({ frameworks: [] })), takeUntilDestroyed(this.destroyRef)).subscribe(d => {
      const fws = asArray(d, 'frameworks');
      this.frameworks.set(fws);
      this.buildGauges();
      this.buildOverlapChord();
      this.buildDomainBreakdown();
    });

    const start = new Date(); start.setDate(start.getDate() - 90);
    this.http.get<any[]>(`${this.api}/analytics/trends`, {
      params: { startDate: start.toISOString(), endDate: new Date().toISOString() }
    }).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(t => {
      this.trends.set(t || []);
      this.buildTrendLines();
    });
  }

  buildGauges(): void {
    const fws = this.frameworks();
    if (!fws.length) return;
    const series: Record<string, any>[] = fws.slice(0, 8).map((fw: Record<string, any>, i: number) => {
      const score = fw.compliance_score || fw.complianceScore || fw.score || 0;
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        type: 'gauge', startAngle: 220, endAngle: -40, min: 0, max: 100,
        center: [`${12.5 + col * 25}%`, `${30 + row * 50}%`], radius: '22%',
        pointer: { show: false },
        progress: { show: true, width: 10, roundCap: true,
          itemStyle: { color: score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444' }
        },
        axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(var(--color-black-rgb), 0.05)']] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '85%'], fontSize: 10, color: '#64748b' },
        detail: { valueAnimation: true, fontSize: 18, fontWeight: 800, offsetCenter: [0, '20%'],
          formatter: '{value}%', color: score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : 'var(--error)'
        },
        data: [{ value: score, name: (fw.name || fw.framework_name || `FW-${i + 1}`).slice(0, 16) }]
      };
    });
    this.frameworkGaugesOpts.set({ series });
  }

  buildOverlapChord(): void {
    const fws = this.frameworks();
    if (fws.length < 2) return;
    const names = fws.slice(0, 6).map((f: Record<string, any>) => f.name || f.framework_name || 'FW');
    const nodes = names.map((n: string) => ({ name: n }));
    const links: Record<string, any>[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        links.push({ source: names[i], target: names[j], value: fws[i]?.overlap?.[names[j]] || fws[j]?.overlap?.[names[i]] || 0 });
      }
    }
    this.overlapChordOpts.set({
      tooltip: { trigger: 'item', formatter: (p: any) => p.data?.source ? `${p.data.source} ↔ ${p.data.target}: ${p.data.value} ${this.i18n.translate('frameworkScorecard.chartSharedControls')}` : p.name },
      series: [{
        type: 'graph', layout: 'circular', circular: { rotateLabel: true },
        data: nodes.map((n: Record<string, any>, i: number) => ({ ...n, symbolSize: 40, itemStyle: { color: ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6'][i % 6] } })),
        links, categories: [], roam: true,
        label: { show: true, fontSize: 10, color: '#64748b' },
        lineStyle: { curveness: 0.3, opacity: 0.6 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
      }]
    });
  }

  buildDomainBreakdown(): void {
    const fws = this.frameworks().slice(0, 6);
    if (!fws.length) return;
    const cats = [
      this.i18n.translate('frameworkScorecard.chartGovernance'),
      this.i18n.translate('frameworkScorecard.chartRisk'),
      this.i18n.translate('frameworkScorecard.chartCompliance'),
      this.i18n.translate('frameworkScorecard.chartOperations'),
      this.i18n.translate('frameworkScorecard.chartTechnology'),
    ];
    /** Raw domain keys used for data lookup (always English) */
    const catKeys = ['Governance', 'Risk', 'Compliance', 'Operations', 'Technology'];
    this.domainBreakdownOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      legend: { bottom: 0, textStyle: { fontSize: 9 } },
      grid: { top: 10, right: 16, bottom: 40, left: 50 },
      xAxis: { type: 'category', data: fws.map((f: Record<string, any>) => (f.name || f.framework_name || '').slice(0, 12)), axisLabel: { fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
      series: cats.map((cat, i) => ({
        name: cat, type: 'bar', stack: 'total',
        data: fws.map((f: Record<string, any>) => f.domain_scores?.[catKeys[i]] || f.domainScores?.[catKeys[i].toLowerCase()] || 0),
        itemStyle: { color: ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'][i] }
      }))
    });
  }

  buildTrendLines(): void {
    const t = this.trends();
    if (!t?.length) return;
    const dates = t.map((d: Record<string, any>) => d.snapshotDate?.slice(0, 10) || '');
    this.trendLinesOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      legend: { bottom: 0, textStyle: { fontSize: 9 } },
      grid: { top: 10, right: 16, bottom: 30, left: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 9, rotate: 30 }, boundaryGap: false },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9 } },
      series: [
        { name: this.i18n.translate('frameworkScorecard.chartCompliance'), type: 'line', data: t.map((d: Record<string, any>) => d.complianceScore || 0), smooth: true, symbol: 'none', lineStyle: { width: 2 }, itemStyle: { color: '#22c55e' } },
        { name: this.i18n.translate('frameworkScorecard.chartEvidence'), type: 'line', data: t.map((d: Record<string, any>) => d.evidenceCoverage || 0), smooth: true, symbol: 'none', lineStyle: { width: 2 }, itemStyle: { color: '#0ea5e9' } },
        { name: this.i18n.translate('frameworkScorecard.chartRemediation'), type: 'line', data: t.map((d: Record<string, any>) => d.remediationClosureRate || 0), smooth: true, symbol: 'none', lineStyle: { width: 2 }, itemStyle: { color: '#8b5cf6' } },
      ]
    });
  }

  getGapCount(fw: Record<string, any>): number {
    return fw.gap_count || fw.gapCount || fw.missingControls || 0;
  }

  getScore(fw: Record<string, any>): number {
    return fw.compliance_score || fw.complianceScore || fw.score || 0;
  }

  getScoreClass(fw: Record<string, any>): string {
    const s = this.getScore(fw);
    if (s >= 70) return 'score-good';
    if (s >= 40) return 'score-warn';
    return 'score-critical';
  }

}
