/**
 * Maturity Dashboard Score Gauge — Displays the overall maturity score gauge
 * with component breakdown bars.
 *
 * Presentational child of MaturityDashboardComponent.
 */

import {
  Component, Input, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MaturityScore } from '@app/core/services/user-account/journey.service';

/** Score tier thresholds */
function getScoreTier(score: number): { labelKey: string; cssClass: string } {
  if (score >= 80) return { labelKey: 'maturityDashboard.tierExcellent', cssClass: 'tier-excellent' };
  if (score >= 60) return { labelKey: 'maturityDashboard.tierGood', cssClass: 'tier-good' };
  if (score >= 40) return { labelKey: 'maturityDashboard.tierFair', cssClass: 'tier-fair' };
  if (score >= 20) return { labelKey: 'maturityDashboard.tierDeveloping', cssClass: 'tier-developing' };
  return { labelKey: 'maturityDashboard.tierInitial', cssClass: 'tier-initial' };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-score-gauge',
    imports: [CommonModule, AppDatePipe, AppNumberPipe],
    template: `
    <div class="score-row">
      <!-- Maturity score gauge -->
      <div class="gauge-card">
        <h2 class="section-title">{{ i18n.translate('maturityDashboard.overallScore') }}</h2>
        <div class="gauge-container" role="meter"
             [attr.aria-valuenow]="score.overall"
             aria-valuemin="0" aria-valuemax="100"
             [attr.aria-label]="i18n.translate('maturityDashboard.maturityScoreLabel')">
          <svg class="gauge-svg" viewBox="0 0 200 120">
            <!-- Background arc -->
            <path class="gauge-bg"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none" stroke-width="16" stroke-linecap="round" />
            <!-- Score arc -->
            <path class="gauge-fill"
                  [attr.d]="gaugeArcPath()"
                  [ngClass]="scoreTier.cssClass"
                  fill="none" stroke-width="16" stroke-linecap="round" />
          </svg>
          <div class="gauge-value">
            <span class="gauge-number">{{ score.overall | appNumber:'decimal':'1.0-0' }}</span>
            <span class="gauge-label">/ 100</span>
          </div>
          <div class="gauge-tier" [ngClass]="scoreTier.cssClass">
            {{ i18n.translate(scoreTier.labelKey) }}
          </div>
          <div class="gauge-computed">
            {{ isAr() ? 'آخر حساب:' : 'Computed:' }}
            {{ score.computedAt | appDate:'medium' }}
          </div>
        </div>
      </div>

      <!-- Component breakdown -->
      <div class="breakdown-card">
        <h2 class="section-title">{{ isAr() ? 'تفاصيل المكونات' : 'Component Breakdown' }}</h2>
        <div class="component-list">
          @for (comp of score.components; track comp.name) {
            <div class="component-row">
              <div class="component-info">
                <span class="component-name">{{ isAr() ? comp.nameAr : comp.name }}</span>
                <span class="component-weight">
                  {{ isAr() ? 'الوزن:' : 'Weight:' }} {{ (comp.weight * 100) | appNumber:'decimal':'1.0-0' }}%
                </span>
              </div>
              <div class="component-bar-container">
                <div class="component-bar-track">
                  <div class="component-bar-fill"
                       [style.width.%]="comp.score"
                       [ngClass]="getComponentBarClass(comp.score)"></div>
                </div>
                <span class="component-score">{{ comp.score | appNumber:'decimal':'1.0-0' }}</span>
              </div>
              @if (comp.details) {
                <p class="component-details">{{ comp.details }}</p>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
    styles: [`
    /* -- Score row (gauge + breakdown) -- */
    .score-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-bold);
      color: var(--text-heading);
      margin: 0 0 var(--space-md);
    }

    /* -- Gauge card -- */
    .gauge-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--space-lg);
      text-align: center;
    }

    .gauge-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .gauge-svg { width: 200px; height: 120px; }
    .gauge-bg { stroke: var(--border-subtle); }
    .gauge-fill { transition: stroke-dashoffset 800ms ease; }

    .gauge-fill.tier-excellent { stroke: var(--success); }
    .gauge-fill.tier-good { stroke: var(--success); }
    .gauge-fill.tier-fair { stroke: var(--warning); }
    .gauge-fill.tier-developing { stroke: var(--risk-high); }
    .gauge-fill.tier-initial { stroke: var(--danger); }

    .gauge-value {
      margin-top: -20px;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .gauge-number {
      font-size: var(--font-size-xxl, 36px);
      font-weight: var(--font-black);
      color: var(--text-heading);
    }

    .gauge-label { font-size: var(--font-size-sm); color: var(--text-muted); }

    .gauge-tier {
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      padding: 2px 12px;
      border-radius: var(--radius-lg);
      margin-top: var(--space-xs);
    }

    .gauge-tier.tier-excellent { background: rgba(var(--module-accent-green-rgb), 0.12); color: var(--success); }
    .gauge-tier.tier-good { background: rgba(var(--module-accent-green-rgb), 0.12); color: var(--success); }
    .gauge-tier.tier-fair { background: rgba(var(--module-accent-amber-rgb), 0.12); color: var(--warning); }
    .gauge-tier.tier-developing { background: rgba(var(--module-accent-orange-rgb), 0.12); color: var(--risk-high); }
    .gauge-tier.tier-initial { background: rgba(var(--module-accent-red-rgb), 0.12); color: var(--danger); }

    .gauge-computed {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-top: var(--space-sm);
    }

    /* -- Breakdown card -- */
    .breakdown-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--space-lg);
    }

    .component-list { display: flex; flex-direction: column; gap: var(--space-md); }
    .component-row { display: flex; flex-direction: column; gap: 4px; }
    .component-info { display: flex; justify-content: space-between; align-items: center; }
    .component-name { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-heading); }
    .component-weight { font-size: var(--font-size-xs); color: var(--text-muted); }
    .component-bar-container { display: flex; align-items: center; gap: var(--space-sm); }

    .component-bar-track {
      flex: 1;
      height: 6px;
      background: var(--border-subtle);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }

    .component-bar-fill {
      height: 100%;
      border-radius: var(--radius-xs);
      transition: width 600ms ease;
    }

    .component-bar-fill.bar-high { background: var(--success); }
    .component-bar-fill.bar-mid { background: var(--warning); }
    .component-bar-fill.bar-low { background: var(--danger); }

    .component-score {
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      color: var(--text-heading);
      min-width: 28px;
      text-align: end;
    }

    .component-details { margin: 0; font-size: var(--font-size-xs); color: var(--text-muted); }

    @media (max-width: 768px) {
      .score-row { grid-template-columns: 1fr; }
    }
  `]
})
export class MaturityScoreGaugeComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) score!: MaturityScore;

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  get scoreTier(): { labelKey: string; cssClass: string } {
    return getScoreTier(this.score?.overall ?? 0);
  }

  /** Compute the SVG arc path for the gauge fill */
  gaugeArcPath(): string {
    const score = this.score?.overall ?? 0;
    const clampedScore = Math.max(0, Math.min(100, score));
    if (clampedScore === 0) return 'M 20 100 A 80 80 0 0 1 20 100';

    const angle = (clampedScore / 100) * Math.PI;
    const cx = 100;
    const cy = 100;
    const r = 80;
    const endX = cx - r * Math.cos(angle);
    const endY = cy - r * Math.sin(angle);
    const largeArc = clampedScore > 50 ? 1 : 0;

    return `M 20 100 A 80 80 0 ${largeArc} 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  getComponentBarClass(score: number): string {
    if (score >= 60) return 'bar-high';
    if (score >= 30) return 'bar-mid';
    return 'bar-low';
  }
}
