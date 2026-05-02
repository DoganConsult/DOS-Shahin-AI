import { Component, Input, ChangeDetectionStrategy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfidenceDimension } from '../../models/onboarding.models';

@Component({
    selector: 'app-confidence-radar',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="radar" [class.rtl]="lang === 'ar'" *ngIf="dimensions.length > 0">
      <div class="radar-title">
        <i class="pi pi-chart-bar"></i>
        {{ lang === 'ar' ? 'رادار ثقة شاهين' : "Shahin's Confidence Radar" }}
      </div>
      <div class="radar-chart">
        <svg viewBox="0 0 200 200" class="radar-svg">
          <!-- Background rings -->
          <circle *ngFor="let r of [80, 60, 40, 20]" [attr.cx]="100" [attr.cy]="100" [attr.r]="r"
            fill="none" stroke="var(--border-subtle, rgba(var(--color-black-rgb), 0.06))" stroke-width="1"/>
          <!-- Data polygon -->
          <polygon [attr.points]="polygonPoints" class="radar-polygon"/>
          <!-- Axis lines + labels -->
          <g *ngFor="let dim of chartDimensions; let i = index">
            <line [attr.x1]="100" [attr.y1]="100"
              [attr.x2]="dim.axisX" [attr.y2]="dim.axisY"
              stroke="var(--border-subtle, rgba(var(--color-black-rgb), 0.08))" stroke-width="1"/>
            <circle [attr.cx]="dim.dataX" [attr.cy]="dim.dataY" r="4"
              class="radar-dot" [class.high]="dim.value >= 0.7" [class.low]="dim.value < 0.4"/>
            <text [attr.x]="dim.labelX" [attr.y]="dim.labelY"
              class="radar-label" text-anchor="middle" dominant-baseline="middle">
              {{ dim.shortLabel }}
            </text>
          </g>
        </svg>
      </div>
      <!-- Legend -->
      <div class="radar-legend">
        <div *ngFor="let dim of chartDimensions" class="radar-legend-item">
          <span class="radar-legend-dot" [class.high]="dim.value >= 0.7" [class.low]="dim.value < 0.4"></span>
          <span class="radar-legend-label">{{ lang === 'ar' ? dim.labelAr : dim.labelEn }}</span>
          <span class="radar-legend-val">{{ (dim.value * 100) | number:'1.0-0' }}%</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .radar { padding: 0.75rem; }
    .radar-title {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: var(--font-size-caption); font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-heading);
      margin-bottom: 0.75rem;
    }
    .radar-title i { color: var(--primary); }
    .radar-chart { max-width: 200px; margin: 0 auto; }
    .radar-svg { width: 100%; height: auto; }
    .radar-polygon {
      fill: rgba(var(--primary-rgb), 0.12); stroke: var(--primary, #0f62fe);
      stroke-width: 2; transition: all 0.5s ease;
    }
    .radar-dot { fill: var(--primary, #0f62fe); transition: all 0.3s ease; }
    .radar-dot.high { fill: var(--status-success, #24a148); }
    .radar-dot.low { fill: var(--orange-400, #ff832b); }
    .radar-label {
      font-size: 7px; fill: var(--text-muted); font-weight: 600;
    }
    .radar-legend { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.75rem; }
    .radar-legend-item {
      display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem;
    }
    .radar-legend-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--primary, #0f62fe); flex-shrink: 0;
    }
    .radar-legend-dot.high { background: var(--status-success, #24a148); }
    .radar-legend-dot.low { background: var(--orange-400, #ff832b); }
    .radar-legend-label { flex: 1; color: var(--text-body); }
    .radar-legend-val { font-weight: 700; color: var(--text-heading); font-variant-numeric: tabular-nums; }
    .rtl { direction: rtl; }
  `]
})
export class ConfidenceRadarComponent implements OnChanges {
  @Input() dimensions: ConfidenceDimension[] = [];
  @Input() lang: 'en' | 'ar' = 'en';

  chartDimensions: { labelEn: string; labelAr: string; shortLabel: string; value: number;
    axisX: number; axisY: number; dataX: number; dataY: number; labelX: number; labelY: number }[] = [];
  polygonPoints = '';

  private static readonly LABELS: Record<string, { en: string; ar: string; short: string }> = {
    regulator_clarity: { en: 'Regulator Clarity', ar: 'وضوح الجهات الرقابية', short: 'REG' },
    module_readiness: { en: 'Module Readiness', ar: 'جاهزية الوحدات', short: 'MOD' },
    framework_alignment: { en: 'Framework Alignment', ar: 'محاذاة الأطر', short: 'FRM' },
    ownership_readiness: { en: 'Ownership Readiness', ar: 'جاهزية المسؤوليات', short: 'OWN' },
    automation_potential: { en: 'Automation Potential', ar: 'إمكانية الأتمتة', short: 'AUT' },
  };

  ngOnChanges(): void {
    this.computeChart();
  }

  private computeChart(): void {
    const dims = (this.dimensions ?? []).slice(0, 5);
    if (dims.length === 0) { this.chartDimensions = []; this.polygonPoints = ''; return; }

    const cx = 100, cy = 100, maxR = 80;
    const angleStep = (2 * Math.PI) / dims.length;
    const startAngle = -Math.PI / 2;

    this.chartDimensions = dims.map((d, i) => {
      const angle = startAngle + i * angleStep;
      const labels = ConfidenceRadarComponent.LABELS[d.dimension] || { en: d.dimension, ar: d.dimension, short: (d.dimension ?? '???').slice(0, 3).toUpperCase() };
      const val = Math.max(0, Math.min(1, d.confidence_value));
      return {
        labelEn: labels.en, labelAr: labels.ar, shortLabel: labels.short, value: val,
        axisX: cx + maxR * Math.cos(angle), axisY: cy + maxR * Math.sin(angle),
        dataX: cx + maxR * val * Math.cos(angle), dataY: cy + maxR * val * Math.sin(angle),
        labelX: cx + (maxR + 14) * Math.cos(angle), labelY: cy + (maxR + 14) * Math.sin(angle),
      };
    });

    this.polygonPoints = this.chartDimensions.map(d => `${d.dataX},${d.dataY}`).join(' ');
  }
}
