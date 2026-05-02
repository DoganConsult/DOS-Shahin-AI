import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/**
 * Presentational component: a compact KPI strip used by the risk register
 * to show total, critical, high, overdue, and no-owner counts.
 * This is an alias/wrapper for risk-register-health-strip that can be
 * used in contexts where only display is needed (no filter events).
 *
 * Note: For filter-capable health strips, use RiskRegisterHealthStripComponent instead.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-register-kpi-strip',
    imports: [CommonModule],
    template: `
    <div class="kpi-strip">
      <div class="kpi-card">
        <div class="kpi-value">{{ total }}</div>
        <div class="kpi-label">{{ labels.totalRisks }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--error)">{{ critical }}</div>
        <div class="kpi-label">{{ labels.criticalLabel }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--warning)">{{ high }}</div>
        <div class="kpi-label">{{ labels.highLabel }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--warning)">{{ overdueTreatments }}</div>
        <div class="kpi-label">{{ labels.overdueTreat }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:var(--text-muted)">{{ noOwner }}</div>
        <div class="kpi-label">{{ labels.noOwner }}</div>
      </div>
    </div>
  `,
    styles: [`
    .kpi-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .kpi-card { flex: 1; min-width: 100px; text-align: center; padding: 12px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
  `]
})
export class RiskRegisterKpiStripComponent {
  public i18n = inject(I18nService);

  /** KPI values */
  @Input() total = 0;
  @Input() critical = 0;
  @Input() high = 0;
  @Input() overdueTreatments = 0;
  @Input() noOwner = 0;

  /** Localized label bag */
  @Input() labels: { totalRisks: string; criticalLabel: string; highLabel: string; overdueTreat: string; noOwner: string } = {
    totalRisks: 'Total Risks', criticalLabel: 'Critical', highLabel: 'High', overdueTreat: 'Overdue Treat.', noOwner: 'No Owner',
  };
}
