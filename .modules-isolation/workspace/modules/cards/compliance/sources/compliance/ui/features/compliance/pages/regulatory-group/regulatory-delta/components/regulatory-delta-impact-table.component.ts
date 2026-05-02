import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { ButtonModule, PlaceholderModule, TagModule } from 'carbon-components-angular';

/** Shape of a single delta impact assessment. */
export interface DeltaImpact {
  impactId: string;
  deltaId: string;
  instrumentName: string;
  controlId: string;
  controlTitle: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  status: string;
  resolvedAt: string | null;
}

/** Shape of a grouped impact section for rendering. */
export interface ImpactGroup {
  level: DeltaImpact['impactLevel'];
  label: string;
  severity: 'danger' | 'warning' | 'info' | 'success';
  impacts: DeltaImpact[];
}

/**
 * Dumb component: renders the Impact Assessment section with
 * grouped impact cards by severity level and resolve actions.
 */
@Component({
    selector: 'app-regulatory-delta-impact-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, TagModule, PlaceholderModule, AppDatePipe],
    template: `
    <div class="rd-section">
      <h2 class="rd-section-title">
        <i class=""></i>
        {{ i18n.translate('regulatoryDelta.impactAssessment') || 'Impact Assessment' }}
      </h2>

      @if (loading) {
        <div class="rd-impact-grid">
          @for (i of [1,2,3]; track i) {
            <div class="rd-impact-card">
              <cds-placeholder></cds-placeholder>
            </div>
          }
        </div>
      } @else if (impactGroups.length === 0) {
        <div class="rd-empty-state">
          <i class=""></i>
          <p>{{ i18n.translate('regulatoryDelta.noImpacts') || 'No impact assessments available. Impacts are generated after scanning for regulatory deltas.' }}</p>
        </div>
      } @else {
        @for (group of impactGroups; track group.level) {
          <div class="rd-impact-section">
            <h3 class="rd-impact-level-header">
              <cds-tag [value]="group.label" [severity]="group.severity" />
              <span class="rd-impact-count">({{ group.impacts.length }})</span>
            </h3>
            <div class="rd-impact-grid">
              @for (impact of group.impacts; track impact.impactId) {
                <div class="rd-impact-card" [class]="'rd-impact-' + impact.impactLevel">
                  <div class="rd-impact-card-header">
                    <span class="rd-impact-control-title">{{ impact.controlTitle }}</span>
                    <cds-tag
                      [value]="impact.impactLevel | titlecase"
                      [severity]="impactSeverity(impact.impactLevel)"
                      [rounded]="true" />
                  </div>
                  <div class="rd-impact-instrument">
                    <i class=""></i>
                    {{ impact.instrumentName }}
                  </div>
                  <p class="rd-impact-recommendation">{{ impact.recommendation }}</p>
                  <div class="rd-impact-card-footer">
                    <span class="rd-impact-status" [class]="'rd-status-' + impact.status">
                      <i class="pi" [ngClass]="impact.status === 'resolved' ? 'pi-check-circle' : 'pi-clock'"></i>
                      {{ impact.status === 'resolved'
                        ? (i18n.translate('regulatoryDelta.resolved') || 'Resolved')
                        : (i18n.translate('regulatoryDelta.pending') || 'Pending') }}
                    </span>
                    @if (impact.status !== 'resolved') {
                      <button cdsButton
                        [label]="i18n.translate('regulatoryDelta.resolve') || 'Resolve'"
                        icon=""
                        class="  "
                        (click)="resolve.emit(impact)"
                        [loading]="resolvingId === impact.impactId">
                      </button>
                    } @else {
                      <span class="rd-resolved-date">{{ impact.resolvedAt | appDate:'medium' }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
    styles: [`
    .rd-section { margin-bottom: 32px; }
    .rd-section-title {
      display: flex; align-items: center; gap: 10px;
      font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading, #1e293b);
      margin: 0 0 16px 0; padding-bottom: 12px;
      border-bottom: 2px solid var(--border-subtle, #e2e8f0);
    }
    .rd-section-title i { font-size: var(--font-size-body-md); color: var(--primary, #3b82f6); }

    .rd-impact-section { margin-bottom: 20px; }
    .rd-impact-level-header {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 12px 0; font-size: var(--font-size-md); font-weight: 600;
    }
    .rd-impact-count { font-size: var(--font-size-tag); color: var(--text-color-secondary, #64748b); }
    .rd-impact-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }
    .rd-impact-card {
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 18px; border: 1px solid var(--border-subtle, #e2e8f0);
      transition: box-shadow 0.2s; display: flex; flex-direction: column; gap: 10px;
    }
    .rd-impact-card:hover { box-shadow: 0 4px 20px rgba(var(--color-black-rgb), 0.06); }
    .rd-impact-critical { border-left: 4px solid #dc2626; }
    .rd-impact-high { border-left: 4px solid #f97316; }
    .rd-impact-medium { border-left: 4px solid #f59e0b; }
    .rd-impact-low { border-left: 4px solid #22c55e; }
    .rd-impact-card-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
    }
    .rd-impact-control-title {
      font-size: var(--font-size-body-sm); font-weight: 700; color: var(--text-heading, #1e293b); flex: 1;
    }
    .rd-impact-instrument {
      display: flex; align-items: center; gap: 6px;
      font-size: var(--font-size-caption); color: var(--text-color-secondary, #64748b);
    }
    .rd-impact-instrument i { font-size: var(--font-size-sm); }
    .rd-impact-recommendation {
      font-size: var(--font-size-tag); color: var(--text-color-secondary, #475569);
      line-height: 1.5; margin: 0;
      background: var(--surface-ground, var(--surface-ice, #f8fafc));
      padding: 10px 12px; border-radius: var(--radius-md, 8px);
    }
    .rd-impact-card-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 8px; border-top: 1px solid var(--border-subtle, #f1f5f9);
    }
    .rd-impact-status {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: var(--font-size-caption); font-weight: 600;
    }
    .rd-status-pending { color: #f59e0b; }
    .rd-status-resolved { color: #16a34a; }
    .rd-resolved-date { font-size: var(--font-size-sm); color: var(--text-color-secondary, #94a3b8); }

    .rd-empty-state {
      text-align: center; padding: 48px 24px;
      color: var(--text-color-secondary, #94a3b8);
    }
    .rd-empty-state i { font-size: var(--font-size-6xl); opacity: 0.2; display: block; margin-bottom: 12px; }
    .rd-empty-state p { font-size: var(--font-size-body-sm); margin: 0; }

    @media (max-width: 768px) {
      .rd-impact-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class RegulatoryDeltaImpactTableComponent {
  readonly i18n = inject(I18nService);

  @Input() loading = false;
  @Input() impactGroups: ImpactGroup[] = [];
  @Input() resolvingId: string | null = null;

  @Output() resolve = new EventEmitter<DeltaImpact>();

  /** Maps impact level to PrimeNG tag severity. */
  impactSeverity(level: string): 'danger' | 'warning' | 'info' | 'success' {
    switch (level) {
      case 'critical': return 'danger';
      case 'high':     return 'warning';
      case 'medium':   return 'info';
      case 'low':      return 'success';
      default:         return 'info';
    }
  }
}
