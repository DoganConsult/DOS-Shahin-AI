/**
 * RiskConstellationComponent — Risk constellation scatter chart with correlation lines.
 *
 * Uses `buildRiskConstellationOptions` from scatter-heatmap-treemap-builders.
 * Requirements: 11.14
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildRiskConstellationOptions } from '../../echart-builders/scatter-heatmap-treemap-builders';
import type { BubbleData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-risk-constellation',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Risk Constellation Chart'"
      (chartClick)="onPointClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class RiskConstellationComponent implements OnInit, OnChanges {
  @Input() data!: BubbleData;
  @Output() pointDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onPointClick(event: GrcRecord): void {
    this.pointDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildRiskConstellationOptions(this.data);
    }
  }
}
