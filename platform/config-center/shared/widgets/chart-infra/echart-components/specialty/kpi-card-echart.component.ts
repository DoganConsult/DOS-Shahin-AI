/**
 * KpiCardEchartComponent — Single KPI card with embedded sparkline.
 *
 * Shows label and value as text, with a small sparkline chart below.
 * Uses `buildSparklineOptions` from line-builders.
 * Requirements: 12.6
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildSparklineOptions } from '../../echart-builders/line-builders';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-kpi-card-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="kpi-card">
      <div class="kpi-label">{{ label }}</div>
      <div class="kpi-value">{{ value }}</div>
      <div class="kpi-sparkline">
        <app-echart
          [options]="chartOptions"
          [ariaLabel]="'Sparkline for ' + label">
        </app-echart>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .kpi-card { display: flex; flex-direction: column; height: 100%; padding: 12px; }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-muted, #6f6f6f); margin-bottom: 4px; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 600; }
    .kpi-sparkline { flex: 1; min-height: 40px; margin-top: 8px; }
  `]
})
export class KpiCardEchartComponent implements OnInit, OnChanges {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() sparklineData: number[] = [];

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['sparklineData'] && !changes['sparklineData'].firstChange) ||
        (changes['label'] && !changes['label'].firstChange)) {
      this.buildChart();
    }
  }

  private buildChart(): void {
    if (this.sparklineData?.length) {
      this.chartOptions = buildSparklineOptions({ values: this.sparklineData, label: this.label });
    }
  }
}
