/**
 * RiskDistributionComponent — Risk distribution donut chart by severity.
 *
 * Uses `buildEvidenceDonutOptions` from pie-radar-gauge-builders (same donut pattern).
 * Requirements: 10.11
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildEvidenceDonutOptions } from '../../echart-builders/pie-radar-gauge-builders';
import type { DonutData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-risk-distribution',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Risk Distribution Donut'"
      (chartClick)="onSegmentClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class RiskDistributionComponent implements OnInit, OnChanges {
  @Input() data!: DonutData;
  @Output() segmentDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onSegmentClick(event: GrcRecord): void {
    this.segmentDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildEvidenceDonutOptions(this.data);
    }
  }
}
