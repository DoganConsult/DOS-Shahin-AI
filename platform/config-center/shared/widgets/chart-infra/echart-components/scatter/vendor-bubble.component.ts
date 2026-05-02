/**
 * VendorBubbleComponent — Vendor bubble scatter chart.
 *
 * Uses `buildVendorBubbleOptions` from scatter-heatmap-treemap-builders.
 * Requirements: 11.12
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildVendorBubbleOptions } from '../../echart-builders/scatter-heatmap-treemap-builders';
import type { BubbleData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-vendor-bubble',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Vendor Bubble Chart'"
      (chartClick)="onBubbleClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class VendorBubbleComponent implements OnInit, OnChanges {
  @Input() data!: BubbleData;
  @Output() bubbleDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onBubbleClick(event: GrcRecord): void {
    this.bubbleDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildVendorBubbleOptions(this.data);
    }
  }
}
