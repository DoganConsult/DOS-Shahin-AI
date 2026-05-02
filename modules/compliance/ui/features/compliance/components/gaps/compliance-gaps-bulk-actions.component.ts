/**
 * Compliance Gaps Bulk Actions — Dumb sub-component
 * Renders the summary severity cards (critical/high/medium/low/overdue counts)
 * for the compliance gaps page.
 */
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-compliance-gaps-bulk-actions',
    imports: [CommonModule],
    template: `
    <div class="summary-cards">
      <div class="summary-card critical">
        <span class="card-num">{{ criticalCount }}</span>
        <span class="card-label">{{ i18n.translate('common.critical') }}</span>
      </div>
      <div class="summary-card high">
        <span class="card-num">{{ highCount }}</span>
        <span class="card-label">{{ i18n.translate('common.high') }}</span>
      </div>
      <div class="summary-card medium">
        <span class="card-num">{{ mediumCount }}</span>
        <span class="card-label">{{ i18n.translate('common.medium') }}</span>
      </div>
      <div class="summary-card low">
        <span class="card-num">{{ lowCount }}</span>
        <span class="card-label">{{ i18n.translate('common.low') }}</span>
      </div>
      <div class="summary-card overdue">
        <span class="card-num">{{ overdueCount }}</span>
        <span class="card-label">{{ i18n.translate('common.overdue') }}</span>
      </div>
    </div>
  `,
    styles: [`
    .summary-cards { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-card { flex: 1; min-width: 100px; padding: 12px 16px; border-radius: var(--radius); text-align: center; }
    .summary-card .card-num { display: block; font-size: var(--font-size-2xl); font-weight: 700; }
    .summary-card .card-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: .5px; }
    .summary-card.critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .summary-card.high { background: var(--status-warning-bg, #fcf4d6); color: #9a3412; }
    .summary-card.medium { background: #fefce8; color: #854d0e; }
    .summary-card.low { background: var(--status-success-bg, #defbe6); color: #166534; }
    .summary-card.overdue { background: var(--status-danger-bg, #fff1f1); color: #b91c1c; border: 1px dashed #fca5a5; }
  `]
})
export class ComplianceGapsBulkActionsComponent {
  readonly i18n = inject(I18nService);

  @Input() criticalCount = 0;
  @Input() highCount = 0;
  @Input() mediumCount = 0;
  @Input() lowCount = 0;
  @Input() overdueCount = 0;
}
