import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AiAssetFilters {
  assetType: string | null;
  scopeType: string | null;
  lifecycleStatus: string | null;
  status: string | null;
  search: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-asset-filter-bar',
    imports: [
        CommonModule,
        FormsModule,
        DropdownModule,
        InputTextModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="filters-bar">
      <p-dropdown
        [options]="assetTypeOptions"
        [ngModel]="filters.assetType"
        (ngModelChange)="onFilterChange('assetType', $event)"
        [placeholder]="i18n.translate('ai.assets.filterAssetType')"
        [showClear]="true"
        styleClass="filter-dropdown">
      </p-dropdown>
      <p-dropdown
        [options]="scopeTypeOptions"
        [ngModel]="filters.scopeType"
        (ngModelChange)="onFilterChange('scopeType', $event)"
        [placeholder]="i18n.translate('ai.assets.filterScopeType')"
        [showClear]="true"
        styleClass="filter-dropdown">
      </p-dropdown>
      <p-dropdown
        [options]="lifecycleStatusOptions"
        [ngModel]="filters.lifecycleStatus"
        (ngModelChange)="onFilterChange('lifecycleStatus', $event)"
        [placeholder]="i18n.translate('ai.assets.filterLifecycle')"
        [showClear]="true"
        styleClass="filter-dropdown">
      </p-dropdown>
      <p-dropdown
        [options]="statusOptions"
        [ngModel]="filters.status"
        (ngModelChange)="onFilterChange('status', $event)"
        [placeholder]="i18n.translate('ai.assets.filterStatus')"
        [showClear]="true"
        styleClass="filter-dropdown">
      </p-dropdown>
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <input
          pInputText
          type="text"
          [placeholder]="i18n.translate('common.search')"
          [ngModel]="filters.search"
          (ngModelChange)="onFilterChange('search', $event)"
          (keyup.enter)="filtersChanged.emit()" />
      </span>
    </div>
  `,
    styles: [`
    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
      align-items: center;
    }
    :host .filter-dropdown {
      min-width: 160px;
    }
    .filters-bar .p-input-icon-left {
      display: flex;
      align-items: center;
      position: relative;
    }
    .filters-bar .p-input-icon-left > i {
      position: absolute;
      left: 0.5rem;
      z-index: 1;
      color: var(--text-color-secondary);
    }
    .filters-bar .p-input-icon-left > input {
      padding-left: 2rem;
      min-width: 200px;
    }
  `]
})
export class AiAssetFilterBarComponent {
  readonly i18n = inject(I18nService);

  /** Current filter values. */
  @Input() filters: AiAssetFilters = {
    assetType: null,
    scopeType: null,
    lifecycleStatus: null,
    status: null,
    search: '',
  };

  /** Dropdown option arrays passed from parent. */
  @Input() assetTypeOptions: { label: string; value: string }[] = [];
  @Input() scopeTypeOptions: { label: string; value: string }[] = [];
  @Input() lifecycleStatusOptions: { label: string; value: string }[] = [];
  @Input() statusOptions: { label: string; value: string }[] = [];

  /** Emitted when any filter value changes. */
  @Output() filtersChanged = new EventEmitter<void>();

  /** Handle individual filter field change and emit. */
  onFilterChange(field: keyof AiAssetFilters, value: string | null): void {
    (this.filters as unknown as Record<string, unknown>)[field] = value;
    this.filtersChanged.emit();
  }
}
