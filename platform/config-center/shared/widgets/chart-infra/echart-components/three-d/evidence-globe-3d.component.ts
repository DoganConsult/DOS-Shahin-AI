/**
 * EvidenceGlobe3dComponent — 3D globe showing evidence collection locations.
 *
 * Uses `buildEvidenceGlobeOptions` from custom-3d-builders.
 * Falls back to a message when WebGL is not available.
 * Requirements: 9.9
 */
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildEvidenceGlobeOptions } from '../../echart-builders/advanced/custom-3d-builders';
import type { GlobeData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-evidence-globe-3d',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <ng-container *ngIf="webGLSupported; else noWebGL">
      <app-echart
        [options]="chartOptions"
        [ariaLabel]="'Evidence Globe 3D'">
      </app-echart>
    </ng-container>
    <ng-template #noWebGL>
      <div class="webgl-fallback" role="alert">
        <span class="fallback-icon">⚠️</span>
        <p>3D visualization requires WebGL support. Please use a modern browser with hardware acceleration enabled.</p>
      </div>
    </ng-template>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .webgl-fallback {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; min-height: 200px; color: var(--text-muted, #6f6f6f);
      font-size: var(--font-size-base); text-align: center; padding: 1rem;
    }
    .fallback-icon { font-size: var(--font-size-4xl); margin-bottom: 0.5rem; }
  `]
})
export class EvidenceGlobe3dComponent implements OnInit, OnChanges {
  @Input() data!: GlobeData;

  chartOptions: EChartsOption = {};
  webGLSupported = EvidenceGlobe3dComponent.checkWebGL();

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  private buildChart(): void {
    if (this.data && this.webGLSupported) {
      this.chartOptions = buildEvidenceGlobeOptions(this.data);
    }
  }

  private static checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }
}
