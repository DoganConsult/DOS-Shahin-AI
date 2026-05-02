import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardVM } from '../../models/module-overview.vm';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-kpi-card-grid',
    imports: [CommonModule],
    template: `
    <div class="kpi-grid" role="list" [attr.aria-label]="isAr ? 'مؤشرات الأداء الرئيسية' : 'Key performance indicators'">
      @for (card of cards; track card.id) {
        <div
          class="kpi-card"
          role="listitem"
          [class.kpi-card--clickable]="!!card.route"
          [class.kpi-card--danger]="card.severity === 'danger'"
          [class.kpi-card--warning]="card.severity === 'warning'"
          [class.kpi-card--success]="card.severity === 'success'"
          [class.kpi-card--default]="card.severity === 'default'"
          [attr.tabindex]="card.route ? 0 : null"
          [attr.aria-label]="(isAr ? card.labelAr : card.labelEn) + ': ' + card.value"
          (click)="card.route && cardClick.emit(card)"
          (keyup.enter)="card.route && cardClick.emit(card)">
          <div class="kpi-icon" [style.background]="card.bg" [style.color]="card.color">
            <i [class]="'pi pi-' + card.icon" aria-hidden="true"></i>
          </div>
          <div class="kpi-body">
            <span class="kpi-value" [style.color]="card.color">{{ card.value }}</span>
            <span class="kpi-label">{{ isAr ? card.labelAr : card.labelEn }}</span>
            <span class="kpi-trend" *ngIf="card.trend !== undefined && card.trend !== null"
              [class.trend-up]="card.trend! > 0"
              [class.trend-down]="card.trend! < 0">
              <i [class]="card.trend! >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" aria-hidden="true"></i>
              {{ card.trend! > 0 ? '+' : '' }}{{ card.trend }}%
            </span>
            <svg *ngIf="card.sparklinePoints?.length"
                 class="kpi-sparkline"
                 [attr.width]="60" [attr.height]="20"
                 viewBox="0 0 60 20" preserveAspectRatio="none"
                 aria-hidden="true">
              <polyline
                [attr.points]="buildSparkline(card.sparklinePoints!)"
                fill="none"
                [attr.stroke]="card.color"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
          <i class="pi pi-chevron-right kpi-drill" aria-hidden="true" *ngIf="card.route"></i>
        </div>
      }
    </div>
  `,
    styles: [`
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 16px;
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-lg);
      transition: box-shadow 0.15s, transform 0.12s, border-color 0.15s;
      position: relative;
      outline: none;
      border-inline-start: 3px solid transparent;
    }

    .kpi-card--clickable {
      cursor: pointer;
    }
    .kpi-card--clickable:hover {
      box-shadow: 0 2px 10px rgba(var(--color-black-rgb), 0.07);
      transform: translateY(-1px);
      border-color: var(--primary-200, #bfdbfe);
    }
    .kpi-card--clickable:focus-visible {
      box-shadow: 0 0 0 3px var(--primary-200, #bfdbfe);
      border-color: var(--primary-400, #60a5fa);
    }

    .kpi-card--danger  { border-inline-start-color: var(--error); }
    .kpi-card--warning { border-inline-start-color: var(--warning); }
    .kpi-card--success { border-inline-start-color: var(--success); }
    .kpi-card--default { border-inline-start-color: var(--text-muted); }

    .kpi-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: var(--font-size-base);
    }

    .kpi-body {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .kpi-value {
      font-size: var(--font-size-2xl);
      font-weight: 800;
      line-height: 1.2;
    }

    .kpi-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted, var(--text-muted));
      font-weight: 600;
      margin-top: 3px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .kpi-trend {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      margin-top: 4px;
    }
    .trend-up   { color: var(--success); }
    .trend-down { color: var(--error); }

    .kpi-sparkline {
      display: block;
      margin-top: 4px;
      opacity: 0.7;
      transition: opacity 0.15s;
    }
    .kpi-card:hover .kpi-sparkline { opacity: 1; }

    .kpi-drill {
      font-size: var(--font-size-xs);
      color: var(--text-muted, var(--text-muted));
      flex-shrink: 0;
      transition: transform 0.12s;
    }
    .kpi-card--clickable:hover .kpi-drill { transform: translateX(2px); }
    [dir="rtl"] .kpi-card--clickable:hover .kpi-drill { transform: translateX(-2px); }
    [dir="rtl"] .kpi-drill { transform: scaleX(-1); }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .kpi-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class KpiCardGridComponent {
  @Input() cards: KpiCardVM[] = [];
  @Input() isAr = false;
  @Output() cardClick = new EventEmitter<KpiCardVM>();

  /** Convert an array of values into an SVG polyline points string (60x20 viewBox). */
  buildSparkline(points: number[]): string {
    if (!points || points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = 60 / (points.length - 1);
    return points.map((v, i) => {
      const x = (i * stepX).toFixed(1);
      const y = (18 - ((v - min) / range) * 16 + 1).toFixed(1); // 1px top/bottom padding
      return `${x},${y}`;
    }).join(' ');
  }
}
