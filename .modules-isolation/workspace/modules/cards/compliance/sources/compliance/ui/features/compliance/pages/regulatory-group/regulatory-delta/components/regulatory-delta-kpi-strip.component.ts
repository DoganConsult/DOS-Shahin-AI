import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PlaceholderModule } from 'carbon-components-angular';

/**
 * Dumb component: renders the four KPI cards at the top of the
 * Regulatory Delta Dashboard (total deltas, critical impacts,
 * pending resolution, last scan date).
 */
@Component({
    selector: 'app-regulatory-delta-kpi-strip',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, PlaceholderModule],
    template: `
    <div class="rd-kpi-strip">
      @if (loading) {
        @for (i of [1,2,3,4]; track i) {
          <div class="rd-kpi-card">
            <cds-placeholder></cds-placeholder>
            <cds-placeholder></cds-placeholder>
          </div>
        }
      } @else {
        <div class="rd-kpi-card">
          <span class="rd-kpi-value">{{ totalDeltas }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.totalDeltas') || 'Total Deltas' }}</span>
        </div>
        <div class="rd-kpi-card rd-kpi-critical">
          <span class="rd-kpi-value">{{ criticalImpacts }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.criticalImpacts') || 'Critical Impacts' }}</span>
        </div>
        <div class="rd-kpi-card rd-kpi-pending">
          <span class="rd-kpi-value">{{ pendingResolution }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.pendingResolution') || 'Pending Resolution' }}</span>
        </div>
        <div class="rd-kpi-card">
          <span class="rd-kpi-value rd-kpi-date">{{ lastScanDisplay }}</span>
          <span class="rd-kpi-label">{{ i18n.translate('regulatoryDelta.kpi.lastScan') || 'Last Scan Date' }}</span>
        </div>
      }
    </div>
  `,
    styles: [`
    .rd-kpi-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .rd-kpi-card {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 20px 16px; border: 1px solid var(--border-subtle, #e2e8f0);
      transition: box-shadow 0.2s;
    }
    .rd-kpi-card:hover { box-shadow: 0 4px 20px rgba(var(--color-black-rgb), 0.06); }
    .rd-kpi-value {
      font-size: var(--font-size-4xl); font-weight: 800;
      color: var(--text-heading, #1e293b);
    }
    .rd-kpi-date { font-size: var(--font-size-md); }
    .rd-kpi-label {
      font-size: var(--font-size-caption); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-color-secondary, #64748b);
    }
    .rd-kpi-critical .rd-kpi-value { color: #dc2626; }
    .rd-kpi-pending .rd-kpi-value { color: #f59e0b; }

    @media (max-width: 768px) {
      .rd-kpi-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class RegulatoryDeltaKpiStripComponent {
  readonly i18n = inject(I18nService);

  @Input() loading = false;
  @Input() totalDeltas = 0;
  @Input() criticalImpacts = 0;
  @Input() pendingResolution = 0;
  @Input() lastScanDisplay = '--';
}
