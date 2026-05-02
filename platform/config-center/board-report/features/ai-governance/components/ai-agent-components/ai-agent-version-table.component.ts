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
import { ChipModule } from 'primeng/chip';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AgentAsset {
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

export interface AgentVersion {
  id: string;
  asset_id: string;
  version_number: number;
  agent_config: Record<string, unknown>;
  capabilities?: string[];
  linked_prompt_asset_id?: string;
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
  | { type: 'edit'; version: AgentVersion }
  | { type: 'submit'; version: AgentVersion }
  | { type: 'delete'; version: AgentVersion }
  | { type: 'approve'; version: AgentVersion }
  | { type: 'reject'; version: AgentVersion }
  | { type: 'activate'; version: AgentVersion }
  | { type: 'suspend'; version: AgentVersion }
  | { type: 'retire'; version: AgentVersion };

/**
 * Presentational component that renders the version table for a selected agent asset.
 * Displays version details, capabilities, linked assets, approval/deployment status,
 * and action buttons based on version state and user permissions.
 */
@Component({
    selector: 'app-ai-agent-version-table',
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TooltipModule,
        ProgressSpinnerModule,
        ChipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- No asset selected state -->
    <div *ngIf="!asset" class="empty-state empty-state-lg">
      <i class="pi pi-arrow-left"></i>
      <span>{{ i18n.translate('ai.agents.selectAsset') }}</span>
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
          <!-- Rollback button -->
          <button
            *ngIf="canManage && !isSeededGlobal(asset)"
            pButton
            icon="pi pi-replay"
            [label]="i18n.translate('ai.agents.rollback')"
            class="p-button-sm p-button-warning p-button-outlined"
            (click)="rollback.emit(asset)">
          </button>
          <!-- Create new draft version -->
          <button
            *ngIf="canWrite && !isSeededGlobal(asset)"
            pButton
            icon="pi pi-plus"
            [label]="i18n.translate('ai.agents.newVersion')"
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
        <span>{{ i18n.translate('ai.agents.noVersions') }}</span>
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
        aria-label="Agent Versions">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('ai.agents.version') }}</th>
            <th>{{ i18n.translate('ai.agents.capabilities') }}</th>
            <th>{{ i18n.translate('ai.agents.linkedPrompt') }}</th>
            <th>{{ i18n.translate('ai.agents.linkedModel') }}</th>
            <th>{{ i18n.translate('ai.agents.approval') }}</th>
            <th>{{ i18n.translate('ai.agents.deployment') }}</th>
            <th>{{ i18n.translate('ai.agents.changeSummary') }}</th>
            <th>{{ i18n.translate('ai.agents.createdAt') }}</th>
            <th>{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-v>
          <tr>
            <td>
              <span class="version-number">v{{ v.version_number }}</span>
            </td>
            <td>
              <div class="capabilities-chips">
                <p-chip *ngFor="let cap of getCapabilitiesPreview(v)" [label]="cap" styleClass="capability-chip" />
                <span *ngIf="(v.capabilities?.length || 0) > 3" class="text-muted">
                  +{{ v.capabilities.length - 3 }}
                </span>
              </div>
            </td>
            <td>{{ getLinkedPromptName(v.linked_prompt_asset_id) }}</td>
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
              <div class="action-buttons" *ngIf="!isSeededGlobal(asset!)">
                <!-- Draft actions -->
                <ng-container *ngIf="v.approval_status === 'draft'">
                  <button pButton icon="pi pi-pencil" class="p-button-sm p-button-text"
                    [pTooltip]="i18n.translate('common.edit')"
                    *ngIf="canWrite"
                    (click)="versionAction.emit({type: 'edit', version: v})"></button>
                  <button pButton icon="pi pi-send" class="p-button-sm p-button-text p-button-info"
                    [pTooltip]="i18n.translate('ai.agents.submitApproval')"
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
                    [pTooltip]="i18n.translate('ai.agents.approve')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'approve', version: v})"></button>
                  <button pButton icon="pi pi-times" class="p-button-sm p-button-text p-button-danger"
                    [pTooltip]="i18n.translate('ai.agents.reject')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'reject', version: v})"></button>
                </ng-container>

                <!-- Approved + inactive actions -->
                <ng-container *ngIf="v.approval_status === 'approved' && !v.is_active">
                  <button pButton icon="pi pi-power-off" class="p-button-sm p-button-text p-button-success"
                    [pTooltip]="i18n.translate('ai.agents.activate')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'activate', version: v})"></button>
                </ng-container>

                <!-- Active actions -->
                <ng-container *ngIf="v.is_active">
                  <button pButton icon="pi pi-pause" class="p-button-sm p-button-text p-button-warning"
                    [pTooltip]="i18n.translate('ai.agents.suspend')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'suspend', version: v})"></button>
                  <button pButton icon="pi pi-ban" class="p-button-sm p-button-text p-button-secondary"
                    [pTooltip]="i18n.translate('ai.agents.retire')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'retire', version: v})"></button>
                </ng-container>

                <!-- Suspended actions -->
                <ng-container *ngIf="v.deployment_status === 'suspended' && !v.is_active">
                  <button pButton icon="pi pi-power-off" class="p-button-sm p-button-text p-button-success"
                    [pTooltip]="i18n.translate('ai.agents.activate')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'activate', version: v})"></button>
                  <button pButton icon="pi pi-ban" class="p-button-sm p-button-text p-button-secondary"
                    [pTooltip]="i18n.translate('ai.agents.retire')"
                    *ngIf="canManage"
                    (click)="versionAction.emit({type: 'retire', version: v})"></button>
                </ng-container>
              </div>

              <!-- Seeded global: lock icon only -->
              <div *ngIf="isSeededGlobal(asset!)" class="action-buttons">
                <i class="pi pi-lock text-muted" [pTooltip]="i18n.translate('ai.agents.seededLocked')"></i>
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

    .capabilities-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
    }

    :host .capability-chip {
      font-size: var(--font-size-xs);
      padding: 0.1rem 0.4rem;
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

    /* Deployment badges */
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
export class AiAgentVersionTableComponent {
  readonly i18n = inject(I18nService);

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() asset: AgentAsset | null = null;
  @Input() versions: AgentVersion[] = [];
  @Input() loading = false;
  @Input() total = 0;
  @Input() pageSize = 20;
  @Input() canWrite = false;
  @Input() canManage = false;

  /** Map of prompt asset id -> display name. */
  @Input() promptAssetMap = new Map<string, string>();
  /** Map of model asset id -> display name. */
  @Input() modelAssetMap = new Map<string, string>();

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() versionAction = new EventEmitter<VersionAction>();
  @Output() newVersion = new EventEmitter<AgentAsset>();
  @Output() rollback = new EventEmitter<AgentAsset>();
  @Output() pageChange = new EventEmitter<unknown>();

  // ── Display helpers ───────────────────────────────────────────────────────

  /** Check if asset is a seeded global (mutations disallowed). */
  isSeededGlobal(asset: AgentAsset): boolean {
    return asset.scope_type === 'global' && asset.source_type === 'seeded';
  }

  /** Return up to 3 capability strings for chip preview. */
  getCapabilitiesPreview(version: AgentVersion): string[] {
    if (!version.capabilities || !Array.isArray(version.capabilities)) return [];
    return version.capabilities.slice(0, 3);
  }

  /** Get display name for a linked prompt asset ID. */
  getLinkedPromptName(id?: string): string {
    if (!id) return '-';
    return this.promptAssetMap.get(id) ?? id;
  }

  /** Get display name for a linked model asset ID. */
  getLinkedModelName(id?: string): string {
    if (!id) return '-';
    return this.modelAssetMap.get(id) ?? id;
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
      case 'draft': return this.i18n.translate('ai.agents.statusDraft');
      case 'pending_approval': return this.i18n.translate('ai.agents.statusPending');
      case 'approved': return this.i18n.translate('ai.agents.statusApproved');
      case 'rejected': return this.i18n.translate('ai.agents.statusRejected');
      default: return status;
    }
  }

  /** Get deployment CSS class key for a version. */
  getDeploymentKey(v: AgentVersion): string {
    if (v.is_active) return 'active';
    if (v.deployment_status === 'suspended') return 'suspended';
    if (v.deployment_status === 'retired') return 'retired';
    return 'inactive';
  }

  /** Deployment status display label. */
  getDeploymentLabel(v: AgentVersion): string {
    if (v.is_active) return this.i18n.translate('ai.agents.deployActive');
    if (v.deployment_status === 'suspended') return this.i18n.translate('ai.agents.deploySuspended');
    if (v.deployment_status === 'retired') return this.i18n.translate('ai.agents.deployRetired');
    return this.i18n.translate('ai.agents.deployInactive');
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
