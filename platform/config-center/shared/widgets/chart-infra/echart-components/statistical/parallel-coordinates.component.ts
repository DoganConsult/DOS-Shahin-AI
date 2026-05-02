/**
 * ParallelCoordinatesComponent — Parallel coordinates chart for multi-dimensional analysis.
 *
 * Uses `buildParallelCoordinatesOptions` from advanced-builders.
 * Requirements: 11.16
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildParallelCoordinatesOptions } from '../../echart-builders/advanced-builders';
import type { ParallelCoordinatesData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-parallel-coordinates',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Parallel Coordinates Chart'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ParallelCoordinatesComponent implements OnInit, OnChanges {
  @Input() data!: ParallelCoordinatesData;

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
      this.chartOptions = buildParallelCoordinatesOptions(this.data);
    }
  }
}
