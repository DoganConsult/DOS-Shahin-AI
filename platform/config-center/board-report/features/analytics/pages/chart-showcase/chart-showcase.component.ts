import { Component, OnInit, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { PlotlyChartComponent } from '@app/shared/charts/plotly-chart.component';
import { ButtonModule } from 'primeng/button';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chart-showcase',
  standalone: true,
  imports: [CommonModule, PageShellComponent, PlotlyChartComponent, ButtonModule],
  template: `
    <app-page-shell
      icon="chart-bar"
      [title]="i18n.translate('chartShowcase.title')"
      [subtitle]="i18n.translate('chartShowcase.subtitle')"
      [breadcrumbs]="['Dashboard', 'Charts']"
      [loading]="loading">

      <div class="cs-toolbar">
        <button class="cs-refresh" (click)="refreshData()"><i class="pi pi-refresh"></i> Refresh with Live Data</button>
      </div>

      <div class="cs-grid">
        <!-- 1. Animated Gauge: Overall Compliance -->
        <div class="cs-card cs-card-full">
          <h3 class="cs-title"><i class="pi pi-chart-line"></i> Overall GRC Health — Animated Gauges</h3>
          <div class="cs-gauge-row">
            <app-plotly-chart [data]="gaugeCompliance" [layout]="gaugeLayout('Compliance', compliancePct)" height="220px" />
            <app-plotly-chart [data]="gaugeControls" [layout]="gaugeLayout('Control Effectiveness', controlPct)" height="220px" />
            <app-plotly-chart [data]="gaugePolicy" [layout]="gaugeLayout('Policy Approval', policyPct)" height="220px" />
          </div>
        </div>

        <!-- 2. Animated Bar: Risk Distribution -->
        <div class="cs-card">
          <h3 class="cs-title"><i class="pi pi-chart-bar"></i> Risk Distribution (Animated Bars)</h3>
          <app-plotly-chart [data]="riskBarData" [layout]="riskBarLayout" height="320px" />
        </div>

        <!-- 3. Animated Donut: Findings by Status -->
        <div class="cs-card">
          <h3 class="cs-title"><i class="pi pi-chart-pie"></i> Findings by Status (Animated Donut)</h3>
          <app-plotly-chart [data]="findingsDonutData" [layout]="donutLayout" height="320px" />
        </div>

        <!-- 4. Animated Area: Compliance Trend -->
        <div class="cs-card">
          <h3 class="cs-title"><i class="pi pi-chart-line"></i> Compliance Trend (Animated Area)</h3>
          <app-plotly-chart [data]="trendData" [layout]="trendLayout" height="320px" />
        </div>

        <!-- 5. Animated Heatmap: Risk by Category × Impact -->
        <div class="cs-card">
          <h3 class="cs-title"><i class="pi pi-th-large"></i> Risk Heatmap (Animated)</h3>
          <app-plotly-chart [data]="heatmapData" [layout]="heatmapLayout" height="320px" />
        </div>
      </div>

    </app-page-shell>
  `,
  styles: [`
    .cs-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .cs-refresh {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: var(--primary); color: white; border: none; border-radius: var(--radius-sm);
      font-size: var(--font-size-sm); font-weight: var(--font-medium); cursor: pointer; transition: all 150ms;
    }
    .cs-refresh:hover { background: var(--primary-dark); }

    .cs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .cs-card {
      padding: 18px; background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
    }
    .cs-card-full { grid-column: 1 / -1; }
    .cs-title {
      font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading);
      margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
    }
    .cs-title .pi { color: var(--primary); font-size: var(--font-size-md); }
    .cs-gauge-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

    @media (max-width: 1024px) { .cs-grid { grid-template-columns: 1fr; } .cs-gauge-row { grid-template-columns: 1fr; } }
  `],
})
export class ChartShowcaseComponent implements OnInit {
  private _storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  private api = environment.apiUrl;

  // Gauge values
  compliancePct = 0;
  controlPct = 0;
  policyPct = 0;

