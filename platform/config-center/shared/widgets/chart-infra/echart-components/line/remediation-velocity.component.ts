/**
 * RemediationVelocityComponent — Remediation velocity trend with trendline.
 *
 * Uses `buildRemediationVelocityOptions` from line-builders.
 * Requirements: 11.11
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildRemediationVelocityOptions } from '../../echart-builders/line-builders';
import type { TimeSeriesData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-remediation-velocity',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Remediation Velocity Chart'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class RemediationVelocityComponent implements OnInit, OnChanges {
  @Input() data!: TimeSeriesData;

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
      this.chartOptions = buildRemediationVelocityOptions(this.data);
    }
  }
}
