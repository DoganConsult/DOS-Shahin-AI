/**
 * RiskHeatmapEchartComponent — 5×5 risk heatmap with drill-down on cell click.
 *
 * Uses `buildRiskHeatmapEnhancedOptions` from scatter-heatmap-treemap-builders.
 * Requirements: 9.1, 9.11
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildRiskHeatmapEnhancedOptions } from '../../echart-builders/scatter-heatmap-treemap-builders';
import type { HeatmapData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { parseHeatmapCellSelection } from '../../chart-utils';

@Component({
    selector: 'app-risk-heatmap-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Risk Heatmap'"
      (chartClick)="onCellClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class RiskHeatmapEchartComponent implements OnInit, OnChanges {
  @Input() data!: HeatmapData;
  @Output() cellDrillDown = new EventEmitter<{ row: string; column: string; value: number }>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onCellClick(event: { data?: unknown }): void {
    const selection = parseHeatmapCellSelection(event, this.data?.rows, this.data?.columns);
    if (selection) {
      this.cellDrillDown.emit(selection);
    }
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildRiskHeatmapEnhancedOptions(this.data);
    }
  }
}
