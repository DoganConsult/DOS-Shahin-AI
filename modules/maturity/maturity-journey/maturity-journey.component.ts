import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
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
  selector: 'app-maturity-journey',
  standalone: true,
  imports: [CommonModule, AppNumberPipe, RouterLink, AppEchartComponent],
  template: `
    <div class="mat-root" [dir]="i18n.direction()">
      <header class="mat-header">
        <div class="mat-header-left">
          <i class="pi pi-star mat-icon"></i>
          <div>
            <h1>{{ i18n.translate('maturityJourney.title') }}</h1>
            <p>{{ i18n.translate('maturityJourney.subtitle') }}</p>
          </div>
        </div>
        <a routerLink="/agrc-os" class="mat-nav"><i class="pi pi-arrow-left"></i> AGRC-OS</a>
      </header>

      <!-- CMMI Ladder -->
      <div class="mat-ladder">
        <div class="mat-ladder-step" *ngFor="let level of levels; let i = index"
             [class.active]="currentLevel() >= (i + 1)" [class.current]="currentLevel() === (i + 1)">
          <div class="mat-ls-num">{{ i + 1 }}</div>
          <div class="mat-ls-info">
            <span class="mat-ls-name">{{ level.name }}</span>
            <span class="mat-ls-desc">{{ i18n.localize(level.desc, level.descAr) }}</span>
          </div>
          <div class="mat-ls-bar"><div class="mat-ls-fill" [style.width.%]="currentLevel() >= (i + 1) ? 100 : (currentLevel() === i ? aggregateScore() : 0)"></div></div>
        </div>
      </div>

      <!-- Current Score + Prediction -->
      <div class="mat-score-row">
        <div class="mat-score-card">
          <span class="mat-sc-label">{{ i18n.translate('maturityJourney.currentLevel') }}</span>
          <span class="mat-sc-value">{{ currentLevel() }}</span>
          <span class="mat-sc-name">{{ getLevelName(currentLevel()) }}</span>
        </div>
        <div class="mat-score-card">
          <span class="mat-sc-label">{{ i18n.translate('maturityJourney.aggregateScore') }}</span>
          <span class="mat-sc-value">{{ aggregateScore() | appNumber:'decimal':'1.0-0' }}%</span>
        </div>
        <div class="mat-score-card" *ngIf="predictions()">
          <span class="mat-sc-label">{{ i18n.translate('maturityJourney.forecast90') }}</span>
          <span class="mat-sc-value mat-sc-pred">{{ predictions().complianceScore | appNumber:'decimal':'1.0-0' }}%</span>
        </div>
        <div class="mat-score-card" *ngIf="predictions()">
          <span class="mat-sc-label">{{ i18n.translate('maturityJourney.forecast365') }}</span>
          <span class="mat-sc-value mat-sc-pred">{{ predict365() | appNumber:'decimal':'1.0-0' }}%</span>
        </div>
      </div>

      <!-- Charts -->
      <div class="mat-grid">
        <section class="mat-card">
          <h2 class="mat-card-title"><i class="pi pi-chart-line"></i> {{ i18n.translate('maturityJourney.maturityOverTime') }}</h2>
          <div class="mat-chart-wrap">
            <app-echart [options]="journeyOpts()" ariaLabel="Maturity journey timeline" />
          </div>
        </section>
        <section class="mat-card">
          <h2 class="mat-card-title"><i class="pi pi-chart-pie"></i> {{ i18n.translate('maturityJourney.capabilityRadar') }}</h2>
          <div class="mat-chart-wrap">
            <app-echart [options]="radarOpts()" ariaLabel="Maturity capability radar" />
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .mat-root { padding: var(--space-lg, 24px); max-width: 1440px; margin: 0 auto; }
    .mat-header {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
      padding: 20px 24px; border-radius: var(--radius-xl); margin-bottom: 20px;
      background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%);
      color: #fff; box-shadow: var(--shadow-lg);
    }
    .mat-header-left { display: flex; align-items: center; gap: 14px; }
    .mat-icon { font-size: var(--font-size-3xl); color: #c4b5fd; }
    .mat-header h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 800; }
    .mat-header p { margin: 2px 0 0; font-size: var(--font-size-sm); color: rgba(var(--color-white-rgb), 0.6); }
    .mat-nav {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius);
      background: rgba(var(--color-white-rgb), 0.1); color: #fff; text-decoration: none; font-size: var(--font-size-sm); font-weight: 600;
      border: 1px solid rgba(var(--color-white-rgb), 0.15); transition: all 200ms;
    }
    .mat-nav:hover { background: rgba(var(--color-white-rgb), 0.2); }

    /* CMMI Ladder */
    .mat-ladder { display: flex; flex-direction: column-reverse; gap: 6px; margin-bottom: 20px; }
    .mat-ladder-step {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: var(--radius-md);
      background: var(--surface, #fff); border: 1px solid var(--border-primary);
      opacity: 0.5; transition: all 300ms;
    }
    .mat-ladder-step.active { opacity: 1; border-color: rgba(var(--module-accent-violet-rgb), 0.3); }
    .mat-ladder-step.current { border-color: var(--secondary, #8b5cf6); box-shadow: var(--shadow-glow); }
    .mat-ls-num {
      width: 36px; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-md); font-weight: 800; background: rgba(var(--module-accent-violet-rgb), 0.08); color: #7c3aed;
    }
    .mat-ladder-step.current .mat-ls-num { background: var(--secondary, #8b5cf6); color: #fff; }
    .mat-ls-info { flex: 1; min-width: 0; }
    .mat-ls-name { display: block; font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); }
    .mat-ls-desc { display: block; font-size: var(--font-size-xs); color: var(--text-muted); }
    .mat-ls-bar { width: 120px; height: 6px; border-radius: var(--radius-xs); background: rgba(var(--color-black-rgb), 0.05); overflow: hidden; flex-shrink: 0; }
    .mat-ls-fill { height: 100%; border-radius: var(--radius-xs); background: var(--secondary, #8b5cf6); transition: width 800ms; }

    /* Score Row */
    .mat-score-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .mat-score-card {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 18px; border-radius: var(--radius-lg);
      background: var(--surface, #fff); border: 1px solid var(--border-primary);
      box-shadow: var(--shadow-sm);
    }
    .mat-sc-label { font-size: var(--font-size-xs); color: var(--text-muted); }
    .mat-sc-value { font-size: var(--font-size-4xl); font-weight: 800; color: #7c3aed; }
    .mat-sc-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .mat-sc-pred { color: var(--primary); }

    /* Charts */
    .mat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .mat-card {
      background: var(--surface, #fff); border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);
    }
    .mat-card-title { margin: 0 0 12px; font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); display: flex; align-items: center; gap: 8px; }
    .mat-card-title i { color: var(--secondary, #8b5cf6); }
    .mat-chart-wrap { height: 280px; }

    @media (max-width: 768px) { .mat-grid { grid-template-columns: 1fr; } .mat-score-row { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class MaturityJourneyComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  currentLevel = signal(1);
  aggregateScore = signal(0);
  predictions = signal<GrcRecord | null>(null);
  trends = signal<GrcRecord[]>([]);

  journeyOpts = signal<EChartsOption>({});
  radarOpts = signal<EChartsOption>({});

  levels = [
    { name: 'Initial', desc: 'Ad-hoc processes, reactive', descAr: 'عمليات عشوائية، ردود فعل' },
    { name: 'Managed', desc: 'Basic policies in place', descAr: 'سياسات أساسية مطبقة' },
    { name: 'Defined', desc: 'Standardized processes', descAr: 'عمليات موحدة ومعيارية' },
    { name: 'Measured', desc: 'Metrics-driven governance', descAr: 'حوكمة قائمة على المقاييس' },
    { name: 'Optimizing', desc: 'Continuous improvement', descAr: 'تحسين مستمر' },
  ];

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.http.get<unknown>(`${this.api}/analytics/maturity`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(m => {
      if (m) {
        this.currentLevel.set(m.level || 1);
        this.aggregateScore.set(m.aggregate || 0);
        this.buildRadar(m.criteria);
      }
    });

    this.http.get<unknown>(`${this.api}/analytics/predictions`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      this.predictions.set(p?.predictions || null);
    });

    const start = new Date(); start.setDate(start.getDate() - 180);
    this.http.get<unknown[]>(`${this.api}/analytics/trends`, {
      params: { startDate: start.toISOString(), endDate: new Date().toISOString() }
    }).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(t => {
      this.trends.set(t || []);
      this.buildJourney();
    });
  }

  getLevelName(level: number): string {
    return this.levels[level - 1]?.name || this.i18n.translate('common.unknown');
  }

  predict365(): number {
    const p = this.predictions();
    if (!p) return this.aggregateScore();
    // Extrapolate: 30-day prediction → 365-day (linear approx with cap at 100)
    const delta30 = (p.complianceScore || 0) - this.aggregateScore();
    return Math.min(100, this.aggregateScore() + delta30 * 12);
  }

  buildJourney(): void {
    const t = this.trends();
    if (!t?.length) return;
    const dates = t.map((d: Record<string, unknown>) => d.snapshotDate?.slice(0, 10) || '');
    // Compute aggregate from each trend point
    const aggs = t.map((d: Record<string, unknown>) => {
      const c = d.complianceScore || 0;
      const r = 100 - (d.riskScore || 0);
      const e = d.evidenceCoverage || 0;
      const p = d.remediationClosureRate || 0;
      return Math.round((c + r + e + p) / 4);
    });

    this.journeyOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      grid: { top: 30, right: 16, bottom: 30, left: 45 },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 9, rotate: 30 }, boundaryGap: false },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9 },
        splitLine: { lineStyle: { color: ['rgba(var(--color-black-rgb), 0.05)'] } }
      },
      visualMap: { show: false, pieces: [
        { lte: 20, color: '#ef4444' }, { gt: 20, lte: 40, color: '#f59e0b' },
        { gt: 40, lte: 60, color: '#eab308' }, { gt: 60, lte: 80, color: '#22c55e' },
        { gt: 80, color: '#16a34a' }
      ] },
      series: [{
        type: 'line', data: aggs, smooth: true, symbol: 'circle', symbolSize: 4,
        lineStyle: { width: 3 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(var(--module-accent-violet-rgb), 0.15)' }, { offset: 1, color: 'rgba(var(--module-accent-violet-rgb), 0)' }]
        }},
        markLine: { data: [
          { yAxis: 20, label: { formatter: 'L1', fontSize: 9 }, lineStyle: { color: '#ef4444', type: 'dashed' } },
          { yAxis: 40, label: { formatter: 'L2', fontSize: 9 }, lineStyle: { color: '#f59e0b', type: 'dashed' } },
          { yAxis: 60, label: { formatter: 'L3', fontSize: 9 }, lineStyle: { color: '#eab308', type: 'dashed' } },
          { yAxis: 80, label: { formatter: 'L4', fontSize: 9 }, lineStyle: { color: '#22c55e', type: 'dashed' } },
        ], silent: true }
      }]
    });
  }

  buildRadar(criteria: Record<string, unknown>): void {
    if (!criteria) return;
    this.radarOpts.set({
      radar: {
        indicator: [
          { name: 'Compliance', max: 100 }, { name: 'Risk Mgmt', max: 100 },
          { name: 'Evidence', max: 100 }, { name: 'Process', max: 100 }
        ],
        shape: 'polygon', radius: '65%',
        axisName: { fontSize: 10, color: '#64748b' },
        splitArea: { areaStyle: { color: ['rgba(var(--module-accent-violet-rgb), 0.02)', 'rgba(var(--module-accent-violet-rgb), 0.05)'] } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [criteria.complianceScore || 0, 100 - (criteria.riskScore || 0), criteria.evidenceCoverage || 0, criteria.processMaturity || 0],
          name: 'Current',
          areaStyle: { color: 'rgba(var(--module-accent-violet-rgb), 0.15)' },
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' }
        }]
      }]
    });
  }

}
