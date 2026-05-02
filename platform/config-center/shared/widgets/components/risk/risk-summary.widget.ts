import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DashboardData } from '@app/core/models/grc.models';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-risk-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="risk-bars">
      <div class="bar-row" *ngFor="let item of levels">
        <span class="bar-label">{{ i18n.translate(item.labelKey) }}</span>
        <div class="bar-track">
          <div class="bar-fill" [style.width.%]="item.pct" [style.background]="item.color"></div>
        </div>
        <span class="bar-count">{{ item.count }}</span>
      </div>
    </div>
  `,
  styles: [`
    .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .bar-label { font-size: var(--font-size-xs); width: 64px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    .bar-track {
      flex: 1; height: 12px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .bar-fill { height: 100%; border-radius: var(--radius-sm); transition: width 600ms cubic-bezier(0.4,0,0.2,1); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .bar-count { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); width: 30px; text-align: end; color: var(--text-heading); }
  `],
})
export class RiskSummaryWidget implements OnInit {
  levels: { labelKey: string; count: number; pct: number; color: string }[] = [];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.operationsSvc.getDashboard().subscribe({
      next: (d: DashboardData) => {
        const r = d.summary.risksByLevel;
        const total = r.critical + r.high + r.medium + r.low || 1;
        this.levels = [
          { labelKey: 'dashboard.critical', count: r.critical, pct: (r.critical / total) * 100, color: 'var(--error)' },
          { labelKey: 'dashboard.high', count: r.high, pct: (r.high / total) * 100, color: '#f97316' },
          { labelKey: 'dashboard.medium', count: r.medium, pct: (r.medium / total) * 100, color: '#eab308' },
          { labelKey: 'dashboard.low', count: r.low, pct: (r.low / total) * 100, color: '#22c55e' },
        ];
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
