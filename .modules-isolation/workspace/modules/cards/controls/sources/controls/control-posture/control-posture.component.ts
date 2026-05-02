import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { environment } from '@env/environment';
import type { EChartsOption } from 'echarts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-control-posture',
  standalone: true,
  imports: [CommonModule, RouterLink, AppEchartComponent, RaciPanelComponent],
  templateUrl: './control-posture.component.html',
  styleUrl: '',
})
export class ControlPostureComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private svc = inject(AGRCOSService);
  private api = environment.apiUrl;
  private subs: Subscription[] = [];

  controls = signal<GrcRecord[]>([]);
  metrics = signal<GrcRecord | null>(null);
  kpis = signal<GrcRecord | null>(null);

  effectivenessGridOpts = signal<EChartsOption>({});
  lifecyclePieOpts = signal<EChartsOption>({});
  staleAgingOpts = signal<EChartsOption>({});
  testingCoverageOpts = signal<EChartsOption>({});
  controlSankeyOpts = signal<EChartsOption>({});

  // Summary stats
  totalControls = signal(0);
  activeControls = signal(0);
  stalePercent = signal(0);
  testedPercent = signal(0);

  ngOnInit(): void { this.loadAll(); }
  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  loadAll(): void {
    this.http.get<unknown>(`${this.api}/controls`).pipe(catchError(() => of({ controls: [] })), takeUntilDestroyed(this.destroyRef)).subscribe(d => {
      const ctrls = asArray(d, 'controls');
      this.controls.set(ctrls);
      this.computeStats();
      this.buildEffectivenessGrid();
      this.buildLifecyclePie();
      this.buildStaleAging();
      this.buildTestingCoverage();
    });

    this.svc.getMetrics().pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(m => this.metrics.set(m));

    this.http.get(`${this.api}/analytics/kpis`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(k => this.kpis.set(k));

    // Framework-to-control sankey
    this.http.get<unknown>(`${this.api}/frameworks`).pipe(catchError(() => of({ frameworks: [] })), takeUntilDestroyed(this.destroyRef)).subscribe(d => {
      this.buildControlSankey(d?.frameworks || []);
    });
  }

  computeStats(): void {
    const c = this.controls();
    this.totalControls.set(c.length);
    this.activeControls.set(c.filter((x: Record<string, unknown>) => x.status === 'active' || x.stage === 'active').length);
    const stale = c.filter((x: Record<string, unknown>) => x.status === 'stale' || x.is_stale).length;
    this.stalePercent.set(c.length > 0 ? Math.round((stale / c.length) * 100) : 0);
    const tested = c.filter((x: Record<string, unknown>) => x.last_tested || x.tested).length;
    this.testedPercent.set(c.length > 0 ? Math.round((tested / c.length) * 100) : 0);
  }

  buildEffectivenessGrid(): void {
    const c = this.controls();
    if (!c.length) return;
    const domains = [...new Set(c.map((x: Record<string, unknown>) => x.domain || x.category || 'General'))].slice(0, 8);
    const levels = [
      this.i18n.translate('controlPosture.chartEffective'),
      this.i18n.translate('controlPosture.chartPartially'),
      this.i18n.translate('controlPosture.chartIneffective'),
      this.i18n.translate('controlPosture.chartNotAssessed'),
    ];
    const data: Record<string, unknown>[] = [];
    domains.forEach((dom, di) => {
      const domControls = c.filter((x: Record<string, unknown>) => (x.domain || x.category || 'General') === dom);
      const eff = domControls.filter((x: Record<string, unknown>) => x.effectiveness === 'effective' || x.score >= 80).length;
      const part = domControls.filter((x: Record<string, unknown>) => x.effectiveness === 'partial' || (x.score >= 40 && x.score < 80)).length;
      const ineff = domControls.filter((x: Record<string, unknown>) => x.effectiveness === 'ineffective' || (x.score > 0 && x.score < 40)).length;
      const na = domControls.length - eff - part - ineff;
      [eff, part, ineff, na].forEach((v, li) => data.push([li, di, v]));
    });

    this.effectivenessGridOpts.set({
      tooltip: { formatter: (p: any) => `${domains[p.data[1]]}: ${levels[p.data[0]]} — ${p.data[2]} ${this.i18n.translate('controlPosture.chartControls')}` },
      grid: { top: 10, right: 20, bottom: 30, left: 100 },
      xAxis: { type: 'category', data: levels, axisLabel: { fontSize: 9 }, splitArea: { show: true } },
      yAxis: { type: 'category', data: domains, axisLabel: { fontSize: 9 }, splitArea: { show: true } },
      visualMap: { min: 0, max: Math.max(5, ...data.map(d => d[2])), calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
        inRange: { color: ['var(--status-success-bg, #defbe6)', '#86efac', '#22c55e', '#15803d'] }, textStyle: { fontSize: 9 }
      },
      series: [{ type: 'heatmap', data, label: { show: true, fontSize: 11, fontWeight: 700 }, emphasis: { itemStyle: { shadowBlur: 10 } } }] as any
    });
  }

  buildLifecyclePie(): void {
    const c = this.controls();
    if (!c.length) return;
    const draftLabel = this.i18n.translate('controlPosture.chartDraft');
    const activeLabel = this.i18n.translate('controlPosture.chartActive');
    const testingLabel = this.i18n.translate('controlPosture.chartTesting');
    const retiredLabel = this.i18n.translate('controlPosture.chartRetired');
    const otherLabel = this.i18n.translate('controlPosture.chartOther');
    const stages: Record<string, number> = { [draftLabel]: 0, [activeLabel]: 0, [testingLabel]: 0, [retiredLabel]: 0, [otherLabel]: 0 };
    c.forEach((x: Record<string, unknown>) => {
      const s = (x.stage || x.status || 'other').toLowerCase();
      if (s === 'draft') stages[draftLabel]++;
      else if (s === 'active') stages[activeLabel]++;
      else if (s === 'testing' || s === 'in_test') stages[testingLabel]++;
      else if (s === 'retired' || s === 'deprecated') stages[retiredLabel]++;
      else stages[otherLabel]++;
    });
    const colors: Record<string, string> = { [draftLabel]: 'var(--text-muted)', [activeLabel]: 'var(--success)', [testingLabel]: 'var(--warning)', [retiredLabel]: 'var(--error)', [otherLabel]: 'var(--text-muted)' };
    this.lifecyclePieOpts.set({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'],
        data: Object.entries(stages).filter(([, v]) => v > 0).map(([name, value]) => ({
          name, value, itemStyle: { color: (colors as GrcRecord)[name] || '#94a3b8' }
        })),
        label: { show: true, fontSize: 10, formatter: '{b}: {c}' },
        emphasis: { scaleSize: 8 }
      }]
    });
  }

  buildStaleAging(): void {
    const c = this.controls();
    const buckets = [
      { label: '< 30d', min: 0, max: 30, count: 0 },
      { label: '30-60d', min: 30, max: 60, count: 0 },
      { label: '60-90d', min: 60, max: 90, count: 0 },
      { label: '90-180d', min: 90, max: 180, count: 0 },
      { label: '> 180d', min: 180, max: Infinity, count: 0 },
    ];
    const now = Date.now();
    c.forEach((x: Record<string, unknown>) => {
      const last = x.last_assessed || x.last_tested || x.updated_at;
      if (!last) { buckets[4].count++; return; }
      const days = Math.floor((now - new Date(last).getTime()) / 86400000);
      const bucket = buckets.find(b => days >= b.min && days < b.max);
      if (bucket) bucket.count++;
    });

    this.staleAgingOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      grid: { top: 10, right: 16, bottom: 30, left: 40 },
      xAxis: { type: 'category', data: buckets.map(b => b.label), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
      series: [{
        type: 'bar', data: buckets.map((b, i) => ({
          value: b.count,
          itemStyle: { color: ['#22c55e', '#86efac', '#f59e0b', '#f97316', '#ef4444'][i], borderRadius: [4, 4, 0, 0] }
        })),
        barWidth: '50%'
      }]
    });
  }

  buildTestingCoverage(): void {
    const c = this.controls();
    const tested = c.filter((x: Record<string, unknown>) => x.last_tested || x.tested).length;
    const untested = c.length - tested;
    this.testingCoverageOpts.set({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['50%', '70%'], center: ['50%', '50%'],
        data: [
          { name: this.i18n.translate('controlPosture.chartTested'), value: tested, itemStyle: { color: '#22c55e' } },
          { name: this.i18n.translate('controlPosture.chartUntested'), value: untested, itemStyle: { color: '#ef4444' } },
        ],
        label: { show: true, fontSize: 10, formatter: '{b}\n{d}%' },
        emphasis: { scaleSize: 6 }
      }]
    });
  }

  buildControlSankey(frameworks: Record<string, unknown>[]): void {
    if (!frameworks.length) return;
    const c = this.controls();
    const fwNames = frameworks.slice(0, 6).map((f: Record<string, unknown>) => f.name || f.framework_name || 'FW');
    const domains = [...new Set(c.map((x: Record<string, unknown>) => x.domain || x.category || 'General'))].slice(0, 6);
    const nodes = [...fwNames.map(n => ({ name: n })), ...domains.map(n => ({ name: n }))];
    const links: Record<string, unknown>[] = [];
    fwNames.forEach(fw => {
      domains.forEach(dom => {
        const count = c.filter((x: Record<string, unknown>) => (x.domain || x.category || 'General') === dom).length;
        if (count > 0) links.push({ source: fw, target: dom, value: Math.max(1, Math.round(count / fwNames.length)) });
      });
    });

    this.controlSankeyOpts.set({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'sankey', data: nodes, links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
        label: { fontSize: 10 },
        nodeWidth: 20, nodeGap: 10
      }] as unknown
    });
  }
}
