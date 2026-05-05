/**
 * Foundation KPI card grid component.
 *
 * Replaces @app/shared/components/status-indicators/kpi-card-grid.component.
 * Uses dos-metric-card from @dos/ui-system (thin IBM Carbon tile wrapper).
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KpiCardVM } from '../shared/foundation-types';

@Component({
  selector: 'foundation-kpi-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="fkpi-grid" [attr.dir]="dir">
      @for (card of cards; track card.id) {
        <a class="fkpi-tile"
           [routerLink]="card.route"
           [queryParams]="card.queryParams ?? {}"
           [style.--tile-color]="card.color"
           [style.--tile-bg]="card.bg"
           [class.fkpi-tile--danger]="card.severity === 'danger'"
           [class.fkpi-tile--warning]="card.severity === 'warning'"
           [class.fkpi-tile--success]="card.severity === 'success'">
          <span class="fkpi-tile__icon" aria-hidden="true">{{ card.icon }}</span>
          <span class="fkpi-tile__value">{{ card.value }}</span>
          <span class="fkpi-tile__label">{{ dir === 'rtl' ? card.labelAr : card.labelEn }}</span>
          @if (card.trend !== undefined && card.trend !== null) {
            <span class="fkpi-tile__trend"
                  [class.fkpi-tile__trend--up]="card.trend > 0"
                  [class.fkpi-tile__trend--down]="card.trend < 0">
              {{ card.trend > 0 ? '↑' : card.trend < 0 ? '↓' : '—' }}
              {{ card.trend !== 0 ? (card.trend | number:'1.0-1') + (card.unit ?? '%') : '' }}
            </span>
          }
        </a>
      }
    </div>
  `,
  styles: [`
    .fkpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--cds-spacing-05, 16px);
    }
    .fkpi-tile {
      display: flex; flex-direction: column; align-items: flex-start;
      padding: var(--cds-spacing-05, 16px);
      border: 1px solid var(--cds-border-subtle-01, #c6c6c6);
      border-radius: 4px;
      background: var(--cds-layer-02, #fff);
      text-decoration: none;
      color: inherit;
      transition: box-shadow .15s ease;
    }
    .fkpi-tile:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,.12);
      border-color: var(--cds-interactive, #0f62fe);
    }
    .fkpi-tile--danger  { border-inline-start: 3px solid var(--cds-support-error, #da1e28); }
    .fkpi-tile--warning { border-inline-start: 3px solid var(--cds-support-warning, #f1c21b); }
    .fkpi-tile--success { border-inline-start: 3px solid var(--cds-support-success, #24a148); }
    .fkpi-tile__icon  { font-size: 1.25rem; margin-bottom: var(--cds-spacing-02, 4px); }
    .fkpi-tile__value { font-size: 1.75rem; font-weight: 700; line-height: 1; color: var(--cds-text-primary, #161616); }
    .fkpi-tile__label { font-size: .75rem; color: var(--cds-text-secondary, #525252); margin-top: var(--cds-spacing-02, 4px); }
    .fkpi-tile__trend { font-size: .7rem; margin-top: var(--cds-spacing-01, 2px); }
    .fkpi-tile__trend--up   { color: var(--cds-support-success, #24a148); }
    .fkpi-tile__trend--down { color: var(--cds-support-error, #da1e28); }
  `],
})
export class FoundationKpiGridComponent {
  @Input() cards: KpiCardVM[] = [];
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Output() cardClicked = new EventEmitter<KpiCardVM>();
}
