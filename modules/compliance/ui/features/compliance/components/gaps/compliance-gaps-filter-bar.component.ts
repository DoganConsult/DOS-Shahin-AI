/**
 * Compliance Gaps Filter Bar — Dumb sub-component
 * Renders the toolbar with scope toggle, framework/severity/status selects,
 * overdue checkbox, export button, and gap count badge.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { FrameworkSummaryDto, ComplianceGapDto } from '../../models/compliance.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-compliance-gaps-filter-bar',
    imports: [CommonModule, FormsModule, ExportButtonComponent],
    template: `
    <div class="page-toolbar">
      <h2>{{ scope === 'my' ? (i18n.translate('My gaps') || 'My gaps') : i18n.translate('common.complianceGaps') }}</h2>
      <div class="toolbar-actions">
        <button type="button" class="scope-btn" [class.active]="scope === 'my'" (click)="toggleScope.emit()">
          <i class=""></i> {{ scope === 'my' ? (i18n.translate('My gaps') || 'My gaps') : (i18n.translate('All') || 'All') }}
        </button>
        <select class="filter-select" [ngModel]="frameworkFilter" (ngModelChange)="frameworkFilterChange.emit($event)">
          <option value="">{{ i18n.translate('common.allFrameworks') }}</option>
          @for (fw of frameworks; track fw.frameworkId) {
            <option [value]="fw.frameworkId">{{ i18n.localize(fw.nameEn, fw.nameAr) }}</option>
          }
        </select>
        <select class="filter-select" [ngModel]="severityFilter" (ngModelChange)="severityFilterChange.emit($event)">
          <option value="">{{ i18n.translate('common.allSeverities') }}</option>
          <option value="critical">{{ i18n.translate('common.critical') }}</option>
          <option value="high">{{ i18n.translate('common.high') }}</option>
          <option value="medium">{{ i18n.translate('common.medium') }}</option>
          <option value="low">{{ i18n.translate('common.low') }}</option>
        </select>
        <select class="filter-select" [ngModel]="statusFilter" (ngModelChange)="statusFilterChange.emit($event)">
          <option value="">{{ i18n.translate('common.allStatuses') }}</option>
          <option value="open">{{ i18n.translate('common.open') }}</option>
          <option value="in_progress">{{ i18n.translate('common.inProgress') }}</option>
          <option value="awaiting_validation">{{ i18n.translate('common.awaitingValidation') }}</option>
          <option value="closed">{{ i18n.translate('common.closed') }}</option>
        </select>
        <label class="overdue-toggle">
          <input type="checkbox" [ngModel]="overdueOnly" (ngModelChange)="overdueOnlyChange.emit($event)" />
          {{ i18n.translate('common.overdueOnly') }}
        </label>
        <app-export-button module="compliance-gaps" [label]="i18n.translate('common.export')" [data]="exportData" />
        <span class="count-badge">{{ totalGaps }} {{ i18n.translate('common.gapUnit') }}</span>
      </div>
    </div>
  `,
    styles: [`
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .page-toolbar h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .scope-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card, #fff); cursor: pointer; color: var(--text-color); }
    .scope-btn:hover { background: var(--surface-100, #f3f4f6); }
    .scope-btn.active { background: var(--primary-50, #eff6ff); border-color: var(--primary-500, var(--primary)); color: var(--primary-700, var(--primary)); }
    .filter-select { padding: 6px 10px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card, #fff); }
    .overdue-toggle { display: flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); cursor: pointer; }
    .count-badge { font-size: var(--font-size-sm); padding: 4px 10px; border-radius: var(--radius-lg); background: var(--surface-200, var(--border-subtle)); color: var(--text-color-secondary); }
  `]
})
export class ComplianceGapsFilterBarComponent {
  readonly i18n = inject(I18nService);

  @Input() scope: 'my' | 'all' = 'all';
  @Input() frameworkFilter = '';
  @Input() severityFilter = '';
  @Input() statusFilter = '';
  @Input() overdueOnly = false;
  @Input() totalGaps = 0;
  @Input() frameworks: FrameworkSummaryDto[] = [];
  @Input() exportData: ComplianceGapDto[] = [];

  @Output() toggleScope = new EventEmitter<void>();
  @Output() frameworkFilterChange = new EventEmitter<string>();
  @Output() severityFilterChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<string>();
  @Output() overdueOnlyChange = new EventEmitter<boolean>();
}
