/**
 * TopRisksEchartComponent — Ranked top risks with mini bar charts.
 *
 * Uses `buildFindingsBarOptions` from bar-builders.
 * Requirements: 12.7
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildFindingsBarOptions } from '../../echart-builders/bar-builders';
import type { FindingsBarData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-top-risks-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Top Risks Bar Chart'"
      (chartClick)="onBarClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class TopRisksEchartComponent implements OnInit, OnChanges {
  @Input() data!: FindingsBarData;
  @Output() riskDrillDown = new EventEmitter<any>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onBarClick(event: GrcRecord): void {
    this.riskDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildFindingsBarOptions(this.data);
    }
  }
}
