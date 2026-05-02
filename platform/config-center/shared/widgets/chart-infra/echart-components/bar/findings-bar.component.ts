/**
 * FindingsBarComponent — Stacked bar chart of findings by severity.
 *
 * Uses `buildFindingsBarOptions` from bar-builders.
 * Requirements: 11.4
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildFindingsBarOptions } from '../../echart-builders/bar-builders';
import type { FindingsBarData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-findings-bar',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Findings Bar Chart'"
      (chartClick)="onBarClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class FindingsBarComponent implements OnInit, OnChanges {
  @Input() data!: FindingsBarData;
  @Output() barDrillDown = new EventEmitter<any>();

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
    this.barDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildFindingsBarOptions(this.data);
    }
  }
}
