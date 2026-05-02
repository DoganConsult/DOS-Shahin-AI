import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

import { ModelAsset } from './ai-model-asset-panel.component';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ModelVersion {
  id: string;
  asset_id: string;
  version_number: number;
  provider: string;
  provider_model_id: string;
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  deployment_status?: 'active' | 'suspended' | 'retired' | 'inactive';
  is_active: boolean;
  config?: Record<string, unknown>;
  change_summary?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface GovernedResolution {
  provider?: string;
  provider_model_id?: string;
  mismatch_details?: string;
  action_taken?: string;
  allowlist_advisory?: string;
  resolved_version_id?: string;
  asset_id?: string;
  [key: string]: unknown;
}

// ── Version action event types ────────────────────────────────────────────────

export type VersionActionType =
  | 'edit' | 'submit' | 'delete'
  | 'approve' | 'reject' | 'activate'
  | 'suspend' | 'retire';

export interface VersionActionEvent {
  action: VersionActionType;
  version: ModelVersion;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Presentational component for the right-hand version panel.
 * Displays the version table, action buttons, and governed resolution form.
 */
@Component({
    selector: 'app-ai-model-version-table',
    imports: [
        CommonModule,
        FormsModule,
        GrcDataTableComponent,
        TableModule,
        TagModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './ai-model-version-table.component.html',
    styleUrls: ['./ai-model-version-table.component.scss']
})
export class AiModelVersionTableComponent {
  // ── Injected services ────────────────────────────────────────────────────────
  constructor(readonly i18n: I18nService) {}

  // ── Inputs ─────────────────────────────────────────────────────────────────
  @Input() asset: ModelAsset | null = null;
  @Input() versions: ModelVersion[] = [];
  @Input() versionsLoading = false;
  @Input() versionTotal = 0;
  @Input() versionPageSize = 20;
  @Input() canWrite = false;
  @Input() canManage = false;
  @Input() isSeededGlobal = false;

  /** Governed resolution inputs */
  @Input() resolveAgentId = '';
  @Input() resolveLoading = false;
  @Input() resolveResult: GovernedResolution | null = null;

  // ── Outputs ────────────────────────────────────────────────────────────────
  @Output() createDraft = new EventEmitter<void>();
  @Output() rollbackRequested = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<unknown>();
  @Output() versionAction = new EventEmitter<VersionActionEvent>();

  /** Governed resolution outputs */
  @Output() resolveAgentIdChange = new EventEmitter<string>();
  @Output() resolveRequested = new EventEmitter<void>();

  // ── Display helpers ────────────────────────────────────────────────────────

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
      case 'draft': return this.i18n.translate('ai.models.statusDraft');
      case 'pending_approval': return this.i18n.translate('ai.models.statusPending');
      case 'approved': return this.i18n.translate('ai.models.statusApproved');
      case 'rejected': return this.i18n.translate('ai.models.statusRejected');
      default: return status;
    }
  }

  /** Get deployment CSS class key for a version. */
  getDeploymentKey(v: ModelVersion): string {
    if (v.is_active) return 'active';
    if (v.deployment_status === 'suspended') return 'suspended';
    if (v.deployment_status === 'retired') return 'retired';
    return 'inactive';
  }

  /** Deployment status display label. */
  getDeploymentLabel(v: ModelVersion): string {
    if (v.is_active) return this.i18n.translate('ai.models.deployActive');
    if (v.deployment_status === 'suspended') return this.i18n.translate('ai.models.deploySuspended');
    if (v.deployment_status === 'retired') return this.i18n.translate('ai.models.deployRetired');
    return this.i18n.translate('ai.models.deployInactive');
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
