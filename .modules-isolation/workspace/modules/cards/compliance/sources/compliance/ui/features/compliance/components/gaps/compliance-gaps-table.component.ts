/**
 * Compliance Gaps Table — Dumb sub-component
 * Renders the gaps data table with severity/status badges and overdue highlighting.
 * Emits row click events to the parent for detail drawer opening.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceGapDto } from '../../models/compliance.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-compliance-gaps-table',
    imports: [CommonModule],
    template: `
    @if (loading) {
      <div class="loading-state" aria-live="polite"><i class=" pi-spinner"></i> {{ i18n.translate('common.loading') }}</div>
    }

    @if (!loading && loadError) {
      <div class="load-error-banner" role="alert">
        <i class=""></i>
        <span>{{ loadError }}</span>
        <button type="button" class="retry-btn" (click)="retry.emit()">{{ i18n.translate('common.retry') }}</button>
      </div>
    }

    @if (!loading && !loadError && gaps.length === 0) {
      <div class="empty-state"><i class=""></i><p>{{ i18n.translate('common.noGapsFound') }}</p></div>
    }

    @if (!loading && !loadError && gaps.length > 0) {
      <div class="table-wrap">
        <table aria-label="Data Table table" class="data-table">
          <thead>
            <tr>
              <th>{{ i18n.translate('common.gap') }}</th>
              <th>{{ i18n.translate('common.framework') }}</th>
              <th>{{ i18n.translate('common.domain') }}</th>
              <th>{{ i18n.translate('common.severity') }}</th>
              <th>{{ i18n.translate('common.owner') }}</th>
              <th>{{ i18n.translate('common.dueDate') }}</th>
              <th>{{ i18n.translate('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (g of gaps; track g.gapId) {
              <tr tabindex="0" role="button" (keyup.enter)="rowClick.emit(g)" (click)="rowClick.emit(g)" class="clickable-row" [class.overdue-row]="isOverdue(g)">
                <td class="title-cell">{{ g.title }}</td>
                <td>{{ g.frameworkName }}</td>
                <td>{{ g.domainName }}</td>
                <td><span class="severity-badge" [attr.data-severity]="g.severity">{{ g.severity }}</span></td>
                <td>{{ g.owner || '\u2014' }}</td>
                <td class="date-cell" [class.overdue-date]="isOverdue(g)">{{ g.dueDate || '\u2014' }}</td>
                <td><span class="status-badge" [attr.data-status]="g.status">{{ formatStatus(g.status) }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
    styles: [`
    .loading-state, .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary, var(--text-muted)); }
    .empty-state i { font-size: 40px; margin-bottom: 12px; display: block; opacity: .4; }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .data-table th { background: var(--surface-100, var(--surface-ice)); padding: 10px 12px; text-align: start; font-weight: 600; white-space: nowrap; border-bottom: 1px solid var(--surface-border); }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid var(--surface-50, #f9fafb); }
    .clickable-row { cursor: pointer; transition: background .1s; }
    .clickable-row:hover { background: var(--surface-50, #f9fafb); }
    .overdue-row { background: var(--status-danger-bg, #fff1f1); }
    .title-cell { max-width: 280px; }
    .date-cell { white-space: nowrap; }
    .overdue-date { color: #b91c1c; font-weight: 600; }
    .severity-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .severity-badge[data-severity="critical"] { background: #fee2e2; color: #991b1b; }
    .severity-badge[data-severity="high"] { background: #ffedd5; color: #9a3412; }
    .severity-badge[data-severity="medium"] { background: #fef9c3; color: #854d0e; }
    .severity-badge[data-severity="low"] { background: #dcfce7; color: #166534; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .status-badge[data-status="open"] { background: #fee2e2; color: #b91c1c; }
    .status-badge[data-status="in_progress"] { background: #dbeafe; color: #1d4ed8; }
    .status-badge[data-status="awaiting_validation"] { background: #fef9c3; color: #a16207; }
    .status-badge[data-status="closed"] { background: #dcfce7; color: #15803d; }
    .status-badge[data-status="accepted"] { background: var(--surface-200); color: var(--text-color-secondary); }
  `]
})
export class ComplianceGapsTableComponent {
  readonly i18n = inject(I18nService);

  @Input() gaps: ComplianceGapDto[] = [];
  @Input() loading = false;
  @Input() loadError: string | null = null;

  @Output() rowClick = new EventEmitter<ComplianceGapDto>();
  @Output() retry = new EventEmitter<void>();

  isOverdue(g: ComplianceGapDto): boolean {
    if (!g.dueDate || g.status === 'closed') return false;
    return new Date(g.dueDate) < new Date();
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }
}
