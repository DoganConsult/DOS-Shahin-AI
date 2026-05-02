/**
 * AiInsightsEchartComponent — AI insight cards with mini sparkline charts.
 *
 * Simple card layout showing insight text with a small sparkline.
 * Uses `buildSparklineOptions` from line-builders.
 * Requirements: 12.1
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildSparklineOptions } from '../../echart-builders/line-builders';
import type { EChartsOption } from 'echarts';

export interface AiInsight {
  title: string;
  description: string;
  sparklineValues: number[];
}

@Component({
    selector: 'app-ai-insights-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="insights-grid">
      <div class="insight-card" *ngFor="let insight of insights; let i = index">
        <div class="insight-text">
          <strong>{{ insight.title }}</strong>
          <p>{{ insight.description }}</p>
        </div>
        <div class="insight-sparkline">
          <app-echart
            [options]="sparklineOptions[i]"
            [ariaLabel]="'Sparkline for ' + insight.title">
          </app-echart>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .insights-grid { display: flex; flex-direction: column; gap: 8px; height: 100%; overflow: auto; }
    .insight-card { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radius); background: var(--surface-02, rgba(var(--color-white-rgb), 0.06)); }
    .insight-text { flex: 1; min-width: 0; }
    .insight-text strong { font-size: var(--font-size-xs-plus); display: block; }
    .insight-text p { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--text-muted, #6f6f6f); }
    .insight-sparkline { width: 80px; height: 40px; flex-shrink: 0; }
  `]
})
export class AiInsightsEchartComponent implements OnInit, OnChanges {
  @Input() insights: AiInsight[] = [];

  sparklineOptions: EChartsOption[] = [];

  ngOnInit(): void {
    this.buildCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['insights'] && !changes['insights'].firstChange) {
      this.buildCharts();
    }
  }

  private buildCharts(): void {
    this.sparklineOptions = (this.insights ?? []).map(insight =>
      buildSparklineOptions({ values: insight.sparklineValues ?? [] })
    );
  }

}