  // Chart data
  gaugeCompliance: Record<string, unknown>[] = [];
  gaugeControls: Record<string, unknown>[] = [];
  gaugePolicy: Record<string, unknown>[] = [];
  riskBarData: Record<string, unknown>[] = [];
  riskBarLayout: Record<string, unknown> = {};
  findingsDonutData: Record<string, unknown>[] = [];
  donutLayout: Record<string, unknown> = {};
  trendData: Record<string, unknown>[] = [];
  trendLayout: Record<string, unknown> = {};
  heatmapData: Record<string, unknown>[] = [];
  heatmapLayout: Record<string, unknown> = {};

  constructor(public i18n: I18nService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadBoardData();
  }

  refreshData(): void {
    this.loadBoardData();
  }

  private loadBoardData(): void {
    this.loading = true;
    const wsId = this._storage.get('grc_active_workspace') || '';
    const url = wsId
      ? `${this.api}/report-center/board-report?workspaceId=${wsId}`
      : `${this.api}/report-center/board-report`;

    this.http.get<unknown>(url).subscribe({
      next: (d) => {
        this.compliancePct = d.executiveSummary?.overallCompliancePct || 0;
        this.controlPct = d.executiveSummary?.controlEffectivenessPct || 0;
        this.policyPct = d.executiveSummary?.policyApprovalPct || 0;
        this.buildGauges();
        this.buildRiskBars(d.risks);
        this.buildFindingsDonut(d.findings);
        this.buildTrend(d);
        this.buildHeatmap();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => {
        // Use demo data if API unavailable
        this.compliancePct = 72; this.controlPct = 65; this.policyPct = 88;
        this.buildGauges();
        this.buildRiskBars({ critical: 3, high: 8, medium: 15, low: 22 });
        this.buildFindingsDonut({ open: 12, closed: 34, criticalOpen: 2 });
        this.buildTrend(null);
        this.buildHeatmap();
        this.loading = false; this.cdr.markForCheck();
      },
    });
  }

  // --- 1. Animated Gauges ---
  private buildGauges(): void {
    this.gaugeCompliance = [this.gaugeTrace(this.compliancePct)];
    this.gaugeControls = [this.gaugeTrace(this.controlPct)];
    this.gaugePolicy = [this.gaugeTrace(this.policyPct)];
  }

  private gaugeTrace(value: number): Record<string, unknown> {
    return {
      type: 'indicator',
      mode: 'gauge+number',
      value,
      gauge: {
        axis: { range: [0, 100], tickwidth: 1, tickcolor: '#e2e8f0' },
        bar: { color: value >= 75 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444', thickness: 0.7 },
        bgcolor: '#f8fafc',
        borderwidth: 0,
        steps: [
          { range: [0, 50], color: '#fee2e2' },
          { range: [50, 75], color: 'var(--status-warning-bg, #fcf4d6)' },
          { range: [75, 100], color: '#dcfce7' },
        ],
      },
      number: { suffix: '%', font: { size: 28, color: '#0c4a6e' } },
    };
  }

  gaugeLayout(title: string, _value: number): Record<string, unknown> {
    return {
      title: { text: title, font: { size: 13, color: '#64748b' } },
      margin: { t: 40, r: 20, b: 10, l: 20 },
      height: 200,
    };
  }

  // --- 2. Animated Risk Bar Chart ---
  private buildRiskBars(risks: Record<string, unknown>): void {
    const categories = ['Critical', 'High', 'Medium', 'Low'];
    const values = [risks?.critical || 0, risks?.high || 0, risks?.medium || 0, risks?.low || 0];
    const colors = ['#ef4444', '#f59e0b', '#0ea5e9', '#22c55e'];

    this.riskBarData = [{
      type: 'bar',
      x: categories,
      y: values,
      marker: {
        color: colors,
        line: { color: colors.map(c => c + '88'), width: 1.5 },
      },
      text: values.map(String),
      textposition: 'outside',
      textfont: { size: 14, color: '#0c4a6e', family: 'Inter' },
    }];

    this.riskBarLayout = {
      xaxis: { title: '', tickfont: { size: 12, color: '#64748b' } },
      yaxis: { title: 'Count', gridcolor: '#f1f5f9', tickfont: { size: 11, color: '#94a3b8' } },
      bargap: 0.35,
      transition: { duration: 800, easing: 'elastic-in-out' },
    };
  }

  // --- 3. Animated Donut ---
  private buildFindingsDonut(findings: Record<string, unknown>): void {
    const open = findings?.open || 0;
    const closed = findings?.closed || 0;
    const critical = findings?.criticalOpen || 0;
    const other = Math.max(0, open - critical);

    this.findingsDonutData = [{
      type: 'pie',
      values: [critical, other, closed],
      labels: ['Critical Open', 'Other Open', 'Closed'],
      hole: 0.55,
      textinfo: 'label+value',
      textposition: 'outside',
      marker: {
        colors: ['#ef4444', '#f59e0b', '#22c55e'],
        line: { color: '#ffffff', width: 2 },
      },
      pull: [0.05, 0, 0],
      rotation: -45,
    }];

    this.donutLayout = {
      showlegend: true,
      legend: { orientation: 'h', y: -0.1, font: { size: 11 } },
      annotations: [{
        text: `<b>${open + closed}</b><br>Total`,
        showarrow: false, font: { size: 16, color: '#0c4a6e' },
      }],
      transition: { duration: 600, easing: 'cubic-in-out' },
    };
  }

  // --- 4. Animated Area Trend ---
  private buildTrend(data: any): void {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentPct = data?.executiveSummary?.overallCompliancePct || 72;
    // Generate a realistic upward trend ending at current value
    const base = Math.max(20, currentPct - 35);
    const complianceTrend = months.map((_, i) => Math.min(100, Math.round(base + (currentPct - base) * (i / 11) + (Math.random() * 6 - 3))));
    const controlTrend = months.map((_, i) => Math.min(100, Math.round(base - 5 + (currentPct - base + 5) * (i / 11) + (Math.random() * 8 - 4))));

    this.trendData = [
      {
        type: 'scatter',
        mode: 'lines',
        x: months, y: complianceTrend,
        name: 'Compliance %',
        fill: 'tozeroy',
        fillcolor: 'rgba(14,165,233,0.12)',
        line: { color: '#0ea5e9', width: 3, shape: 'spline' },
      },
      {
        type: 'scatter',
        mode: 'lines',
        x: months, y: controlTrend,
        name: 'Control Effectiveness %',
        fill: 'tozeroy',
        fillcolor: 'rgba(139,92,246,0.08)',
        line: { color: '#8b5cf6', width: 2, shape: 'spline', dash: 'dot' },
      },
    ];

    this.trendLayout = {
      xaxis: { tickfont: { size: 11, color: '#64748b' } },
      yaxis: { title: '%', range: [0, 105], gridcolor: '#f1f5f9', tickfont: { size: 11, color: '#94a3b8' } },
      legend: { orientation: 'h', y: 1.12, font: { size: 11 } },
      transition: { duration: 700, easing: 'cubic-in-out' },
    };
  }

  // --- 5. Animated Heatmap ---
  private buildHeatmap(): void {
    const xLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
    const yLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
    const z = [
      [1, 2, 3, 4, 5],
      [2, 4, 6, 8, 10],
      [3, 6, 9, 12, 15],
      [4, 8, 12, 16, 20],
      [5, 10, 15, 20, 25],
    ];

    this.heatmapData = [{
      type: 'heatmap',
      x: xLabels,
      y: yLabels,
      z,
      colorscale: [
        [0, '#dcfce7'],
        [0.25, '#fef9c3'],
        [0.5, '#fed7aa'],
        [0.75, '#fca5a5'],
        [1, '#991b1b'],
      ],
      showscale: true,
      colorbar: { title: 'Score', tickfont: { size: 10 }, titlefont: { size: 11 } },
      text: z.map(row => row.map(v => `Score: ${v}`)),
      hoverinfo: 'text',
      xgap: 2,
      ygap: 2,
    }];

    this.heatmapLayout = {
      xaxis: { title: 'Impact', tickfont: { size: 11, color: '#64748b' }, side: 'bottom' },
      yaxis: { title: 'Likelihood', tickfont: { size: 11, color: '#64748b' } },
      transition: { duration: 600, easing: 'cubic-in-out' },
    };
  }
}
