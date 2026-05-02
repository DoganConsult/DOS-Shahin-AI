/**
 * RiskBridgeWaterfallComponent — Waterfall chart of cumulative risk score changes.
 *
 * Uses `buildRiskBridgeWaterfallOptions` from bar-builders.
 * Requirements: 11.7
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildRiskBridgeWaterfallOptions } from '../../echart-builders/bar-builders';
import type { WaterfallData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-risk-bridge-waterfall',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Risk Bridge Waterfall Chart'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class RiskBridgeWaterfallComponent implements OnInit, OnChanges {
  @Input() data!: WaterfallData;

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildRiskBridgeWaterfallOptions(this.data);
    }
  }
}
