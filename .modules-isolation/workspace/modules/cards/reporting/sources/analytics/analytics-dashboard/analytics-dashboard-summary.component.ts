import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnobModule } from 'primeng/knob';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';

const ANALYTICS_SUMMARY_STYLES = `
  .gauge-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px; }
  .gauge-card { display: flex; flex-direction: column; align-items: center; gap: 10px; background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px 12px 14px; border: 1px solid var(--surface-border, var(--border-subtle)); transition: box-shadow .2s; }
  .gauge-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
  .gauge-meta { text-align: center; }
  .gauge-label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: .04em; }
  .gauge-trend { display: inline-flex; align-items: center; gap: 3px; font-size: var(--font-size-xs); font-weight: 700; margin-top: 4px; }
  .gauge-trend.positive { color: var(--success); }
  .gauge-trend.negative { color: var(--error); }
  .quick-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; padding: 14px 18px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
  .qs-chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; background: var(--surface-card, #fff); border-radius: var(--radius-xl); border: 1px solid var(--surface-border, var(--border-subtle)); font-size: var(--font-size-sm); }
  .qs-value { font-weight: 800; color: var(--text-color, var(--text-heading)); }
  .qs-label { color: var(--text-color-secondary, var(--text-muted)); font-size: var(--font-size-sm); }
  .maturity-banner { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-radius: var(--radius-lg); margin-bottom: 20px; border: 1px solid var(--surface-border, var(--border-subtle)); background: linear-gradient(135deg, var(--status-success-bg, #defbe6) 0%, #ecfdf5 100%); }
  .maturity-initial { background: linear-gradient(135deg, var(--status-danger-bg, #fff1f1) 0%, var(--status-danger-bg, #fff1f1) 100%); }
  .maturity-developing { background: linear-gradient(135deg, #fffbeb 0%, #fefce8 100%); }
  .maturity-defined { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
  .maturity-managed { background: linear-gradient(135deg, var(--status-success-bg, #defbe6) 0%, #dcfce7 100%); }
  .maturity-optimized { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); }
  .mb-left { display: flex; align-items: center; gap: 14px; }
  .mb-level-badge { padding: 8px 18px; border-radius: var(--radius); font-weight: 800; font-size: var(--font-size-base); background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); color: var(--text-color, var(--text-heading)); text-transform: uppercase; }
  .mb-info { display: flex; flex-direction: column; }
  .mb-title { font-weight: 700; font-size: var(--font-size-base); color: var(--text-color, var(--text-heading)); }
  .mb-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
  .mb-right { text-align: end; }
  .mb-agg-value { display: block; font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-color, var(--text-heading)); }
  .mb-agg-label { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: .04em; }
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics-dashboard-summary',
  standalone: true,
  imports: [CommonModule, KnobModule],
  styles: [ANALYTICS_SUMMARY_STYLES],
  template: `
    <div class="gauge-strip">
      @for (g of gauges; track g.key) {
        <div class="gauge-card" [class]="'gauge-' + g.severity">
          <p-knob [ngModel]="g.value" [readonly]="true" [size]="96" [strokeWidth]="8"
            [valueColor]="g.knobColor" textColor="var(--text-heading, #1e293b)"
            [valueTemplate]="g.template" />
          <div class="gauge-meta">
            <span class="gauge-label">{{ i18n.translate('analytics.gauge.' + g.key) }}</span>
            <span class="gauge-trend" [class.positive]="g.trend >= 0" [class.negative]="g.trend < 0">
              <i class="pi" [ngClass]="g.trend >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
              {{ g.trendDisplay }}
            </span>
          </div>
        </div>
      }
    </div>

    <div class="quick-stats">
      @for (s of quickStats; track s.label) {
        <div class="qs-chip">
          <i class="pi" [ngClass]="'pi-' + s.icon" [style.color]="s.color"></i>
          <span class="qs-value">{{ s.value }}</span>
          <span class="qs-label">{{ i18n.translate('analytics.stat.' + s.key) }}</span>
        </div>
      }
    </div>

    @if (maturityData) {
      <div class="maturity-banner" [class]="'maturity-' + maturityData.levelClass">
        <div class="mb-left">
          <div class="mb-level-badge">{{ maturityData.level }}</div>
          <div class="mb-info">
            <span class="mb-title">{{ i18n.translate('analytics.maturityLevel') }}</span>
            <span class="mb-desc">{{ i18n.localize(maturityData.descEn, maturityData.descAr) }}</span>
          </div>
        </div>
        <div class="mb-right">
          <div class="mb-aggregate">
            <span class="mb-agg-value">{{ maturityData.aggregate }}%</span>
            <span class="mb-agg-label">{{ i18n.translate('analytics.aggregateScore') }}</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class AnalyticsDashboardSummaryComponent {
  protected readonly i18n = inject(I18nService);

  @Input() gauges: Array<Record<string, any>> = [];
  @Input() quickStats: Array<Record<string, any>> = [];
  @Input() maturityData: Record<string, any> | null = null;
}