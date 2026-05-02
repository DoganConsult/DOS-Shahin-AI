/**
 * PainPointCardComponent — Dumb presentational component
 * Renders a single pain point card with icon, mini-chart, severity badge,
 * title, description, proof, impact, module pills, and action buttons.
 * Parent: PainPointsSectionComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import type { EChartsOption } from 'echarts';

/** Pain point data structure */
export interface PainPoint {
  id: string;
  icon: string;
  color: string;
  level: 'HIGH' | 'MED' | 'LOW';
  selected?: boolean;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  proofAr: string;
  proofEn: string;
  impactAr: string;
  impactEn: string;
  modules: string[];
}

@Component({
  selector: 'app-pain-point-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, AppEchartComponent],
  template: `
    <article class="pp-card" [class.pp-card--selected]="point.selected" tabindex="0" role="group"
             [attr.aria-label]="i18n.localize(point.titleEn, point.titleAr)"
             (keyup.enter)="toggled.emit(point.id)" (keyup.space)="toggled.emit(point.id)">

      <!-- Top: Icon + Mini Viz + Severity -->
      <div class="card-visual" [style.background]="alpha(point.color, 0.05)">
        <div class="vis-row">
          <div class="card-icon-box" [style.background]="alpha(point.color, 0.14)" [style.color]="point.color">
            <i class="pi" [ngClass]="normalizeIcon(point.icon)"></i>
          </div>
          <div class="mini-viz">
            <app-echart [options]="chartOptions" [ariaLabel]="i18n.localize(point.titleEn, point.titleAr)" />
          </div>
        </div>
        <div class="vis-footer">
          <span class="sev-badge" [attr.data-level]="point.level">
            <span class="sev-dot" [attr.data-level]="point.level"></span>
            {{ point.level === 'HIGH' ? i18n.translate('landing.painPoints.severityHigh') : point.level === 'MED' ? i18n.translate('landing.painPoints.severityMedium') : i18n.translate('landing.painPoints.severityLow') }}
          </span>
        </div>
      </div>

      <!-- Title + Desc -->
      <div class="card-body">
        <h3>{{ i18n.localize(point.titleEn, point.titleAr) }}</h3>
        <p class="card-desc">{{ i18n.localize(point.descEn, point.descAr) }}</p>
      </div>

      <!-- Proof -->
      @if (i18n.localize(point.proofEn, point.proofAr)) {
        <div class="card-block">
          <div class="block-icon">
            <svg class="signal-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M8.5 16c-1-1.1-1.7-2.5-1.7-4s.7-2.9 1.7-4"/>
              <path d="M15.5 8c1 1.1 1.7 2.5 1.7 4s-.7 2.9-1.7 4"/>
              <path d="M5.8 19c-1.8-2-2.8-4.4-2.8-7s1-5 2.8-7"/>
              <path d="M18.2 5c1.8 2 2.8 4.4 2.8 7s-1 5-2.8 7"/>
            </svg>
          </div>
          <div class="block-content">
            <div class="block-label">
              <svg class="signal-label-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                   viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2a10 10 0 0 1 0 20" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/>
                <path d="M12 6a6 6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" opacity=".7"/>
              </svg>
              {{ i18n.translate('landing.painPoints.askYourself') }}
            </div>
            <div class="block-value">{{ i18n.localize(point.proofEn, point.proofAr) }}</div>
          </div>
        </div>
      }

      <!-- Impact -->
      @if (i18n.localize(point.impactEn, point.impactAr)) {
        <div class="card-block card-block--impact">
          <div class="block-icon"><i class="pi pi-bolt"></i></div>
          <div class="block-content">
            <div class="block-label">{{ i18n.translate('landing.painPoints.impact') }}</div>
            <div class="block-value">{{ i18n.localize(point.impactEn, point.impactAr) }}</div>
          </div>
        </div>
      }

      <!-- Module pills -->
      @if (point.modules.length) {
        <div class="card-modules">
          @for (m of point.modules; track m) {
            <span class="mod-pill" [style.border-color]="alpha(point.color, 0.25)" [style.color]="point.color">{{ m }}</span>
          }
        </div>
      }

      <!-- Actions -->
      <div class="card-actions">
        <p-button [label]="i18n.translate('landing.painPoints.seeSolution')" icon="pi pi-eye"
                  [outlined]="true" severity="secondary" styleClass="p-button-sm"
                  (onClick)="solutionRequested.emit()" />
        <p-button [label]="point.selected ? i18n.translate('landing.painPoints.selectedCheck') : i18n.translate('landing.painPoints.select')"
                  [icon]="point.selected ? 'pi pi-check' : 'pi pi-plus'"
                  [severity]="point.selected ? 'success' : 'info'" styleClass="p-button-sm"
                  (onClick)="toggled.emit(point.id)" />
      </div>
    </article>
  `,
  styles: [`
    .pp-card {
      border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface);
      display: flex; flex-direction: column; overflow: hidden;
      transition: all var(--duration-moderate-02) var(--ease-productive-standard);
    }
    .pp-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); border-color: var(--border-primary); }
    .pp-card--selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-lightest), var(--shadow-card); }

    .card-visual { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-subtle); }
    .vis-row { display: flex; align-items: center; gap: var(--space-md); }
    .card-icon-box {
      width: 44px; height: 44px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xl); flex-shrink: 0; transition: transform var(--duration-moderate-01) var(--ease-productive-standard);
    }
    .pp-card:hover .card-icon-box { transform: scale(1.1); }
    .mini-viz { flex: 1; height: 80px; min-width: 0; opacity: 0.85; transition: opacity var(--duration-moderate-01); }
    .pp-card:hover .mini-viz { opacity: 1; }
    .vis-footer { display: flex; align-items: center; margin-top: var(--space-sm); }

    .sev-badge {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: var(--radius-pill);
      font-size: var(--font-size-xs); font-weight: var(--font-black); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase;
    }
    .sev-dot { width: 7px; height: 7px; border-radius: var(--radius-pill); }
    .sev-badge[data-level="HIGH"] { background: var(--carbon-tag-red-bg); color: var(--carbon-tag-red-text); }
    .sev-badge[data-level="MED"]  { background: var(--surface-amber); color: var(--carbon-orange-60); }
    .sev-badge[data-level="LOW"]  { background: var(--carbon-tag-green-bg); color: var(--carbon-tag-green-text); }
    .sev-dot[data-level="HIGH"] { background: var(--carbon-red-50); }
    .sev-dot[data-level="MED"]  { background: var(--carbon-yellow-30); }
    .sev-dot[data-level="LOW"]  { background: var(--carbon-green-40); }

    .card-body { padding: var(--space-md) var(--space-lg) 0; }
    .card-body h3 { margin: 0; font-size: var(--font-size-md); font-weight: var(--font-black); line-height: var(--line-height-normal); color: var(--text-heading); }
    .card-desc { margin: var(--space-xs) 0 0; font-size: var(--font-size-base); line-height: var(--line-height-relaxed); color: var(--text-muted); }

    .card-block {
      display: flex; gap: var(--space-sm); margin: 0 var(--space-lg); padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius); border: 1px solid var(--border-subtle); background: var(--surface-ice);
    }
    .card-block:first-of-type { margin-top: var(--space-md); }
    .card-block + .card-block { margin-top: var(--space-xs); }
    .block-icon { flex-shrink: 0; width: 20px; padding-top: 1px; color: var(--text-muted); font-size: var(--font-size-sm); }
    .block-content { flex: 1; min-width: 0; }
    .block-label {
      display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); font-weight: var(--font-black);
      color: var(--text-heading); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;
    }
    .signal-icon { display: block; color: var(--primary); opacity: 0.85; transition: opacity var(--duration-moderate-01); }
    .pp-card:hover .signal-icon { opacity: 1; }
    .signal-label-icon { color: var(--primary); flex-shrink: 0; }
    .block-value { font-size: var(--font-size-sm); line-height: var(--line-height-relaxed); color: var(--text-muted); }

    .card-modules { display: flex; flex-wrap: wrap; gap: var(--space-xs); padding: 0 var(--space-lg); margin-top: var(--space-md); }
    .mod-pill { font-size: var(--font-size-xs); font-weight: var(--font-bold); padding: 3px 8px; border-radius: var(--radius-pill); border: 1px solid; background: var(--surface); }

    .card-actions { display: flex; gap: var(--space-sm); padding: var(--space-md) var(--space-lg); margin-top: auto; flex-wrap: wrap; }
  `],
})
export class PainPointCardComponent {
  i18n = inject(I18nService);

  @Input() point!: PainPoint;
  @Input() chartOptions!: EChartsOption;

  @Output() toggled = new EventEmitter<string>();
  @Output() solutionRequested = new EventEmitter<void>();

  /** Ensure icon always has 'pi' base class */
  normalizeIcon(icon: string): string {
    if (!icon) return 'pi pi-info-circle';
    if (icon.startsWith('pi pi-')) return icon;
    if (icon.startsWith('pi-')) return 'pi ' + icon;
    return 'pi ' + icon;
  }

  /** Create rgba from hex */
  alpha(hex: string, a: number): string {
    if (!hex || !hex.startsWith('#')) return `rgba(var(--module-accent-indigo-rgb), ${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
}
