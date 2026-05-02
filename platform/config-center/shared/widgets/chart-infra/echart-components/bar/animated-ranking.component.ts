/**
 * AnimatedRankingComponent — Animated horizontal bar race chart.
 *
 * Uses `buildAnimatedRankingOptions` from bar-builders.
 * Requirements: 11.5
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildAnimatedRankingOptions } from '../../echart-builders/bar-builders';
import type { AnimatedRankingData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-animated-ranking',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Animated Ranking Bar Race'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class AnimatedRankingComponent implements OnInit, OnChanges {
  @Input() data!: AnimatedRankingData;

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
      this.chartOptions = buildAnimatedRankingOptions(this.data);
    }
  }
}
