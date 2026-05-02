/**
 * GrcPulseRiverComponent — ThemeRiver chart of GRC activity streams.
 *
 * Uses `buildGrcPulseRiverOptions` from advanced-builders.
 * Requirements: 12.10
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildGrcPulseRiverOptions } from '../../echart-builders/advanced-builders';
import type { ThemeRiverData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-grc-pulse-river',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'GRC Pulse River Chart'"
      (chartClick)="onStreamClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class GrcPulseRiverComponent implements OnInit, OnChanges {
  @Input() data!: ThemeRiverData;
  @Output() streamDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onStreamClick(event: GrcRecord): void {
    this.streamDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildGrcPulseRiverOptions(this.data);
    }
  }
}
