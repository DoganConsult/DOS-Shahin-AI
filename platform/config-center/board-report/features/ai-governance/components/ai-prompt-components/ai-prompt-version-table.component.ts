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
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PromptAsset {
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

export interface PromptVersion {
  id: string;
  asset_id: string;
  version_number: number;
  template_text: string;
  variables?: Record<string, unknown>;
  linked_model_asset_id?: string;
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  deployment_status?: 'active' | 'suspended' | 'retired' | 'inactive';
  is_active: boolean;
  change_summary?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

/** Emitted when user triggers a version action. */
export type VersionAction =
  | { type: 'edit'; version: PromptVersion }
  | { type: 'submit'; version: PromptVersion }
  | { type: 'delete'; version: PromptVersion }
  | { type: 'approve'; version: PromptVersion }
  | { type: 'reject'; version: PromptVersion }
  | { type: 'activate'; version: PromptVersion }
  | { type: 'suspend'; version: PromptVersion }
  | { type: 'retire'; version: PromptVersion };

/**
 * Presentational component that renders the version table for a selected prompt asset.
 * Displays version details, template preview, linked models, approval/deployment status,
 * and action buttons based on version state and user permissions.
 */
@Component({
    selector: 'app-ai-prompt-version-table',
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TooltipModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- No asset selected state -->
    <div *ngIf="!asset" class="empty-state empty-state-lg">
      <i class="pi pi-arrow-left"></i>
      <span>{{ i18n.translate('ai.prompts.selectAsset') }}</span>
    </div>

    <!-- Asset selected -->
    <ng-container *ngIf="asset">
      <!-- Version panel header -->
      <div class="version-panel-header">
        <div class="version-header-info">
          <h3 class="panel-title">{{ asset.display_name }}</h3>
          <span class="text-muted" *ngIf="asset.description">{{ asset.description }}</span>
        </div>
        <div class="version-header-actions">
          <!-- Rollback button (asset level) -->
          <button
            *ngIf="canManage && !isSeededGlobal(asset)"
            pButton
            icon="pi pi-replay"
            [label]="i18n.translate('ai.prompts.rollback')"
            class="p-button-sm p-button-warning p-button-outlined"
            (click)="rollback.emit(asset)">
          </button>
          <!-- Create new draft version -->
          <button
            *ngIf="canWrite && !isSeededGlobal(asset)"
            pButton
            icon="pi pi-plus"
            [label]="i18n.translate('ai.prompts.newVersion')"
            class="p-button-sm p-button-outlined"
            (click)="newVersion.emit(asset)">
          </button>
        </div>
      </div>

      <!-- Version loading state -->
      <div *ngIf="loading" class="loading-center">
        <p-progressSpinner strokeWidth="3" [style]="{width: '32px', height: '32px'}" />
      </div>

      <!-- Version empty state -->
      <div *ngIf="!loading && versions.length === 0" class="empty-state">
        <i class="pi pi-list"></i>
        <span>{{ i18n.translate('ai.prompts.noVersions') }}</span>
      </div>

      <!-- Version table -->
      <p-table
        *ngIf="!loading && versions.length > 0"
        [value]="versions"
        [paginator]="total > pageSize"
        [rows]="pageSize"
        [totalRecords]="total"
        [lazy]="true"
        (onLazyLoad)="pageChange.emit($event)"
        dataKey="id"
        styleClass="p-datatable-sm p-datatable-striped"
        aria-label="Prompt Versions">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('ai.prompts.version') }}</th>
            <th>{{ i18n.translate('ai.prompts.templatePreview') }}</th>
            <th>{{ i18n.translate('ai.prompts.linkedModel') }}</th>
            <th>{{ i18n.translate('ai.prompts.approval') }}</th>
            <th>{{ i18n.translate('ai.prompts.deployment') }}</th>
            <th>{{ i18n.translate('ai.prompts.changeSummary') }}</th>
            <th>{{ i18n.translate('ai.prompts.createdAt') }}</th>
            <th>{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-v>
          <tr>
            <td>
              <span class="version-number">v{{ v.version_number }}</span>
            </td>
            <td class="template-preview-cell">
              <code class="template-preview-code">{{ truncateTemplate(v.template_text) }}</code>
            </td>
            <td>{{ getLinkedModelName(v.linked_model_asset_id) }}</td>
            <td>
              <p-tag
                [value]="getApprovalLabel(v.approval_status)"
                [severity]="getApprovalSeverity(v.approval_status)" />
            </td>
            <td>
              <span class="deployment-badge" [ngClass]="'deployment-' + getDeploymentKey(v)">
                <span *ngIf="v.is_active" class="active-dot"></span>
                {{ getDeploymentLabel(v) }}
              </span>
            </td>
            <td class="change-summary-cell">{{ v.change_summary || '-' }}</td>
            <td>{{ formatDate(v.created_at) }}</td>
            <td>
              <div class="action-buttons" *ngIf="!isSeededGlobal(asset)">
                <!-- Draft actions -->
                <ng-container *ngIf="v.approval_status === 'draft'">
                  <button pButton icon="pi pi-pencil" class="p-button-sm p-button-text"
                    [pTooltip]="i18n.translate('common.edit')"
                    *ngIf="canWrite"
                    (click)="versionAction.emit({type: 'edit', version: v})"></button>
                  <button pButton icon="pi pi-send" class="p-button-sm p-button-text p-button-info"
                    [pTooltip]="i18n.translate('ai.prompts.submitApproval')"
                    *ngIf="canWrite"
                    (click)="versionAction.emit({type: 'submit', version: v})"></button>
                  <button pButton icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger"
                    [pTooltip]="i18n.translate('common.delete')"
                    *ngIf="canWrite"
                    (click)="versionAction.emit({type: 'delete', version: v})"></button>
                </ng-container>

                <!-- Pending approval actions -->
                <ng-container *ngIf="v.approval_status === 'pending_approval'">
                  <button pButton icon="pi pi-check" class="p-button-sm p-button-text p-button-success"
                    [pTooltip]="i18n.translate('ai.prompts.approve')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'approve', version: v})"></button>
                  <button pButton icon="pi pi-times" class="p-button-sm p-button-text p-button-danger"
                    [pTooltip]="i18n.translate('ai.prompts.reject')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'reject', version: v})"></button>
                </ng-container>

                <!-- Approved + inactive actions -->
                <ng-container *ngIf="v.approval_status === 'approved' && !v.is_active">
                  <button pButton icon="pi pi-power-off" class="p-button-sm p-button-text p-button-success"
                    [pTooltip]="i18n.translate('ai.prompts.activate')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'activate', version: v})"></button>
                </ng-container>

                <!-- Active actions -->
                <ng-container *ngIf="v.is_active">
                  <button pButton icon="pi pi-pause" class="p-button-sm p-button-text p-button-warning"
                    [pTooltip]="i18n.translate('ai.prompts.suspend')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'suspend', version: v})"></button>
                  <button pButton icon="pi pi-ban" class="p-button-sm p-button-text p-button-secondary"
                    [pTooltip]="i18n.translate('ai.prompts.retire')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'retire', version: v})"></button>
                </ng-container>

                <!-- Suspended actions -->
                <ng-container *ngIf="v.deployment_status === 'suspended' && !v.is_active">
                  <button pButton icon="pi pi-power-off" class="p-button-sm p-button-text p-button-success"
                    [pTooltip]="i18n.translate('ai.prompts.activate')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'activate', version: v})"></button>
                  <button pButton icon="pi pi-ban" class="p-button-sm p-button-text p-button-secondary"
                    [pTooltip]="i18n.translate('ai.prompts.retire')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'retire', version: v})"></button>
                </ng-container>
              </div>

              <!-- Seeded global: lock icon only -->
              <div *ngIf="isSeededGlobal(asset)" class="action-buttons">
                <i class="pi pi-lock text-muted" [pTooltip]="i18n.translate('ai.prompts.seededLocked')"></i>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </ng-container>
  `,
    styles: [`
    .version-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .version-header-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .panel-title {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text-color);
    }

    .version-header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .version-number {
      font-weight: 600;
      font-family: var(--font-family-monospace, monospace);
    }

    .template-preview-cell {
      max-width: 220px;
    }

    .template-preview-code {
      font-size: var(--font-size-caption);
      background: var(--surface-ground);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-xs);
      word-break: break-all;
      display: inline-block;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .change-summary-cell {
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .action-buttons {
      display: flex;
      gap: 0.125rem;
      align-items: center;
    }

    /* ── Deployment badges ── */
    .deployment-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: var(--font-size-caption);
      font-weight: 500;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-xs);
    }

    .active-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
    }

    .deployment-active {
      background: rgba(var(--module-accent-green-rgb), 0.12);
      color: #16a34a;
    }

    .deployment-suspended {
      background: rgba(var(--module-accent-orange-rgb), 0.12);
      color: #ea580c;
    }

    .deployment-retired {
      background: var(--surface-ground);
      color: var(--text-color-secondary);
      text-decoration: line-through;
    }

    .deployment-inactive {
      background: transparent;
      color: var(--text-color-secondary);
      border: 1px solid var(--surface-border);
    }

    /* ── Shared States ── */
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

    .empty-state-lg {
      flex: 1;
      font-size: var(--font-size-md);
    }

    .empty-state i {
      font-size: var(--font-size-2xl);
      opacity: 0.5;
    }

    .text-muted {
      color: var(--text-color-secondary);
      font-size: var(--font-size-tag);
    }

    @media (max-width: 768px) {
      .version-panel-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class AiPromptVersionTableComponent {
  readonly i18n = inject(I18nService);

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() asset: PromptAsset | null = null;
  @Input() versions: PromptVersion[] = [];
  @Input() loading = false;
  @Input() total = 0;
  @Input() pageSize = 20;
  @Input() canWrite = false;
  @Input() canManage = false;
  @Input() modelAssetMap = new Map<string, string>();

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() versionAction = new EventEmitter<VersionAction>();
  @Output() newVersion = new EventEmitter<PromptAsset>();
  @Output() rollback = new EventEmitter<PromptAsset>();
  @Output() pageChange = new EventEmitter<unknown>();

  /** Check if asset is a seeded global (mutations disallowed). */
  isSeededGlobal(asset: PromptAsset | null): boolean {
    if (!asset) return false;
    return asset.scope_type === 'global' && asset.source_type === 'seeded';
  }

  /** Truncate template_text for table preview display. */
  truncateTemplate(text: string, maxLen = 60): string {
    if (!text) return '-';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  }

  /** Look up the display name for a linked model asset ID. */
  getLinkedModelName(modelAssetId?: string): string {
    if (!modelAssetId) return '-';
    return this.modelAssetMap.get(modelAssetId) ?? modelAssetId;
  }

  /** Approval status -> PrimeNG tag severity. */
  getApprovalSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_approval': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'info';
    }
  }

  /** Approval status -> display label. */
  getApprovalLabel(status: string): string {
    switch (status) {
      case 'draft': return this.i18n.translate('ai.prompts.statusDraft');
      case 'pending_approval': return this.i18n.translate('ai.prompts.statusPending');
      case 'approved': return this.i18n.translate('ai.prompts.statusApproved');
      case 'rejected': return this.i18n.translate('ai.prompts.statusRejected');
      default: return status;
    }
  }

  /** Get deployment CSS class key for a version. */
  getDeploymentKey(v: PromptVersion): string {
    if (v.is_active) return 'active';
    if (v.deployment_status === 'suspended') return 'suspended';
    if (v.deployment_status === 'retired') return 'retired';
    return 'inactive';
  }

  /** Deployment status display label. */
  getDeploymentLabel(v: PromptVersion): string {
    if (v.is_active) return this.i18n.translate('ai.prompts.deployActive');
    if (v.deployment_status === 'suspended') return this.i18n.translate('ai.prompts.deploySuspended');
    if (v.deployment_status === 'retired') return this.i18n.translate('ai.prompts.deployRetired');
    return this.i18n.translate('ai.prompts.deployInactive');
  }

  /** Format ISO date string for display. */
  formatDate(isoString: string): string {
    if (!isoString) return '-';
    try {
      return this.i18n.formatDate(new Date(isoString));
    } catch {
      return isoString;
    }
  }
}
