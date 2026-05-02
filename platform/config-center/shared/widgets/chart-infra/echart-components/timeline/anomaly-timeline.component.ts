/**
 * AnomalyTimelineComponent — Line+scatter anomaly detection timeline.
 *
 * Uses `buildAnomalyTimelineOptions` from line-builders.
 * Requirements: 9.4
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildAnomalyTimelineOptions } from '../../echart-builders/line-builders';
import type { AnomalyTimelineData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-anomaly-timeline',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Anomaly Detection Timeline'"
      (chartClick)="onEventClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class AnomalyTimelineComponent implements OnInit, OnChanges {
  @Input() data!: AnomalyTimelineData;
  @Output() eventDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onEventClick(event: GrcRecord): void {
    this.eventDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildAnomalyTimelineOptions(this.data);
    }
  }
}
