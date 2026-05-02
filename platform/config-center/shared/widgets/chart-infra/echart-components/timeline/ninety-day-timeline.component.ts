/**
 * NinetyDayTimelineComponent — 90-day rolling compliance and risk event timeline.
 *
 * Uses `buildGrcTimelineOptions` from line-builders for a multi-series timeline.
 * Requirements: 9.6
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildGrcTimelineOptions } from '../../echart-builders/line-builders';
import type { TimeSeriesData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-ninety-day-timeline',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'90-Day Rolling Timeline'"
      (chartClick)="onEventClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class NinetyDayTimelineComponent implements OnInit, OnChanges {
  @Input() data!: TimeSeriesData;
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
      this.chartOptions = buildGrcTimelineOptions(this.data);
    }
  }
}
