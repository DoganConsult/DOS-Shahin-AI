import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

import { AiAssetExpansionPanelComponent } from './ai-asset-expansion-panel.component';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AiAssetRow {
  id: string;
  asset_key: string;
  display_name: string;
  description?: string;
  asset_type: string;
  scope_type: 'global' | 'tenant';
  source_type?: string;
  lifecycle_status: string;
  status?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  business_owner?: string;
  technical_owner?: string;
  governance_owner?: string;
  allowed_transitions?: string[];
  updated_at?: string;
  created_at?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-asset-table',
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TooltipModule,
        AiAssetExpansionPanelComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <p-table
      [value]="assets"
      [paginator]="totalRecords > pageSize"
      [rows]="pageSize"
      [totalRecords]="totalRecords"
      [lazy]="true"
      (onLazyLoad)="lazyLoad.emit($event)"
      dataKey="id"
      [rowsPerPageOptions]="[20, 50, 100]"
      [expandedRowKeys]="expandedRows"
      styleClass="p-datatable-sm p-datatable-striped"
      aria-label="AI Asset Inventory">

      <ng-template pTemplate="header">
        <tr>
          <th style="width: 3rem"></th>
          <th>{{ i18n.translate('ai.assets.displayName') }}</th>
          <th>{{ i18n.translate('ai.assets.assetKey') }}</th>
          <th>{{ i18n.translate('ai.assets.assetType') }}</th>
          <th>{{ i18n.translate('ai.assets.scopeType') }}</th>
          <th>{{ i18n.translate('ai.assets.lifecycle') }}</th>
          <th>{{ i18n.translate('ai.assets.status') }}</th>
          <th>{{ i18n.translate('ai.assets.sourceType') }}</th>
          <th>{{ i18n.translate('ai.assets.updatedAt') }}</th>
          <th>{{ i18n.translate('common.actions') }}</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-asset let-expanded="expanded">
        <tr>
          <td>
            <button
              type="button"
              pButton
              [pRowToggler]="asset"
              class="p-button-text p-button-sm p-button-rounded"
              [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'">
            </button>
          </td>
          <td>
            <span class="asset-display-name">{{ asset.display_name }}</span>
            <i *ngIf="isSeededGlobal(asset)"
               class="pi pi-lock lock-icon"
               [pTooltip]="i18n.translate('ai.assets.seededLocked')"></i>
          </td>
          <td><code class="asset-key-code">{{ asset.asset_key }}</code></td>
          <td>
            <p-tag
              [value]="asset.asset_type"
              [severity]="getAssetTypeSeverity(asset.asset_type)"
              styleClass="type-chip" />
          </td>
          <td>
            <p-tag
              [value]="asset.scope_type === 'global' ? 'Global' : 'Tenant'"
              [severity]="asset.scope_type === 'global' ? 'info' : 'success'"
              styleClass="scope-tag" />
          </td>
          <td>
            <p-tag
              [value]="asset.lifecycle_status"
              [severity]="getLifecycleSeverity(asset.lifecycle_status)"
              styleClass="lifecycle-tag" />
          </td>
          <td>{{ asset.status || '-' }}</td>
          <td>{{ asset.source_type || '-' }}</td>
          <td>{{ asset.updated_at ? (asset.updated_at | date:'short') : '-' }}</td>
          <td>
            <div class="action-buttons">
              <button
                *ngIf="canWrite && !isSeededGlobal(asset)"
                pButton
                icon="pi pi-pencil"
                class="p-button-text p-button-sm p-button-rounded"
                [pTooltip]="i18n.translate('common.edit')"
                (click)="edit.emit(asset)">
              </button>
              <button
                *ngIf="canWrite && !isSeededGlobal(asset) && asset.scope_type === 'tenant'"
                pButton
                icon="pi pi-trash"
                class="p-button-text p-button-sm p-button-rounded p-button-danger"
                [pTooltip]="i18n.translate('common.delete')"
                (click)="delete.emit(asset)">
              </button>
            </div>
          </td>
        </tr>
      </ng-template>

      <!-- Row Expansion -->
      <ng-template pTemplate="rowexpansion" let-asset>
        <tr>
          <td [attr.colspan]="10">
            <app-ai-asset-expansion-panel
              [asset]="asset"
              [isSeededGlobal]="isSeededGlobal(asset)"
              [transitioning]="transitioning"
              (transition)="transitionAsset.emit($event)">
            </app-ai-asset-expansion-panel>
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td [attr.colspan]="10" class="empty-state">
            <i class="pi pi-box"></i>
            <span>{{ i18n.translate('ai.assets.noAssets') }}</span>
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .asset-display-name { font-weight: 500; }
    .lock-icon {
      margin-inline-start: 0.375rem;
      font-size: var(--font-size-caption);
      color: var(--text-color-secondary);
    }
    .asset-key-code {
      font-size: var(--font-size-caption);
      background: var(--surface-ground);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-xs);
      word-break: break-all;
    }
    .type-chip,
    .scope-tag,
    .lifecycle-tag {
      font-size: var(--font-size-xs);
      padding: 0.1rem 0.4rem;
    }
    .action-buttons {
      display: flex;
      gap: 0.125rem;
      align-items: center;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      color: var(--text-color-secondary);
    }
  `]
})
export class AiAssetTableComponent {
  readonly i18n = inject(I18nService);

  /** Asset rows to display. */
  @Input() assets: AiAssetRow[] = [];

  /** Total records for server-side pagination. */
  @Input() totalRecords = 0;

  /** Page size for pagination. */
  @Input() pageSize = 20;

  /** Whether the user has write permission. */
  @Input() canWrite = false;

  /** Whether a lifecycle transition is in progress. */
  @Input() transitioning = false;

  /** Tracks which rows are currently expanded. */
  @Input() expandedRows: Record<string, boolean> = {};

  /** Emitted on PrimeNG lazy load for server-side pagination. */
  @Output() lazyLoad = new EventEmitter<GrcRecord>();

  /** Emitted when user clicks the edit button on a row. */
  @Output() edit = new EventEmitter<AiAssetRow>();

  /** Emitted when user clicks the delete button on a row. */
  @Output() delete = new EventEmitter<AiAssetRow>();

  /** Emitted when user clicks a lifecycle transition button. */
  @Output() transitionAsset = new EventEmitter<{ asset: AiAssetRow; target: string }>();

  /** Returns true if the asset is a seeded global (immutable). */
  isSeededGlobal(asset: AiAssetRow): boolean {
    return asset.scope_type === 'global' && asset.source_type === 'seeded';
  }

  /** Map asset_type to a PrimeNG tag severity for colored chips. */
  getAssetTypeSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      agent: 'info', model: 'success', prompt: 'warning', tool: 'danger',
      provider: 'info', workflow: 'success', binding: 'warning',
    };
    return map[type] || 'info';
  }

  /** Map lifecycle_status to a PrimeNG tag severity. */
  getLifecycleSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      draft: 'warning', review: 'info', approved: 'success',
      active: 'success', deprecated: 'danger', archived: 'danger',
    };
    return map[status] || 'info';
  }
}
