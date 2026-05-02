import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/**
 * Presentational component: Cross-module filter banner for the risk register.
 * Shows when query params (controlId, evidenceId) are active, with a clear button.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-register-filter-bar',
    imports: [CommonModule],
    template: `
    <div class="cross-filter-banner" *ngIf="filterText">
      <i class="pi pi-filter"></i>
      <span>{{ filterText }}</span>
      <button class="banner-clear-btn" (click)="clearFilter.emit()">
        <i class="pi pi-times"></i> {{ clearLabel }}
      </button>
    </div>
  `,
    styles: [`
    .cross-filter-banner {
      display: flex; align-items: center; gap: 10px; padding: 10px 16px; margin-bottom: 12px;
      background: var(--surface-100, #f3f4f6); border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--text);
    }
    .cross-filter-banner i { color: var(--primary); }
    .banner-clear-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: var(--font-size-sm);
      display: inline-flex; align-items: center; gap: 4px; margin-inline-start: auto;
    }
    .banner-clear-btn:hover { color: var(--primary); }
  `]
})
export class RiskRegisterFilterBarComponent {
  public i18n = inject(I18nService);

  /** The active filter description text */
  @Input() filterText = '';

  /** Label for the clear button */
  @Input() clearLabel = 'Clear filter';

  /** Emitted when the clear button is clicked */
  @Output() clearFilter = new EventEmitter<void>();
}
