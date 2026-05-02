import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ModelAsset {
  id: string;
  asset_key: string;
  display_name: string;
  description?: string;
  scope_type: 'global' | 'tenant';
  source_type?: string;
  lifecycle_status: string;
  status?: string;
  tags?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Presentational component for the left-hand asset list panel.
 * Displays a searchable list of AI model assets with scope/lifecycle tags.
 */
@Component({
    selector: 'app-ai-model-asset-panel',
    imports: [
        CommonModule,
        FormsModule,
        TagModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <aside class="asset-panel">
      <div class="panel-header">
        <h3 class="panel-title">{{ i18n.translate('ai.models.assetTitle') }}</h3>
        <button
          *ngIf="canWrite"
          pButton
          icon="pi pi-plus"
          class="p-button-sm p-button-outlined"
          [pTooltip]="i18n.translate('ai.models.newAsset')"
          (click)="createDraft.emit()">
        </button>
      </div>

      <!-- Search -->
      <div class="asset-search">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search"></i>
          <input
            pInputText
            type="text"
            class="w-full"
            [placeholder]="i18n.translate('common.search')"
            [ngModel]="searchTerm"
            (ngModelChange)="searchTermChange.emit($event)" />
        </span>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading-center">
        <p-progressSpinner strokeWidth="3" [style]="{width: '32px', height: '32px'}" />
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && filteredAssets.length === 0" class="empty-state">
        <i class="pi pi-box"></i>
        <span>{{ i18n.translate('ai.models.noAssets') }}</span>
      </div>

      <!-- Asset list -->
      <ul class="asset-list" *ngIf="!loading">
        <li
          *ngFor="let asset of filteredAssets; trackBy: trackAssetById"
          class="asset-item"
          [class.selected]="selectedAssetId === asset.id"
          (click)="assetSelected.emit(asset)">
          <div class="asset-item-header">
            <span class="asset-name">{{ asset.display_name }}</span>
            <i *ngIf="isSeededGlobal(asset)"
               class="pi pi-lock"
               [pTooltip]="i18n.translate('ai.models.seededLocked')"></i>
          </div>
          <div class="asset-item-meta">
            <p-tag
              [value]="asset.scope_type === 'global' ? 'Global' : 'Tenant'"
              [severity]="asset.scope_type === 'global' ? 'info' : 'success'"
              styleClass="scope-tag" />
            <p-tag
              [value]="asset.lifecycle_status"
              [severity]="getLifecycleSeverity(asset.lifecycle_status)"
              styleClass="lifecycle-tag" />
          </div>
        </li>
      </ul>
    </aside>
  `,
    styles: [`
    .asset-panel {
      width: 280px;
      min-width: 280px;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .panel-title {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text-color);
    }

    .asset-search {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .asset-search .p-input-icon-left {
      display: flex;
      align-items: center;
      position: relative;
    }

    .asset-search .p-input-icon-left > i {
      position: absolute;
      left: 0.5rem;
      z-index: 1;
      color: var(--text-color-secondary);
    }

    .asset-search .p-input-icon-left > input {
      padding-left: 2rem;
    }

    .asset-list {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      flex: 1;
    }

    .asset-item {
      padding: 0.625rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid var(--surface-border);
      transition: background 0.15s;
    }

    .asset-item:hover {
      background: var(--surface-hover);
    }

    .asset-item.selected {
      background: var(--primary-color);
      color: var(--primary-color-text);
    }

    .asset-item.selected .asset-name {
      color: var(--primary-color-text);
    }

    .asset-item.selected .pi-lock {
      color: var(--primary-color-text);
    }

    .asset-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .asset-name {
      font-weight: 500;
      font-size: var(--font-size-base);
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .asset-item-meta {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.25rem;
    }

    :host .scope-tag,
    :host .lifecycle-tag {
      font-size: var(--font-size-xs);
      padding: 0.1rem 0.4rem;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem 1rem;
      color: var(--text-color-secondary);
      font-size: var(--font-size-body-sm);
    }

    .empty-state i {
      font-size: var(--font-size-2xl);
      opacity: 0.5;
    }

    /* Responsive: full width on mobile */
    @media (max-width: 768px) {
      .asset-panel {
        width: 100%;
        min-width: unset;
        max-height: 300px;
      }
    }
  `]
})
export class AiModelAssetPanelComponent {
  // ── Injected services ────────────────────────────────────────────────────────
  constructor(readonly i18n: I18nService) {}

  // ── Inputs ─────────────────────────────────────────────────────────────────
  @Input() filteredAssets: ModelAsset[] = [];
  @Input() loading = false;
  @Input() searchTerm = '';
  @Input() selectedAssetId: string | null = null;
  @Input() canWrite = false;

  // ── Outputs ────────────────────────────────────────────────────────────────
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() assetSelected = new EventEmitter<ModelAsset>();
  @Output() createDraft = new EventEmitter<void>();

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Check if asset is a seeded global (mutations disallowed). */
  isSeededGlobal(asset: ModelAsset): boolean {
    return asset.scope_type === 'global' && asset.source_type === 'seeded';
  }

  /** TrackBy for ngFor on assets. */
  trackAssetById(_index: number, asset: ModelAsset): string {
    return asset.id;
  }

  /** Lifecycle status -> PrimeNG severity. */
  getLifecycleSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'active': return 'success';
      case 'deprecated': return 'warning';
      case 'retired': return 'danger';
      default: return 'info';
    }
  }
}
