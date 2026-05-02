/**
 * GanttTimelineComponent — Gantt chart for remediation and project timelines.
 *
 * Uses `buildGanttTimelineOptions` from custom-3d-builders.
 * Requirements: 9.5
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildGanttTimelineOptions } from '../../echart-builders/advanced/custom-3d-builders';
import type { GanttData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-gantt-timeline',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Gantt Timeline'"
      (chartClick)="onEventClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class GanttTimelineComponent implements OnInit, OnChanges {
  @Input() data!: GanttData;
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
      this.chartOptions = buildGanttTimelineOptions(this.data);
    }
  }
}
