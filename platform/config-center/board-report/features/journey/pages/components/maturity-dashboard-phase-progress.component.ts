/**
 * Maturity Dashboard Phase Progress — Displays phase completion bars
 * and the maturity trend chart.
 *
 * Presentational child of MaturityDashboardComponent.
 */

import {
  Component, Input, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MaturityScore, TrendPoint } from '@app/core/services/user-account/journey.service';

/** Phase display metadata */
const PHASE_LABELS: Record<string, { icon: string }> = {
  foundation: { icon: 'pi-building' },
  assessment: { icon: 'pi-search' },
  implementation: { icon: 'pi-wrench' },
  operations: { icon: 'pi-sync' },
  continuous_improvement: { icon: 'pi-chart-line' },
};

/** Phase completion data passed from parent */
export interface PhaseCompletionData {
  type: string;
  nameEn: string;
  nameAr: string;
  completionPercent: number;
  totalTasks: number;
  completedTasks: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-phase-progress',
    imports: [CommonModule, AppNumberPipe],
    template: `
    <!-- Phase completion bars -->
    @if (phaseCompletions.length > 0) {
      <div class="phases-card">
        <h2 class="section-title">{{ isAr() ? 'تقدم المراحل' : 'Phase Progress' }}</h2>
        <div class="phase-bars">
          @for (phase of phaseCompletions; track phase.type) {
            <div class="phase-bar-row">
              <div class="phase-bar-label">
                <i class="pi" [ngClass]="getPhaseIcon(phase.type)"></i>
                <span class="phase-bar-name">{{ isAr() ? phase.nameAr : phase.nameEn }}</span>
              </div>
              <div class="phase-bar-track">
                <div class="phase-bar-fill"
                     [style.width.%]="phase.completionPercent"
                     [class.complete]="phase.completionPercent === 100"></div>
              </div>
              <div class="phase-bar-stats">
                <span class="phase-bar-percent">{{ phase.completionPercent | appNumber:'decimal':'1.0-0' }}%</span>
                <span class="phase-bar-tasks">
                  {{ phase.completedTasks }}/{{ phase.totalTasks }}
                  {{ isAr() ? 'مهام' : 'tasks' }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Trend chart -->
    @if (trendPoints.length > 1) {
      <div class="trend-card">
        <h2 class="section-title">{{ isAr() ? 'اتجاه النضج' : 'Maturity Trend' }}</h2>
        <div class="trend-chart" role="img"
             [attr.aria-label]="isAr() ? 'رسم بياني لاتجاه درجة النضج' : 'Maturity score trend chart'">
          <!-- Y-axis labels -->
          <div class="trend-y-axis">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>
          <!-- Chart area -->
          <div class="trend-area">
            <!-- Grid lines -->
            <div class="trend-grid">
              <div class="trend-grid-line" style="bottom: 100%"></div>
              <div class="trend-grid-line" style="bottom: 75%"></div>
              <div class="trend-grid-line" style="bottom: 50%"></div>
              <div class="trend-grid-line" style="bottom: 25%"></div>
              <div class="trend-grid-line" style="bottom: 0%"></div>
            </div>
            <!-- Data points and connecting lines -->
            <svg class="trend-svg" [attr.viewBox]="'0 0 ' + trendWidth + ' 120'" preserveAspectRatio="none">
              <polyline class="trend-line"
                        [attr.points]="trendPolylinePoints"
                        fill="none" stroke-width="2" />
              <polygon class="trend-fill"
                       [attr.points]="trendPolygonPoints" />
              @for (pt of trendDataPoints; track pt.index) {
                <circle class="trend-dot"
                        [attr.cx]="pt.x" [attr.cy]="pt.y" r="3" />
              }
            </svg>
            <!-- X-axis labels -->
            <div class="trend-x-axis">
              @for (pt of trendXLabels; track pt.index) {
                <span class="trend-x-label" [style.left.%]="pt.leftPercent">
                  {{ pt.label }}
                </span>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-bold);
      color: var(--text-heading);
      margin: 0 0 var(--space-md);
    }

    /* -- Phase completion bars -- */
    .phases-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .phase-bars { display: flex; flex-direction: column; gap: var(--space-md); }

    .phase-bar-row {
      display: grid;
      grid-template-columns: 200px 1fr 100px;
      align-items: center;
      gap: var(--space-md);
    }

    .phase-bar-label { display: flex; align-items: center; gap: var(--space-sm); }
    .phase-bar-label .pi { color: var(--primary); font-size: var(--font-size-base); }
    .phase-bar-name { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-heading); }

    .phase-bar-track {
      height: 8px;
      background: var(--border-subtle);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }

    .phase-bar-fill {
      height: 100%;
      background: var(--primary);
      border-radius: var(--radius-xs);
      transition: width 600ms ease;
    }

    .phase-bar-fill.complete { background: var(--success); }

    .phase-bar-stats { display: flex; flex-direction: column; align-items: flex-end; }
    .phase-bar-percent { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); }
    .phase-bar-tasks { font-size: var(--font-size-xs); color: var(--text-muted); }

    /* -- Trend chart -- */
    .trend-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .trend-chart { display: flex; gap: var(--space-sm); height: 160px; }

    .trend-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      padding-bottom: 20px;
      min-width: 28px;
      text-align: end;
    }

    .trend-area { flex: 1; position: relative; padding-bottom: 20px; }
    .trend-grid { position: absolute; inset: 0; bottom: 20px; }

    .trend-grid-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-subtle);
    }

    .trend-svg {
      position: absolute;
      inset: 0;
      bottom: 20px;
      width: 100%;
      height: calc(100% - 20px);
    }

    .trend-line { stroke: var(--primary); vector-effect: non-scaling-stroke; }
    .trend-fill { fill: rgba(var(--module-accent-sky-rgb), 0.08); }
    .trend-dot { fill: var(--primary); vector-effect: non-scaling-stroke; }

    .trend-x-axis {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 20px;
      display: flex;
    }

    .trend-x-label {
      position: absolute;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      transform: translateX(-50%);
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .phase-bar-row { grid-template-columns: 1fr; gap: var(--space-xs); }
      .phase-bar-stats { flex-direction: row; gap: var(--space-sm); align-items: center; }
      .trend-chart { height: 140px; }
    }
  `]
})
export class MaturityPhaseProgressComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) phaseCompletions: PhaseCompletionData[] = [];
  @Input({ required: true }) trendPoints: TrendPoint[] = [];

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  get trendWidth(): number {
    return Math.max(this.trendPoints.length * 40, 200);
  }

  get trendDataPoints(): { index: number; x: number; y: number }[] {
    const trend = this.trendPoints;
    if (trend.length === 0) return [];
    const w = this.trendWidth;
    const step = trend.length > 1 ? w / (trend.length - 1) : w / 2;
    return trend.map((pt, i) => ({
      index: i,
      x: trend.length > 1 ? i * step : w / 2,
      y: 120 - (pt.score / 100) * 120,
    }));
  }

  get trendPolylinePoints(): string {
    return this.trendDataPoints.map(p => `${p.x},${p.y}`).join(' ');
  }

  get trendPolygonPoints(): string {
    const pts = this.trendDataPoints;
    if (pts.length === 0) return '';
    const w = this.trendWidth;
    const line = pts.map(p => `${p.x},${p.y}`).join(' ');
    return `${pts[0].x},120 ${line} ${pts[pts.length - 1].x},120`;
  }

  get trendXLabels(): { index: number; leftPercent: number; label: string }[] {
    const trend = this.trendPoints;
    if (trend.length === 0) return [];
    return trend.map((pt, i) => {
      const d = new Date(pt.date);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return {
        index: i,
        leftPercent: trend.length > 1 ? (i / (trend.length - 1)) * 100 : 50,
        label,
      };
    });
  }

  getPhaseIcon(type: string): string {
    return PHASE_LABELS[type]?.icon ?? 'pi-circle';
  }
}
