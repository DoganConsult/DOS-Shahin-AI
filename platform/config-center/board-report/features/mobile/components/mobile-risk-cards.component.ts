import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Shape of a single risk item in the mobile risk list. */
export interface MobileRiskItem {
  id: string;
  title: string;
  titleAr: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string;
  owner: string;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Dumb component: renders the Top Risks list on the mobile dashboard
 * with severity badges and trend indicators.
 */
@Component({
    selector: 'app-mobile-risk-cards',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div class="mob-section-header">
      <span>{{ isRtl() ? 'أعلى المخاطر' : 'Top Risks' }}</span>
      <button class="mob-see-all" (click)="navigate.emit('/risks')">{{ isRtl() ? 'عرض الكل' : 'See All' }}</button>
    </div>

    <div class="mob-risks-list" *ngIf="risks.length > 0">
      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/risks')" class="mob-risk-item" *ngFor="let risk of risks; trackBy: trackById"
           (click)="navigate.emit('/risks')" [class]="'sev-' + risk.severity">
        <div class="mob-risk-left">
          <div class="mob-risk-sev-dot" [class]="'dot-' + risk.severity"></div>
          <div class="mob-risk-info">
            <div class="mob-risk-title">{{ isRtl() ? risk.titleAr : risk.title }}</div>
            <div class="mob-risk-meta">
              <span class="mob-risk-owner">{{ risk.owner }}</span>
              <span class="mob-risk-due">{{ formatDate(risk.dueDate) }}</span>
            </div>
          </div>
        </div>
        <div class="mob-risk-right">
          <span class="mob-sev-badge" [class]="'badge-' + risk.severity">
            {{ isRtl() ? severityLabelAr(risk.severity) : severityLabel(risk.severity) }}
          </span>
          <span class="mob-trend-icon" [class]="'trend-' + risk.trend">
            {{ risk.trend === 'up' ? '&#8593;' : risk.trend === 'down' ? '&#8595;' : '&#8594;' }}
          </span>
        </div>
      </div>
    </div>

    <div class="mob-empty-state" *ngIf="!loading && risks.length === 0">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--color-white-rgb), 0.2)" stroke-width="1.5">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <span>{{ isRtl() ? 'لا توجد مخاطر حرجة' : 'No critical risks' }}</span>
    </div>
  `,
    styles: [`
    .mob-section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px 4px; margin-top: 4px;
    }
    .mob-section-header > span { font-size: var(--font-size-sm); font-weight: 600; color: rgba(var(--color-white-rgb), 0.6); text-transform: uppercase; letter-spacing: 0.05em; }
    .mob-see-all { background: none; border: none; color: var(--primary); font-size: var(--font-size-sm); cursor: pointer; padding: 4px 0; }

    .mob-risks-list { margin: 4px 16px; display: flex; flex-direction: column; gap: 8px; }

    .mob-risk-item {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(var(--color-white-rgb), 0.04); border: 1px solid rgba(var(--color-white-rgb), 0.06);
      border-radius: var(--radius-lg); padding: 12px 14px; cursor: pointer;
      transition: background 0.15s;
    }
    .mob-risk-item:active { background: rgba(var(--color-white-rgb), 0.08); }
    .mob-risk-item.sev-critical { border-color: color-mix(in srgb, var(--hub-risk) 25%, transparent); background: color-mix(in srgb, var(--hub-risk) 4%, transparent); }
    .mob-risk-item.sev-high { border-color: color-mix(in srgb, var(--hub-assessment) 25%, transparent); background: color-mix(in srgb, var(--hub-assessment) 4%, transparent); }

    .mob-risk-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .mob-risk-sev-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex-shrink: 0; }
    .dot-critical { background: var(--error); box-shadow: var(--shadow-glow); }
    .dot-high { background: var(--warning); box-shadow: var(--shadow-glow); }
    .dot-medium { background: var(--severity-medium); }
    .dot-low { background: var(--severity-low); }

    .mob-risk-info { flex: 1; min-width: 0; }
    .mob-risk-title { font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mob-risk-meta { display: flex; gap: 8px; margin-top: 2px; }
    .mob-risk-owner, .mob-risk-due { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.4); }

    .mob-risk-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .mob-sev-badge { font-size: var(--font-size-xs); font-weight: 700; padding: 2px 6px; border-radius: var(--radius-sm); text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-critical { background: color-mix(in srgb, var(--hub-risk) 20%, transparent); color: var(--severity-critical); }
    .badge-high { background: color-mix(in srgb, var(--hub-assessment) 20%, transparent); color: var(--severity-high); }
    .badge-medium { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--severity-medium); }
    .badge-low { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--severity-low); }

    .mob-trend-icon { font-size: var(--font-size-base); font-weight: 700; }
    .trend-up { color: var(--error); }
    .trend-down { color: var(--success); }
    .trend-stable { color: rgba(var(--color-white-rgb), 0.4); }

    .mob-empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; gap: 8px; color: rgba(var(--color-white-rgb), 0.3); font-size: var(--font-size-sm);
    }
  `]
})
export class MobileRiskCardsComponent {
  private readonly i18n = inject(I18nService);

  @Input() risks: MobileRiskItem[] = [];
  @Input() loading = false;

  @Output() navigate = new EventEmitter<string>();

  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');

  trackById(_: number, item: { id: string }): string { return item.id; }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(this.isRtl() ? 'ar-SA' : 'en-GB', { month: 'short', day: 'numeric' });
  }

  severityLabel(s: string): string {
    const map: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    return map[s] ?? s;
  }

  severityLabelAr(s: string): string {
    const map: Record<string, string> = { critical: 'حرج', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' };
    return map[s] ?? s;
  }
}
